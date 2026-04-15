import { Game } from "@/lib/types";

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

  upcoming.sort(
    (a, b) =>
      new Date(a.scheduled_at ?? 0).getTime() -
      new Date(b.scheduled_at ?? 0).getTime()
  );

  return { live, final: final_games, upcoming };
}

export function formatGameTime(game: Game): string {
  if (game.status === "live") {
    return game.game_clock ?? "Live";
  }

  if (game.status === "final") {
    return "Final";
  }

  // Upcoming: show tip-off time
  if (game.scheduled_at) {
    const date = new Date(game.scheduled_at);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  return "TBD";
}
