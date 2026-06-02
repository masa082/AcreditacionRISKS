"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface NavItem {
  href: string;
  label: string;
  disabled?: boolean;
}

export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-1 px-3">
      {items.map((item) => {
        if (item.disabled) {
          return (
            <span
              key={item.href}
              className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-slate-300"
              title="Disponible en una próxima fase"
            >
              {item.label}
              <span className="text-[10px]">pronto</span>
            </span>
          );
        }
        const active =
          pathname === item.href ||
          (item.href !== "/panel" &&
            item.href !== "/admin" &&
            item.href !== "/portal" &&
            pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
              active
                ? "bg-brand-50 text-brand-800"
                : "text-slate-600 hover:bg-brand-50 hover:text-brand-800"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
