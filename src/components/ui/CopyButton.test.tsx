import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CopyButton } from "./CopyButton";

function mockClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("CopyButton", () => {
  it("muestra la etiqueta en reposo", () => {
    render(<CopyButton value="abc-123" label="Copiar identificador" />);

    expect(
      screen.getByRole("button", { name: "Copiar identificador" }),
    ).toBeInTheDocument();
  });

  it("copia el valor y confirma al usuario", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn<(text: string) => Promise<void>>().mockResolvedValue();
    render(<CopyButton value="abc-123" label="Copiar identificador" />);
    mockClipboard(writeText);

    await user.click(screen.getByRole("button", { name: "Copiar identificador" }));

    expect(writeText).toHaveBeenCalledWith("abc-123");
    expect(await screen.findByRole("button", { name: "Copiado" })).toBeInTheDocument();
  });

  it("informa del error si el portapapeles no está disponible", async () => {
    const user = userEvent.setup();
    render(<CopyButton value="abc-123" label="Copiar identificador" />);
    mockClipboard(() => Promise.reject(new Error("sin permiso")));

    await user.click(screen.getByRole("button", { name: "Copiar identificador" }));

    expect(
      await screen.findByRole("button", { name: "No se pudo copiar" }),
    ).toBeInTheDocument();
  });
});
