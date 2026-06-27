"use client";

import { useState } from "react";
import Link from "next/link";

interface DropdownItem {
  href: string;
  label: string;
  description?: string;
}

interface NavDropdownProps {
  label: string;
  items: DropdownItem[];
}

export function NavDropdown({ label, items }: NavDropdownProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="group relative">
      <button className="flex items-center gap-1 font-medium text-slate-600 hover:text-brand-800">
        {label}
        <svg className="h-4 w-4 transition group-hover:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </button>

      {/* Desktop dropdown */}
      <div className="invisible absolute left-0 top-full min-w-max rounded-xl border border-slate-200 bg-white p-2 shadow-lg transition group-hover:visible group-hover:opacity-100">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-lg px-4 py-3 text-sm hover:bg-slate-50"
          >
            <div className="font-medium text-slate-900">{item.label}</div>
            {item.description && <div className="text-xs text-slate-500">{item.description}</div>}
          </Link>
        ))}
      </div>
    </div>
  );
}
