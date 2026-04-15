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

  // Fetch user's favorite team IDs
  const { data: favorites } = await supabase
    .from("user_favorites")
    .select("team_id")
    .eq("user_id", user.id);

  const favoriteIds = favorites?.map((f) => f.team_id) ?? [];

  // If no favorites, redirect to onboarding
  if (favoriteIds.length === 0) {
    redirect("/onboarding");
  }

  // Fetch today's games for favorite teams
  const today = new Date().toISOString().split("T")[0];
  const { data: games } = await supabase
    .from("games")
    .select("*")
    .eq("date", today)
    .or(
      favoriteIds
        .flatMap((id) => [`home_team_id.eq.${id}`, `away_team_id.eq.${id}`])
        .join(",")
    );

  return (
    <Dashboard
      initialGames={(games as Game[]) ?? []}
      userFavoriteIds={favoriteIds}
    />
  );
}
