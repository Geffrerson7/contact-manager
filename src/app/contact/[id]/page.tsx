import type { Metadata } from "next";
import { CopyButton } from "@/components/ui/CopyButton";

export const metadata: Metadata = {
  title: "Detalle del contacto · Contact Manager",
};

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-8">
      <h1 className="text-3xl font-semibold tracking-tight">Detalle del contacto</h1>
      <p className="text-slate-600 dark:text-slate-400">
        Placeholder de la ruta dinámica <code>/contact/[id]</code>.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-slate-600 dark:text-slate-400">
          Identificador recibido: <code>{id}</code>
        </p>
        {/* Frontera servidor → cliente: solo se pasan strings serializables. */}
        <CopyButton value={id} label="Copiar identificador" />
      </div>
    </main>
  );
}
