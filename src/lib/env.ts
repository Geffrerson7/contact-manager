export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error(
      "Falta DATABASE_URL. Copia .env.example a .env y ajusta la cadena de conexión.",
    );
  }

  return url;
}
