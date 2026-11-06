import type { Contact } from "@/lib/contacts/types";

let sequence = 0;

/** Contacto DTO válido con valores deterministas; `overrides` sustituye campos concretos. */
export function makeContact(overrides: Partial<Contact> = {}): Contact {
  sequence += 1;
  const suffix = sequence.toString(16).padStart(12, "0");

  return {
    id: `00000000-0000-4000-8000-${suffix}`,
    name: `Contacto ${sequence}`,
    phone: "",
    email: `contacto${sequence}@example.com`,
    role: "Amigo",
    company: "",
    isFavorite: false,
    createdAt: "2026-01-15T09:00:00.000Z",
    updatedAt: "2026-01-15T09:00:00.000Z",
    ...overrides,
  };
}
