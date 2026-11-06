// Timestamps (§6, §14.6). En M1 solo se implementa T8; T1–T7 y T9–T11 se
// añaden en M3, cuando existan el repositorio y el servicio.

import pg from "pg";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { connectToTestDatabase, truncateAll, withContactsTriggerDisabled } from "./helpers/db";

const CHECK_VIOLATION = "23514";
const TIMESTAMPS_CHECK = "contacts_timestamps_check";

let client: pg.Client;

beforeAll(async () => {
  client = await connectToTestDatabase();
});

afterEach(async () => {
  await truncateAll(client);
});

afterAll(async () => {
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
