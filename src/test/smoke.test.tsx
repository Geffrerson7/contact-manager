import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

function Smoke() {
  return <p>Entorno de pruebas listo</p>;
}

describe("entorno de pruebas", () => {
  it("renderiza un componente de React con jsdom y jest-dom", () => {
    render(<Smoke />);

    expect(screen.getByText("Entorno de pruebas listo")).toBeInTheDocument();
  });
});
