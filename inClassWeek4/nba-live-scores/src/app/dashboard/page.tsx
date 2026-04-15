import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Dashboard from "@/components/dashboard/Dashboard";
import { Game } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // Fetch user's favorite team abbreviations
  const { data: favorites } = await supabase
    .from("nba_favorites")
    .select("team_abbr")
    .eq("user_id", user.id);

  const favoriteAbbrs = favorites?.map((f) => f.team_abbr) ?? [];

  // If no favorites, redirect to onboarding
  if (favoriteAbbrs.length === 0) {
    redirect("/onboarding");
  }

  // Fetch today's games for favorite teams
  const today = new Date().toISOString().split("T")[0];
  const { data: games } = await supabase
    .from("nba_games")
    .select("*")
    .eq("date", today)
    .or(
      favoriteAbbrs
        .flatMap((abbr) => [`home_team.eq.${abbr}`, `away_team.eq.${abbr}`])
        .join(",")
    );

  return (
    <Dashboard
      initialGames={(games as Game[]) ?? []}
      userFavoriteAbbrs={favoriteAbbrs}
    />
  );
}
