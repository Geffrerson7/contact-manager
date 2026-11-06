/**
 * Composición del servidor: un único servicio de contactos por proceso.
 * Solo servidor. Las páginas (M5) y los Route Handlers (M4) obtienen el servicio de aquí.
 */
import { createContactsRepository } from "@/lib/contacts/repository";
import {
  createContactsService,
  type ContactsService,
} from "@/lib/contacts/service";
import { getAccessMode } from "@/lib/env";
import { prisma } from "@/lib/prisma";

let service: ContactsService | undefined;

export function getContactsService(): ContactsService {
  service ??= createContactsService({
    repository: createContactsRepository(prisma),
    accessMode: getAccessMode(),
  });
  return service;
}
