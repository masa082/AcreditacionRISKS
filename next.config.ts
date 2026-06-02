import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  // ESLint se configura en una fase posterior; no bloquear el build por ahora.
  eslint: { ignoreDuringBuilds: true },
  // El chequeo de tipos de TypeScript permanece activo (no se ignora).
};

export default nextConfig;
