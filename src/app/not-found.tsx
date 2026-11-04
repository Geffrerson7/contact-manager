import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Página no encontrada · Contact Manager",
};

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-8">
      <h1 className="text-3xl font-semibold tracking-tight">Página no encontrada</h1>
      <p className="text-slate-600 dark:text-slate-400">
        La ruta solicitada no existe en Contact Manager.
      </p>
      <Link
        href="/"
        className="font-medium text-blue-700 underline-offset-4 hover:underline dark:text-blue-400"
      >
        Volver al inicio
      </Link>
    </main>
  );
}
