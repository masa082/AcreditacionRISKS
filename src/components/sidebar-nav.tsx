"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem {
  href: string;
  label: string;
  disabled?: boolean;
  /// Categoría para agrupar la navegación visualmente (UX profesional).
  /// Si se omite, el ítem aparece sin encabezado de grupo.
  group?: string;
  /// Glifo opcional (emoji o texto corto) para mejorar el escaneo visual.
  icon?: string;
}

const PANEL_ROOTS = new Set(["/panel", "/admin", "/portal"]);

function isActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (PANEL_ROOTS.has(href)) return false;
  return pathname.startsWith(href + "/") || pathname.startsWith(href);
}

export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  // Agrupa los ítems preservando el orden de aparición de cada categoría.
  const groups: Array<{ title: string | null; items: NavItem[] }> = [];
  for (const it of items) {
    const title = it.group ?? null;
    const last = groups[groups.length - 1];
    if (last && last.title === title) {
      last.items.push(it);
    } else {
      groups.push({ title, items: [it] });
    }
  }

  return (
    <nav className="flex-1 overflow-y-auto px-3 pb-4">
      {groups.map((g, gi) => (
        <div key={`${g.title ?? "_"}-${gi}`} className={gi > 0 ? "mt-4" : ""}>
          {g.title ? (
            <div className="px-2 pb-1 pt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
              {g.title}
            </div>
          ) : null}
          <ul className="space-y-0.5">
            {g.items.map((item) => {
              if (item.disabled) {
                return (
                  <li key={item.href}>
                    <span
                      className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-300"
                      title="Disponible en una próxima fase"
                    >
                      <span className="flex items-center gap-2">
                        {item.icon ? <span aria-hidden>{item.icon}</span> : null}
                        {item.label}
                      </span>
                      <span className="text-[10px]">pronto</span>
                    </span>
                  </li>
                );
              }
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                      active
                        ? "bg-brand-50 text-brand-800 ring-1 ring-brand-100"
                        : "text-slate-600 hover:bg-brand-50 hover:text-brand-800"
                    }`}
                  >
                    {item.icon ? (
                      <span aria-hidden className="text-base leading-none">{item.icon}</span>
                    ) : null}
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
