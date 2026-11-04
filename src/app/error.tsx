"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-8">
      <h1 className="text-3xl font-semibold tracking-tight">Algo salió mal</h1>
      <p className="text-slate-600 dark:text-slate-400">
        Se produjo un error inesperado al renderizar esta página.
      </p>
      <button
        type="button"
        onClick={reset}
        className="w-fit rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
      >
        Reintentar
      </button>
    </main>
  );
}
