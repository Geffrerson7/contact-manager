import { describe, expect, it } from "vitest";
import { getAccessMode, getDatabaseUrl } from "./env";

function env(values: Record<string, string | undefined>): NodeJS.ProcessEnv {
  return values as NodeJS.ProcessEnv;
}

describe("getAccessMode", () => {
  it.each(["read-only", "read-write", "  read-only  "])(
    "acepta %j",
    (value) => {
      expect(
        getAccessMode(
          env({ CONTACTS_ACCESS_MODE: value, NODE_ENV: "production" }),
        ),
      ).toBe(value.trim());
    },
  );

  it("sin variable: read-only en producción (fail-closed, también Preview de Vercel)", () => {
    expect(getAccessMode(env({ NODE_ENV: "production" }))).toBe("read-only");
    expect(
      getAccessMode(env({ NODE_ENV: "production", CONTACTS_ACCESS_MODE: "" })),
    ).toBe("read-only");
  });

  it("sin variable: read-write en desarrollo y pruebas", () => {
    expect(getAccessMode(env({ NODE_ENV: "development" }))).toBe("read-write");
    expect(getAccessMode(env({ NODE_ENV: "test" }))).toBe("read-write");
    expect(getAccessMode(env({}))).toBe("read-write");
  });

  it.each(["readonly", "READ-ONLY", "true", "demo", "write"])(
    "rechaza el valor desconocido %j",
    (value) => {
      expect(() => getAccessMode(env({ CONTACTS_ACCESS_MODE: value }))).toThrow(
        /CONTACTS_ACCESS_MODE/,
      );
    },
  );

  it("usa process.env por defecto", () => {
    expect(getAccessMode()).toBe("read-write");
  });
});

describe("getDatabaseUrl", () => {
  it("devuelve DATABASE_URL o falla con un mensaje claro", () => {
    const previous = process.env.DATABASE_URL;
    try {
      process.env.DATABASE_URL = "postgresql://x";
      expect(getDatabaseUrl()).toBe("postgresql://x");
      delete process.env.DATABASE_URL;
      expect(() => getDatabaseUrl()).toThrow(/Falta DATABASE_URL/);
    } finally {
      if (previous === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = previous;
    }
  });
});
