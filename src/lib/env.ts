export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error(
      "Falta DATABASE_URL. Copia .env.example a .env y ajusta la cadena de conexión.",
    );
  }

  return url;
}

/**
 * Modo de acceso del despliegue. Sin autenticación, el «usuario demo» se define por
 * despliegue y no por petición: lo decide la configuración del servidor, nunca el cliente.
 */
export type AccessMode = "read-only" | "read-write";

export const ACCESS_MODES: readonly AccessMode[] = ["read-only", "read-write"];

/**
 * Lee `CONTACTS_ACCESS_MODE` (variable de servidor; nunca `NEXT_PUBLIC_`).
 *
 * - `read-only` / `read-write`: valor explícito.
 * - Ausente: `read-only` en producción (fail-closed, incluidos los Preview de Vercel) y
 *   `read-write` en desarrollo y pruebas.
 * - Cualquier otro valor: error de configuración (no se adivina).
 */
export function getAccessMode(
  env: NodeJS.ProcessEnv = process.env,
): AccessMode {
  const raw = env.CONTACTS_ACCESS_MODE?.trim();

  if (raw === undefined || raw === "") {
    return env.NODE_ENV === "production" ? "read-only" : "read-write";
  }

  if ((ACCESS_MODES as readonly string[]).includes(raw))
    return raw as AccessMode;

  throw new Error(
    `CONTACTS_ACCESS_MODE="${raw}" no es válido; usa "read-only" o "read-write".`,
  );
}
