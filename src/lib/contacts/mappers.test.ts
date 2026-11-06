import { describe, expect, it } from "vitest";
import type { Contact as ContactRow } from "@/generated/prisma/client";
import { toContact, toContactCreateData, toUndoResult } from "./mappers";

const row: ContactRow = {
  id: "6f1c2a9e-3b4d-4c8a-9f21-7d5e8b0a1c34",
  name: "Ana García",
  phone: "+1 (555) 123-4567",
  email: "ana@email.com",
  role: "Amigo",
  company: "",
  isFavorite: true,
  createdAt: new Date("2026-01-15T09:00:00.000Z"),
  updatedAt: new Date("2026-01-16T10:30:00.123Z"),
  deletedAt: null,
  deletedBatchId: null,
};

describe("toContact", () => {
  it("convierte la fila en DTO con fechas ISO", () => {
    expect(toContact(row)).toEqual({
      id: row.id,
      name: "Ana García",
      phone: "+1 (555) 123-4567",
      email: "ana@email.com",
      role: "Amigo",
      company: "",
      isFavorite: true,
      createdAt: "2026-01-15T09:00:00.000Z",
      updatedAt: "2026-01-16T10:30:00.123Z",
    });
  });

  it("no expone los campos internos de borrado", () => {
    const deleted: ContactRow = {
      ...row,
      deletedAt: new Date("2026-01-17T00:00:00.000Z"),
      deletedBatchId: "00000000-0000-4000-8000-000000000001",
    };

    expect(toContact(deleted)).not.toHaveProperty("deletedAt");
    expect(toContact(deleted)).not.toHaveProperty("deletedBatchId");
  });
});

describe("toContactCreateData", () => {
  it("incluye el id y la entrada, sin timestamps", () => {
    const data = toContactCreateData(row.id, {
      name: "Ana",
      phone: "",
      email: "ana@email.com",
      role: "Trabajo",
      company: "Acme",
      isFavorite: false,
    });

    expect(data).toEqual({
      id: row.id,
      name: "Ana",
      phone: "",
      email: "ana@email.com",
      role: "Trabajo",
      company: "Acme",
      isFavorite: false,
    });
    expect(data).not.toHaveProperty("createdAt");
    expect(data).not.toHaveProperty("updatedAt");
  });
});

describe("toUndoResult", () => {
  it("devuelve el resultado vacío sin lote", () => {
    expect(toUndoResult(null)).toEqual({
      count: 0,
      batchId: null,
      expiresAt: null,
    });
  });

  it("convierte el lote con la expiración en ISO", () => {
    expect(
      toUndoResult({
        id: "00000000-0000-4000-8000-000000000002",
        contactCount: 3,
        expiresAt: new Date("2026-01-15T09:00:05.000Z"),
      }),
    ).toEqual({
      count: 3,
      batchId: "00000000-0000-4000-8000-000000000002",
      expiresAt: "2026-01-15T09:00:05.000Z",
    });
  });
});
