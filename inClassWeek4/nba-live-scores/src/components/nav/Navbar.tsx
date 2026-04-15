"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface NavbarProps {
  isLoggedIn: boolean;
  userEmail: string | null;
}

export default function Navbar({ isLoggedIn, userEmail }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/dashboard");
    router.refresh();
  }

  function linkClass(href: string) {
    const active = pathname === href;
    return `text-sm font-medium transition-colors ${
      active
        ? "text-orange-600"
        : "text-zinc-600 hover:text-zinc-900"
    }`;
  }

  return (
    <nav className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-lg font-bold text-zinc-900">
            <span className="text-orange-600">NBA</span> Scores
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className={linkClass("/dashboard")}>
              Home
            </Link>
            {isLoggedIn && (
              <Link href="/onboarding" className={linkClass("/onboarding")}>
                My Teams
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <>
              {userEmail && (
                <span className="hidden sm:inline text-sm text-zinc-400">{userEmail}</span>
              )}
              <button
                onClick={handleSignOut}
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50"
              >
                Sign Out
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="rounded-lg bg-orange-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-orange-700"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
