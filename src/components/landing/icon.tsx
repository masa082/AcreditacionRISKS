/**
 * Iconos line-art (estilo Lucide simplificado) para la landing.
 *
 * Los emoji 🎓📜🔒 dan a la página un aire de "plantilla genérica de IA";
 * usar SVG monocromos line-art con `currentColor` da una identidad visual
 * mucho más profesional y coherente con la marca CIOC.
 *
 * Tamaño base 24×24 controlado por `size` (default 22), color heredado por
 * `currentColor` para que respeten Tailwind `text-*` del contenedor.
 */
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Base({ size = 22, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const Icon = {
  ShieldCheck: (p: IconProps) => (
    <Base {...p}>
      <path d="M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </Base>
  ),
  Stamp: (p: IconProps) => (
    <Base {...p}>
      <path d="M5 21h14" />
      <path d="M7 17h10v3H7z" />
      <path d="M12 17v-3" />
      <path d="M9 14h6a3 3 0 0 0 0-6h-1V5a2 2 0 1 0-4 0v3H9a3 3 0 0 0 0 6Z" />
    </Base>
  ),
  Diploma: (p: IconProps) => (
    <Base {...p}>
      <rect x="3" y="5" width="14" height="11" rx="1.5" />
      <path d="M7 9h6M7 12h4" />
      <circle cx="17" cy="18" r="3" />
      <path d="m15.5 19.7-.7 2.3 2.2-1 2.2 1-.7-2.3" />
    </Base>
  ),
  QR: (p: IconProps) => (
    <Base {...p}>
      <rect x="3" y="3" width="7" height="7" rx="0.5" />
      <rect x="14" y="3" width="7" height="7" rx="0.5" />
      <rect x="3" y="14" width="7" height="7" rx="0.5" />
      <path d="M14 14h2v2h-2zM18 14h3M14 18h3v3M21 18v3" />
    </Base>
  ),
  Bolt: (p: IconProps) => (
    <Base {...p}>
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
    </Base>
  ),
  ChartUp: (p: IconProps) => (
    <Base {...p}>
      <path d="M3 21h18" />
      <path d="m4 17 5-5 4 3 7-8" />
      <path d="M16 7h4v4" />
    </Base>
  ),
  Lock: (p: IconProps) => (
    <Base {...p}>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 1 1 8 0v3" />
      <circle cx="12" cy="16" r="1" />
    </Base>
  ),
  Clock: (p: IconProps) => (
    <Base {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Base>
  ),
  Refresh: (p: IconProps) => (
    <Base {...p}>
      <path d="M21 12a9 9 0 1 1-3.5-7.1" />
      <path d="M21 4v5h-5" />
    </Base>
  ),
  Bell: (p: IconProps) => (
    <Base {...p}>
      <path d="M6 8a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </Base>
  ),
  Mail: (p: IconProps) => (
    <Base {...p}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </Base>
  ),
  Archive: (p: IconProps) => (
    <Base {...p}>
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <path d="M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8" />
      <path d="M10 12h4" />
    </Base>
  ),
  Eye: (p: IconProps) => (
    <Base {...p}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </Base>
  ),
  Handshake: (p: IconProps) => (
    <Base {...p}>
      <path d="M11 17 5 11l2-2 4 3 4-4 4 4-7 7-1-2Z" />
      <path d="m3 13 2 2M21 11l-2 2" />
    </Base>
  ),
  Building: (p: IconProps) => (
    <Base {...p}>
      <rect x="4" y="3" width="16" height="18" rx="1" />
      <path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2" />
      <path d="M10 21v-3h4v3" />
    </Base>
  ),
  Check: (p: IconProps) => (
    <Base {...p}><path d="m5 12 5 5 9-11" /></Base>
  ),
  X: (p: IconProps) => (
    <Base {...p}><path d="M6 6l12 12M18 6 6 18" /></Base>
  ),
  Quote: (p: IconProps) => (
    <Base {...p}>
      <path d="M7 7h4v4H7zM7 11c0 3 1 5 4 5M13 7h4v4h-4zM13 11c0 3 1 5 4 5" />
    </Base>
  ),
};

export type IconKey = keyof typeof Icon;
