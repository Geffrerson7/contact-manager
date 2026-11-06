/**
 * Persistencia de contactos con Prisma 7 + SQL de bloqueo (§7, §11).
 * Solo servidor. No valida ni decide reglas de dominio: eso es del servicio.
 *
 * Reglas de bloqueo (§7.3):
 * - R1: las transacciones multi-tabla (`deleteOne`, `deleteAll`, `restore`, `purge`) toman el
 *   mutex estructural como primera sentencia tras `SET LOCAL`.
 * - R2: solo `deleteAll` (y `seed`, M7) toma además `SHARE` sobre `contacts`.
 * - R3: el resto solo usa bloqueos de fila de una tabla.
 * - R4: `purge` usa `pg_try_advisory_xact_lock` y omite la pasada si no lo obtiene.
 */
import type {
  Contact as ContactRow,
  Prisma,
  PrismaClient,
  UndoBatch as UndoBatchRow,
} from "@/generated/prisma/client";
import {
  PURGE_EXPIRED_AFTER_MINUTES,
  PURGE_LOCK_TIMEOUT,
  PURGE_RESTORED_AFTER_HOURS,
  UNDO_WINDOW_SECONDS,
  WRITE_LOCK_TIMEOUT,
  WRITE_MUTEX_KEY,
} from "./constants";
import { ContactsError, UndoInconsistentError } from "./errors";
import type { toContactCreateData } from "./mappers";
import type { ContactInput, RestoreResult } from "./types";
import { classifyFailedClaim, type UndoBatchState } from "./undo";

export type { ContactRow, UndoBatchRow };
export type TransactionClient = Prisma.TransactionClient;
export type ContactCreateData = ReturnType<typeof toContactCreateData>;
export type ContactContentData = Partial<Omit<ContactInput, "isFavorite">>;
export type ContactReplaceData = ContactInput;
export type UndoBatchSummary = Pick<
  UndoBatchRow,
  "id" | "contactCount" | "expiresAt"
>;

/** Hooks de prueba (§14.4). En producción son `undefined` y no ejecutan consultas extra. */
export interface HookContext {
  tx: TransactionClient;
  pid: number;
}

export interface UndoTransactionHooks {
  onStart?: (ctx: HookContext) => Promise<void>;
  /** Tras adquirir el mutex y antes de cualquier bloqueo de tabla. */
  afterMutex?: (ctx: HookContext) => Promise<void>;
  afterDeleteAllSnapshot?: (
    ctx: HookContext & { batchId: string; ids: readonly string[] },
  ) => Promise<void>;
  afterRestoreClaim?: (
    ctx: HookContext & { batchId: string; contactCount: number },
  ) => Promise<void>;
}

export interface PurgeResult {
  /** `false` si otro escritor estructural tenía el mutex: la pasada se omitió (R4). */
  acquired: boolean;
  batches: number;
}

/**
 * Decide, con el contacto actual bloqueado, qué columnas cambiar. Devuelve `null` si no hay
 * cambios (no se emite `UPDATE`). Puede lanzar para abortar la transacción.
 */
export type ContactUpdatePlan = (
  current: ContactRow,
) => ContactContentData | null;

export interface ContactsRepository {
  listActive(): Promise<ContactRow[]>;
  findActive(id: string): Promise<ContactRow | null>;
  create(data: ContactCreateData): Promise<ContactRow>;
  replace(id: string, data: ContactReplaceData): Promise<ContactRow | null>;
  updateLocked(id: string, plan: ContactUpdatePlan): Promise<ContactRow | null>;
  setFavorite(id: string, isFavorite: boolean): Promise<ContactRow | null>;
  deleteOne(
    id: string,
    batchId: string,
    hooks?: UndoTransactionHooks,
  ): Promise<UndoBatchSummary | null>;
  deleteAll(
    batchId: string,
    hooks?: UndoTransactionHooks,
  ): Promise<UndoBatchSummary | null>;
  restore(
    batchId: string,
    hooks?: UndoTransactionHooks,
  ): Promise<RestoreResult>;
  purge(): Promise<PurgeResult>;
}

/** Orden estable de los listados: inserción (Fase 2) con desempate por id. */
const LIST_ORDER = [
  { createdAt: "asc" },
  { id: "asc" },
] as const satisfies Prisma.ContactOrderByWithRelationInput[];

const TRANSACTION_OPTIONS = { maxWait: 5_000, timeout: 10_000 } as const;

/** Error interno para revertir una transacción y devolver «no encontrado». */
class RollbackNotFound extends Error {}

function isRecordNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === "P2025"
  );
}

