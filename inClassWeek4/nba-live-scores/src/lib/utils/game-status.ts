import { Game, GameStatus } from "@/lib/types";

export function classifyGames(games: Game[]) {
  const live: Game[] = [];
  const final_games: Game[] = [];
  const upcoming: Game[] = [];

  for (const game of games) {
    switch (game.status) {
      case "live":
        live.push(game);
        break;
      case "final":
        final_games.push(game);
        break;
      case "scheduled":
        upcoming.push(game);
        break;
    }
  }

  // Sort upcoming by scheduled time
  upcoming.sort(
    (a, b) =>
      new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
  );

  return { live, final: final_games, upcoming };
}

export function formatGameTime(game: Game): string {
  if (game.status === "live") {
    const period = game.period ?? 0;
    const quarter =
      period <= 4 ? `Q${period}` : `OT${period - 4 > 1 ? period - 4 : ""}`;
    return `${quarter} ${game.time ?? ""}`.trim();
  }

  if (game.status === "final") {
    return "Final";
  }

  // Upcoming: show tip-off time
  const date = new Date(game.scheduled_at);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
