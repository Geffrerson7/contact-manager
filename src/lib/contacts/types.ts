/**
 * Tipos del dominio y de los contratos de datos (§8.2, §9.2).
 * Solo tipos: no importa Prisma, React ni `next/*`.
 */
import type { ROLES } from "./constants";

export type Role = (typeof ROLES)[number];

/** DTO público de un contacto. Las fechas viajan como ISO 8601 (UTC). */
export interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: Role;
  company: string;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ContactInput {
  name: string;
  phone: string;
  email: string;
  role: Role;
  company: string;
  isFavorite: boolean;
}

export type ContactPatch = Partial<Omit<ContactInput, "isFavorite">>;

export interface FavoriteInput {
  isFavorite: boolean;
}

export interface ContactFilters {
  q: string;
  onlyFavorites: boolean;
}

/**
 * Contrato exacto de `data` en GET /api/contacts.
 * No existe `meta`: los contadores ya reflejan los filtros aplicados.
 */
export interface ContactListResult {
  contacts: Contact[];
  total: number;
  favorites: number;
  filters: ContactFilters;
}

/** Posición de un contacto dentro de una lista (ya filtrada) para Anterior/Siguiente (F2-04). */
export interface ContactNeighbors {
  index: number;
  total: number;
  previous: Contact | null;
  next: Contact | null;
}

export type UndoResult =
  | { count: 0; batchId: null; expiresAt: null }
  | { count: number; batchId: string; expiresAt: string };

export interface RestoreResult {
  restored: number;
  status: "restored" | "already_restored";
}

export type FieldName =
  | "name"
  | "phone"
  | "email"
  | "role"
  | "company"
  | "isFavorite"
  | "contactMethod";

export type FieldErrors = Partial<Record<FieldName, string>>;

export type ValidationResult<T> =
  { ok: true; value: T } | { ok: false; fieldErrors: FieldErrors };
