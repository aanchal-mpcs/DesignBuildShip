import { createClient } from "@/lib/supabase/server";
import Dashboard from "@/components/dashboard/Dashboard";
import { Game } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const today = new Date().toISOString().split("T")[0];
  let favoriteAbbrs: string[] = [];

  if (user) {
    const { data: favorites } = await supabase
      .from("nba_favorites")
      .select("team_abbr")
      .eq("user_id", user.id);

    favoriteAbbrs = favorites?.map((f) => f.team_abbr) ?? [];
  }

  // Fetch games: filtered by favorites if logged in with favorites, otherwise all today's games
  let games: Game[] = [];

  if (favoriteAbbrs.length > 0) {
    const { data } = await supabase
      .from("nba_games")
      .select("*")
      .eq("date", today)
      .or(
        favoriteAbbrs
          .flatMap((abbr) => [`home_team.eq.${abbr}`, `away_team.eq.${abbr}`])
          .join(",")
      );
    games = (data as Game[]) ?? [];
  } else {
    const { data } = await supabase
      .from("nba_games")
      .select("*")
      .eq("date", today);
    games = (data as Game[]) ?? [];
  }

  return (
    <Dashboard
      initialGames={games}
      userFavoriteAbbrs={favoriteAbbrs}
      isLoggedIn={!!user}
    />
  );
}
