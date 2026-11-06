// M3 — UNDO_INCONSISTENT (§11.4, §14.10: C5, variante inversa y C5-bis).
// La inconsistencia se inyecta con un UPDATE directo; no hay hooks ni ramas de producción.

import type pg from "pg";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { UndoInconsistentError } from "@/lib/contacts/errors";
import type { ContactsService } from "@/lib/contacts/service";
import type { Contact } from "@/lib/contacts/types";
import {
  createTestPrisma,
  createTestService,
  expectContactsError,
  input,
} from "./helpers/app";
import { connectToTestDatabase, truncateAll } from "./helpers/db";

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

async function deleteThree(): Promise<{ created: Contact[]; batchId: string }> {
  const created = [
    await service.create(input({ name: "A", isFavorite: true })),
    await service.create(input({ name: "B" })),
    await service.create(input({ name: "C" })),
  ];
  const { batchId } = await service.deleteAll();
  return { created, batchId: batchId! };
}

async function setContactCount(batchId: string, count: number): Promise<void> {
  await client.query(
    `UPDATE "undo_batches" SET "contactCount" = $2 WHERE "id" = $1::uuid`,
    [batchId, count],
  );
}

async function state(batchId: string) {
  const { rows } = await client.query<{
    restoredAt: Date | null;
    deleted: number;
    active: number;
  }>(
    `SELECT (SELECT "restoredAt" FROM "undo_batches" WHERE "id" = $1::uuid) AS "restoredAt",
            (SELECT count(*)::int FROM "contacts" WHERE "deletedBatchId" = $1::uuid) AS "deleted",
            (SELECT count(*)::int FROM "contacts" WHERE "deletedAt" IS NULL) AS "active"`,
    [batchId],
  );
  return rows[0]!;
}

describe("C5 — restauración con contactCount inconsistente", () => {
  it.each([
    ["mayor (5 declarados, 3 vinculados)", 5],
    ["menor (2 declarados, 3 vinculados)", 2],
  ])(
    "contactCount %s → UNDO_INCONSISTENT con rollback completo",
    async (_label, count) => {
      const { created, batchId } = await deleteThree();
      await setContactCount(batchId, count);

      const error = await expectContactsError(
        service.restore({ batchId }),
        "UNDO_INCONSISTENT",
      );
      expect(error).toBeInstanceOf(UndoInconsistentError);
      expect(error.details).toEqual({ batchId, expected: count, actual: 3 });

      // Ni restoredAt ni contactos: no hubo restauración parcial y el lote sigue existiendo.
      expect(await state(batchId)).toEqual({
        restoredAt: null,
        deleted: 3,
        active: 0,
      });

      // Cierre: reparar y reintentar deja los 3 activos con sus datos originales.
      await setContactCount(batchId, 3);
      expect(await service.restore({ batchId })).toEqual({
        restored: 3,
        status: "restored",
      });
      expect(
        (await service.list({ q: "", onlyFavorites: false })).contacts,
      ).toEqual(created);
    },
  );
});

describe("C5-bis — integridad pura en SQL", () => {
  it("el ROLLBACK revierte el claim y la restauración", async () => {
    const { batchId } = await deleteThree();
    await setContactCount(batchId, 5);

    await client.query("BEGIN");
    try {
      const claim = await client.query<{ contactCount: number }>(
        `UPDATE "undo_batches" SET "restoredAt" = clock_timestamp()
          WHERE "id" = $1::uuid AND "restoredAt" IS NULL AND "expiresAt" > clock_timestamp()
        RETURNING "contactCount"`,
        [batchId],
      );
      const restored = await client.query(
        `UPDATE "contacts" SET "deletedAt" = NULL, "deletedBatchId" = NULL
          WHERE "deletedBatchId" = $1::uuid AND "deletedAt" IS NOT NULL`,
        [batchId],
      );
      expect(claim.rows[0]!.contactCount).toBe(5);
      expect(restored.rowCount).toBe(3);
    } finally {
      await client.query("ROLLBACK");
    }

    expect(await state(batchId)).toEqual({
      restoredAt: null,
      deleted: 3,
      active: 0,
    });
  });
});
