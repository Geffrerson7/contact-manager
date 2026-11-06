import { describe, expect, it } from "vitest";
import { makeContact } from "@/test/factories";
import {
  selectContactList,
  selectFilteredContacts,
  selectNeighbors,
} from "./selectors";
import type { ContactFilters } from "./types";

const ana = makeContact({
  name: "Ana García",
  email: "ana@email.com",
  phone: "+1 (555) 123-4567",
  role: "Amigo",
  isFavorite: true,
});
const jose = makeContact({
  name: "José Pérez",
  email: "jose@trabajo.com",
  phone: "+51 987-654-321",
  role: "Trabajo",
});
const maria = makeContact({
  name: "María López",
  email: "",
  phone: "0051 912 345 678",
  role: "Familia",
  company: "Acme",
  isFavorite: true,
});
const otro = makeContact({
  name: "Zoe",
  email: "zoe@example.com",
  phone: "",
  role: "Otro",
});

const all = [ana, jose, maria, otro];

function filters(q = "", onlyFavorites = false): ContactFilters {
  return { q, onlyFavorites };
}

function names(contacts: readonly { name: string }[]): string[] {
  return contacts.map((contact) => contact.name);
}

describe("selectFilteredContacts", () => {
  it("devuelve todos, en el mismo orden, sin filtros", () => {
    expect(selectFilteredContacts(all, filters())).toEqual(all);
  });

  it("trata una consulta de solo espacios como vacía", () => {
    expect(selectFilteredContacts(all, filters("   "))).toEqual(all);
  });

  it("filtra solo favoritos", () => {
    expect(names(selectFilteredContacts(all, filters("", true)))).toEqual([
      "Ana García",
      "María López",
    ]);
  });

  it("busca por nombre sin distinguir acentos ni mayúsculas", () => {
    expect(names(selectFilteredContacts(all, filters("JOSE")))).toEqual([
      "José Pérez",
    ]);
    expect(names(selectFilteredContacts(all, filters("garcía")))).toEqual([
      "Ana García",
    ]);
    expect(names(selectFilteredContacts(all, filters("  maria ")))).toEqual([
      "María López",
    ]);
  });

  it("busca por email", () => {
    expect(names(selectFilteredContacts(all, filters("@trabajo")))).toEqual([
      "José Pérez",
    ]);
  });

  it("busca por categoría", () => {
    expect(names(selectFilteredContacts(all, filters("familia")))).toEqual([
      "María López",
    ]);
  });

  it("no busca por empresa", () => {
    expect(selectFilteredContacts(all, filters("acme"))).toEqual([]);
  });

  it("busca por teléfono con separadores y prefijos", () => {
    expect(names(selectFilteredContacts(all, filters("555-123")))).toEqual([
      "Ana García",
    ]);
    expect(
      names(selectFilteredContacts(all, filters("+51 987 654 321"))),
    ).toEqual(["José Pérez"]);
    expect(
      names(selectFilteredContacts(all, filters("+51 912345678"))),
    ).toEqual(["María López"]);
  });

  it("no aplica la rama telefónica si la consulta tiene letras", () => {
    expect(selectFilteredContacts(all, filters("tel 555"))).toEqual([]);
  });

  it("combina búsqueda y favoritos", () => {
    expect(names(selectFilteredContacts(all, filters("a", true)))).toEqual([
      "Ana García",
      "María López",
    ]);
    expect(selectFilteredContacts(all, filters("jose", true))).toEqual([]);
  });

  it("no muta la lista recibida", () => {
    const input = [...all];
    selectFilteredContacts(input, filters("ana", true));
    expect(input).toEqual(all);
  });
});

