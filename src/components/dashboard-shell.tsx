import Link from "next/link";
import type { ReactNode } from "react";
import { logoutAction } from "@/lib/actions/auth";
import { SidebarNav, type NavItem } from "@/components/sidebar-nav";
import { NotificationBellServer } from "@/components/notification-bell-server";
import { OnacBadge } from "@/components/onac-badge";
import { LegalTimeCO } from "@/components/legal-time-co";

const APP_NAME = "CIOC";
const APP_LONG = "Certificado de Idoneidad como Oficial de Cumplimiento";

export type { NavItem };

export function DashboardShell({
  area,
  nav,
  user,
  children,
  subscriberLogo,
  subscriberName,
}: {
  area: string;
  nav: NavItem[];
  user: { name: string; role: string };
  children: ReactNode;
  /** URL del logo del suscriptor (cargado en /panel/organizacion).
   *  Si es null, en el header solo se muestra el nombre del usuario. */
  subscriberLogo?: string | null;
  /** Nombre comercial del suscriptor para alt y tooltip del logo. */
  subscriberName?: string;
}) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="flex h-16 flex-col justify-center border-b border-slate-200 px-5">
          <Link href="/" className="text-lg font-bold text-brand-800 leading-none">
            {APP_NAME}
          </Link>
          <span className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-400" title={APP_LONG}>
            {APP_LONG}
          </span>
        </div>
        <div className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          {area}
        </div>
        <SidebarNav items={nav} />
        <div className="border-t border-slate-200 p-3 space-y-3">
          <LegalTimeCO variant="compact" />
          <OnacBadge variant="compact" />
          <div className="text-center text-[10px] text-slate-400">ISO/IEC 17024</div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
          <div className="text-sm text-slate-500 md:hidden">{APP_NAME}</div>
          <div className="ml-auto flex items-center gap-3">
            <NotificationBellServer />
            <div className="hidden text-right sm:block">
              <div className="text-sm font-medium text-slate-800">
                {user.name}
              </div>
              <div className="text-xs text-slate-400">{user.role}</div>
            </div>
            {subscriberLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={subscriberLogo}
                alt={subscriberName ?? "Suscriptor"}
                title={subscriberName ?? "Suscriptor"}
                className="h-10 w-auto rounded border border-slate-200 bg-white object-contain p-0.5"
              />
            ) : (
              <div className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-slate-50 text-xs font-bold text-slate-500">
                {(subscriberName ?? user.name).slice(0, 1).toUpperCase()}
              </div>
            )}
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
              >
                Salir
              </button>
            </form>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
