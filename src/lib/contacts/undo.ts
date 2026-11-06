/**
 * Reglas puras del deshacer (§11). El SQL vive en el repositorio; aquí solo se decide
 * qué significa el estado de un lote cuando el claim de restauración no afectó a ninguna fila.
 */
import { ContactsError } from "./errors";
import type { RestoreResult } from "./types";

/** Estado de un lote leído en la misma transacción, con la expiración evaluada por PostgreSQL. */
export interface UndoBatchState {
  restoredAt: Date | null;
  /** `expiresAt <= clock_timestamp()`, calculado en la base (nunca con el reloj de Node). */
  expired: boolean;
}

/**
 * Clasificación del claim fallido (§11.3):
 * - lote inexistente → `UNDO_NOT_FOUND`;
 * - ya restaurado → `{ restored: 0, status: "already_restored" }`;
 * - sin restaurar y expirado → `UNDO_EXPIRED`.
 *
 * Un lote sin restaurar y no expirado no puede fallar el claim bajo el mutex; si ocurre,
 * se responde `CONFLICT` en vez de inventar un resultado.
 */
export function classifyFailedClaim(
  state: UndoBatchState | null,
): RestoreResult {
  if (state === null) throw new ContactsError("UNDO_NOT_FOUND");
  if (state.restoredAt !== null) {
    return { restored: 0, status: "already_restored" };
  }
  if (state.expired) throw new ContactsError("UNDO_EXPIRED");
  throw new ContactsError("CONFLICT");
}
