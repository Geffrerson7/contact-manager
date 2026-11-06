/**
 * Valores inmutables del dominio de contactos.
 * Sin dependencias: este módulo puede importarse desde cliente y servidor.
 */

/** Categorías de relación (D2, F2-01). El orden es el de presentación en la UI. */
export const ROLES = ["Amigo", "Trabajo", "Familia", "Otro"] as const;

/** Límites de los campos (§9.1). Coinciden con los `VARCHAR` de `schema.prisma`. */
export const NAME_MAX_LENGTH = 80;
export const PHONE_MAX_LENGTH = 30;
export const PHONE_MIN_DIGITS = 6;
export const PHONE_MAX_DIGITS = 15;
export const EMAIL_MAX_LENGTH = 254;
export const COMPANY_MAX_LENGTH = 80;

/** Búsqueda telefónica (§10.2). */
export const PHONE_QUERY_MIN_DIGITS = 3;
export const PHONE_STORED_MIN_DIGITS = 6;
