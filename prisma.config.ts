import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Se accede a process.env directamente (no a env()) para que `prisma generate`
    // funcione en entornos sin DATABASE_URL, como el build de CI o Docker.
    url: process.env.DATABASE_URL ?? "",
  },
});
