import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";

const connectionString = process.env.TEST_DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "Falta TEST_DATABASE_URL. Copia .env.example a .env y levanta PostgreSQL con `docker compose up -d`.",
  );
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("conexión de Prisma con PostgreSQL", () => {
  it("ejecuta una consulta trivial", async () => {
    const rows = await prisma.$queryRaw<{ ok: number }[]>`SELECT 1 AS ok`;

    expect(rows[0]?.ok).toBe(1);
  });
});
