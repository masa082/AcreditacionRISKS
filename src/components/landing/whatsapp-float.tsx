import { BRAND } from "@/lib/brand";

/** Botón flotante de WhatsApp en la esquina inferior derecha. Visible en todas
 *  las páginas. Si BRAND.whatsapp.number es vacío, no se renderiza. */
export function WhatsAppFloat() {
  const w = BRAND.whatsapp;
  if (!w?.number) return null;
  const href = `https://wa.me/${w.number.replace(/\D/g, "")}?text=${encodeURIComponent(w.message ?? "")}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escríbenos por WhatsApp"
      className="fixed bottom-5 right-5 z-50 grid h-14 w-14 place-items-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/40 ring-4 ring-white transition hover:scale-105 hover:bg-emerald-600 sm:bottom-7 sm:right-7"
    >
      <svg width="28" height="28" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
        <path d="M16 .5C7.4.5.5 7.4.5 16c0 2.7.7 5.4 2.1 7.7L.5 31.5l8-2.1A15.4 15.4 0 0 0 16 31.5C24.6 31.5 31.5 24.6 31.5 16S24.6.5 16 .5zm0 28c-2.4 0-4.7-.6-6.7-1.8l-.5-.3-4.8 1.3 1.3-4.7-.3-.5A12.5 12.5 0 1 1 16 28.5zm7-9.3c-.4-.2-2.3-1.1-2.6-1.2-.4-.1-.6-.2-.9.2-.2.4-1 1.2-1.2 1.4-.2.2-.4.3-.8.1-.4-.2-1.6-.6-3-1.8-1.1-1-1.8-2.2-2-2.5-.2-.4 0-.6.2-.8.2-.2.4-.4.5-.6.2-.2.2-.4.4-.6.1-.2.1-.4 0-.6-.1-.2-.9-2.1-1.2-2.9-.3-.7-.7-.6-.9-.6h-.8c-.3 0-.7.1-1 .5-.4.4-1.4 1.4-1.4 3.5s1.4 4 1.6 4.3c.2.3 2.8 4.3 6.7 6 .9.4 1.7.6 2.2.8.9.3 1.8.2 2.5.2.8-.1 2.3-.9 2.7-1.9.3-.9.3-1.7.2-1.9 0-.2-.3-.3-.7-.5z" />
      </svg>
    </a>
  );
}
