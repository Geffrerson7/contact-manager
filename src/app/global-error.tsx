"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white p-8 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-100">
        <h1 className="text-3xl font-semibold tracking-tight">Error crítico</h1>
        <p className="text-slate-600 dark:text-slate-400">
          La aplicación no pudo renderizarse. Vuelve a intentarlo.
        </p>
        <button
          type="button"
          onClick={reset}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          Reintentar
        </button>
      </body>
    </html>
  );
}
