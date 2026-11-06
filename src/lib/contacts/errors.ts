/**
 * Errores de la capa de aplicación (§8.3).
 *
 * El servicio solo lanza `ContactsError`; la capa HTTP (M4) traduce `code` a estado HTTP.
 * Los errores de PostgreSQL se clasifican aquí a partir del SQLSTATE original, que
 * Prisma 7 con `@prisma/adapter-pg` expone en `meta.driverAdapterError.cause`.
 */
import type { FieldErrors } from "./types";
import { MESSAGES } from "./validation";

export type ContactsErrorCode =
  | "INVALID_ID"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "UNDO_NOT_FOUND"
  | "UNDO_EXPIRED"
  | "UNDO_INCONSISTENT"
  | "READ_ONLY"
  | "DB_UNAVAILABLE"
  | "INTERNAL_ERROR";

export const ERROR_MESSAGES: Record<ContactsErrorCode, string> = {
  INVALID_ID: "El identificador no es válido.",
  VALIDATION_ERROR: "Revisa los datos del contacto.",
  NOT_FOUND: "El contacto no existe o ya fue eliminado.",
  CONFLICT: "Hay otra operación en curso. Inténtalo de nuevo.",
  UNDO_NOT_FOUND: "No se encontró la operación que intentas deshacer.",
  UNDO_EXPIRED: "El plazo para deshacer ha terminado.",
  UNDO_INCONSISTENT:
    "No se pudo deshacer la operación porque los datos no son coherentes.",
  READ_ONLY: "Esta demostración es de solo lectura.",
  DB_UNAVAILABLE: "La base de datos no está disponible en este momento.",
  INTERNAL_ERROR: "Se produjo un error inesperado.",
};

export interface ContactsErrorOptions {
  message?: string;
  /** Solo para `VALIDATION_ERROR`. Ausente si no hay errores asociados a campos (§9.2). */
  fields?: FieldErrors;
  details?: Record<string, unknown>;
  cause?: unknown;
}

export class ContactsError extends Error {
  readonly code: ContactsErrorCode;
  readonly fields?: FieldErrors;
  readonly details?: Record<string, unknown>;

  constructor(code: ContactsErrorCode, options: ContactsErrorOptions = {}) {
    super(options.message ?? ERROR_MESSAGES[code], { cause: options.cause });
    this.name = "ContactsError";
    this.code = code;
    if (options.fields && Object.keys(options.fields).length > 0) {
      this.fields = options.fields;
    }
    if (options.details) this.details = options.details;
  }
}

/** `VALIDATION_ERROR` con `fields` solo si hay errores de campo (cuerpo no objeto → sin `fields`). */
export function validationError(fields: FieldErrors): ContactsError {
  return new ContactsError("VALIDATION_ERROR", { fields });
}

/** §11.4: el número de contactos restaurados no coincide con `contactCount`. */
export class UndoInconsistentError extends ContactsError {
  constructor(details: { batchId: string; expected: number; actual: number }) {
    super("UNDO_INCONSISTENT", { details });
    this.name = "UndoInconsistentError";
  }
}

// --- Clasificación de errores de PostgreSQL ---------------------------------

const LOCK_NOT_AVAILABLE = "55P03";
const SERIALIZATION_FAILURE = "40001";
const DEADLOCK_DETECTED = "40P01";
const READ_ONLY_SQL_TRANSACTION = "25006";
const INSUFFICIENT_PRIVILEGE = "42501";
const CHECK_VIOLATION = "23514";
const CONTACTABLE_CHECK = "contacts_contactable_check";

/** Errores de Prisma sin conexión con la base (P1xxx) y tipos del adaptador equivalentes. */
const CONNECTION_PRISMA_CODES = new Set(["P1001", "P1002", "P1008", "P1017"]);
const CONNECTION_ADAPTER_KINDS = new Set([
  "DatabaseNotReachable",
  "DatabaseDoesNotExist",
  "DatabaseAccessDenied",
  "AuthenticationFailed",
  "ConnectionClosed",
  "SocketTimeout",
  "TlsConnectionError",
]);

interface AdapterCause {
  originalCode?: unknown;
  code?: unknown;
  kind?: unknown;
  message?: unknown;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function adapterCause(error: unknown): AdapterCause | undefined {
  if (!isObject(error) || !isObject(error.meta)) return undefined;
  const adapterError = error.meta.driverAdapterError;
  if (!isObject(adapterError) || !isObject(adapterError.cause))
    return undefined;
  return adapterError.cause;
}

/** SQLSTATE de un error de Prisma (vía adaptador) o de `pg` directamente. */
export function postgresCode(error: unknown): string | undefined {
  const cause = adapterCause(error);
  const code = cause?.originalCode ?? cause?.code;
  if (typeof code === "string" && /^[0-9A-Z]{5}$/.test(code)) return code;

  // `pg.DatabaseError` (conexiones directas) expone el SQLSTATE en `code` junto a `severity`.
  // Sin `severity`, `code` puede ser de Prisma (`P2025`), que también tiene 5 caracteres.
  if (
    isObject(error) &&
    typeof error.severity === "string" &&
    typeof error.code === "string" &&
    /^[0-9A-Z]{5}$/.test(error.code)
  ) {
    return error.code;
  }
  return undefined;
}

function postgresMessage(error: unknown): string {
  const message = adapterCause(error)?.message;
  if (typeof message === "string") return message;
  return error instanceof Error ? error.message : "";
}

function isConnectionError(error: unknown): boolean {
  if (!isObject(error)) return false;
  if (typeof error.code === "string" && CONNECTION_PRISMA_CODES.has(error.code))
    return true;
  if (error.name === "PrismaClientInitializationError") return true;
  const kind = adapterCause(error)?.kind;
  return typeof kind === "string" && CONNECTION_ADAPTER_KINDS.has(kind);
}

/** `40001`/`40P01`: el servicio reintenta antes de responder `CONFLICT` (§8.3). */
export function isRetryableError(error: unknown): boolean {
  const code = postgresCode(error);
  return code === SERIALIZATION_FAILURE || code === DEADLOCK_DETECTED;
}

/** Traduce cualquier error a `ContactsError`. Los `ContactsError` se devuelven tal cual. */
export function toContactsError(error: unknown): ContactsError {
  if (error instanceof ContactsError) return error;

  const code = postgresCode(error);
  switch (code) {
    case LOCK_NOT_AVAILABLE:
    case SERIALIZATION_FAILURE:
    case DEADLOCK_DETECTED:
      return new ContactsError("CONFLICT", { cause: error });
    case READ_ONLY_SQL_TRANSACTION:
    case INSUFFICIENT_PRIVILEGE:
      // Rol de solo lectura en la base (despliegue demo): segunda capa de protección.
      return new ContactsError("READ_ONLY", { cause: error });
    case CHECK_VIOLATION:
      if (postgresMessage(error).includes(CONTACTABLE_CHECK)) {
        return new ContactsError("VALIDATION_ERROR", {
          fields: { contactMethod: MESSAGES.contactMethodRequired },
          cause: error,
        });
      }
      break;
  }

  if (isConnectionError(error)) {
    return new ContactsError("DB_UNAVAILABLE", { cause: error });
  }

  return new ContactsError("INTERNAL_ERROR", { cause: error });
}
