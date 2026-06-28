"use client";

import { useState, useEffect } from "react";

export function CacheClearButton() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleClearCache = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/cache/purge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (response.ok && data.ok) {
        setSuccess(true);
        setMessage(`✓ ${data.message}`);

        // Recargar página después de 2 segundos
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        const errorMsg = data.error || "Error desconocido al limpiar caché";
        setMessage(`✗ ${errorMsg}`);
        console.error("Cache purge failed:", data);
      }
    } catch (error) {
      console.error("Error clearing cache:", error);
      const errorMsg = error instanceof Error ? error.message : "Error de conexión";
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
        title={success ? "Caché purgado - recargando..." : "Limpiar caché"}
        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm transition ${
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
        <div className={`text-xs text-center py-1 px-2 rounded ${
          success
            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
            : "bg-rose-50 text-rose-700 border border-rose-200"
        }`}>
          {message}
        </div>
      )}
    </div>
  );
}
