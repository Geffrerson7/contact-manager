import { describe, expect, it, vi } from "vitest";
import { ContactsError } from "./errors";
import type { ContactRow, ContactsRepository } from "./repository";
import { createContactsService } from "./service";

const ID = "6f1c2a9e-3b4d-4c8a-9f21-7d5e8b0a1c34";

function row(overrides: Partial<ContactRow> = {}): ContactRow {
  return {
    id: ID,
    name: "Ana",
    phone: "",
    email: "ana@email.com",
    role: "Amigo",
    company: "",
    isFavorite: false,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    deletedAt: null,
    deletedBatchId: null,
    ...overrides,
  };
}

const batch = {
  id: ID,
  contactCount: 1,
  expiresAt: new Date("2026-01-01T00:00:05.000Z"),
};

function pgError(code: string) {
  return Object.assign(new Error(code), {
    code: "P2010",
    meta: { driverAdapterError: { cause: { originalCode: code } } },
  });
}

function fakeRepository(
  overrides: Partial<ContactsRepository> = {},
): ContactsRepository {
  return {
    listActive: vi.fn(async () => [row()]),
    findActive: vi.fn(async () => row()),
    create: vi.fn(async (data) => row(data)),
    replace: vi.fn(async (_id, data) => row(data)),
    updateLocked: vi.fn(async (_id, plan) => {
      const current = row();
      const changes = plan(current);
      return changes === null ? current : row(changes);
    }),
    setFavorite: vi.fn(async (_id, isFavorite) => row({ isFavorite })),
    deleteOne: vi.fn(async () => batch),
    deleteAll: vi.fn(async () => batch),
    restore: vi.fn(async () => ({ restored: 1, status: "restored" as const })),
    purge: vi.fn(async () => ({ acquired: true, batches: 0 })),
    ...overrides,
  };
}

async function codeOf(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise;
    return undefined;
  } catch (error) {
    return error instanceof ContactsError ? error.code : "no-ContactsError";
  }
}

describe("modo de acceso", () => {
  it("en read-only rechaza antes de validar el id o el cuerpo y no llama al repositorio", async () => {
    const repository = fakeRepository();
    const service = createContactsService({
      repository,
      accessMode: "read-only",
    });

    expect(await codeOf(service.create(null))).toBe("READ_ONLY");
    expect(await codeOf(service.replace("x", null))).toBe("READ_ONLY");
    expect(await codeOf(service.patch("x", null))).toBe("READ_ONLY");
    expect(await codeOf(service.setFavorite("x", null))).toBe("READ_ONLY");
    expect(await codeOf(service.deleteOne("x"))).toBe("READ_ONLY");
    expect(await codeOf(service.deleteAll())).toBe("READ_ONLY");
    expect(await codeOf(service.restore(null))).toBe("READ_ONLY");
    expect(await codeOf(service.purge())).toBe("READ_ONLY");

    for (const method of Object.values(repository)) {
      expect(method).not.toHaveBeenCalled();
    }
  });

  it("en read-only las lecturas no purgan", async () => {
    const repository = fakeRepository();
    const service = createContactsService({
      repository,
      accessMode: "read-only",
    });

    await service.list({ q: "", onlyFavorites: false });
    await service.get(ID);
    expect(repository.purge).not.toHaveBeenCalled();
  });
});

describe("purga oportunista", () => {
  it("purga en la primera lectura y respeta el throttle de 1 min", async () => {
    let clock = 1_000;
    const repository = fakeRepository();
    const service = createContactsService({
      repository,
      accessMode: "read-write",
      now: () => clock,
    });

    await service.list({ q: "", onlyFavorites: false });
    await service.get(ID);
    expect(repository.purge).toHaveBeenCalledTimes(1);

    clock += 60_000;
    await service.getDetail(ID, { q: "", onlyFavorites: false });
    expect(repository.purge).toHaveBeenCalledTimes(2);
  });

  it("un fallo de la purga no hace fallar la lectura", async () => {
    const repository = fakeRepository({
      purge: vi.fn(async () => {
        throw pgError("55P03");
      }),
    });
    const service = createContactsService({
      repository,
      accessMode: "read-write",
    });

    expect((await service.list({ q: "", onlyFavorites: false })).total).toBe(1);
  });

  it("usa Date.now si no se inyecta reloj", async () => {
    const repository = fakeRepository();
    const service = createContactsService({
      repository,
      accessMode: "read-write",
    });
    await service.list({ q: "", onlyFavorites: false });
    expect(repository.purge).toHaveBeenCalledTimes(1);
  });
});