async function hookContext(
  tx: TransactionClient,
  hooks: UndoTransactionHooks | undefined,
): Promise<HookContext | undefined> {
  if (!hooks?.onStart) return undefined;
  const [row] = await tx.$queryRaw<
    { pid: number }[]
  >`SELECT pg_backend_pid() AS pid`;
  const ctx = { tx, pid: row!.pid };
  await hooks.onStart(ctx);
  return ctx;
}

function contextFor(
  tx: TransactionClient,
  ctx: HookContext | undefined,
): HookContext {
  return ctx ?? { tx, pid: -1 };
}

async function beginStructuralWrite(tx: TransactionClient): Promise<void> {
  await tx.$executeRawUnsafe(
    `SET LOCAL lock_timeout = '${WRITE_LOCK_TIMEOUT}'`,
  );
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${WRITE_MUTEX_KEY}::int4)`;
}

export function createContactsRepository(
  prisma: PrismaClient,
): ContactsRepository {
  return {
    listActive() {
      return prisma.contact.findMany({
        where: { deletedAt: null },
        orderBy: [...LIST_ORDER],
      });
    },

    findActive(id) {
      return prisma.contact.findFirst({ where: { id, deletedAt: null } });
    },

    create(data) {
      // Sin createdAt/updatedAt: los fija PostgreSQL (P2).
      return prisma.contact.create({ data });
    },

    async replace(id, data) {
      try {
        // Un único UPDATE … WHERE id AND deletedAt IS NULL … RETURNING (§7.6).
        return await prisma.contact.update({
          where: { id, deletedAt: null },
          data,
        });
      } catch (error) {
        if (isRecordNotFound(error)) return null;
        throw error;
      }
    },

    async updateLocked(id, plan) {
      return prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(
          `SET LOCAL lock_timeout = '${WRITE_LOCK_TIMEOUT}'`,
        );
        // Bloqueo de fila (R3): el parche se combina con el estado que no puede cambiar
        // hasta el COMMIT, así la regla «teléfono o correo» se evalúa sobre datos reales.
        const locked = await tx.$queryRaw<{ id: string }[]>`
          SELECT "id" FROM "contacts"
           WHERE "id" = ${id}::uuid AND "deletedAt" IS NULL
           FOR UPDATE`;
        if (locked.length === 0) return null;

        const current = await tx.contact.findUniqueOrThrow({ where: { id } });
        const changes = plan(current);
        if (changes === null) return current;

        return tx.contact.update({ where: { id }, data: changes });
      }, TRANSACTION_OPTIONS);
    },

    async setFavorite(id, isFavorite) {
      try {
        // El trigger deja updatedAt intacto (D9, T3).
        return await prisma.contact.update({
          where: { id, deletedAt: null },
          data: { isFavorite },
        });
      } catch (error) {
        if (isRecordNotFound(error)) return null;
        throw error;
      }
    },

    async deleteOne(id, batchId, hooks) {
      try {
        return await prisma.$transaction(async (tx) => {
          const ctx = await hookContext(tx, hooks);
          await beginStructuralWrite(tx);
          await hooks?.afterMutex?.(contextFor(tx, ctx));

          // Lote primero por la clave foránea (§7.7).
          const [batch] = await tx.$queryRaw<UndoBatchSummary[]>`
            INSERT INTO "undo_batches" ("id", "scope", "contactCount", "createdAt", "expiresAt")
            VALUES (${batchId}::uuid, 'ONE', 1, clock_timestamp(),
                    clock_timestamp() + make_interval(secs => ${UNDO_WINDOW_SECONDS}::int4))
            RETURNING "id", "contactCount", "expiresAt"`;

          const affected = await tx.$executeRaw`
            UPDATE "contacts"
               SET "deletedAt" = clock_timestamp(), "deletedBatchId" = ${batchId}::uuid
             WHERE "id" = ${id}::uuid AND "deletedAt" IS NULL`;

          // 0 filas → ROLLBACK: el lote no llega a existir.
          if (affected === 0) throw new RollbackNotFound();
          return batch!;
        }, TRANSACTION_OPTIONS);
      } catch (error) {
        if (error instanceof RollbackNotFound) return null;
        throw error;
      }
    },

    deleteAll(batchId, hooks) {
      return prisma.$transaction(async (tx) => {
        const ctx = await hookContext(tx, hooks);
        await beginStructuralWrite(tx);
        await hooks?.afterMutex?.(contextFor(tx, ctx));

        // R2: congelar a los escritores ordinarios mientras se fija el conjunto de ids.
        await tx.$executeRawUnsafe(`LOCK TABLE "contacts" IN SHARE MODE`);

        const rows = await tx.$queryRaw<{ id: string }[]>`
          SELECT "id" FROM "contacts"
           WHERE "deletedAt" IS NULL
           ORDER BY "id"
           FOR UPDATE`;
        const ids = rows.map((row) => row.id);

        await hooks?.afterDeleteAllSnapshot?.({
          ...contextFor(tx, ctx),
          batchId,
          ids,
        });

        // Sin contactos activos: COMMIT sin lote (el CHECK exige contactCount > 0).
        if (ids.length === 0) return null;

        const [batch] = await tx.$queryRaw<UndoBatchSummary[]>`
          INSERT INTO "undo_batches" ("id", "scope", "contactCount", "createdAt", "expiresAt")
          VALUES (${batchId}::uuid, 'ALL', ${ids.length}::int4, clock_timestamp(),
                  clock_timestamp() + make_interval(secs => ${UNDO_WINDOW_SECONDS}::int4))
          RETURNING "id", "contactCount", "expiresAt"`;

        const affected = await tx.$executeRaw`
          UPDATE "contacts"
             SET "deletedAt" = clock_timestamp(), "deletedBatchId" = ${batchId}::uuid
           WHERE "id" = ANY(${ids}::uuid[]) AND "deletedAt" IS NULL`;

        // Con SHARE + FOR UPDATE no debería ocurrir; si ocurre, ROLLBACK → CONFLICT.
        if (affected !== ids.length) throw new ContactsError("CONFLICT");
        return batch!;
      }, TRANSACTION_OPTIONS);
    },

    restore(batchId, hooks) {
      return prisma.$transaction(async (tx) => {
        const ctx = await hookContext(tx, hooks);
        await beginStructuralWrite(tx);
        await hooks?.afterMutex?.(contextFor(tx, ctx));

        // Claim condicional (§11.4): solo un lote sin restaurar y dentro de la ventana.
        const claimed = await tx.$queryRaw<{ contactCount: number }[]>`
          UPDATE "undo_batches" SET "restoredAt" = clock_timestamp()
           WHERE "id" = ${batchId}::uuid
             AND "restoredAt" IS NULL
             AND "expiresAt" > clock_timestamp()
          RETURNING "contactCount"`;

        if (claimed.length === 0) {
          // Clasificación en la misma transacción, con el reloj de PostgreSQL (§11.3).
          const [state] = await tx.$queryRaw<UndoBatchState[]>`
            SELECT "restoredAt", "expiresAt" <= clock_timestamp() AS "expired"
              FROM "undo_batches" WHERE "id" = ${batchId}::uuid`;
          return classifyFailedClaim(state ?? null);
        }

        const expected = claimed[0]!.contactCount;
        await hooks?.afterRestoreClaim?.({
          ...contextFor(tx, ctx),
          batchId,
          contactCount: expected,
        });

        const restored = await tx.$executeRaw`
          UPDATE "contacts" SET "deletedAt" = NULL, "deletedBatchId" = NULL
           WHERE "deletedBatchId" = ${batchId}::uuid AND "deletedAt" IS NOT NULL`;

        // Lanzar dentro de $transaction revierte también restoredAt: todo o nada.
        if (restored !== expected) {
          throw new UndoInconsistentError({
            batchId,
            expected,
            actual: restored,
          });
        }

        return { restored, status: "restored" as const };
      }, TRANSACTION_OPTIONS);
    },

    purge() {
      return prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(
          `SET LOCAL lock_timeout = '${PURGE_LOCK_TIMEOUT}'`,
        );

        const [lock] = await tx.$queryRaw<{ acquired: boolean }[]>`
          SELECT pg_try_advisory_xact_lock(${WRITE_MUTEX_KEY}::int4) AS "acquired"`;
        if (!lock?.acquired) return { acquired: false, batches: 0 };

        // La cascada elimina los contactos borrados de cada lote; nunca toca activos.
        const batches = await tx.$executeRaw`
          DELETE FROM "undo_batches"
           WHERE ("restoredAt" IS NULL
                  AND "expiresAt" < clock_timestamp()
                      - make_interval(mins => ${PURGE_EXPIRED_AFTER_MINUTES}::int4))
              OR ("restoredAt" IS NOT NULL
                  AND "restoredAt" < clock_timestamp()
                      - make_interval(hours => ${PURGE_RESTORED_AFTER_HOURS}::int4))`;

        return { acquired: true, batches };
      }, TRANSACTION_OPTIONS);
    },
  };
}
