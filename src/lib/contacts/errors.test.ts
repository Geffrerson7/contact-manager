import { describe, expect, it } from "vitest";
import {
  ContactsError,
  ERROR_MESSAGES,
  isRetryableError,
  postgresCode,
  toContactsError,
  UndoInconsistentError,
  validationError,
} from "./errors";
import { MESSAGES } from "./validation";

/** Forma real de un error de Prisma 7 + adapter-pg (comprobada contra PostgreSQL 17). */
function prismaError(cause: Record<string, unknown>, code = "P2010") {
  return Object.assign(new Error("Invalid invocation"), {
    name: "PrismaClientKnownRequestError",
    code,
    meta: { driverAdapterError: { name: "DriverAdapterError", cause } },
  });
}

function pgCause(originalCode: string, message = "error") {
  return { originalCode, code: originalCode, kind: "postgres", message };
}

describe("ContactsError", () => {
  it("usa el mensaje por defecto del código", () => {
    const error = new ContactsError("NOT_FOUND");
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("ContactsError");
    expect(error.message).toBe(ERROR_MESSAGES.NOT_FOUND);
    expect(error.fields).toBeUndefined();
  });

  it("omite fields vacíos (§9.2) y conserva los no vacíos", () => {
    expect(validationError({}).fields).toBeUndefined();
    expect(validationError({ name: "x" }).fields).toEqual({ name: "x" });
  });

  it("UndoInconsistentError lleva los detalles del lote", () => {
    const error = new UndoInconsistentError({
      batchId: "b",
      expected: 5,
      actual: 3,
    });
    expect(error).toBeInstanceOf(ContactsError);
    expect(error.code).toBe("UNDO_INCONSISTENT");
    expect(error.details).toEqual({ batchId: "b", expected: 5, actual: 3 });
  });
});

describe("postgresCode", () => {
  it("lee el SQLSTATE del adaptador de Prisma", () => {
    expect(postgresCode(prismaError(pgCause("55P03")))).toBe("55P03");
    expect(postgresCode(prismaError({ code: "40001" }))).toBe("40001");
  });

  it("lee el SQLSTATE de pg.DatabaseError", () => {
    expect(
      postgresCode(
        Object.assign(new Error("x"), { code: "23514", severity: "ERROR" }),
      ),
    ).toBe("23514");
  });

  it.each([
    null,
    undefined,
    "x",
    new Error("x"),
    { code: "P2025" },
    prismaError({ kind: "x" }),
  ])("devuelve undefined sin SQLSTATE (%#)", (error) => {
    expect(postgresCode(error)).toBeUndefined();
  });
});

describe("toContactsError", () => {
  it("devuelve los ContactsError tal cual", () => {
    const error = new ContactsError("INVALID_ID");
    expect(toContactsError(error)).toBe(error);
  });

  it.each(["55P03", "40001", "40P01"])("%s → CONFLICT", (code) => {
    const source = prismaError(pgCause(code));
    const mapped = toContactsError(source);
    expect(mapped.code).toBe("CONFLICT");
    expect(mapped.cause).toBe(source);
  });

  it.each(["25006", "42501"])(
    "%s → READ_ONLY (rol de solo lectura)",
    (code) => {
      expect(toContactsError(prismaError(pgCause(code))).code).toBe(
        "READ_ONLY",
      );
    },
  );

  it("23514 de contacts_contactable_check → VALIDATION_ERROR de contactMethod", () => {
    const mapped = toContactsError(
      prismaError(
        pgCause(
          "23514",
          'new row for relation "contacts" violates check constraint "contacts_contactable_check"',
        ),
      ),
    );
    expect(mapped.code).toBe("VALIDATION_ERROR");
    expect(mapped.fields).toEqual({
      contactMethod: MESSAGES.contactMethodRequired,
    });
  });

  it("23514 de pg.DatabaseError usa el mensaje del propio error", () => {
    const error = Object.assign(
      new Error('violates check constraint "contacts_contactable_check"'),
      { code: "23514", severity: "ERROR" },
    );
    expect(toContactsError(error).code).toBe("VALIDATION_ERROR");
  });

  it("otro 23514 → INTERNAL_ERROR", () => {
    expect(
      toContactsError(
        prismaError(pgCause("23514", "violates contacts_timestamps_check")),
      ).code,
    ).toBe("INTERNAL_ERROR");
  });

  it.each([
    prismaError({ kind: "DatabaseNotReachable", host: "h", port: 1 }, "P1001"),
    prismaError({ kind: "AuthenticationFailed" }, "P2010"),
    Object.assign(new Error("x"), { code: "P1017" }),
    Object.assign(new Error("x"), { name: "PrismaClientInitializationError" }),
  ])("errores de conexión → DB_UNAVAILABLE (%#)", (error) => {
    expect(toContactsError(error).code).toBe("DB_UNAVAILABLE");
  });

  it.each([new Error("x"), "texto", null, prismaError(pgCause("22012"))])(
    "cualquier otro fallo → INTERNAL_ERROR (%#)",
    (error) => {
      const mapped = toContactsError(error);
      expect(mapped.code).toBe("INTERNAL_ERROR");
      expect(mapped.message).toBe(ERROR_MESSAGES.INTERNAL_ERROR);
    },
  );
});

describe("isRetryableError", () => {
  it("solo 40001 y 40P01 se reintentan", () => {
    expect(isRetryableError(prismaError(pgCause("40001")))).toBe(true);
    expect(isRetryableError(prismaError(pgCause("40P01")))).toBe(true);
    expect(isRetryableError(prismaError(pgCause("55P03")))).toBe(false);
    expect(isRetryableError(new Error("x"))).toBe(false);
  });
});