describe("reintentos (40001/40P01)", () => {
  it("reintenta un deadlock y devuelve el resultado", async () => {
    const deleteAll = vi
      .fn<ContactsRepository["deleteAll"]>()
      .mockRejectedValueOnce(pgError("40P01"))
      .mockRejectedValueOnce(pgError("40001"))
      .mockResolvedValueOnce(batch);
    const service = createContactsService({
      repository: fakeRepository({ deleteAll }),
      accessMode: "read-write",
    });

    expect((await service.deleteAll()).count).toBe(1);
    expect(deleteAll).toHaveBeenCalledTimes(3);
    // Cada intento usa un lote nuevo: un intento revertido no reutiliza su id.
    const batchIds = deleteAll.mock.calls.map(([batchId]) => batchId);
    expect(new Set(batchIds).size).toBe(3);
  });

  it("agotados los reintentos responde CONFLICT", async () => {
    const restore = vi.fn<ContactsRepository["restore"]>(async () => {
      throw pgError("40P01");
    });
    const service = createContactsService({
      repository: fakeRepository({ restore }),
      accessMode: "read-write",
    });

    expect(await codeOf(service.restore({ batchId: ID }))).toBe("CONFLICT");
    expect(restore).toHaveBeenCalledTimes(3);
  });

  it("no reintenta otros errores", async () => {
    const deleteOne = vi.fn<ContactsRepository["deleteOne"]>(async () => {
      throw pgError("55P03");
    });
    const service = createContactsService({
      repository: fakeRepository({ deleteOne }),
      accessMode: "read-write",
    });

    expect(await codeOf(service.deleteOne(ID))).toBe("CONFLICT");
    expect(deleteOne).toHaveBeenCalledTimes(1);
  });
});

describe("casos de uso con repositorio falso", () => {
  it("normaliza el id antes de llamar al repositorio", async () => {
    const repository = fakeRepository();
    const service = createContactsService({
      repository,
      accessMode: "read-write",
    });

    await service.get(ID.toUpperCase());
    await service.setFavorite(ID.toUpperCase(), { isFavorite: true });
    await service.deleteOne(ID.toUpperCase());
    await service.restore({ batchId: ID.toUpperCase() });

    expect(repository.findActive).toHaveBeenCalledWith(ID);
    expect(repository.setFavorite).toHaveBeenCalledWith(ID, true);
    expect(vi.mocked(repository.deleteOne).mock.calls[0]![0]).toBe(ID);
    expect(vi.mocked(repository.restore).mock.calls[0]![0]).toBe(ID);
  });

  it("patch solo envía los campos que cambian", async () => {
    const repository = fakeRepository();
    const service = createContactsService({
      repository,
      accessMode: "read-write",
    });
    let changes: unknown;
    vi.mocked(repository.updateLocked).mockImplementationOnce(
      async (_id, plan) => {
        changes = plan(row());
        return row();
      },
    );

    await service.patch(ID, {
      name: "Ana",
      email: "OTRA@EMAIL.COM",
      company: " ",
    });
    expect(changes).toEqual({ email: "otra@email.com" });
  });

  it("patch sin cambios reales no pide UPDATE (plan → null)", async () => {
    const repository = fakeRepository();
    const service = createContactsService({
      repository,
      accessMode: "read-write",
    });
    let changes: unknown = "sin llamar";
    vi.mocked(repository.updateLocked).mockImplementationOnce(
      async (_id, plan) => {
        changes = plan(row());
        return row();
      },
    );

    await service.patch(ID, { name: " Ana " });
    expect(changes).toBeNull();
  });

  it("patch vacío no abre transacción", async () => {
    const repository = fakeRepository();
    const service = createContactsService({
      repository,
      accessMode: "read-write",
    });

    await service.patch(ID, {});
    expect(repository.updateLocked).not.toHaveBeenCalled();
    expect(repository.findActive).toHaveBeenCalledWith(ID);
  });

  it("traduce los errores no clasificados a INTERNAL_ERROR", async () => {
    const service = createContactsService({
      repository: fakeRepository({
        listActive: vi.fn(async () => {
          throw new Error("fallo inesperado");
        }),
      }),
      accessMode: "read-write",
    });

    expect(await codeOf(service.list({ q: "", onlyFavorites: false }))).toBe(
      "INTERNAL_ERROR",
    );
  });

  it("NOT_FOUND cuando el repositorio no encuentra el contacto", async () => {
    const service = createContactsService({
      repository: fakeRepository({
        findActive: vi.fn(async () => null),
        replace: vi.fn(async () => null),
        updateLocked: vi.fn(async () => null),
        setFavorite: vi.fn(async () => null),
        deleteOne: vi.fn(async () => null),
      }),
      accessMode: "read-write",
    });
    const body = {
      name: "Ana",
      phone: "",
      email: "ana@email.com",
      role: "Amigo",
      company: "",
      isFavorite: false,
    };

    expect(await codeOf(service.get(ID))).toBe("NOT_FOUND");
    expect(await codeOf(service.replace(ID, body))).toBe("NOT_FOUND");
    expect(await codeOf(service.patch(ID, { name: "B" }))).toBe("NOT_FOUND");
    expect(await codeOf(service.patch(ID, {}))).toBe("NOT_FOUND");
    expect(await codeOf(service.setFavorite(ID, { isFavorite: true }))).toBe(
      "NOT_FOUND",
    );
    expect(await codeOf(service.deleteOne(ID))).toBe("NOT_FOUND");
  });

  it("deleteAll sin lote devuelve el UndoResult vacío", async () => {
    const service = createContactsService({
      repository: fakeRepository({ deleteAll: vi.fn(async () => null) }),
      accessMode: "read-write",
    });
    expect(await service.deleteAll()).toEqual({
      count: 0,
      batchId: null,
      expiresAt: null,
    });
  });
});
