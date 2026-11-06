import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/generated/**", "src/test/**", "**/*.test.{ts,tsx}"],
      thresholds: {
        // §14.11: dominio ≥ 90 %. Los umbrales de componentes y global llegan en M5–M8.
        "src/lib/contacts/{ids,validation,search,selectors,mappers}.ts": {
          statements: 90,
          branches: 90,
          functions: 90,
          lines: 90,
        },
        // §14.11: servicio (y handlers, M4) ≥ 85 %. El repositorio se cubre con integración.
        "src/lib/{env,contacts/{service,repository,errors,undo}}.ts": {
          statements: 85,
          branches: 85,
          functions: 85,
          lines: 85,
        },
      },
    },
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "jsdom",
          include: ["src/**/*.test.{ts,tsx}"],
          setupFiles: ["./src/test/setup.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          environment: "node",
          include: ["tests/integration/**/*.int.test.ts"],
          // Vacía la base de pruebas validada y aplica las migraciones (M1).
          globalSetup: ["./tests/integration/globalSetup.ts"],
          setupFiles: ["./tests/integration/setup.ts"],
          testTimeout: 15_000,
          hookTimeout: 30_000,
          fileParallelism: false,
        },
      },
    ],
  },
});
