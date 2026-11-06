import { describe, expect, it } from "vitest";
import { createId, isUuid, normalizeId } from "./ids";

describe("createId", () => {
  it("genera UUID v4 válidos y distintos", () => {
    const ids = Array.from({ length: 50 }, () => createId());

    for (const id of ids) {
      expect(isUuid(id)).toBe(true);
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    }
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("isUuid", () => {
  it.each([
    "6f1c2a9e-3b4d-4c8a-9f21-7d5e8b0a1c34",
    "6F1C2A9E-3B4D-4C8A-9F21-7D5E8B0A1C34",
    "00000000-0000-0000-0000-000000000000",
  ])("acepta %s", (value) => {
    expect(isUuid(value)).toBe(true);
  });

  it.each([
    "",
    "1",
    "6f1c2a9e3b4d4c8a9f217d5e8b0a1c34",
    "{6f1c2a9e-3b4d-4c8a-9f21-7d5e8b0a1c34}",
    " 6f1c2a9e-3b4d-4c8a-9f21-7d5e8b0a1c34",
    "6f1c2a9e-3b4d-4c8a-9f21-7d5e8b0a1c3g",
    "6f1c2a9e-3b4d-4c8a-9f21-7d5e8b0a1c34-extra",
  ])("rechaza %j", (value) => {
    expect(isUuid(value)).toBe(false);
  });

  it.each([null, undefined, 42, {}, []])(
    "rechaza valores que no son texto (%j)",
    (value) => {
      expect(isUuid(value)).toBe(false);
    },
  );
});

describe("normalizeId", () => {
  const lower = "6f1c2a9e-3b4d-4c8a-9f21-7d5e8b0a1c34";

  it("devuelve en minúsculas un UUID en mayúsculas", () => {
    expect(normalizeId(lower.toUpperCase())).toBe(lower);
  });

  it("acepta mayúsculas y minúsculas mezcladas", () => {
    expect(normalizeId("6F1c2A9e-3B4d-4C8a-9F21-7d5E8b0A1c34")).toBe(lower);
  });

  it("deja igual un UUID ya en minúsculas", () => {
    expect(normalizeId(lower)).toBe(lower);
  });

  it("los ids generados ya están normalizados", () => {
    const id = createId();
    expect(normalizeId(id)).toBe(id);
  });

  it.each([
    "",
    "no-es-uuid",
    ` ${lower}`,
    `{${lower}}`,
    lower.replace(/-/g, ""),
    null,
    undefined,
    42,
  ])("devuelve null si no es UUID (%j)", (value) => {
    expect(normalizeId(value)).toBeNull();
  });
});
