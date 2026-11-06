// M3 — Borrado lógico, deshacer y restauración (§11, §14.5, §14.8).

import type pg from "pg";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { UNDO_WINDOW_SECONDS } from "@/lib/contacts/constants";
import type { ContactsService } from "@/lib/contacts/service";
import type { Contact } from "@/lib/contacts/types";
import {
  createTestPrisma,
  createTestService,
  expectContactsError,
  input,
} from "./helpers/app";
import { connectToTestDatabase, truncateAll } from "./helpers/db";

const UNKNOWN_ID = "6f1c2a9e-3b4d-4c8a-9f21-7d5e8b0a1c34";

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

async function createThree(): Promise<Contact[]> {
  return [
    await service.create(input({ name: "Ana", isFavorite: true })),
    await service.create(input({ name: "Bruno" })),
    await service.create(input({ name: "Carla", isFavorite: true })),
  ];
}

interface BatchRow {
  scope: string;
  contactCount: number;
  restoredAt: Date | null;
  windowMs: number;
}

async function readBatch(batchId: string): Promise<BatchRow | undefined> {
  const { rows } = await client.query<BatchRow>(
    `SELECT "scope", "contactCount", "restoredAt",
            (extract(epoch FROM "expiresAt" - "createdAt") * 1000)::int AS "windowMs"
       FROM "undo_batches" WHERE "id" = $1::uuid`,
    [batchId],
  );
  return rows[0];
}

/** Mueve la ventana del lote al pasado (respeta el CHECK expiresAt > createdAt). */
async function expireBatch(batchId: string, minutesAgo = 1): Promise<void> {
  await client.query(
    `UPDATE "undo_batches"
        SET "createdAt" = clock_timestamp() - make_interval(mins => $2::int + 1),
            "expiresAt" = clock_timestamp() - make_interval(mins => $2::int)
      WHERE "id" = $1::uuid`,
    [batchId, minutesAgo],
  );
}

/** Invariantes §5.5 (1, 2, 6): sin activos con lote, sin borrados sin lote, conteos coherentes. */
async function expectInvariants(): Promise<void> {
  const { rows } = await client.query<{ violations: number }>(
    `SELECT (
       (SELECT count(*) FROM "contacts" WHERE ("deletedAt" IS NULL) <> ("deletedBatchId" IS NULL))
     + (SELECT count(*) FROM "undo_batches" b
         WHERE b."restoredAt" IS NULL
           AND b."contactCount" <> (SELECT count(*) FROM "contacts" c WHERE c."deletedBatchId" = b."id"))
     + (SELECT count(*) FROM "contacts" WHERE "updatedAt" < "createdAt")
     )::int AS "violations"`,
  );
  expect(rows[0]!.violations).toBe(0);
}

