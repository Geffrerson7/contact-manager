"use client";

// Client Component: necesita estado local (useState), un manejador de eventos
// (onClick) y una API del navegador (navigator.clipboard). Nada de esto existe
// en el servidor, por eso es el único archivo de esta pantalla marcado como
// cliente. La página que lo usa sigue siendo un Server Component.

import { useEffect, useState } from "react";

type CopyStatus = "idle" | "copied" | "error";

const RESET_DELAY_MS = 2000;

const feedback: Record<Exclude<CopyStatus, "idle">, string> = {
  copied: "Copiado",
  error: "No se pudo copiar",
};

type CopyButtonProps = {
  /** Texto que se copiará. Debe ser serializable: llega desde un Server Component. */
  value: string;
  /** Texto visible del botón en reposo, p. ej. «Copiar identificador». */
  label: string;
};

export function CopyButton({ value, label }: CopyButtonProps) {
  const [status, setStatus] = useState<CopyStatus>("idle");

  // Vuelve al estado inicial tras unos segundos y limpia el temporizador si el
  // componente se desmonta antes.
  useEffect(() => {
    if (status === "idle") return;

    const timeoutId = window.setTimeout(() => setStatus("idle"), RESET_DELAY_MS);
    return () => window.clearTimeout(timeoutId);
  }, [status]);

  async function handleClick() {
    try {
      await navigator.clipboard.writeText(value);
      setStatus("copied");
    } catch {
      // Sin contexto seguro (HTTPS/localhost) o sin permiso, la API falla.
      setStatus("error");
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-fit rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
    >
      <span aria-live="polite">{status === "idle" ? label : feedback[status]}</span>
    </button>
  );
}
