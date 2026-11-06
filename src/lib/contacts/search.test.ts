import { describe, expect, it } from "vitest";
import {
  isPhoneQuery,
  normalizePhoneDigits,
  normalizeText,
  phoneMatches,
} from "./search";

describe("normalizeText", () => {
  it.each([
    ["José", "jose"],
    ["  MARÍA Peña ", "maria pena"],
    ["Ünïcödé", "unicode"],
    ["ANA@EMAIL.COM", "ana@email.com"],
    ["", ""],
  ])("%j → %j", (input, expected) => {
    expect(normalizeText(input)).toBe(expected);
  });

  it("normaliza igual la forma compuesta y la descompuesta", () => {
    expect(normalizeText("José")).toBe(normalizeText("José"));
  });
});

describe("normalizePhoneDigits", () => {
  it.each([
    ["+51 987-654-321", "51987654321"],
    ["0051 987 654 321", "51987654321"],
    ["+1 (555) 123-4567", "15551234567"],
    ["555.123.4567", "5551234567"],
    ["", ""],
    ["abc", ""],
  ])("%j → %j", (input, expected) => {
    expect(normalizePhoneDigits(input)).toBe(expected);
  });

  it("solo elimina un prefijo 00 inicial", () => {
    expect(normalizePhoneDigits("000123")).toBe("0123");
    expect(normalizePhoneDigits("1200345")).toBe("1200345");
  });
});

describe("isPhoneQuery", () => {
  it.each(["555", "+51 987", "(555) 123", "0051"])(
    "activa la rama telefónica con %j",
    (q) => {
      expect(isPhoneQuery(q)).toBe(true);
    },
  );

  it.each(["", "   ", "Ana", "ana 555", "Ñ1", "José"])(
    "no la activa con %j",
    (q) => {
      expect(isPhoneQuery(q)).toBe(false);
    },
  );
});

describe("phoneMatches — casos de referencia §10.4", () => {
  it.each([
    ["+51 987-654-321", "987654321", true],
    ["+51 987-654-321", "+51 987 654 321", true],
    ["+51 987-654-321", "0051 987 654 321", true],
    ["987654321", "+51 987654321", true],
    ["+1 (555) 123-4567", "5551234567", true],
    ["+1 (555) 123-4567", "987", false],
    ["+1 (555) 123-4567", "9876543210", false],
    ["+1 (555) 123-4567", "555", true],
  ])("almacenado %j, consulta %j → %s", (stored, query, expected) => {
    expect(phoneMatches(stored, normalizePhoneDigits(query))).toBe(expected);
  });
});

describe("phoneMatches — límites", () => {
  it("exige al menos 3 dígitos en la consulta", () => {
    expect(phoneMatches("555 123 4567", "55")).toBe(false);
    expect(phoneMatches("555 123 4567", "555")).toBe(true);
  });

  it("no coincide con un teléfono almacenado vacío", () => {
    expect(phoneMatches("", "555")).toBe(false);
    expect(phoneMatches("+ ( )", "555")).toBe(false);
  });

  it("solo usa la contención inversa si el almacenado tiene al menos 6 dígitos", () => {
    expect(phoneMatches("12345", "9912345")).toBe(false);
    expect(phoneMatches("123456", "99123456")).toBe(true);
  });
});
