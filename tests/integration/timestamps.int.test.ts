// Timestamps (§6, §14.6). T8 (M1) verifica la invariante a nivel de SQL; T1–T7 y
// T9–T11 (M3) la verifican a través del servicio y el repositorio reales.

import pg from "pg";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import type { ContactsService } from "@/lib/contacts/service";
import { createTestPrisma, createTestService, input } from "./helpers/app";
import { connectToTestDatabase, truncateAll, withContactsTriggerDisabled } from "./helpers/db";

const CHECK_VIOLATION = "23514";
const TIMESTAMPS_CHECK = "contacts_timestamps_check";

let client: pg.Client;
let prisma: PrismaClient;
let service: ContactsService;

beforeAll(async () => {
  client = await connectToTestDatabase();
  prisma = createTestPrisma();
  service = createTestService(prisma);
});

afterEach(async () => {
  await truncateAll(client);
});

afterAll(async () => {
  await prisma?.$disconnect();
  await client?.end();
});

type Timestamps = { createdAt: Date; updatedAt: Date };

async function insertContact(name: string): Promise<string> {
  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO "contacts" ("id", "name", "email", "role")
     VALUES (gen_random_uuid(), $1, $2, 'Amigo')
     RETURNING "id"`,
    [name, `${name.toLowerCase()}@example.com`],
  );
  return rows[0]!.id;
}

async function readTimestamps(id: string): Promise<Timestamps> {
  const { rows } = await client.query<Timestamps>(
    `SELECT "createdAt", "updatedAt" FROM "contacts" WHERE "id" = $1::uuid`,
    [id],
  );
  return rows[0]!;
}

async function expectTimestampsCheckViolation(query: Promise<unknown>): Promise<void> {
  const error: unknown = await query.then(
    () => null,
    (reason: unknown) => reason,
  );

  expect(error, "se esperaba que PostgreSQL rechazara la operación").toBeInstanceOf(
    pg.DatabaseError,
  );
  // Solo es válido el rechazo de este CHECK concreto: cualquier otro error falla.
  const { code, constraint } = error as pg.DatabaseError;
  expect(code, "SQLSTATE").toBe(CHECK_VIOLATION);
  expect(constraint, "restricción").toBe(TIMESTAMPS_CHECK);
}

async function isContactsTriggerEnabled(): Promise<boolean> {
  const { rows } = await client.query<{ enabled: string }>(
    `SELECT "tgenabled" AS "enabled" FROM pg_trigger
      WHERE "tgname" = 'contacts_before_update' AND "tgrelid" = '"contacts"'::regclass`,
  );
  expect(rows).toHaveLength(1);
  return rows[0]!.enabled === "O";
}

async function countInvariantViolations(): Promise<number> {
  const { rows } = await client.query<{ count: number }>(
    `SELECT count(*)::int AS "count" FROM "contacts" WHERE "updatedAt" < "createdAt"`,
  );
  return rows[0]!.count;
}

describe("timestamps de contactos", () => {
  it("T8 — invariante global: ningún contacto con updatedAt < createdAt", async () => {
    const ids = [
      await insertContact("Ana"),
      await insertContact("Bruno"),
      await insertContact("Carla"),
    ];
    const [first, second, third] = ids as [string, string, string];
    const original = await readTimestamps(first);

    // 1. Con el trigger activo: retrasar updatedAt sin cambiar contenido no tiene efecto.
    await client.query(
      `UPDATE "contacts" SET "updatedAt" = "createdAt" - interval '1 day' WHERE "id" = $1::uuid`,
      [first],
    );
    expect(await readTimestamps(first)).toEqual(original);

    // 2. Con el trigger activo: adelantar createdAt se revierte (createdAt es inmutable).
    await client.query(
      `UPDATE "contacts" SET "createdAt" = clock_timestamp() + interval '1 day' WHERE "id" = $1::uuid`,
      [first],
    );
    expect(await readTimestamps(first)).toEqual(original);

    // 3. Sin trigger, el CHECK sigue protegiendo la invariante por sí solo.
    await withContactsTriggerDisabled(client, async () => {
      await expectTimestampsCheckViolation(
        client.query(
          `UPDATE "contacts" SET "updatedAt" = "createdAt" - interval '1 millisecond' WHERE "id" = $1::uuid`,
          [second],
        ),
      );
      await expectTimestampsCheckViolation(
        client.query(
          `UPDATE "contacts" SET "createdAt" = "updatedAt" + interval '1 day' WHERE "id" = $1::uuid`,
          [third],
        ),
      );
    });

    // 4. Un INSERT con timestamps invertidos también se rechaza.
    await expectTimestampsCheckViolation(
      client.query(
        `INSERT INTO "contacts" ("id", "name", "email", "role", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), 'Dario', 'dario@example.com', 'Amigo',
                 clock_timestamp(), clock_timestamp() - interval '1 day')`,
      ),
    );

    // 5. El trigger quedó habilitado de nuevo tras el bloque anterior.
    expect(await isContactsTriggerEnabled()).toBe(true);

    // 6. Invariante global sobre datos reales (no sobre una tabla vacía).
    const { rows: total } = await client.query<{ count: number }>(
      `SELECT count(*)::int AS "count" FROM "contacts"`,
    );
    expect(total[0]!.count).toBe(3);
    expect(await countInvariantViolations()).toBe(0);
  });
});

/** Coloca `updatedAt` una hora por delante del reloj de PostgreSQL (simula reloj atrasado). */
async function pushUpdatedAtIntoFuture(id: string): Promise<number> {
  const { rows } = await client.query<{ t: Date }>(
    `SELECT date_trunc('milliseconds', clock_timestamp() + interval '1 hour') AS t`,
  );
  const future = rows[0]!.t;
  await withContactsTriggerDisabled(client, () =>
    client.query(`UPDATE "contacts" SET "updatedAt" = $1 WHERE "id" = $2::uuid`, [future, id]),
  );
  return future.getTime();
}

const ms = (iso: string) => new Date(iso).getTime();

describe("timestamps a través del servicio (T1–T7, T9–T11)", () => {
  it("T1 — crear: createdAt = updatedAt", async () => {
    const created = await service.create(input());
    expect(created.updatedAt).toBe(created.createdAt);
  });

  it("T2 — editar name: updatedAt > createdAt y > el anterior", async () => {
    const created = await service.create(input());
    const first = await service.patch(created.id, { name: "Uno" });
    const second = await service.replace(created.id, input({ name: "Dos" }));

    expect(ms(first.updatedAt)).toBeGreaterThan(ms(created.createdAt));
    expect(ms(second.updatedAt)).toBeGreaterThan(ms(first.updatedAt));
    expect(second.createdAt).toBe(created.createdAt);
  });

  it("T3 — alternar favorito: updatedAt idéntico", async () => {
    const created = await service.create(input());
    const on = await service.setFavorite(created.id, { isFavorite: true });
    const off = await service.setFavorite(created.id, { isFavorite: false });
    expect([on.updatedAt, off.updatedAt]).toEqual([created.updatedAt, created.updatedAt]);
  });

  it("T4 — deleteAll: updatedAt intacto en los 3", async () => {
    const created = [
      await service.create(input({ name: "A" })),
      await service.create(input({ name: "B" })),
      await service.create(input({ name: "C" })),
    ];
    await service.deleteAll();

    const { rows } = await client.query<{ id: string; updatedAt: Date }>(
      `SELECT "id", "updatedAt" FROM "contacts" ORDER BY "createdAt", "id"`,
    );
    expect(rows.map((row) => row.updatedAt.toISOString())).toEqual(
      created.map((contact) => contact.updatedAt),
    );
  });

  it("T5 — restaurar: updatedAt intacto", async () => {
    const created = await service.create(input());
    const { batchId } = await service.deleteOne(created.id);
    await service.restore({ batchId });
    expect((await service.get(created.id)).updatedAt).toBe(created.updatedAt);
  });

  it("T6 — UPDATE con los mismos valores: updatedAt intacto", async () => {
    const created = await service.create(input());
    await client.query(
      `UPDATE "contacts" SET "name" = "name", "email" = "email" WHERE "id" = $1::uuid`,
      [created.id],
    );
    await service.replace(created.id, input());
    expect((await service.get(created.id)).updatedAt).toBe(created.updatedAt);
  });

  it("T7 — UPDATE manual de createdAt/updatedAt: se revierte", async () => {
    const created = await service.create(input());
    await client.query(
      `UPDATE "contacts"
          SET "createdAt" = clock_timestamp() - interval '1 year',
              "updatedAt" = clock_timestamp() + interval '1 year'
        WHERE "id" = $1::uuid`,
      [created.id],
    );
    expect(await service.get(created.id)).toEqual(created);
  });

  it("T9 — reloj atrasado: una edición produce exactamente futuro + 1 ms", async () => {
    const created = await service.create(input());
    const future = await pushUpdatedAtIntoFuture(created.id);

    const edited = await service.patch(created.id, { name: "Nombre nuevo" });
    expect(ms(edited.updatedAt)).toBe(future + 1);
  });

  it("T10 — dos ediciones en el mismo ms: updatedAt₂ = updatedAt₁ + 1 ms", async () => {
    const created = await service.create(input());
    const future = await pushUpdatedAtIntoFuture(created.id);

    // Con el valor almacenado por delante del reloj, ambas ediciones caen «en el mismo ms».
    const first = await service.patch(created.id, { name: "Uno" });
    const second = await service.patch(created.id, { name: "Dos" });
    expect(ms(first.updatedAt)).toBe(future + 1);
    expect(ms(second.updatedAt)).toBe(future + 2);
  });

  it("T11 — 50 ediciones: estrictamente creciente en cada paso", async () => {
    const created = await service.create(input());
    let previous = ms(created.updatedAt);

    for (let i = 0; i < 50; i += 1) {
      const edited = await service.patch(created.id, { name: `Edición ${i}` });
      const current = ms(edited.updatedAt);
      expect(current).toBeGreaterThan(previous);
      previous = current;
    }
    expect(await countInvariantViolations()).toBe(0);
  });
});

// Garantías de las propias herramientas de T8: si fallaran, T8 podría dar
// falsos positivos o dejar la base en un estado inconsistente.
describe("herramientas de prueba de T8", () => {
  it("rechaza una operación que termina sin error", async () => {
    await expect(expectTimestampsCheckViolation(client.query("SELECT 1"))).rejects.toThrow(
      /se esperaba que PostgreSQL rechazara la operación/,
    );
  });

  it("rechaza un error de PostgreSQL con otro SQLSTATE", async () => {
    // 22012: division_by_zero.
    await expect(expectTimestampsCheckViolation(client.query("SELECT 1 / 0"))).rejects.toThrow(
      /SQLSTATE/,
    );
  });

  it("rechaza un 23514 de otra restricción", async () => {
    // contacts_deleted_pair_check: deletedAt sin deletedBatchId.
    const id = await insertContact("Elena");
    await expect(
      expectTimestampsCheckViolation(
        client.query(`UPDATE "contacts" SET "deletedAt" = clock_timestamp() WHERE "id" = $1::uuid`, [
          id,
        ]),
      ),
    ).rejects.toThrow(/restricción/);
  });

  it("vuelve a habilitar el trigger aunque la operación falle", async () => {
    const failure = new Error("fallo provocado dentro del bloque");

    await expect(
      withContactsTriggerDisabled(client, async () => {
        expect(await isContactsTriggerEnabled()).toBe(false);
        throw failure;
      }),
    ).rejects.toBe(failure);

    expect(await isContactsTriggerEnabled()).toBe(true);
  });
});
