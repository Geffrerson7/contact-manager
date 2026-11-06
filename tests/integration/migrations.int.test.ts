// M1 — Las migraciones se aplican desde una base vacía (globalSetup) y dejan
// el esquema, los CHECK y el trigger que exige la arquitectura (§5, §14.5).

import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { connectToTestDatabase } from "./helpers/db";

let client: pg.Client;

beforeAll(async () => {
  client = await connectToTestDatabase();
});

afterAll(async () => {
  await client?.end();
});

describe("migraciones de Prisma", () => {
  it("aplica exactamente 0001–0004, sin fallos ni reversiones", async () => {
    const { rows } = await client.query<{
      migration_name: string;
      finished: boolean;
      rolled_back: boolean;
    }>(
      `SELECT "migration_name",
              "finished_at" IS NOT NULL AS "finished",
              "rolled_back_at" IS NOT NULL AS "rolled_back"
         FROM "_prisma_migrations"
        ORDER BY "migration_name"`,
    );

    expect(rows).toEqual([
      { migration_name: "0001_init", finished: true, rolled_back: false },
      { migration_name: "0002_undo_integrity", finished: true, rolled_back: false },
      { migration_name: "0003_contact_timestamps", finished: true, rolled_back: false },
      { migration_name: "0004_contactable_check", finished: true, rolled_back: false },
    ]);
  });

  it("crea los CHECK de integridad (§5.2), timestamps (§5.3) y medio de contacto (§5.4)", async () => {
    const { rows } = await client.query<{ name: string; table: string; definition: string }>(
      `SELECT "conname" AS "name",
              "conrelid"::regclass::text AS "table",
              pg_get_constraintdef("oid") AS "definition"
         FROM pg_constraint
        WHERE "contype" = 'c'
          AND "connamespace" = 'public'::regnamespace
        ORDER BY "conname"`,
    );

    // Lista exacta: cualquier CHECK de más o de menos hace fallar la prueba.
    expect(rows).toEqual([
      {
        name: "contacts_contactable_check",
        table: "contacts",
        definition:
          "CHECK ((((email)::text <> ''::text) OR ((phone)::text <> ''::text)))",
      },
      {
        name: "contacts_deleted_pair_check",
        table: "contacts",
        definition: 'CHECK ((("deletedAt" IS NULL) = ("deletedBatchId" IS NULL)))',
      },
      {
        name: "contacts_timestamps_check",
        table: "contacts",
        definition: 'CHECK (("updatedAt" >= "createdAt"))',
      },
      {
        name: "undo_batches_count_check",
        table: "undo_batches",
        definition: 'CHECK (("contactCount" > 0))',
      },
      {
        name: "undo_batches_window_check",
        table: "undo_batches",
        definition: 'CHECK (("expiresAt" > "createdAt"))',
      },
    ]);
  });

  it("crea el trigger BEFORE UPDATE de contactos, habilitado", async () => {
    const { rows } = await client.query<{ name: string; enabled: string; definition: string }>(
      `SELECT "tgname" AS "name",
              "tgenabled" AS "enabled",
              pg_get_triggerdef("oid") AS "definition"
         FROM pg_trigger
        WHERE "tgrelid" = '"contacts"'::regclass
          AND NOT "tgisinternal"`,
    );

    expect(rows).toEqual([
      {
        name: "contacts_before_update",
        enabled: "O", // habilitado en modo normal
        definition:
          "CREATE TRIGGER contacts_before_update BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION contacts_before_update()",
      },
    ]);
  });

  it("define todas las columnas temporales como timestamptz(3), con valor por defecto en la base", async () => {
    const { rows } = await client.query<{
      table: string;
      column: string;
      type: string;
      precision: number;
      default: string | null;
    }>(
      `SELECT "table_name" AS "table",
              "column_name" AS "column",
              "data_type" AS "type",
              "datetime_precision" AS "precision",
              "column_default" AS "default"
         FROM information_schema.columns
        WHERE "table_schema" = 'public'
          AND "table_name" IN ('contacts', 'undo_batches', 'system_state')
          AND "data_type" LIKE 'timestamp%'
        ORDER BY "table_name", "column_name"`,
    );

    const tz = "timestamp with time zone";
    const now = "CURRENT_TIMESTAMP";

    expect(rows).toEqual([
      { table: "contacts", column: "createdAt", type: tz, precision: 3, default: now },
      { table: "contacts", column: "deletedAt", type: tz, precision: 3, default: null },
      { table: "contacts", column: "updatedAt", type: tz, precision: 3, default: now },
      { table: "system_state", column: "updatedAt", type: tz, precision: 3, default: now },
      { table: "undo_batches", column: "createdAt", type: tz, precision: 3, default: now },
      { table: "undo_batches", column: "expiresAt", type: tz, precision: 3, default: null },
      { table: "undo_batches", column: "restoredAt", type: tz, precision: 3, default: null },
    ]);
  });
});
