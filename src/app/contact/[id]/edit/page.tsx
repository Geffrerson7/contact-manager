import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Editar contacto · Contact Manager",
};

export default async function EditContactPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-8">
      <h1 className="text-3xl font-semibold tracking-tight">Editar contacto</h1>
      <p className="text-slate-600 dark:text-slate-400">
        Placeholder de la ruta <code>/contact/[id]/edit</code>. El formulario de
        edición se implementará en un hito posterior.
      </p>
      <p className="text-slate-600 dark:text-slate-400">
        Identificador recibido: <code>{id}</code>
      </p>
      <Link
        href={`/contact/${id}`}
        className="font-medium text-blue-700 underline-offset-4 hover:underline dark:text-blue-400"
      >
        Volver al detalle
      </Link>
    </main>
  );
}
