import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Acerca de · Contact Manager",
};

export default function AboutPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-8">
      <h1 className="text-3xl font-semibold tracking-tight">Acerca del proyecto</h1>
      <p className="text-slate-600 dark:text-slate-400">
        Placeholder de la ruta <code>/about</code>. Aquí se mostrará la
        información del proyecto.
      </p>
    </main>
  );
}
