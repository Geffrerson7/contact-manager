import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Buscar · Contact Manager",
};

export default function SearchPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-8">
      <h1 className="text-3xl font-semibold tracking-tight">Buscar contactos</h1>
      <p className="text-slate-600 dark:text-slate-400">
        Placeholder de la ruta <code>/search</code>. Aquí se implementará la
        búsqueda con los parámetros <code>q</code> y <code>fav</code> en la URL.
      </p>
    </main>
  );
}
