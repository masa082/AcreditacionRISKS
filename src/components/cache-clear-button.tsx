"use client";

import { useState } from "react";

export function CacheClearButton() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleClearCache = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/cache/purge", { method: "POST" });
      if (response.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (error) {
      console.error("Error clearing cache:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClearCache}
      disabled={loading}
      title={success ? "Caché purgado" : "Limpiar caché"}
      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-sm transition ${
        success
          ? "border-emerald-300 bg-emerald-50 text-emerald-600"
          : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-60"
      }`}
    >
      <span className="text-base">{success ? "✅" : "🔄"}</span>
      <span className="hidden sm:inline text-xs font-medium">
        {loading ? "Limpiando..." : success ? "Limpio" : "Caché"}
      </span>
    </button>
  );
}
