/**
 * Validación de entrada (§9). Funciones puras, sin dependencias (N-10: sin Zod).
 * Se reutiliza en cliente (feedback inmediato) y servidor (autoridad: siempre revalida).
 *
 * Todas las funciones reciben `unknown` (el cuerpo JSON ya parseado) y devuelven el valor
 * normalizado con solo las claves conocidas. Si la entrada no es un objeto, devuelven
 * `{ ok: false, fieldErrors: {} }`: no hay campo al que asignar el error y la capa HTTP
 * responde con un mensaje general.
 */
import {
  COMPANY_MAX_LENGTH,
  EMAIL_MAX_LENGTH,
  NAME_MAX_LENGTH,
  PHONE_MAX_DIGITS,
  PHONE_MAX_LENGTH,
  PHONE_MIN_DIGITS,
  ROLES,
} from "./constants";
import type {
  ContactInput,
  ContactPatch,
  FavoriteInput,
  FieldErrors,
  Role,
  ValidationResult,
} from "./types";

type FieldResult<T> = { ok: true; value: T } | { ok: false; error: string };

const PHONE_ALLOWED = /^[0-9+().\- ]+$/;
/** Formato básico `local@dominio.tld`: sin espacios, una sola `@` y etiquetas de dominio no vacías. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

export const MESSAGES = {
  nameRequired: "El nombre es obligatorio.",
  nameTooLong: `El nombre no puede superar ${NAME_MAX_LENGTH} caracteres.`,
  phoneType: "El teléfono debe ser texto.",
  phoneTooLong: `El teléfono no puede superar ${PHONE_MAX_LENGTH} caracteres.`,
  phoneChars:
    "El teléfono solo puede contener dígitos, espacios y los símbolos + ( ) - .",
  phoneDigits: `El teléfono debe tener entre ${PHONE_MIN_DIGITS} y ${PHONE_MAX_DIGITS} dígitos.`,
  emailType: "El correo debe ser texto.",
  emailTooLong: `El correo no puede superar ${EMAIL_MAX_LENGTH} caracteres.`,
  emailFormat: "Introduce un correo válido, por ejemplo nombre@dominio.com.",
  roleInvalid: "Selecciona una categoría válida.",
  companyType: "La empresa debe ser texto.",
  companyTooLong: `La empresa no puede superar ${COMPANY_MAX_LENGTH} caracteres.`,
  favoriteType: "El favorito debe ser verdadero o falso.",
  contactMethodRequired: "Indica al menos un teléfono o un correo.",
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Longitud en caracteres (puntos de código), igual que `VARCHAR(n)` en PostgreSQL. */
function charLength(value: string): number {
  return Array.from(value).length;
}

function ok<T>(value: T): FieldResult<T> {
  return { ok: true, value };
}

function fail<T>(error: string): FieldResult<T> {
  return { ok: false, error };
}

function validateName(raw: unknown): FieldResult<string> {
  if (typeof raw !== "string") return fail(MESSAGES.nameRequired);
  const value = raw.trim();
  if (value === "") return fail(MESSAGES.nameRequired);
  if (charLength(value) > NAME_MAX_LENGTH) return fail(MESSAGES.nameTooLong);
  return ok(value);
}

/** El teléfono se guarda tal como se escribe (solo `trim`); la normalización es de la búsqueda. */
function validatePhone(raw: unknown): FieldResult<string> {
  if (raw === undefined) return ok("");
  if (typeof raw !== "string") return fail(MESSAGES.phoneType);
  const value = raw.trim();
  if (value === "") return ok("");
  if (charLength(value) > PHONE_MAX_LENGTH) return fail(MESSAGES.phoneTooLong);
  if (!PHONE_ALLOWED.test(value)) return fail(MESSAGES.phoneChars);
  const digits = value.replace(/\D/g, "").length;
  if (digits < PHONE_MIN_DIGITS || digits > PHONE_MAX_DIGITS)
    return fail(MESSAGES.phoneDigits);
  return ok(value);
}

function validateEmail(raw: unknown): FieldResult<string> {
  if (raw === undefined) return ok("");
  if (typeof raw !== "string") return fail(MESSAGES.emailType);
  const value = raw.trim().toLowerCase();
  if (value === "") return ok("");
  if (charLength(value) > EMAIL_MAX_LENGTH) return fail(MESSAGES.emailTooLong);
  if (!EMAIL_PATTERN.test(value)) return fail(MESSAGES.emailFormat);
  return ok(value);
}

export function isRole(value: unknown): value is Role {
  return (
    typeof value === "string" && (ROLES as readonly string[]).includes(value)
  );
}

function validateRole(raw: unknown): FieldResult<Role> {
  return isRole(raw) ? ok(raw) : fail(MESSAGES.roleInvalid);
}

