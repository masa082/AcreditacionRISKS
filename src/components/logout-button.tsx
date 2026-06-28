"use client";

import { useState } from "react";
import { logoutAction } from "@/lib/actions/auth";

interface LogoutButtonProps {
  variant?: "sidebar" | "header";
}

export function LogoutButton({ variant = "header" }: LogoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);

    try {
      // Limpiar datos del cliente primero
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
        console.warn("Limpieza local parcial:", e);
      }

      // Luego hacer logout en el servidor
      await logoutAction();
    } catch (error) {
      console.error("Error during logout:", error);
      setIsLoading(false);
    }
  };

  if (variant === "sidebar") {
    return (
      <button
        onClick={handleLogout}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-2.5 py-2 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-60 transition"
        title="Cerrar sesión y limpiar datos"
      >
        <span className="text-sm">{isLoading ? "⏳" : "🚪"}</span>
        <span>{isLoading ? "Saliendo..." : "Cerrar sesión"}</span>
      </button>
    );
  }

  // header variant
  return (
    <form action={handleLogout}>
      <button
        type="button"
        onClick={handleLogout}
        disabled={isLoading}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-60 transition"
        title="Cerrar sesión y limpiar datos"
      >
        {isLoading ? "Saliendo..." : "Salir"}
      </button>
    </form>
  );
}
