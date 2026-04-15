"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Game } from "@/lib/types";

export function useRealtimeScores(
  initialGames: Game[],
  favoriteAbbrs: string[]
) {
  const [games, setGames] = useState<Game[]>(initialGames);
  const supabase = createClient();

  // Sync when initialGames prop changes
  useEffect(() => {
    setGames(initialGames);
  }, [initialGames]);

  useEffect(() => {
    const showAll = favoriteAbbrs.length === 0;

    const channel = supabase
      .channel("live-scores")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "nba_games",
        },
        (payload) => {
          const updated = payload.new as Game;
          if (
            !showAll &&
            !favoriteAbbrs.includes(updated.home_team) &&
            !favoriteAbbrs.includes(updated.away_team)
          ) {
            return;
          }

          setGames((prev) =>
            prev.map((g) => (g.id === updated.id ? { ...g, ...updated } : g))
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "nba_games",
        },
        (payload) => {
          const inserted = payload.new as Game;
          if (
            !showAll &&
            !favoriteAbbrs.includes(inserted.home_team) &&
            !favoriteAbbrs.includes(inserted.away_team)
          ) {
            return;
          }

          setGames((prev) => {
            if (prev.some((g) => g.id === inserted.id)) return prev;
            return [...prev, inserted];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [favoriteAbbrs]);

  return games;
}
