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
      {/* Desktop links */}
      <div className="hidden sm:flex items-center gap-1">
        {links.map((link) => {
          const isActive =
            link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);

          return (
            <a
              key={link.href}
              href={link.href}
              aria-current={isActive ? "page" : undefined}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-stone-100 text-stone-900 dark:bg-stone-800 dark:text-stone-100"
                  : "text-stone-600 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
              }`}
            >
              {link.label}
            </a>
          );
        })}
      </div>

      {/* Mobile menu button */}
      <button
        onClick={() => setOpen(!open)}
        className="sm:hidden rounded-md p-1.5 text-stone-600 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
        aria-label="Toggle menu"
        aria-expanded={open}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          {open ? (
            <path d="M5 5l10 10M15 5L5 15" />
          ) : (
            <path d="M3 5h14M3 10h14M3 15h14" />
          )}
        </svg>
      </button>

      {/* Mobile dropdown */}
      {open && (
        <div className="absolute top-14 left-0 right-0 sm:hidden bg-[var(--background)] border-b border-stone-200 dark:border-stone-800 px-4 py-2 z-50">
          {links.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);

            return (
              <a
                key={link.href}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                onClick={() => setOpen(false)}
                className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-stone-100 text-stone-900 dark:bg-stone-800 dark:text-stone-100"
                    : "text-stone-600 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
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
