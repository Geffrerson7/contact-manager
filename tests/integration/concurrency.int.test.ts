// M3 — Concurrencia de las escrituras estructurales (§7, §14.7 C4, §14.8).
// C1–C3 (seed ↔ deleteAll) llegan con el seed en M7.
//
// Coordinación por hooks (§14.4) y detección de bloqueos por PostgreSQL: nunca por tiempo.

import type pg from "pg";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { WRITE_MUTEX_KEY } from "@/lib/contacts/constants";
import type { ContactsService } from "@/lib/contacts/service";
import {
  createTestPrisma,
  createTestService,
  expectContactsError,
  input,
} from "./helpers/app";
import {
  deferred,
  openTestConnection,
  waitUntilBlockedBy,
  waitUntilBlockedOnAdvisoryLock,
  type TestConnection,
} from "./helpers/concurrency";
import { connectToTestDatabase, truncateAll } from "./helpers/db";

let client: pg.Client;
let prisma: PrismaClient;
let service: ContactsService;
let observer: TestConnection;

beforeAll(async () => {
  client = await connectToTestDatabase();
  prisma = createTestPrisma();
  service = createTestService(prisma);
  observer = await openTestConnection("observer");
});

afterEach(async () => {
  await truncateAll(client);
});

afterAll(async () => {
  await observer?.close();
  await prisma?.$disconnect();
  await client?.end();
});

describe("C4 — deleteAll frente a un escritor ordinario", () => {
  it("el INSERT espera en SHARE (no en el mutex), termina tras el COMMIT y queda fuera del lote", async () => {
    await service.create(input({ name: "A" }));
    await service.create(input({ name: "B" }));

    const pid = deferred<number>();
    const snapshotTaken = deferred();
    const hold = deferred();
    const deleting = createTestService(prisma, {
      hooks: {
        onStart: async (ctx) => pid.resolve(ctx.pid),
        afterDeleteAllSnapshot: async () => {
          snapshotTaken.resolve();
          await hold.promise;
        },
      },
    });

    const writer = await openTestConnection("c4-writer");
    try {
      const deleteAll = deleting.deleteAll();
      const deletePid = await pid.promise;
      await snapshotTaken.promise;

      const insert = writer.query<{ id: string }>(
        `INSERT INTO "contacts" ("id", "name", "email", "role")
         VALUES (gen_random_uuid(), 'Nuevo', 'nuevo@example.com', 'Amigo') RETURNING "id"`,
      );
      await waitUntilBlockedBy(observer, writer.pid, deletePid);

      // Bloqueado por la tabla, no por el mutex: el escritor ordinario no lo toma (R3).
      const advisoryWaits = await observer.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM pg_locks
          WHERE pid = $1 AND locktype = 'advisory' AND NOT granted`,
        [writer.pid],
      );
      expect(advisoryWaits[0]!.n).toBe(0);

      hold.resolve();
      const result = await deleteAll;
      const [inserted] = await insert;

      expect(result.count).toBe(2);
      const { rows } = await client.query<{ deletedBatchId: string | null }>(
        `SELECT "deletedBatchId" FROM "contacts" WHERE "id" = $1::uuid`,
        [inserted!.id],
      );
      expect(rows).toEqual([{ deletedBatchId: null }]);
      expect((await service.list({ q: "", onlyFavorites: false })).total).toBe(
        1,
      );
    } finally {
      hold.resolve();
      await writer.close();
    }
  });
});

describe("mutex estructural (R1)", () => {
  it("deleteOne y restore se serializan: el segundo espera el mutex sin bloqueos tomados", async () => {
    const ana = await service.create(input({ name: "Ana" }));
    const bruno = await service.create(input({ name: "Bruno" }));
    const { batchId } = await service.deleteOne(ana.id);

    const mutexTaken = deferred();
    const hold = deferred();
    const deleting = createTestService(prisma, {
      hooks: {
        onStart: async () => undefined,
        afterMutex: async () => {
          mutexTaken.resolve();
          await hold.promise;
        },
      },
    });
    const restorePid = deferred<number>();
    const restoring = createTestService(prisma, {
      hooks: { onStart: async (ctx) => restorePid.resolve(ctx.pid) },
    });

    try {
      const deleteBruno = deleting.deleteOne(bruno.id);
      await mutexTaken.promise;

      const restoreAna = restoring.restore({ batchId });
      await waitUntilBlockedOnAdvisoryLock(observer, await restorePid.promise);

      hold.resolve();
      expect((await deleteBruno).count).toBe(1);
      expect(await restoreAna).toEqual({ restored: 1, status: "restored" });
    } finally {
      hold.resolve();
    }

    const names = (
      await service.list({ q: "", onlyFavorites: false })
    ).contacts.map((contact) => contact.name);
    expect(names).toEqual(["Ana"]);
  });

  it("dos restauraciones concurrentes: restored 1 y already_restored", async () => {
    const ana = await service.create(input());
    const { batchId } = await service.deleteOne(ana.id);

    const claimed = deferred();
    const hold = deferred();
    const first = createTestService(prisma, {
      hooks: {
        afterRestoreClaim: async () => {
          claimed.resolve();
          await hold.promise;
        },
      },
    });
    const secondPid = deferred<number>();
    const second = createTestService(prisma, {
      hooks: { onStart: async (ctx) => secondPid.resolve(ctx.pid) },
    });

    try {
      const firstRestore = first.restore({ batchId });
      await claimed.promise;
      const secondRestore = second.restore({ batchId });
      await waitUntilBlockedOnAdvisoryLock(observer, await secondPid.promise);

      hold.resolve();
      expect(await firstRestore).toEqual({ restored: 1, status: "restored" });
      expect(await secondRestore).toEqual({
        restored: 0,
        status: "already_restored",
      });
    } finally {
      hold.resolve();
    }
  });

  it("si el mutex no se libera en 3 s, la escritura responde CONFLICT sin escribir", async () => {
    const ana = await service.create(input());
    const holder = await openTestConnection("mutex-holder");
    try {
      await holder.query("BEGIN");
      await holder.query(`SELECT pg_advisory_xact_lock($1::int4)`, [
        WRITE_MUTEX_KEY,
      ]);

      await expectContactsError(service.deleteOne(ana.id), "CONFLICT");
      await expectContactsError(service.deleteAll(), "CONFLICT");
    } finally {
      await holder.query("ROLLBACK");
      await holder.close();
    }

    expect(await service.get(ana.id)).toEqual(ana);
    const { rows } = await client.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM "undo_batches"`,
    );
    expect(rows[0]!.n).toBe(0);
  }, 20_000);
});
