"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeScores } from "@/hooks/useRealtimeScores";
import { classifyGames } from "@/lib/utils/game-status";
import { Game } from "@/lib/types";
import GameSection from "./GameSection";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface DashboardProps {
  initialGames: Game[];
  userFavoriteAbbrs: string[];
  isLoggedIn: boolean;
}

export default function Dashboard({ initialGames, userFavoriteAbbrs, isLoggedIn }: DashboardProps) {
  const games = useRealtimeScores(initialGames, userFavoriteAbbrs);
  const { live, final: finalGames, upcoming } = classifyGames(games);
  const supabase = createClient();
  const router = useRouter();
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    setLastUpdated(new Date());
  }, [games]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/dashboard");
    router.refresh();
  }

  const noGames = live.length === 0 && finalGames.length === 0 && upcoming.length === 0;
  const showingAll = userFavoriteAbbrs.length === 0;

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-xl font-bold text-zinc-900">
              {showingAll ? "NBA SCORES \u2014 TODAY" : "MY TEAMS \u2014 TODAY"}
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Updated {lastUpdated.toLocaleTimeString()}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <>
                <Link
                  href="/onboarding"
                  className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                >
                  &#9733; Favorites
                </Link>
                <button
                  onClick={handleSignOut}
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="rounded-lg bg-orange-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-orange-700"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        {noGames ? (
          <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center">
            <p className="text-zinc-500">No games today.</p>
            {isLoggedIn && (
              <Link
                href="/onboarding"
                className="mt-3 inline-block text-sm font-medium text-orange-600 hover:text-orange-700"
              >
                Add favorite teams
              </Link>
            )}
            {!isLoggedIn && (
              <p className="mt-2 text-sm text-zinc-400">
                <Link href="/signup" className="text-orange-600 hover:text-orange-700 font-medium">
                  Sign up
                </Link>
                {" "}to pick favorite teams and get personalized scores.
              </p>
            )}
          </div>
        ) : (
          <>
            <GameSection title="Live" games={live} type="live" />
            <GameSection title="Final" games={finalGames} type="final" />
            <GameSection title="Upcoming" games={upcoming} type="upcoming" />
          </>
        )}
      </main>
    </div>
  );
}
