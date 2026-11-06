// Se ejecuta una vez antes de la suite de integración: deja la base de pruebas
// vacía y aplica todas las migraciones con `prisma migrate deploy`. Así cada
// ejecución demuestra que las migraciones funcionan desde cero (§17, M1).
//
// Salvaguardas:
// - Solo se usa TEST_DATABASE_URL y debe apuntar a `contact_manager_test`.
// - El servidor confirma `current_database()` antes del DROP SCHEMA.
// - `prisma migrate deploy` recibe DATABASE_URL = TEST_DATABASE_URL; la URL de
//   desarrollo nunca llega a una operación destructiva.
// - No se usa `prisma migrate reset`.

import "dotenv/config";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { connectToTestDatabase, getTestDatabaseUrl, TEST_DATABASE_NAME } from "./helpers/db";

const require = createRequire(import.meta.url);

async function resetTestSchema(): Promise<void> {
  const client = await connectToTestDatabase();
  try {
    await client.query("DROP SCHEMA IF EXISTS public CASCADE");
    await client.query("CREATE SCHEMA public");
  } finally {
    await client.end();
  }
}

function deployMigrations(testUrl: string): void {
  const prismaCli = require.resolve("prisma/build/index.js");
  const result = spawnSync(process.execPath, [prismaCli, "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: testUrl },
    encoding: "utf8",
  });

  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;

  if (result.error || result.status !== 0) {
    throw new Error(
      `prisma migrate deploy falló (código ${result.status ?? "desconocido"}).\n${output}`,
      { cause: result.error },
    );
  }

  // Prisma informa del destino; si no es la base de pruebas, se aborta.
  if (!output.includes(`"${TEST_DATABASE_NAME}"`)) {
    throw new Error(`No se pudo confirmar que migrate deploy usó "${TEST_DATABASE_NAME}".\n${output}`);
  }
}

export default async function setup(): Promise<void> {
  const testUrl = getTestDatabaseUrl();
  await resetTestSchema();
  deployMigrations(testUrl);
}
