import { describe, expect, it } from "vitest";
import { ROLES } from "./constants";
import {
  isRole,
  MESSAGES,
  validateContactInput,
  validateContactPatch,
  validateFavoriteInput,
} from "./validation";

const valid = {
  name: "Ana García",
  phone: "+1 (555) 123-4567",
  email: "ana@email.com",
  role: "Amigo",
  company: "Acme",
  isFavorite: true,
};

function errorsOf(raw: unknown) {
  const result = validateContactInput(raw);
  if (result.ok) throw new Error("se esperaba un error de validación");
  return result.fieldErrors;
}

describe("validateContactInput — entrada válida", () => {
  it("devuelve el contacto normalizado", () => {
    expect(validateContactInput(valid)).toEqual({ ok: true, value: valid });
  });

  it("recorta espacios y pasa el email a minúsculas", () => {
    const result = validateContactInput({
      ...valid,
      name: "  Ana  ",
      phone: "  555 123 4567 ",
      email: "  ANA@Email.COM ",
      company: "  Acme  ",
    });

    expect(result).toMatchObject({
      ok: true,
      value: {
        name: "Ana",
        phone: "555 123 4567",
        email: "ana@email.com",
        company: "Acme",
      },
    });
  });

  it("aplica valores por defecto a los campos opcionales ausentes", () => {
    expect(
      validateContactInput({
        name: "Ana",
        email: "ana@email.com",
        role: "Otro",
        isFavorite: false,
      }),
    ).toEqual({
      ok: true,
      value: {
        name: "Ana",
        phone: "",
        email: "ana@email.com",
        role: "Otro",
        company: "",
        isFavorite: false,
      },
    });
  });

  it("descarta claves desconocidas y campos del servidor", () => {
    const result = validateContactInput({
      ...valid,
      id: "x",
      createdAt: "2020-01-01T00:00:00.000Z",
      deletedAt: null,
    });

    expect(result.ok && Object.keys(result.value).sort()).toEqual([
      "company",
      "email",
      "isFavorite",
      "name",
      "phone",
      "role",
    ]);
  });

  it("acepta solo teléfono o solo email", () => {
    expect(validateContactInput({ ...valid, email: "" }).ok).toBe(true);
    expect(validateContactInput({ ...valid, phone: "" }).ok).toBe(true);
  });

  it.each(ROLES)("acepta la categoría %s", (role) => {
    expect(validateContactInput({ ...valid, role }).ok).toBe(true);
  });
});

describe("validateContactInput — name", () => {
  it.each([undefined, null, 42, "", "    "])("exige nombre (%j)", (name) => {
    expect(errorsOf({ ...valid, name }).name).toBe(MESSAGES.nameRequired);
  });

  it("acepta 80 caracteres y rechaza 81", () => {
    expect(validateContactInput({ ...valid, name: "a".repeat(80) }).ok).toBe(
      true,
    );
    expect(errorsOf({ ...valid, name: "a".repeat(81) }).name).toBe(
      MESSAGES.nameTooLong,
    );
  });

  it("cuenta caracteres, no unidades UTF-16", () => {
    expect(validateContactInput({ ...valid, name: "😀".repeat(80) }).ok).toBe(
      true,
    );
    expect(errorsOf({ ...valid, name: "😀".repeat(81) }).name).toBe(
      MESSAGES.nameTooLong,
    );
  });

  it("aplica el límite después de recortar", () => {
    expect(
      validateContactInput({ ...valid, name: ` ${"a".repeat(80)} ` }).ok,
    ).toBe(true);
  });
});

describe("validateContactInput — phone", () => {
  it.each(["555123", "+51 987-654-321", "(01) 234.5678", "123456789012345"])(
    "acepta %j",
    (phone) => {
      expect(validateContactInput({ ...valid, phone }).ok).toBe(true);
    },
  );

  it.each(["555-123x", "555/123/456", "555_123_456", "#555123"])(
    "rechaza caracteres no permitidos en %j",
    (phone) => {
      expect(errorsOf({ ...valid, phone }).phone).toBe(MESSAGES.phoneChars);
    },
  );

  it.each(["12345", "+ (12) 345", "1234567890123456"])(
    "rechaza %j por número de dígitos",
    (phone) => {
      expect(errorsOf({ ...valid, phone }).phone).toBe(MESSAGES.phoneDigits);
    },
  );

  it("rechaza más de 30 caracteres", () => {
    const phone = "1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6";
    expect(phone.length).toBe(31);
    expect(errorsOf({ ...valid, phone }).phone).toBe(MESSAGES.phoneTooLong);
  });

  it.each([null, 555123, true])(
    "rechaza tipos que no son texto (%j)",
    (phone) => {
      expect(errorsOf({ ...valid, phone }).phone).toBe(MESSAGES.phoneType);
    },
  );

  it("conserva el formato escrito por el usuario", () => {
    expect(
      validateContactInput({ ...valid, phone: "+51 (987) 654.321" }),
    ).toMatchObject({
      value: { phone: "+51 (987) 654.321" },
    });
  });
});

