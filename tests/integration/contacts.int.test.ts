// M3 — Casos de uso de contactos contra PostgreSQL real (§14.5: CRUD, favorito, búsqueda).

import type pg from "pg";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { toContactsError } from "@/lib/contacts/errors";
import type { ContactsService } from "@/lib/contacts/service";
import { MESSAGES } from "@/lib/contacts/validation";
import {
  createTestPrisma,
  createTestService,
  expectContactsError,
  input,
} from "./helpers/app";
import { connectToTestDatabase, truncateAll } from "./helpers/db";

const UNKNOWN_ID = "6f1c2a9e-3b4d-4c8a-9f21-7d5e8b0a1c34";

let client: pg.Client;
let prisma: PrismaClient;
let service: ContactsService;

beforeAll(async () => {
  client = await connectToTestDatabase();
  prisma = createTestPrisma();
  service = createTestService(prisma);
});

afterEach(async () => {
  await truncateAll(client);
});

afterAll(async () => {
  await prisma?.$disconnect();
  await client?.end();
});

async function countContacts(): Promise<number> {
  const { rows } = await client.query<{ n: string }>(
    `SELECT count(*) AS n FROM "contacts"`,
  );
  return Number(rows[0]!.n);
}

describe("create", () => {
  it("valida, genera el UUID y deja los timestamps a PostgreSQL", async () => {
    const created = await service.create(
      input({ name: "  Ana  ", email: "ANA@X.COM" }),
    );

    expect(created).toMatchObject({
      name: "Ana",
      email: "ana@x.com",
      phone: "+51 987-654-321",
      role: "Amigo",
      company: "Acme",
      isFavorite: false,
    });
    expect(created.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(created.createdAt).toBe(created.updatedAt);
    expect(await service.get(created.id)).toEqual(created);
  });

  it("permite emails duplicados (F2-07)", async () => {
    await service.create(input());
    await service.create(input());
    expect(await countContacts()).toBe(2);
  });

  it("rechaza entradas inválidas sin escribir", async () => {
    const error = await expectContactsError(
      service.create(input({ name: "", email: "x" })),
      "VALIDATION_ERROR",
    );
    expect(error.fields).toEqual({
      name: MESSAGES.nameRequired,
      email: MESSAGES.emailFormat,
    });
    expect(await countContacts()).toBe(0);
  });

  it("exige isFavorite en la creación", async () => {
    const { isFavorite: _omitted, ...body } = input();
    void _omitted;
    const error = await expectContactsError(
      service.create(body),
      "VALIDATION_ERROR",
    );
    expect(error.fields).toEqual({ isFavorite: MESSAGES.favoriteType });
  });

  it("un cuerpo que no es objeto produce VALIDATION_ERROR sin fields", async () => {
    const error = await expectContactsError(
      service.create(null),
      "VALIDATION_ERROR",
    );
    expect(error.fields).toBeUndefined();
  });
});

describe("get", () => {
  it("normaliza el id: acepta mayúsculas", async () => {
    const created = await service.create(input());
    expect(await service.get(created.id.toUpperCase())).toEqual(created);
  });

  it.each([undefined, "", "no-es-uuid", `{${UNKNOWN_ID}}`, 42])(
    "responde INVALID_ID ante %j",
    async (rawId) => {
      await expectContactsError(service.get(rawId), "INVALID_ID");
    },
  );

  it("responde NOT_FOUND si no existe", async () => {
    await expectContactsError(service.get(UNKNOWN_ID), "NOT_FOUND");
  });

  it("responde NOT_FOUND si está borrado lógicamente", async () => {
    const created = await service.create(input());
    await service.deleteOne(created.id);
    await expectContactsError(service.get(created.id), "NOT_FOUND");
  });
});

describe("replace (PUT)", () => {
  it("reemplaza el contacto completo", async () => {
    const created = await service.create(input());
    const replaced = await service.replace(
      created.id,
      input({
        name: "Ana B.",
        phone: "",
        company: "",
        role: "Trabajo",
        isFavorite: true,
      }),
    );

    expect(replaced).toMatchObject({
      id: created.id,
      name: "Ana B.",
      phone: "",
      email: "ana@email.com",
      company: "",
      role: "Trabajo",
      isFavorite: true,
      createdAt: created.createdAt,
    });
    expect(replaced.updatedAt > created.updatedAt).toBe(true);
  });

  it("exige isFavorite: un PUT sin él no desmarca el favorito", async () => {
    const created = await service.create(input({ isFavorite: true }));
    const { isFavorite: _omitted, ...body } = input({ name: "Otro" });
    void _omitted;

    await expectContactsError(
      service.replace(created.id, body),
      "VALIDATION_ERROR",
    );
    expect(await service.get(created.id)).toEqual(created);
  });

  it("valida la regla teléfono o correo", async () => {
    const created = await service.create(input());
    const error = await expectContactsError(
      service.replace(created.id, input({ phone: "", email: "" })),
      "VALIDATION_ERROR",
    );
    expect(error.fields).toEqual({
      contactMethod: MESSAGES.contactMethodRequired,
    });
  });

  it("valida el id antes que el cuerpo y responde NOT_FOUND si no existe", async () => {
    await expectContactsError(service.replace("x", null), "INVALID_ID");
    await expectContactsError(
      service.replace(UNKNOWN_ID, input()),
      "NOT_FOUND",
    );
  });

  it("no modifica contactos borrados", async () => {
    const created = await service.create(input());
    await service.deleteOne(created.id);
    await expectContactsError(
      service.replace(created.id, input()),
      "NOT_FOUND",
    );
  });
});

describe("patch (PATCH)", () => {
  it("combina el parche con el contacto actual", async () => {
    const created = await service.create(input({ isFavorite: true }));
    const patched = await service.patch(created.id, {
      name: "  Ana P. ",
      company: "",
    });

    expect(patched).toMatchObject({
      id: created.id,
      name: "Ana P.",
      company: "",
      phone: created.phone,
      email: created.email,
      role: created.role,
      isFavorite: true,
    });
    expect(patched.updatedAt > created.updatedAt).toBe(true);
  });

  it("no puede dejar el contacto sin teléfono ni correo", async () => {
    const created = await service.create(input({ phone: "" }));

    const error = await expectContactsError(
      service.patch(created.id, { email: "" }),
      "VALIDATION_ERROR",
    );
    expect(error.fields).toEqual({
      contactMethod: MESSAGES.contactMethodRequired,
    });
    expect(await service.get(created.id)).toEqual(created);
  });

  it("permite vaciar un medio si queda el otro", async () => {
    const created = await service.create(input());
    expect(await service.patch(created.id, { phone: "" })).toMatchObject({
      phone: "",
      email: created.email,
    });
  });

  it("un parche vacío no escribe ni cambia updatedAt", async () => {
    const created = await service.create(input());
    expect(await service.patch(created.id, {})).toEqual(created);
    // isFavorite y claves desconocidas se ignoran: equivale a un parche vacío.
    expect(
      await service.patch(created.id, { isFavorite: true, id: "x" }),
    ).toEqual(created);
  });

  it("un parche con los mismos valores no cambia updatedAt", async () => {
    const created = await service.create(input());
    expect(
      await service.patch(created.id, {
        name: created.name,
        email: "ANA@EMAIL.COM",
      }),
    ).toEqual(created);
  });

  it("rechaza campos inválidos del parche", async () => {
    const created = await service.create(input());
    const error = await expectContactsError(
      service.patch(created.id, { role: "Jefe" }),
      "VALIDATION_ERROR",
    );
    expect(error.fields).toEqual({ role: MESSAGES.roleInvalid });
  });

  it("responde INVALID_ID y NOT_FOUND, también con parche vacío", async () => {
    await expectContactsError(service.patch("x", {}), "INVALID_ID");
    await expectContactsError(service.patch(UNKNOWN_ID, {}), "NOT_FOUND");
    await expectContactsError(
      service.patch(UNKNOWN_ID, { name: "A" }),
      "NOT_FOUND",
    );
  });
});

describe("setFavorite", () => {
  it("cambia isFavorite sin tocar updatedAt", async () => {
    const created = await service.create(input());
    const favorite = await service.setFavorite(created.id, {
      isFavorite: true,
    });

    expect(favorite).toEqual({ ...created, isFavorite: true });
    expect(
      await service.setFavorite(created.id, { isFavorite: false }),
    ).toEqual(created);
  });

  it("valida el cuerpo y el id", async () => {
    const created = await service.create(input());
    const error = await expectContactsError(
      service.setFavorite(created.id, { isFavorite: "true" }),
      "VALIDATION_ERROR",
    );
    expect(error.fields).toEqual({ isFavorite: MESSAGES.favoriteType });
    await expectContactsError(
      service.setFavorite("x", { isFavorite: true }),
      "INVALID_ID",
    );
    await expectContactsError(
      service.setFavorite(UNKNOWN_ID, { isFavorite: true }),
      "NOT_FOUND",
    );
  });
});

describe("list y getDetail", () => {
  async function seedThree() {
    const ana = await service.create(input({ name: "Ana", isFavorite: true }));
    const jose = await service.create(input({ name: "José", role: "Trabajo" }));
    const maria = await service.create(
      input({ name: "María", isFavorite: true }),
    );
    return { ana, jose, maria };
  }

  it("lista los activos en orden de creación, con búsqueda y contadores (§10.3)", async () => {
    const { ana, jose, maria } = await seedThree();

    expect(await service.list({ q: "", onlyFavorites: false })).toEqual({
      contacts: [ana, jose, maria],
      total: 3,
      favorites: 2,
      filters: { q: "", onlyFavorites: false },
    });

    const favorites = await service.list({ q: "", onlyFavorites: true });
    expect(favorites.contacts).toEqual([ana, maria]);
    expect([favorites.total, favorites.favorites]).toEqual([2, 2]);

    expect(
      (await service.list({ q: "JOSE", onlyFavorites: false })).contacts,
    ).toEqual([jose]);
    expect(
      (await service.list({ q: "987 654 321", onlyFavorites: false })).total,
    ).toBe(3);
  });

  it("excluye los borrados del listado", async () => {
    const { ana, jose } = await seedThree();
    await service.deleteOne(jose.id);

    const result = await service.list({ q: "", onlyFavorites: false });
    expect(result.contacts.map((contact) => contact.id)).not.toContain(jose.id);
    expect(result.contacts[0]).toEqual(ana);
  });

  it("calcula Anterior/Siguiente sobre la lista filtrada (F2-04)", async () => {
    const { ana, jose, maria } = await seedThree();

    expect(
      await service.getDetail(jose.id, { q: "", onlyFavorites: false }),
    ).toEqual({
      contact: jose,
      navigation: { index: 1, total: 3, previous: ana, next: maria },
    });
    expect(
      await service.getDetail(maria.id.toUpperCase(), {
        q: "",
        onlyFavorites: true,
      }),
    ).toEqual({
      contact: maria,
      navigation: { index: 1, total: 2, previous: ana, next: null },
    });
  });

  it("devuelve el detalle sin navegación si el contacto no está en los resultados", async () => {
    const { jose } = await seedThree();
    expect(
      await service.getDetail(jose.id, { q: "", onlyFavorites: true }),
    ).toEqual({
      contact: jose,
      navigation: null,
    });
  });

  it("getDetail responde INVALID_ID y NOT_FOUND", async () => {
    await expectContactsError(
      service.getDetail("x", { q: "", onlyFavorites: false }),
      "INVALID_ID",
    );
    await expectContactsError(
      service.getDetail(UNKNOWN_ID, { q: "", onlyFavorites: false }),
      "NOT_FOUND",
    );
  });
});

describe("contacts_contactable_check (0004)", () => {
  it("PostgreSQL rechaza un contacto sin teléfono ni correo", async () => {
    const error: unknown = await client
      .query(
        `INSERT INTO "contacts" ("id", "name", "role") VALUES (gen_random_uuid(), 'X', 'Amigo')`,
      )
      .then(
        () => null,
        (reason: unknown) => reason,
      );
    expect(error).toMatchObject({
      code: "23514",
      constraint: "contacts_contactable_check",
    });
  });

  it("el servicio traduce la violación a VALIDATION_ERROR de contactMethod", async () => {
    // Saltarse la validación del servicio solo es posible con escrituras directas o
    // concurrentes; se simula con una escritura de Prisma que no pasa por el servicio.
    const created = await service.create(input({ phone: "" }));
    const error: unknown = await prisma.contact
      .update({ where: { id: created.id }, data: { email: "" } })
      .then(
        () => null,
        (reason: unknown) => reason,
      );
    const mapped = toContactsError(error);
    expect(mapped.code).toBe("VALIDATION_ERROR");
    expect(mapped.fields).toEqual({
      contactMethod: MESSAGES.contactMethodRequired,
    });
  });
});

describe("errores de persistencia", () => {
  it("una base inalcanzable produce DB_UNAVAILABLE", async () => {
    const unreachable = createTestPrisma(
      "postgresql://u:p@127.0.0.1:1/contact_manager_test",
    );
    try {
      const offline = createTestService(unreachable);
      await expectContactsError(
        offline.list({ q: "", onlyFavorites: false }),
        "DB_UNAVAILABLE",
      );
      await expectContactsError(offline.create(input()), "DB_UNAVAILABLE");
    } finally {
      await unreachable.$disconnect();
    }
  });
});
