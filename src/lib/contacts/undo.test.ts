import { describe, expect, it } from "vitest";
import { ContactsError } from "./errors";
import { classifyFailedClaim } from "./undo";

function codeOf(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (error) {
    return error instanceof ContactsError ? error.code : "otro";
  }
  return undefined;
}

describe("classifyFailedClaim (§11.3)", () => {
  it("lote inexistente → UNDO_NOT_FOUND", () => {
    expect(codeOf(() => classifyFailedClaim(null))).toBe("UNDO_NOT_FOUND");
  });

  it("ya restaurado → already_restored, aunque haya expirado", () => {
    const restoredAt = new Date("2026-01-01T00:00:00.000Z");
    expect(classifyFailedClaim({ restoredAt, expired: false })).toEqual({
      restored: 0,
      status: "already_restored",
    });
    expect(classifyFailedClaim({ restoredAt, expired: true })).toEqual({
      restored: 0,
      status: "already_restored",
    });
  });

  it("sin restaurar y expirado → UNDO_EXPIRED", () => {
    expect(
      codeOf(() => classifyFailedClaim({ restoredAt: null, expired: true })),
    ).toBe("UNDO_EXPIRED");
  });

  it("sin restaurar y vigente (imposible bajo el mutex) → CONFLICT", () => {
    expect(
      codeOf(() => classifyFailedClaim({ restoredAt: null, expired: false })),
    ).toBe("CONFLICT");
  });
});
