// Arnés de concurrencia (§14.3): conexiones reales, coordinación explícita y detección de
// bloqueos por PostgreSQL. Sin `sleep` como sincronización: solo polling de condiciones.

import pg from "pg";
import { getTestDatabaseUrl } from "./db";

export interface TestConnection {
  client: pg.Client;
  pid: number;
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
  close(): Promise<void>;
}

export async function openTestConnection(
  name: string,
): Promise<TestConnection> {
  const client = new pg.Client({
    connectionString: getTestDatabaseUrl(),
    application_name: `int:${name}`,
  });
  await client.connect();
  await client.query(`SET statement_timeout = '10s'`);
  await client.query(`SET lock_timeout = '10s'`);
  const { rows } = await client.query<{ pid: number }>(
    `SELECT pg_backend_pid() AS pid`,
  );

  return {
    client,
    pid: rows[0]!.pid,
    async query<T>(sql: string, params: unknown[] = []) {
      const result = await client.query(sql, params);
      return result.rows as T[];
    },
    close: () => client.end(),
  };
}

export function deferred<T = void>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

async function pollUntil(
  check: () => Promise<boolean>,
  message: string,
  timeoutMs: number,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error(`Timeout: ${message}`);
}

export function waitUntilBlockedBy(
  observer: TestConnection,
  blockedPid: number,
  blockerPid: number,
  timeoutMs = 5000,
): Promise<void> {
  return pollUntil(
    async () => {
      const rows = await observer.query<{ blocked: boolean }>(
        `SELECT $1::int = ANY(pg_blocking_pids($2::int)) AS blocked`,
        [blockerPid, blockedPid],
      );
      return rows[0]?.blocked === true;
    },
    `el backend ${blockedPid} no quedó bloqueado por ${blockerPid}`,
    timeoutMs,
  );
}

export function waitUntilBlockedOnAdvisoryLock(
  observer: TestConnection,
  pid: number,
  timeoutMs = 5000,
): Promise<void> {
  return pollUntil(
    async () => {
      const rows = await observer.query<{ ok: boolean }>(
        `SELECT EXISTS (
           SELECT 1 FROM pg_locks
            WHERE locktype = 'advisory' AND NOT granted AND pid = $1
         ) AS ok`,
        [pid],
      );
      return rows[0]?.ok === true;
    },
    `el backend ${pid} no quedó esperando el mutex`,
    timeoutMs,
  );
}

/** Espera a que una conexión identificada por `application_name` quede bloqueada. */
export function waitUntilAppBlocked(
  observer: TestConnection,
  blockerPid: number,
  timeoutMs = 5000,
): Promise<void> {
  return pollUntil(
    async () => {
      const rows = await observer.query<{ ok: boolean }>(
        `SELECT EXISTS (
           SELECT 1 FROM pg_stat_activity
            WHERE $1::int = ANY(pg_blocking_pids(pid))
         ) AS ok`,
        [blockerPid],
      );
      return rows[0]?.ok === true;
    },
    `ningún backend quedó bloqueado por ${blockerPid}`,
    timeoutMs,
  );
}
