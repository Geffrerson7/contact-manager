/**
 * Casos de uso de contactos (capa de aplicación, M3).
 *
 * Coordina dominio (M2) y persistencia: valida antes de persistir, normaliza ids, aplica el
 * modo de acceso del despliegue y traduce cualquier fallo a `ContactsError`.
 * No importa `next/*` ni React (§3.2).
 */
import type { AccessMode } from "@/lib/env";
import { MAX_TRANSACTION_RETRIES, PURGE_THROTTLE_MS } from "./constants";
import {
  ContactsError,
  isRetryableError,
  toContactsError,
  validationError,
} from "./errors";
import { createId, normalizeId } from "./ids";
import { toContact, toContactCreateData, toUndoResult } from "./mappers";
import type {
  ContactContentData,
  ContactRow,
  ContactsRepository,
  PurgeResult,
  UndoTransactionHooks,
} from "./repository";
import {
  selectContactList,
  selectFilteredContacts,
  selectNeighbors,
} from "./selectors";
import type {
  Contact,
  ContactFilters,
  ContactInput,
  ContactListResult,
  ContactNeighbors,
  RestoreResult,
  UndoResult,
} from "./types";
import {
  validateContactInput,
  validateContactPatch,
  validateFavoriteInput,
} from "./validation";

export interface ContactDetail {
  contact: Contact;
  /** Anterior/Siguiente sobre la lista filtrada (F2-04); `null` si el contacto no está en ella. */
  navigation: ContactNeighbors | null;
}

export interface ContactsServiceOptions {
  repository: ContactsRepository;
  /** Decidido por el servidor (configuración del despliegue), nunca por la petición. */
  accessMode: AccessMode;
  /** Reloj del proceso, solo para el throttle de la purga oportunista. */
  now?: () => number;
  /** Hooks de concurrencia, exclusivos de las pruebas de integración (§14.4). */
  hooks?: UndoTransactionHooks;
}

export interface ContactsService {
  readonly accessMode: AccessMode;
  list(filters: ContactFilters): Promise<ContactListResult>;
  get(rawId: unknown): Promise<Contact>;
  getDetail(rawId: unknown, filters: ContactFilters): Promise<ContactDetail>;
  create(body: unknown): Promise<Contact>;
  replace(rawId: unknown, body: unknown): Promise<Contact>;
  patch(rawId: unknown, body: unknown): Promise<Contact>;
  setFavorite(rawId: unknown, body: unknown): Promise<Contact>;
  deleteOne(rawId: unknown): Promise<UndoResult>;
  deleteAll(): Promise<UndoResult>;
  restore(body: unknown): Promise<RestoreResult>;
  purge(): Promise<PurgeResult>;
}

const CONTENT_FIELDS = ["name", "phone", "email", "role", "company"] as const;

function requireId(rawId: unknown): string {
  const id = normalizeId(rawId);
  if (id === null) throw new ContactsError("INVALID_ID");
  return id;
}

function rowToInput(row: ContactRow): ContactInput {
  return {
    name: row.name,
    phone: row.phone,
    email: row.email,
    role: row.role,
    company: row.company,
    isFavorite: row.isFavorite,
  };
}

/** Solo los campos de contenido que cambian; `null` si el resultado es idéntico al actual. */
function contentChanges(
  current: ContactRow,
  next: ContactInput,
): ContactContentData | null {
  const changes: ContactContentData = {};
  for (const field of CONTENT_FIELDS) {
    if (next[field] !== current[field]) {
      Object.assign(changes, { [field]: next[field] });
    }
  }
  return Object.keys(changes).length > 0 ? changes : null;
}

function batchIdOf(body: unknown): unknown {
  return typeof body === "object" && body !== null && !Array.isArray(body)
    ? (body as Record<string, unknown>).batchId
    : undefined;
}