describe("deleteOne", () => {
  it("borra lógicamente con un lote ONE de 5 s y lo oculta", async () => {
    const [ana, bruno] = await createThree();
    const result = await service.deleteOne(ana!.id.toUpperCase());

    expect(result.count).toBe(1);
    expect(result.batchId).toMatch(/^[0-9a-f-]{36}$/);
    expect(new Date(result.expiresAt!).getTime()).toBeGreaterThan(
      Date.now() - 1000,
    );
    expect(await readBatch(result.batchId!)).toMatchObject({
      scope: "ONE",
      contactCount: 1,
      restoredAt: null,
      windowMs: UNDO_WINDOW_SECONDS * 1000,
    });

    const { rows } = await client.query<{ deletedBatchId: string | null }>(
      `SELECT "deletedBatchId" FROM "contacts" WHERE "id" = $1::uuid AND "deletedAt" IS NOT NULL`,
      [ana!.id],
    );
    expect(rows).toEqual([{ deletedBatchId: result.batchId }]);
    expect(
      (await service.list({ q: "", onlyFavorites: false })).contacts[0],
    ).toEqual(bruno);
    await expectInvariants();
  });

  it("responde NOT_FOUND sin crear lote si no existe o ya está borrado", async () => {
    const [ana] = await createThree();
    await service.deleteOne(ana!.id);

    await expectContactsError(service.deleteOne(ana!.id), "NOT_FOUND");
    await expectContactsError(service.deleteOne(UNKNOWN_ID), "NOT_FOUND");
    const { rows } = await client.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM "undo_batches"`,
    );
    expect(rows[0]!.n).toBe(1);
  });

  it("responde INVALID_ID", async () => {
    await expectContactsError(service.deleteOne("no-es-uuid"), "INVALID_ID");
  });
});

describe("deleteAll", () => {
  it("borra todos los activos en un lote ALL", async () => {
    await createThree();
    const result = await service.deleteAll();

    expect(result.count).toBe(3);
    expect(await readBatch(result.batchId!)).toMatchObject({
      scope: "ALL",
      contactCount: 3,
    });
    expect((await service.list({ q: "", onlyFavorites: false })).total).toBe(0);
    await expectInvariants();
  });

  it("no incluye contactos que ya estaban borrados en otro lote", async () => {
    const [ana] = await createThree();
    const one = await service.deleteOne(ana!.id);
    const all = await service.deleteAll();

    expect(all.count).toBe(2);
    expect(await readBatch(one.batchId!)).toMatchObject({ contactCount: 1 });
    await expectInvariants();
  });

  it("sin contactos activos devuelve el resultado vacío y no crea lote", async () => {
    expect(await service.deleteAll()).toEqual({
      count: 0,
      batchId: null,
      expiresAt: null,
    });
    const { rows } = await client.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM "undo_batches"`,
    );
    expect(rows[0]!.n).toBe(0);
  });
});

describe("restore", () => {
  it("restaura dentro de la ventana conservando id, orden, favorito y timestamps", async () => {
    const created = await createThree();
    const { batchId } = await service.deleteAll();

    expect(await service.restore({ batchId })).toEqual({
      restored: 3,
      status: "restored",
    });
    expect(
      (await service.list({ q: "", onlyFavorites: false })).contacts,
    ).toEqual(created);
    expect((await readBatch(batchId!))?.restoredAt).toBeInstanceOf(Date);
    await expectInvariants();
  });

  it("acepta el batchId en mayúsculas", async () => {
    const [ana] = await createThree();
    const { batchId } = await service.deleteOne(ana!.id);
    expect(await service.restore({ batchId: batchId!.toUpperCase() })).toEqual({
      restored: 1,
      status: "restored",
    });
  });

  it("una segunda restauración responde already_restored sin sobrescribir restoredAt", async () => {
    const [ana] = await createThree();
    const { batchId } = await service.deleteOne(ana!.id);
    await service.restore({ batchId });
    const before = (await readBatch(batchId!))!.restoredAt;

    expect(await service.restore({ batchId })).toEqual({
      restored: 0,
      status: "already_restored",
    });
    expect((await readBatch(batchId!))!.restoredAt).toEqual(before);
  });

  it("un lote expirado responde UNDO_EXPIRED y no restaura", async () => {
    const [ana] = await createThree();
    const { batchId } = await service.deleteOne(ana!.id);
    await expireBatch(batchId!);

    await expectContactsError(service.restore({ batchId }), "UNDO_EXPIRED");
    expect((await readBatch(batchId!))!.restoredAt).toBeNull();
    await expectContactsError(service.get(ana!.id), "NOT_FOUND");
  });

  it("un lote inexistente responde UNDO_NOT_FOUND", async () => {
    await expectContactsError(
      service.restore({ batchId: UNKNOWN_ID }),
      "UNDO_NOT_FOUND",
    );
  });

  it.each([null, {}, { batchId: "x" }, { batchId: 1 }, [UNKNOWN_ID]])(
    "un batchId inválido (%j) responde INVALID_ID",
    async (body) => {
      await expectContactsError(service.restore(body), "INVALID_ID");
    },
  );
});
