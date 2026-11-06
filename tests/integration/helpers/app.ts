// Servicio y repositorio reales contra la base de pruebas (nunca DATABASE_URL ni Neon).

import { PrismaPg } from "@prisma/adapter-pg";
import { expect } from "vitest";
import { PrismaClient } from "@/generated/prisma/client";
import { ContactsError, type ContactsErrorCode } from "@/lib/contacts/errors";
import {
  createContactsRepository,
  type UndoTransactionHooks,
} from "@/lib/contacts/repository";
import {
  createContactsService,
  type ContactsService,
} from "@/lib/contacts/service";
import type { AccessMode } from "@/lib/env";
import { getTestDatabaseUrl } from "./db";

export function createTestPrisma(
  connectionString = getTestDatabaseUrl(),
): PrismaClient {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

export function createTestService(
  prisma: PrismaClient,
  options: {
    accessMode?: AccessMode;
    hooks?: UndoTransactionHooks;
    now?: () => number;
  } = {},
): ContactsService {
  return createContactsService({
    repository: createContactsRepository(prisma),
    accessMode: options.accessMode ?? "read-write",
    hooks: options.hooks,
    // Por defecto el reloj nunca avanza: solo la primera lectura purga.
    now: options.now ?? (() => 0),
  });
}

export const validInput = {
  name: "Ana García",
  phone: "+51 987-654-321",
  email: "ana@email.com",
  role: "Amigo",
  company: "Acme",
  isFavorite: false,
} as const;

export function input(overrides: Record<string, unknown> = {}) {
  return { ...validInput, ...overrides };
}

/** Espera un `ContactsError` con ese código; cualquier otro resultado falla la prueba. */
export async function expectContactsError(
  promise: Promise<unknown>,
  code: ContactsErrorCode,
): Promise<ContactsError> {
  const error: unknown = await promise.then(
    () => null,
    (reason: unknown) => reason,
  );
  expect(error, `se esperaba ContactsError ${code}`).toBeInstanceOf(
    ContactsError,
  );
  expect((error as ContactsError).code).toBe(code);
  return error as ContactsError;
}
