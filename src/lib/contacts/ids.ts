/**
 * Identificadores (D5): el servicio genera los UUID; la base no tiene default.
 */

/** Forma canónica 8-4-4-4-12 en hexadecimal, cualquier versión (lo que acepta `uuid` de PostgreSQL sin llaves). */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function createId(): string {
  return crypto.randomUUID();
}

/** Guarda para `id` y `batchId` recibidos del exterior; si falla, la API responde `INVALID_ID`. */
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

/**
 * Valida y normaliza un identificador externo: UUID canónico en minúsculas, o `null` si no es
 * UUID (→ `INVALID_ID`). PostgreSQL devuelve los `uuid` en minúsculas, así que las consultas y
 * las comparaciones de cadenas deben usar siempre el valor devuelto por esta función.
 */
export function normalizeId(value: unknown): string | null {
  return isUuid(value) ? value.toLowerCase() : null;
}
