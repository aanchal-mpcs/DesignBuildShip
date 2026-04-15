"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useFavoriteTeams() {
  const [favoriteAbbrs, setFavoriteAbbrs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchFavorites() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("nba_favorites")
        .select("team_abbr")
        .eq("user_id", user.id);

      if (data) {
        setFavoriteAbbrs(data.map((f) => f.team_abbr));
      }
      setLoading(false);
    }

    fetchFavorites();
  }, []);

  return { favoriteAbbrs, loading };
}
