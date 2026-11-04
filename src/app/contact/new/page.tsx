import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nuevo contacto · Contact Manager",
};

export default function NewContactPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-8">
      <h1 className="text-3xl font-semibold tracking-tight">Nuevo contacto</h1>
      <p className="text-slate-600 dark:text-slate-400">
        Placeholder de la ruta <code>/contact/new</code>. El formulario de
        creación se implementará en un hito posterior.
      </p>
    </main>
  );
}
