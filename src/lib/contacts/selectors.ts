/**
 * Selectores puros sobre listas de contactos (§10.3, F2-04).
 * Se usan en el servidor (servicio) y pueden usarse en el cliente.
 */
import { normalizeId } from "./ids";
import {
  isPhoneQuery,
  normalizePhoneDigits,
  normalizeText,
  phoneMatches,
} from "./search";
import type {
  Contact,
  ContactFilters,
  ContactListResult,
  ContactNeighbors,
} from "./types";

export function selectFilteredContacts(
  contacts: readonly Contact[],
  filters: ContactFilters,
): Contact[] {
  const q = normalizeText(filters.q);
  const qDigits = normalizePhoneDigits(filters.q);
  const phoneQuery = isPhoneQuery(filters.q);

  return contacts.filter((contact) => {
    if (filters.onlyFavorites && !contact.isFavorite) return false;
    if (q === "") return true;

    return (
      normalizeText(contact.name).includes(q) ||
      normalizeText(contact.email).includes(q) ||
      normalizeText(contact.role).includes(q) ||
      (phoneQuery && phoneMatches(contact.phone, qDigits))
    );
  });
}

/**
 * `data` de GET /api/contacts (§8.2):
 * - `total`: contactos devueltos, es decir, los que cumplen `q` y `onlyFavorites`.
 * - `favorites`: favoritos que cumplen `q`, ignorando `onlyFavorites`.
 *
 * Con `onlyFavorites` activo, `total === favorites`; sin él, `favorites <= total`.
 */
export function selectContactList(
  contacts: readonly Contact[],
  filters: ContactFilters,
): ContactListResult {
  const matching = selectFilteredContacts(contacts, {
    q: filters.q,
    onlyFavorites: false,
  });
  const favorites = matching.filter((contact) => contact.isFavorite);
  const returned = filters.onlyFavorites ? favorites : matching;

  return {
    contacts: returned,
    total: returned.length,
    favorites: favorites.length,
    filters: { q: filters.q, onlyFavorites: filters.onlyFavorites },
  };
}

/**
 * Vecinos por índice dentro de `contacts`, en el orden recibido. Para F2-04 se pasa la lista
 * ya filtrada. Devuelve `null` si el contacto no está en la lista o `id` no es un UUID.
 * El `id` se normaliza a minúsculas antes de comparar, como los `uuid` de PostgreSQL.
 */
export function selectNeighbors(
  contacts: readonly Contact[],
  id: string,
): ContactNeighbors | null {
  const target = normalizeId(id);
  if (target === null) return null;

  const index = contacts.findIndex((contact) => contact.id === target);
  if (index === -1) return null;

  return {
    index,
    total: contacts.length,
    previous: contacts[index - 1] ?? null,
    next: contacts[index + 1] ?? null,
  };
}
