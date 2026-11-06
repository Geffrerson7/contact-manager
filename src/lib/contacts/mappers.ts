/**
 * Conversión entre filas de Prisma y DTO públicos.
 * Solo servidor: lo usan el repositorio y el servicio. Importa únicamente *tipos* generados.
 */
import type {
  Contact as ContactRow,
  Role as PrismaRole,
  UndoBatch as UndoBatchRow,
} from "@/generated/prisma/client";
import type { Contact, ContactInput, Role, UndoResult } from "./types";

/** Falla en `tsc` si el enum `Role` de Prisma y `ROLES` del dominio dejan de coincidir. */
type Equals<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const rolesInSync: Equals<Role, PrismaRole> = true;
void rolesInSync;

/** Fila de contacto → DTO. Descarta `deletedAt` y `deletedBatchId`, que son internos. */
export function toContact(row: ContactRow): Contact {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    role: row.role,
    company: row.company,
    isFavorite: row.isFavorite,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Datos de inserción. No incluye `createdAt` ni `updatedAt`: PostgreSQL es la única
 * autoridad de los timestamps (P2).
 */
export function toContactCreateData(id: string, input: ContactInput) {
  return {
    id,
    name: input.name,
    phone: input.phone,
    email: input.email,
    role: input.role,
    company: input.company,
    isFavorite: input.isFavorite,
  };
}

/** Lote de borrado → `UndoResult`. Sin lote (no había contactos que borrar) → resultado vacío. */
export function toUndoResult(
  batch: Pick<UndoBatchRow, "id" | "contactCount" | "expiresAt"> | null,
): UndoResult {
  if (batch === null) return { count: 0, batchId: null, expiresAt: null };

  return {
    count: batch.contactCount,
    batchId: batch.id,
    expiresAt: batch.expiresAt.toISOString(),
  };
}
