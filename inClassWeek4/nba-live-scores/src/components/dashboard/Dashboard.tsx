"use client";

import { useEffect, useState } from "react";
import { useRealtimeScores } from "@/hooks/useRealtimeScores";
import { classifyGames } from "@/lib/utils/game-status";
import { Game } from "@/lib/types";
import GameSection from "./GameSection";
import Link from "next/link";
import Navbar from "@/components/nav/Navbar";

interface DashboardProps {
  initialGames: Game[];
  userFavoriteAbbrs: string[];
  isLoggedIn: boolean;
  userEmail: string | null;
}

export default function Dashboard({ initialGames, userFavoriteAbbrs, isLoggedIn, userEmail }: DashboardProps) {
  const games = useRealtimeScores(initialGames, userFavoriteAbbrs);
  const { live, final: finalGames, upcoming } = classifyGames(games);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    setLastUpdated(new Date());
  }, [games]);

  const noGames = live.length === 0 && finalGames.length === 0 && upcoming.length === 0;
  const showingAll = userFavoriteAbbrs.length === 0;

  return (
    <div className="min-h-screen bg-zinc-50">
      <Navbar isLoggedIn={isLoggedIn} userEmail={userEmail} />

      <div className="mx-auto max-w-2xl px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-zinc-900">
            {showingAll ? "All Games Today" : "My Teams \u2014 Today"}
          </h2>
          <p className="text-xs text-zinc-400">
            Updated {lastUpdated.toLocaleTimeString()}
          </p>
        </div>

        <div className="space-y-6">
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
        </div>
      </div>
    </div>
  );
}