describe("validateContactInput — email", () => {
  it.each(["a@b.co", "nombre.apellido+tag@sub.dominio.com", "ÑANDÚ@correo.es"])(
    "acepta %j",
    (email) => {
      expect(validateContactInput({ ...valid, email }).ok).toBe(true);
    },
  );

  it.each([
    "ana",
    "ana@",
    "@dominio.com",
    "ana@dominio",
    "ana@@dominio.com",
    "ana @dominio.com",
    "ana@dominio..com",
    "ana@.dominio.com",
    "ana@dominio.com.",
  ])("rechaza el formato %j", (email) => {
    expect(errorsOf({ ...valid, email }).email).toBe(MESSAGES.emailFormat);
  });

  it("acepta 254 caracteres y rechaza 255", () => {
    const domain = "@example.com";
    expect(
      validateContactInput({
        ...valid,
        email: `${"a".repeat(254 - domain.length)}${domain}`,
      }).ok,
    ).toBe(true);
    expect(
      errorsOf({
        ...valid,
        email: `${"a".repeat(255 - domain.length)}${domain}`,
      }).email,
    ).toBe(MESSAGES.emailTooLong);
  });

  it.each([null, 1, {}])("rechaza tipos que no son texto (%j)", (email) => {
    expect(errorsOf({ ...valid, email }).email).toBe(MESSAGES.emailType);
  });
});

describe("validateContactInput — role", () => {
  it.each([undefined, null, "", "amigo", "AMIGO", "Jefe", 1])(
    "rechaza %j",
    (role) => {
      expect(errorsOf({ ...valid, role }).role).toBe(MESSAGES.roleInvalid);
    },
  );
});

describe("validateContactInput — company", () => {
  it("acepta empresa vacía", () => {
    expect(validateContactInput({ ...valid, company: "   " })).toMatchObject({
      value: { company: "" },
    });
  });

  it("acepta 80 caracteres y rechaza 81", () => {
    expect(validateContactInput({ ...valid, company: "a".repeat(80) }).ok).toBe(
      true,
    );
    expect(errorsOf({ ...valid, company: "a".repeat(81) }).company).toBe(
      MESSAGES.companyTooLong,
    );
  });

  it.each([null, 1])("rechaza tipos que no son texto (%j)", (company) => {
    expect(errorsOf({ ...valid, company }).company).toBe(MESSAGES.companyType);
  });
});

describe("validateContactInput — isFavorite", () => {
  it("es obligatorio: un PUT sin isFavorite no desmarca el favorito", () => {
    const { isFavorite: _omitted, ...withoutFavorite } = valid;
    void _omitted;

    expect(validateContactInput(withoutFavorite)).toEqual({
      ok: false,
      fieldErrors: { isFavorite: MESSAGES.favoriteType },
    });
  });

  it("trata undefined explícito igual que ausente", () => {
    expect(errorsOf({ ...valid, isFavorite: undefined })).toEqual({
      isFavorite: MESSAGES.favoriteType,
    });
  });

  it.each([null, "true", "false", 1, 0, {}, []])("rechaza %j", (isFavorite) => {
    expect(errorsOf({ ...valid, isFavorite })).toEqual({
      isFavorite: MESSAGES.favoriteType,
    });
  });

  it("acepta true", () => {
    expect(validateContactInput({ ...valid, isFavorite: true })).toMatchObject({
      value: { isFavorite: true },
    });
  });

  it("acepta false", () => {
    expect(validateContactInput({ ...valid, isFavorite: false })).toMatchObject(
      {
        value: { isFavorite: false },
      },
    );
  });
});

describe("validateContactInput — regla cruzada", () => {
  it("exige teléfono o email", () => {
    expect(errorsOf({ ...valid, phone: "", email: "" })).toEqual({
      contactMethod: MESSAGES.contactMethodRequired,
    });
    expect(errorsOf({ name: "Ana", role: "Amigo", isFavorite: false })).toEqual(
      {
        contactMethod: MESSAGES.contactMethodRequired,
      },
    );
  });

  it("trata los valores de solo espacios como vacíos", () => {
    expect(errorsOf({ ...valid, phone: "  ", email: "  " }).contactMethod).toBe(
      MESSAGES.contactMethodRequired,
    );
  });

  it("no la añade si uno de los dos campos ya es inválido", () => {
    expect(errorsOf({ ...valid, phone: "", email: "ana" })).toEqual({
      email: MESSAGES.emailFormat,
    });
    expect(errorsOf({ ...valid, phone: "12", email: "" })).toEqual({
      phone: MESSAGES.phoneDigits,
    });
  });
});

