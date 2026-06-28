"use client";

import { useState } from "react";

export function CacheClearButton() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleClearCache = async () => {
    setLoading(true);
    setMessage(null);

    try {
      // 1. Llamar al endpoint de limpieza completa
      const response = await fetch("/api/cleanup/full", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (response.ok && data.ok) {
        // 2. Limpiar localStorage y sessionStorage del cliente
        try {
          localStorage.clear();
          sessionStorage.clear();

          // Eliminar todas las cookies
          document.cookie.split(";").forEach((c) => {
            const eqPos = c.indexOf("=");
            const name = eqPos > -1 ? c.substr(0, eqPos).trim() : c.trim();
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;`;
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname};`;
          });
        } catch (e) {
          console.warn("Nota: Limpieza local parcial:", e);
        }

        setSuccess(true);
        setMessage("✓ Caché, cookies y sesiones limpiados\n🔄 Recargando...");

        // 3. Recargar página después de 2 segundos
        setTimeout(() => {
          window.location.href = window.location.pathname;
        }, 2000);
      } else {
        const errorMsg = data.error || "Error al limpiar";
        setMessage(`✗ ${errorMsg}`);
        console.error("Cleanup failed:", data);
      }
    } catch (error) {
      console.error("Error during cleanup:", error);
      const errorMsg =
        error instanceof Error ? error.message : "Error de conexión";
      setMessage(`✗ ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 w-full">
      <button
        onClick={handleClearCache}
        disabled={loading || success}
        title={
          success
            ? "Sistema limpiado - recargando..."
            : "Limpiar caché, cookies y sesiones"
        }
        className={`flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm transition ${
          success
            ? "border-emerald-300 bg-emerald-50 text-emerald-600 cursor-default"
            : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-60"
        }`}
      >
        <span className="text-base">{success ? "✅" : loading ? "⏳" : "🔄"}</span>
        <span className="hidden sm:inline text-xs font-medium">
          {loading ? "Limpiando..." : success ? "Limpio" : "Caché"}
        </span>
      </button>
      {message && (
        <div
          className={`text-xs text-center py-1 px-2 rounded whitespace-pre-wrap ${
            success
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-rose-50 text-rose-700 border border-rose-200"
          }`}
        >
          {message}
        </div>
      )}
    </div>
  );
}
