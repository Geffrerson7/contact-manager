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

/**
 * Clave arbitraria pero estable del mutex estructural de escritura (§7.2).
 * Debe ser idéntica en todos los procesos y despliegues sobre la misma base.
 * Cabe en int4, por lo que no requiere castear a bigint.
 *
 * R1 (§7.3): toda transacción que escriba en más de una tabla toma
 * `pg_advisory_xact_lock(WRITE_MUTEX_KEY)` como primera sentencia tras `SET LOCAL`.
 */
export const WRITE_MUTEX_KEY = 482019001;

/** Ventana de deshacer (§11.1). La autoridad es PostgreSQL (`expiresAt`); la UI solo la muestra. */
export const UNDO_WINDOW_SECONDS = 5;

/** Retención antes de purgar (§11.1): lotes sin restaurar y lotes restaurados. */
export const PURGE_EXPIRED_AFTER_MINUTES = 10;
export const PURGE_RESTORED_AFTER_HOURS = 24;

/** Throttle de la purga oportunista al listar, por proceso (§3.3, §11.5). */
export const PURGE_THROTTLE_MS = 60_000;

/** `lock_timeout` de las transacciones de escritura (§7.7). */
export const WRITE_LOCK_TIMEOUT = "3s";
export const PURGE_LOCK_TIMEOUT = "1s";

/** Reintentos internos ante `40001`/`40P01` antes de responder `CONFLICT` (§8.3). */
export const MAX_TRANSACTION_RETRIES = 2;
