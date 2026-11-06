// Utilidades de base de datos exclusivas de las pruebas de integración.
// Nunca se importan desde código de producción.

import pg from "pg";

/** Única base sobre la que las pruebas pueden ejecutar operaciones destructivas. */
export const TEST_DATABASE_NAME = "contact_manager_test";

function databaseNameOf(url: string, variable: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`${variable} no es una URL de conexión válida.`);
  }

  const name = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  if (!name) {
    throw new Error(`${variable} no indica el nombre de la base de datos.`);
  }
  return name;
}

/**
 * Devuelve TEST_DATABASE_URL solo si apunta, sin ambigüedad, a la base de
 * pruebas. Aborta ante cualquier discrepancia o si no puede verificarse.
 */
export function getTestDatabaseUrl(): string {
  const testUrl = process.env.TEST_DATABASE_URL;
  if (!testUrl) {
    throw new Error(
      "Falta TEST_DATABASE_URL. Copia .env.example a .env y levanta PostgreSQL con `docker compose up -d`.",
    );
  }

  // La base de Neon guarda los datos de la demostración: las pruebas nunca pueden usarla,
  // aunque alguien la llame `contact_manager_test`.
  if (/\.neon\.tech$/i.test(new URL(testUrl).hostname)) {
    throw new Error("TEST_DATABASE_URL apunta a Neon; las pruebas solo usan PostgreSQL local.");
  }

  const testName = databaseNameOf(testUrl, "TEST_DATABASE_URL");
  if (testName !== TEST_DATABASE_NAME) {
    throw new Error(
      `TEST_DATABASE_URL apunta a "${testName}"; solo se permite "${TEST_DATABASE_NAME}".`,
    );
  }

  // La URL de desarrollo nunca puede coincidir con la de pruebas.
  const devUrl = process.env.DATABASE_URL;
  if (devUrl) {
    if (devUrl === testUrl) {
      throw new Error("DATABASE_URL y TEST_DATABASE_URL son idénticas; se aborta.");
    }
    if (databaseNameOf(devUrl, "DATABASE_URL") === TEST_DATABASE_NAME) {
      throw new Error(
        `DATABASE_URL también apunta a "${TEST_DATABASE_NAME}"; se aborta para no confundir los entornos.`,
      );
    }
  }

  return testUrl;
}

/**
 * Abre una conexión a la base de pruebas y confirma en el propio servidor
 * (`current_database()`) que el destino es el esperado.
 */
export async function connectToTestDatabase(): Promise<pg.Client> {
  const client = new pg.Client({ connectionString: getTestDatabaseUrl() });
  await client.connect();

  try {
    const { rows } = await client.query<{ db: string }>("SELECT current_database() AS db");
    if (rows[0]?.db !== TEST_DATABASE_NAME) {
      throw new Error(
        `La conexión de pruebas llegó a "${rows[0]?.db ?? "desconocida"}"; se aborta.`,
      );
    }
  } catch (error) {
    await client.end();
    throw error;
  }

  return client;
}

/** Vacía las tablas de la aplicación entre pruebas (§14.3, punto 6). */
export async function truncateAll(client: pg.Client): Promise<void> {
  await client.query("BEGIN");
  try {
    await client.query("SET LOCAL lock_timeout = '5s'");
    await client.query(
      'TRUNCATE "contacts", "undo_batches", "system_state" RESTART IDENTITY CASCADE',
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

/**
 * Ejecuta `fn` con el trigger `contacts_before_update` deshabilitado y lo
 * vuelve a habilitar siempre, aunque `fn` falle. Requiere ser propietario de
 * la tabla. Solo para pruebas: permite verificar los CHECK sin el trigger.
 */
export async function withContactsTriggerDisabled<T>(
  client: pg.Client,
  fn: () => Promise<T>,
): Promise<T> {
  await client.query('ALTER TABLE "contacts" DISABLE TRIGGER "contacts_before_update"');
  try {
    return await fn();
  } finally {
    await client.query('ALTER TABLE "contacts" ENABLE TRIGGER "contacts_before_update"');
  }
}