function validateCompany(raw: unknown): FieldResult<string> {
  if (raw === undefined) return ok("");
  if (typeof raw !== "string") return fail(MESSAGES.companyType);
  const value = raw.trim();
  if (charLength(value) > COMPANY_MAX_LENGTH)
    return fail(MESSAGES.companyTooLong);
  return ok(value);
}

/** Obligatorio y booleano: un PUT sin `isFavorite` no debe desmarcar el favorito en silencio. */
function validateFavorite(raw: unknown): FieldResult<boolean> {
  return typeof raw === "boolean" ? ok(raw) : fail(MESSAGES.favoriteType);
}

/**
 * Entrada completa para crear (POST) o reemplazar (PUT).
 * `name`, `role` e `isFavorite` son obligatorios; `phone`, `email` y `company` ausentes
 * valen `""`. Regla cruzada: `phone` o `email` no vacío.
 */
export function validateContactInput(
  raw: unknown,
): ValidationResult<ContactInput> {
  if (!isRecord(raw)) return { ok: false, fieldErrors: {} };

  const name = validateName(raw.name);
  const phone = validatePhone(raw.phone);
  const email = validateEmail(raw.email);
  const role = validateRole(raw.role);
  const company = validateCompany(raw.company);
  const isFavorite = validateFavorite(raw.isFavorite);

  const fieldErrors: FieldErrors = {};
  if (!name.ok) fieldErrors.name = name.error;
  if (!phone.ok) fieldErrors.phone = phone.error;
  if (!email.ok) fieldErrors.email = email.error;
  if (!role.ok) fieldErrors.role = role.error;
  if (!company.ok) fieldErrors.company = company.error;
  if (!isFavorite.ok) fieldErrors.isFavorite = isFavorite.error;

  // Solo se exige un medio de contacto cuando ambos campos son válidos y están vacíos;
  // si uno es inválido, su propio error ya informa al usuario.
  if (phone.ok && email.ok && phone.value === "" && email.value === "") {
    fieldErrors.contactMethod = MESSAGES.contactMethodRequired;
  }

  if (
    !name.ok ||
    !phone.ok ||
    !email.ok ||
    !role.ok ||
    !company.ok ||
    !isFavorite.ok ||
    fieldErrors.contactMethod
  ) {
    return { ok: false, fieldErrors };
  }

  return {
    ok: true,
    value: {
      name: name.value,
      phone: phone.value,
      email: email.value,
      role: role.value,
      company: company.value,
      isFavorite: isFavorite.value,
    },
  };
}

/**
 * Edición parcial (PATCH). Solo valida y devuelve los campos presentes; `isFavorite` y las
 * claves desconocidas se ignoran (el favorito tiene su propio endpoint).
 *
 * La regla cruzada depende del contacto actual: el servicio combina el contacto con el
 * parche y vuelve a validar el resultado con `validateContactInput`.
 */
export function validateContactPatch(
  raw: unknown,
): ValidationResult<ContactPatch> {
  if (!isRecord(raw)) return { ok: false, fieldErrors: {} };

  const value: ContactPatch = {};
  const fieldErrors: FieldErrors = {};

  if (raw.name !== undefined) {
    const result = validateName(raw.name);
    if (result.ok) value.name = result.value;
    else fieldErrors.name = result.error;
  }
  if (raw.phone !== undefined) {
    const result = validatePhone(raw.phone);
    if (result.ok) value.phone = result.value;
    else fieldErrors.phone = result.error;
  }
  if (raw.email !== undefined) {
    const result = validateEmail(raw.email);
    if (result.ok) value.email = result.value;
    else fieldErrors.email = result.error;
  }
  if (raw.role !== undefined) {
    const result = validateRole(raw.role);
    if (result.ok) value.role = result.value;
    else fieldErrors.role = result.error;
  }
  if (raw.company !== undefined) {
    const result = validateCompany(raw.company);
    if (result.ok) value.company = result.value;
    else fieldErrors.company = result.error;
  }

  return Object.keys(fieldErrors).length > 0
    ? { ok: false, fieldErrors }
    : { ok: true, value };
}

/** Cuerpo de PATCH /api/contacts/:id/favorite. `isFavorite` es obligatorio y booleano. */
export function validateFavoriteInput(
  raw: unknown,
): ValidationResult<FavoriteInput> {
  if (!isRecord(raw)) return { ok: false, fieldErrors: {} };

  const isFavorite = validateFavorite(raw.isFavorite);
  return isFavorite.ok
    ? { ok: true, value: { isFavorite: isFavorite.value } }
    : { ok: false, fieldErrors: { isFavorite: isFavorite.error } };
}
