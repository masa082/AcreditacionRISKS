/// URL pública base de la aplicación (para enlaces en correos/QR).
export function appBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3100").replace(/\/$/, "");
}
