"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Game } from "@/lib/types";

export function useRealtimeScores(
  initialGames: Game[],
  favoriteTeamIds: number[]
) {
  const [games, setGames] = useState<Game[]>(initialGames);
  const supabase = createClient();

  // Sync when initialGames prop changes (e.g. from refetch)
  useEffect(() => {
    setGames(initialGames);
  }, [initialGames]);

  useEffect(() => {
    if (favoriteTeamIds.length === 0) return;

    const channel = supabase
      .channel("live-scores")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "games",
        },
        (payload) => {
          const updated = payload.new as Game;
          // Only process if it involves a favorite team
          if (
            !favoriteTeamIds.includes(updated.home_team_id) &&
            !favoriteTeamIds.includes(updated.away_team_id)
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
          table: "games",
        },
        (payload) => {
          const inserted = payload.new as Game;
          if (
            !favoriteTeamIds.includes(inserted.home_team_id) &&
            !favoriteTeamIds.includes(inserted.away_team_id)
          ) {
            return;
          }

          setGames((prev) => {
            // Avoid duplicates
            if (prev.some((g) => g.id === inserted.id)) return prev;
            return [...prev, inserted];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [favoriteTeamIds]);

  return games;
}
