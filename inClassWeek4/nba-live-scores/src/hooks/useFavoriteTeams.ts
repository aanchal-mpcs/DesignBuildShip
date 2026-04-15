"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useFavoriteTeams() {
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
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
        .from("user_favorites")
        .select("team_id")
        .eq("user_id", user.id);

      if (data) {
        setFavoriteIds(data.map((f) => f.team_id));
      }
      setLoading(false);
    }

    fetchFavorites();
  }, []);

  return { favoriteIds, loading };
}
