"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";

const links = [
  { href: "/", label: "Home" },
  { href: "/search", label: "Search" },
  { href: "/community", label: "Community" },
  { href: "/digest", label: "Digest" },
  { href: "/my-books", label: "My List" },
];

export default function NavLinks() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="hidden sm:flex items-center gap-1">
        {links.map((link) => {
          const isActive =
            link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);

          return (
            <a
              key={link.href}
              href={link.href}
              aria-current={isActive ? "page" : undefined}
              className={`px-3 py-1.5 text-sm font-body transition-colors ${
                isActive
                  ? "text-[var(--gold)] font-medium"
                  : "text-[var(--grey)] hover:text-[var(--foreground)]"
              }`}
            >
              {link.label}
            </a>
          );
        })}
      </div>

      <button
        onClick={() => setOpen(!open)}
        className="sm:hidden p-1.5 text-[var(--grey)] hover:text-[var(--foreground)]"
        aria-label="Toggle menu"
        aria-expanded={open}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
          {open ? <path d="M5 5l10 10M15 5L5 15" /> : <path d="M3 5h14M3 10h14M3 15h14" />}
        </svg>
      </button>

      {open && (
        <div className="absolute top-14 left-0 right-0 sm:hidden bg-[var(--background)] border-b border-[var(--grey-light)] px-6 py-3 z-50">
          {links.map((link) => {
            const isActive =
              link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <a
                key={link.href}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                onClick={() => setOpen(false)}
                className={`block py-2 text-sm font-body ${
                  isActive ? "text-[var(--gold)]" : "text-[var(--grey)] hover:text-[var(--foreground)]"
                }`}
              >
                {link.label}
              </a>
            );
          })}
        </div>
      )}
    </>
  );
}
