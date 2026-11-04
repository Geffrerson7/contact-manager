import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Inicio · Contact Manager",
};

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-8">
      <h1 className="text-3xl font-semibold tracking-tight">Contact Manager</h1>
      <p className="text-slate-600 dark:text-slate-400">
        Estructura de navegación del App Router (M1.1). La lista de contactos se
        implementará en hitos posteriores.
      </p>
      <p className="text-slate-600 dark:text-slate-400">
        Usa la navegación superior para recorrer las rutas del MVP. También
        puedes probar una ruta inexistente para ver el estado{" "}
        <code className="rounded bg-slate-100 px-1 py-0.5 text-sm dark:bg-slate-800">
          not-found
        </code>
        , o visitar el{" "}
        <Link
          href="/contact/ejemplo"
          className="font-medium text-blue-700 underline-offset-4 hover:underline dark:text-blue-400"
        >
          detalle de un contacto de ejemplo
        </Link>
        .
      </p>
    </main>
  );
}