describe("validateContactInput — varios errores y entradas no objeto", () => {
  it("devuelve todos los errores de campo a la vez", () => {
    expect(
      errorsOf({
        name: "",
        phone: "abc",
        email: "x",
        role: "Jefe",
        company: 1,
        isFavorite: 1,
      }),
    ).toEqual({
      name: MESSAGES.nameRequired,
      phone: MESSAGES.phoneChars,
      email: MESSAGES.emailFormat,
      role: MESSAGES.roleInvalid,
      company: MESSAGES.companyType,
      isFavorite: MESSAGES.favoriteType,
    });
  });

  it.each([null, undefined, "texto", 42, [], [valid]])(
    "rechaza %j sin errores de campo",
    (raw) => {
      expect(validateContactInput(raw)).toEqual({ ok: false, fieldErrors: {} });
    },
  );
});

describe("validateContactPatch", () => {
  it("acepta un parche vacío", () => {
    expect(validateContactPatch({})).toEqual({ ok: true, value: {} });
  });

  it("devuelve solo los campos presentes, normalizados", () => {
    expect(
      validateContactPatch({ name: "  Ana ", email: "ANA@X.COM" }),
    ).toEqual({
      ok: true,
      value: { name: "Ana", email: "ana@x.com" },
    });
  });

  it("valida todos los campos editables", () => {
    expect(
      validateContactPatch({
        name: "Ana",
        phone: "555 123 456",
        email: "",
        role: "Familia",
        company: "",
      }),
    ).toEqual({
      ok: true,
      value: {
        name: "Ana",
        phone: "555 123 456",
        email: "",
        role: "Familia",
        company: "",
      },
    });
  });

  it("ignora isFavorite y claves desconocidas", () => {
    expect(
      validateContactPatch({ isFavorite: true, id: "x", role: "Otro" }),
    ).toEqual({
      ok: true,
      value: { role: "Otro" },
    });
  });

  it("no aplica la regla cruzada (depende del contacto actual)", () => {
    expect(validateContactPatch({ phone: "", email: "" })).toEqual({
      ok: true,
      value: { phone: "", email: "" },
    });
  });

  it("devuelve los errores de cada campo presente", () => {
    expect(
      validateContactPatch({
        name: "",
        phone: "12",
        email: "x",
        role: "Jefe",
        company: null,
      }),
    ).toEqual({
      ok: false,
      fieldErrors: {
        name: MESSAGES.nameRequired,
        phone: MESSAGES.phoneDigits,
        email: MESSAGES.emailFormat,
        role: MESSAGES.roleInvalid,
        company: MESSAGES.companyType,
      },
    });
  });

  it("trata null como valor inválido, no como ausente", () => {
    expect(validateContactPatch({ name: null })).toEqual({
      ok: false,
      fieldErrors: { name: MESSAGES.nameRequired },
    });
  });

  it.each([null, "texto", []])("rechaza %j sin errores de campo", (raw) => {
    expect(validateContactPatch(raw)).toEqual({ ok: false, fieldErrors: {} });
  });
});

describe("validateFavoriteInput", () => {
  it.each([true, false])("acepta %s", (isFavorite) => {
    expect(validateFavoriteInput({ isFavorite })).toEqual({
      ok: true,
      value: { isFavorite },
    });
  });

  it("descarta claves adicionales", () => {
    expect(validateFavoriteInput({ isFavorite: true, name: "x" })).toEqual({
      ok: true,
      value: { isFavorite: true },
    });
  });

  it.each([
    {},
    { isFavorite: null },
    { isFavorite: "true" },
    { isFavorite: 1 },
  ])("rechaza %j", (raw) => {
    expect(validateFavoriteInput(raw)).toEqual({
      ok: false,
      fieldErrors: { isFavorite: MESSAGES.favoriteType },
    });
  });

  it.each([null, true, []])("rechaza %j sin errores de campo", (raw) => {
    expect(validateFavoriteInput(raw)).toEqual({ ok: false, fieldErrors: {} });
  });
});

describe("isRole", () => {
  it("reconoce exactamente los valores del enum", () => {
    expect(ROLES.every(isRole)).toBe(true);
    expect(isRole("amigo")).toBe(false);
    expect(isRole(undefined)).toBe(false);
  });
});
