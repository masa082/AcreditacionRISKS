"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/** CTA flotante visible solo en mobile (lg:hidden), aparece tras hacer scroll
 *  más allá del hero. Mantiene el CTA principal siempre a la vista. */
export function MobileStickyCTA() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 500);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur shadow-[0_-8px_24px_-12px_rgba(11,29,68,0.18)] transition-transform lg:hidden ${visible ? "translate-y-0" : "translate-y-full"}`}
    >
      <div className="mx-auto flex max-w-md items-center justify-between gap-3">
        <div className="text-[11px] leading-tight">
          <div className="font-bold text-brand-900">¿Listo para certificarte?</div>
          <div className="text-slate-500">SARLAFT desde $650.000 + IVA</div>
        </div>
        <Link
          href="/registro?cert=sarlaft"
          className="rounded-lg btn-grad-navy px-4 py-2 text-sm font-bold text-white shadow-sm"
        >
          Certifícate ahora
        </Link>
      </div>
    </div>
  );
}