export function createContactsService(
  options: ContactsServiceOptions,
): ContactsService {
  const { repository, accessMode, hooks } = options;
  const now = options.now ?? Date.now;
  let lastPurgeAt: number | null = null;

  /** Ejecuta un caso de uso y garantiza que solo salgan `ContactsError`. */
  async function run<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      throw toContactsError(error);
    }
  }

  /** Reintenta `40001`/`40P01` como red de seguridad (§7.6); agotado → `CONFLICT`. */
  async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await fn();
      } catch (error) {
        if (attempt >= MAX_TRANSACTION_RETRIES || !isRetryableError(error))
          throw error;
      }
    }
  }

  /** Primera comprobación de toda escritura: el cliente no puede alterarla. */
  function assertWritable(): void {
    if (accessMode !== "read-write") throw new ContactsError("READ_ONLY");
  }

  /**
   * Purga oportunista antes de leer (§3.3), con throttle por proceso. En solo lectura no se
   * ejecuta: una lectura nunca escribe. Un fallo de la purga no hace fallar la lectura.
   */
  async function maybePurge(): Promise<void> {
    if (accessMode !== "read-write") return;
    const current = now();
    if (lastPurgeAt !== null && current - lastPurgeAt < PURGE_THROTTLE_MS)
      return;
    lastPurgeAt = current;
    try {
      await repository.purge();
    } catch {
      // Se reintentará en la siguiente ventana; la lectura sigue.
    }
  }

  async function activeContacts(): Promise<Contact[]> {
    await maybePurge();
    return (await repository.listActive()).map(toContact);
  }

  return {
    accessMode,

    list(filters) {
      return run(async () =>
        selectContactList(await activeContacts(), filters),
      );
    },

    get(rawId) {
      return run(async () => {
        const id = requireId(rawId);
        await maybePurge();
        const row = await repository.findActive(id);
        if (row === null) throw new ContactsError("NOT_FOUND");
        return toContact(row);
      });
    },

    getDetail(rawId, filters) {
      return run(async () => {
        const id = requireId(rawId);
        const contacts = await activeContacts();
        const contact = contacts.find((candidate) => candidate.id === id);
        if (contact === undefined) throw new ContactsError("NOT_FOUND");

        const filtered = selectFilteredContacts(contacts, filters);
        return { contact, navigation: selectNeighbors(filtered, id) };
      });
    },

    create(body) {
      return run(async () => {
        assertWritable();
        const result = validateContactInput(body);
        if (!result.ok) throw validationError(result.fieldErrors);

        const row = await repository.create(
          toContactCreateData(createId(), result.value),
        );
        return toContact(row);
      });
    },

    replace(rawId, body) {
      return run(async () => {
        assertWritable();
        const id = requireId(rawId);
        // PUT exige el contacto completo, incluido isFavorite: sin valores por defecto ocultos.
        const result = validateContactInput(body);
        if (!result.ok) throw validationError(result.fieldErrors);

        const row = await repository.replace(id, result.value);
        if (row === null) throw new ContactsError("NOT_FOUND");
        return toContact(row);
      });
    },

    patch(rawId, body) {
      return run(async () => {
        assertWritable();
        const id = requireId(rawId);
        const result = validateContactPatch(body);
        if (!result.ok) throw validationError(result.fieldErrors);
        const patch = result.value;

        // Parche vacío: no hay nada que escribir; solo se confirma que el contacto existe.
        if (Object.keys(patch).length === 0) {
          const row = await repository.findActive(id);
          if (row === null) throw new ContactsError("NOT_FOUND");
          return toContact(row);
        }

        const row = await repository.updateLocked(id, (current) => {
          // Contacto completo = actual + parche, revalidado entero (§9.2), incluida la regla
          // «teléfono o correo». Lanzar aquí revierte la transacción sin escribir.
          const merged = validateContactInput({
            ...rowToInput(current),
            ...patch,
          });
          if (!merged.ok) throw validationError(merged.fieldErrors);
          return contentChanges(current, merged.value);
        });
        if (row === null) throw new ContactsError("NOT_FOUND");
        return toContact(row);
      });
    },

    setFavorite(rawId, body) {
      return run(async () => {
        assertWritable();
        const id = requireId(rawId);
        const result = validateFavoriteInput(body);
        if (!result.ok) throw validationError(result.fieldErrors);

        const row = await repository.setFavorite(id, result.value.isFavorite);
        if (row === null) throw new ContactsError("NOT_FOUND");
        return toContact(row);
      });
    },

    deleteOne(rawId) {
      return run(async () => {
        assertWritable();
        const id = requireId(rawId);
        const batch = await withRetry(() =>
          repository.deleteOne(id, createId(), hooks),
        );
        if (batch === null) throw new ContactsError("NOT_FOUND");
        return toUndoResult(batch);
      });
    },

    deleteAll() {
      return run(async () => {
        assertWritable();
        const batch = await withRetry(() =>
          repository.deleteAll(createId(), hooks),
        );
        return toUndoResult(batch);
      });
    },

    restore(body) {
      return run(async () => {
        assertWritable();
        const batchId = requireId(batchIdOf(body));
        return withRetry(() => repository.restore(batchId, hooks));
      });
    },

    purge() {
      return run(async () => {
        assertWritable();
        return withRetry(() => repository.purge());
      });
    },
  };
}
