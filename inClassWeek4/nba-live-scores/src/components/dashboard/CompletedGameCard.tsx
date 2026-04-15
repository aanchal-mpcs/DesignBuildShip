import { Game } from "@/lib/types";
import { NBA_TEAMS } from "@/lib/nba-teams";

export default function CompletedGameCard({ game }: { game: Game }) {
  const homeTeam = NBA_TEAMS.find((t) => t.id === game.home_team_id);
  const awayTeam = NBA_TEAMS.find((t) => t.id === game.away_team_id);
  const awayWon = game.away_team_score > game.home_team_score;
  const homeWon = game.home_team_score > game.away_team_score;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400">&#9733;</span>
            <span className={`font-semibold ${awayWon ? "text-zinc-900" : "text-zinc-400"}`}>
              {awayTeam?.city} {awayTeam?.name}
            </span>
            <span className={`ml-auto text-xl font-bold tabular-nums ${awayWon ? "text-zinc-900" : "text-zinc-400"}`}>
              {game.away_team_score}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400">&#9733;</span>
            <span className={`font-semibold ${homeWon ? "text-zinc-900" : "text-zinc-400"}`}>
              {homeTeam?.city} {homeTeam?.name}
            </span>
            <span className={`ml-auto text-xl font-bold tabular-nums ${homeWon ? "text-zinc-900" : "text-zinc-400"}`}>
              {game.home_team_score}
            </span>
          </div>
        </div>
        <div className="ml-4">
          <span className="text-sm font-medium text-zinc-500">Final</span>
        </div>
      </div>
    </div>
  );
}