describe("selectContactList", () => {
  it("sin onlyFavorites: total = coincidencias con q; favorites = favoritas entre ellas", () => {
    // María no tiene email: «@» deja fuera a una de las dos favoritas.
    const result = selectContactList(all, filters("@"));

    expect(names(result.contacts)).toEqual(["Ana García", "José Pérez", "Zoe"]);
    expect(result.total).toBe(3);
    expect(result.favorites).toBe(1);
    expect(result.filters).toEqual({ q: "@", onlyFavorites: false });
  });

  it("con onlyFavorites: total se reduce a las favoritas y favorites no cambia", () => {
    const result = selectContactList(all, filters("@", true));

    expect(names(result.contacts)).toEqual(["Ana García"]);
    expect(result.total).toBe(1);
    expect(result.favorites).toBe(1);
    expect(result.filters).toEqual({ q: "@", onlyFavorites: true });
  });

  it("3 coincidencias con 2 favoritas: 3/2 sin filtro y 2/2 con onlyFavorites", () => {
    const list = [ana, jose, maria];
    const sinFiltro = selectContactList(list, filters(""));
    const soloFavoritos = selectContactList(list, filters("", true));

    expect([sinFiltro.total, sinFiltro.favorites]).toEqual([3, 2]);
    expect([soloFavoritos.total, soloFavoritos.favorites]).toEqual([2, 2]);
    expect(names(soloFavoritos.contacts)).toEqual([
      "Ana García",
      "María López",
    ]);
  });

  it("favorites no depende de onlyFavorites; total sí", () => {
    for (const q of ["", "a", "@", "555", "nadie"]) {
      const off = selectContactList(all, filters(q, false));
      const on = selectContactList(all, filters(q, true));

      expect(on.favorites).toBe(off.favorites);
      expect(on.total).toBe(off.favorites);
      expect(off.total).toBe(off.contacts.length);
      expect(on.total).toBe(on.contacts.length);
    }
  });

  it("coincide con selectFilteredContacts para los contactos devueltos", () => {
    expect(selectContactList(all, filters("a", true)).contacts).toEqual(
      selectFilteredContacts(all, filters("a", true)),
    );
  });

  it("devuelve contadores a cero si no hay coincidencias", () => {
    expect(selectContactList(all, filters("nadie"))).toEqual({
      contacts: [],
      total: 0,
      favorites: 0,
      filters: { q: "nadie", onlyFavorites: false },
    });
  });

  it("no expone claves adicionales del objeto de filtros", () => {
    const extended = { q: "", onlyFavorites: true, extra: 1 };
    expect(selectContactList(all, extended).filters).toEqual({
      q: "",
      onlyFavorites: true,
    });
  });
});

describe("selectNeighbors", () => {
  it("calcula anterior y siguiente en el medio", () => {
    expect(selectNeighbors(all, jose.id)).toEqual({
      index: 1,
      total: 4,
      previous: ana,
      next: maria,
    });
  });

  it("no tiene anterior en el primero ni siguiente en el último", () => {
    expect(selectNeighbors(all, ana.id)).toMatchObject({
      index: 0,
      previous: null,
      next: jose,
    });
    expect(selectNeighbors(all, otro.id)).toMatchObject({
      index: 3,
      previous: maria,
      next: null,
    });
  });

  it("funciona con un único elemento", () => {
    expect(selectNeighbors([ana], ana.id)).toEqual({
      index: 0,
      total: 1,
      previous: null,
      next: null,
    });
  });

  it("devuelve null si el contacto no está en la lista", () => {
    expect(
      selectNeighbors(all, "00000000-0000-4000-8000-ffffffffffff"),
    ).toBeNull();
    expect(selectNeighbors([], ana.id)).toBeNull();
  });

  it("normaliza el id: acepta mayúsculas (como PostgreSQL)", () => {
    const hex = makeContact({ id: "6f1c2a9e-3b4d-4c8a-9f21-7d5e8b0a1c34" });
    const list = [ana, hex, jose];

    expect(selectNeighbors(list, hex.id.toUpperCase())).toEqual({
      index: 1,
      total: 3,
      previous: ana,
      next: jose,
    });
  });

  it("devuelve null si el id no es un UUID", () => {
    expect(selectNeighbors(all, "no-es-uuid")).toBeNull();
    expect(selectNeighbors(all, ` ${ana.id}`)).toBeNull();
  });

  it("usa el orden de la lista filtrada (F2-04)", () => {
    const favorites = selectFilteredContacts(all, filters("", true));
    expect(selectNeighbors(favorites, ana.id)).toMatchObject({
      next: maria,
      total: 2,
    });
  });
});
