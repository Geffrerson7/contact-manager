/**
 * Normalización para la búsqueda (§10.1, §10.2). Funciones puras.
 * La normalización es exclusiva de la búsqueda: los datos se almacenan tal como los escribe el usuario.
 */
import { PHONE_QUERY_MIN_DIGITS, PHONE_STORED_MIN_DIGITS } from "./constants";

const HAS_LETTER = /\p{L}/u;

/** Sin diacríticos, en minúsculas y sin espacios en los extremos. Se aplica a `name`, `email` y `role`. */
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

/** Solo dígitos; elimina el prefijo internacional 00. El '+' desaparece como no dígito. */
export function normalizePhoneDigits(value: string): string {
  const digits = value.replace(/\D+/g, "");
  return digits.startsWith("00") ? digits.slice(2) : digits;
}

/** La rama telefónica solo se activa si la consulta no contiene letras. */
export function isPhoneQuery(query: string): boolean {
  return query.trim() !== "" && !HAS_LETTER.test(query);
}

/** `queryDigits` debe venir ya normalizado con `normalizePhoneDigits`. */
export function phoneMatches(
  storedPhone: string,
  queryDigits: string,
): boolean {
  if (queryDigits.length < PHONE_QUERY_MIN_DIGITS) return false;

  const stored = normalizePhoneDigits(storedPhone);
  if (stored.length === 0) return false;

  if (stored.includes(queryDigits)) return true;

  return (
    stored.length >= PHONE_STORED_MIN_DIGITS && queryDigits.includes(stored)
  );
}
