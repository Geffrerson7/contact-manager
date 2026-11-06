// M3 — Despliegue de demostración de solo lectura, en dos capas:
// 1. Aplicación: `accessMode: "read-only"` rechaza toda escritura antes de tocar la base.
// 2. Base de datos: un rol con solo SELECT y `default_transaction_read_only = on` (el mismo
//    esquema que se propone para Neon) rechaza las escrituras aunque la app esté mal configurada.
//
// El rol se crea únicamente en el PostgreSQL local de pruebas y se elimina al terminar.

import type pg from "pg";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import type { ContactsService } from "@/lib/contacts/service";
import {
  createTestPrisma,
  createTestService,
  expectContactsError,
  input,
} from "./helpers/app";
import {
  connectToTestDatabase,
  getTestDatabaseUrl,
  truncateAll,
} from "./helpers/db";

const RO_ROLE = "contact_manager_test_ro";
const RO_PASSWORD = "contact_manager_test_ro";

let client: pg.Client;
let prisma: PrismaClient;
let writer: ContactsService;

beforeAll(async () => {
  client = await connectToTestDatabase();
  prisma = createTestPrisma();
  writer = createTestService(prisma);
});

afterEach(async () => {
  await truncateAll(client);
});

afterAll(async () => {
  await prisma?.$disconnect();
  await client?.end();
});

/** Estado completo de las tablas, para comprobar que nada cambió. */
async function snapshot() {
  const { rows } = await client.query<{ data: unknown }>(
    `SELECT json_build_object(
       'contacts', (SELECT coalesce(json_agg(c ORDER BY c."id"), '[]') FROM "contacts" c),
       'batches',  (SELECT coalesce(json_agg(b ORDER BY b."id"), '[]') FROM "undo_batches" b),
       'state',    (SELECT coalesce(json_agg(s ORDER BY s."key"), '[]') FROM "system_state" s)
     ) AS "data"`,
  );
  return rows[0]!.data;
}

async function prepareData() {
  const ana = await writer.create(input({ name: "Ana", isFavorite: true }));
  const bruno = await writer.create(input({ name: "Bruno" }));
  const { batchId } = await writer.deleteOne(bruno.id);
  // Lote expirado hace 20 min: una purga lo eliminaría.
  await client.query(
    `UPDATE "undo_batches"
        SET "createdAt" = clock_timestamp() - interval '21 minutes',
            "expiresAt" = clock_timestamp() - interval '20 minutes'
      WHERE "id" = $1::uuid`,
    [batchId],
  );
  return { ana, batchId: batchId! };
}

/** Todas las escrituras del servicio, con entradas válidas e inválidas. */
function writeAttempts(service: ContactsService, id: string, batchId: string) {
  return {
    "create válido": () => service.create(input()),
    "create inválido": () => service.create({ name: "" }),
    "create con isDemo/accessMode del cliente": () =>
      service.create({ ...input(), isDemo: false, accessMode: "read-write" }),
    "replace (PUT)": () => service.replace(id, input({ name: "X" })),
    "patch (PATCH)": () => service.patch(id, { name: "X" }),
    "patch vacío": () => service.patch(id, {}),
    "patch con id inválido": () => service.patch("no-es-uuid", { name: "X" }),
    "setFavorite (PATCH /favorite)": () =>
      service.setFavorite(id, { isFavorite: false }),
    "deleteOne (DELETE)": () => service.deleteOne(id),
    "deleteAll (DELETE)": () => service.deleteAll(),
    "restore (POST)": () => service.restore({ batchId }),
    purge: () => service.purge(),
  } satisfies Record<string, () => Promise<unknown>>;
}

describe("capa 1 — servicio en modo read-only", () => {
  it("rechaza todas las escrituras con READ_ONLY sin modificar la base", async () => {
    const { ana, batchId } = await prepareData();
    const before = await snapshot();
    const demo = createTestService(prisma, { accessMode: "read-only" });

    for (const [label, attempt] of Object.entries(
      writeAttempts(demo, ana.id, batchId),
    )) {
      const error = await expectContactsError(attempt(), "READ_ONLY");
      expect(error.message, label).toBe(
        "Esta demostración es de solo lectura.",
      );
    }

    expect(await snapshot()).toEqual(before);
  });

  it("permite las lecturas y no purga al leer", async () => {
    const { ana } = await prepareData();
    const before = await snapshot();
    const demo = createTestService(prisma, { accessMode: "read-only" });

    expect(demo.accessMode).toBe("read-only");
    expect((await demo.list({ q: "", onlyFavorites: false })).contacts).toEqual(
      [ana],
    );
    expect(await demo.get(ana.id)).toEqual(ana);
    expect(
      (await demo.getDetail(ana.id, { q: "", onlyFavorites: true })).contact,
    ).toEqual(ana);

    // El lote expirado sigue ahí: una lectura nunca escribe.
    expect(await snapshot()).toEqual(before);
  });
});

describe("capa 2 — rol de base de datos de solo lectura", () => {
  let readOnlyPrisma: PrismaClient;

  beforeAll(async () => {
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${RO_ROLE}') THEN
          CREATE ROLE ${RO_ROLE} LOGIN PASSWORD '${RO_PASSWORD}';
        END IF;
      END $$`);
    await client.query(
      `ALTER ROLE ${RO_ROLE} SET default_transaction_read_only = on`,
    );
    await client.query(
      `GRANT CONNECT ON DATABASE contact_manager_test TO ${RO_ROLE}`,
    );
    await client.query(`GRANT USAGE ON SCHEMA public TO ${RO_ROLE}`);
    await client.query(
      `GRANT SELECT ON ALL TABLES IN SCHEMA public TO ${RO_ROLE}`,
    );

    const url = new URL(getTestDatabaseUrl());
    url.username = RO_ROLE;
    url.password = RO_PASSWORD;
    readOnlyPrisma = createTestPrisma(url.toString());
  });

  afterAll(async () => {
    await readOnlyPrisma?.$disconnect();
    await client.query(
      `REVOKE ALL ON ALL TABLES IN SCHEMA public FROM ${RO_ROLE}`,
    );
    await client.query(`REVOKE ALL ON SCHEMA public FROM ${RO_ROLE}`);
    await client.query(
      `REVOKE ALL ON DATABASE contact_manager_test FROM ${RO_ROLE}`,
    );
    await client.query(`DROP ROLE IF EXISTS ${RO_ROLE}`);
  });

  it("aunque la app esté mal configurada en read-write, la base rechaza cada escritura", async () => {
    const { ana, batchId } = await prepareData();
    const before = await snapshot();
    const misconfigured = createTestService(readOnlyPrisma, {
      accessMode: "read-write",
    });

    const attempts = writeAttempts(misconfigured, ana.id, batchId);
    for (const label of [
      "create válido",
      "replace (PUT)",
      "patch (PATCH)",
      "setFavorite (PATCH /favorite)",
      "deleteOne (DELETE)",
      "deleteAll (DELETE)",
      "restore (POST)",
      "purge",
    ] as const) {
      const error = await expectContactsError(attempts[label](), "READ_ONLY");
      expect(error.cause, label).toBeDefined();
    }

    expect(await snapshot()).toEqual(before);
  });

  it("las lecturas funcionan aunque la purga oportunista falle", async () => {
    const { ana } = await prepareData();
    const before = await snapshot();
    const misconfigured = createTestService(readOnlyPrisma, {
      accessMode: "read-write",
    });

    expect(
      (await misconfigured.list({ q: "", onlyFavorites: false })).contacts,
    ).toEqual([ana]);
    expect(await snapshot()).toEqual(before);
  });
});
