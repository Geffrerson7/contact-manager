// M3 — Purga de lotes (§11.5, §14.5, §14.8).

import type pg from "pg";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { PURGE_THROTTLE_MS, WRITE_MUTEX_KEY } from "@/lib/contacts/constants";
import type { ContactsService } from "@/lib/contacts/service";
import {
  createTestPrisma,
  createTestService,
  expectContactsError,
  input,
} from "./helpers/app";
import {
  openTestConnection,
  waitUntilBlockedBy,
  type TestConnection,
} from "./helpers/concurrency";
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

/** Lote sin restaurar cuya ventana terminó hace `minutes` minutos. */
async function expireBatch(batchId: string, minutes: number): Promise<void> {
  await client.query(
    `UPDATE "undo_batches"
        SET "createdAt" = clock_timestamp() - make_interval(mins => $2::int + 1),
            "expiresAt" = clock_timestamp() - make_interval(mins => $2::int)
      WHERE "id" = $1::uuid`,
    [batchId, minutes],
  );
}

/** Lote restaurado hace `hours` horas. */
async function ageRestoredBatch(batchId: string, hours: number): Promise<void> {
  await client.query(
    `UPDATE "undo_batches"
        SET "createdAt" = clock_timestamp() - make_interval(hours => $2::int + 1),
            "expiresAt" = clock_timestamp() - make_interval(hours => $2::int + 1)
                          + interval '5 seconds',
            "restoredAt" = clock_timestamp() - make_interval(hours => $2::int)
      WHERE "id" = $1::uuid`,
    [batchId, hours],
  );
}

async function counts() {
  const { rows } = await client.query<{ contacts: number; batches: number }>(
    `SELECT (SELECT count(*)::int FROM "contacts") AS "contacts",
            (SELECT count(*)::int FROM "undo_batches") AS "batches"`,
  );
  return rows[0]!;
}

describe("purge sin concurrencia", () => {
  it("elimina el lote expirado hace 20 min y sus contactos; los activos quedan intactos", async () => {
    const active = await service.create(input({ name: "Activo" }));
    const doomed = await service.create(input({ name: "Borrado" }));
    const { batchId } = await service.deleteOne(doomed.id);
    await expireBatch(batchId!, 20);

    expect(await service.purge()).toEqual({ acquired: true, batches: 1 });
    expect(await counts()).toEqual({ contacts: 1, batches: 0 });
    expect(await service.get(active.id)).toEqual(active);
    await expectContactsError(service.restore({ batchId }), "UNDO_NOT_FOUND");
  });

  it("conserva los lotes dentro del margen de 10 min y los restaurados de menos de 24 h", async () => {
    const recent = await service.create(input({ name: "Reciente" }));
    const restored = await service.create(input({ name: "Restaurado" }));
    const recentBatch = await service.deleteOne(recent.id);
    const restoredBatch = await service.deleteOne(restored.id);
    await service.restore({ batchId: restoredBatch.batchId });
    await expireBatch(recentBatch.batchId!, 5);
    await ageRestoredBatch(restoredBatch.batchId!, 23);

    expect(await service.purge()).toEqual({ acquired: true, batches: 0 });
    expect(await counts()).toEqual({ contacts: 2, batches: 2 });
  });

  it("elimina los lotes restaurados de más de 24 h sin tocar sus contactos", async () => {
    const contact = await service.create(input());
    const { batchId } = await service.deleteOne(contact.id);
    await service.restore({ batchId });
    await ageRestoredBatch(batchId!, 25);

    expect(await service.purge()).toEqual({ acquired: true, batches: 1 });
    expect(await counts()).toEqual({ contacts: 1, batches: 0 });
    expect(await service.get(contact.id)).toEqual(contact);
  });
});

describe("purga oportunista al leer (§3.3)", () => {
  it("purga antes de listar, con throttle de 1 min por proceso", async () => {
    let clock = 0;
    const lazy = createTestService(prisma, { now: () => clock });

    const first = await service.create(input({ name: "Uno" }));
    const second = await service.create(input({ name: "Dos" }));
    const b1 = await service.deleteOne(first.id);
    await expireBatch(b1.batchId!, 20);

    await lazy.list({ q: "", onlyFavorites: false });
    expect(await counts()).toEqual({ contacts: 1, batches: 0 });

    const b2 = await service.deleteOne(second.id);
    await expireBatch(b2.batchId!, 20);

    clock += PURGE_THROTTLE_MS - 1;
    await lazy.list({ q: "", onlyFavorites: false });
    expect((await counts()).batches).toBe(1);

    clock += 1;
    await lazy.get(first.id).catch(() => undefined);
    expect(await counts()).toEqual({ contacts: 0, batches: 0 });
  });
});

describe("purga concurrente (§14.8)", () => {
  let holder: TestConnection;
  let observer: TestConnection;

  beforeAll(async () => {
    holder = await openTestConnection("purge-holder");
    observer = await openTestConnection("purge-observer");
  });

  afterAll(async () => {
    await holder?.close();
    await observer?.close();
  });

  it("R4: si otro escritor estructural tiene el mutex, la pasada se omite", async () => {
    const contact = await service.create(input());
    const { batchId } = await service.deleteOne(contact.id);
    await expireBatch(batchId!, 20);

    await holder.query("BEGIN");
    try {
      await holder.query(`SELECT pg_advisory_xact_lock($1::int4)`, [
        WRITE_MUTEX_KEY,
      ]);
      expect(await service.purge()).toEqual({ acquired: false, batches: 0 });
    } finally {
      await holder.query("ROLLBACK");
    }
    expect((await counts()).batches).toBe(1);
    expect(await service.purge()).toEqual({ acquired: true, batches: 1 });
  });

  it("EvalPlanQual: un lote reclamado mientras el DELETE espera no se purga", async () => {
    const contact = await service.create(input());
    const { batchId } = await service.deleteOne(contact.id);
    await expireBatch(batchId!, 20);

    // SQL puro (sin mutex): el DELETE se bloquea en la fila y re-evalúa la condición.
    await holder.query("BEGIN");
    await holder.query(
      `UPDATE "undo_batches" SET "restoredAt" = clock_timestamp() WHERE "id" = $1::uuid`,
      [batchId],
    );

    const purging = observer.query(
      `DELETE FROM "undo_batches"
        WHERE "restoredAt" IS NULL AND "expiresAt" < clock_timestamp() - interval '10 minutes'
       RETURNING "id"`,
    );
    const watcher = await openTestConnection("purge-watcher");
    try {
      await waitUntilBlockedBy(watcher, observer.pid, holder.pid);
    } finally {
      await watcher.close();
    }
    await holder.query("COMMIT");

    expect(await purging).toEqual([]);
    const { rows } = await client.query<{ restored: boolean }>(
      `SELECT "restoredAt" IS NOT NULL AS "restored" FROM "undo_batches" WHERE "id" = $1::uuid`,
      [batchId],
    );
    expect(rows).toEqual([{ restored: true }]);
  });
});
