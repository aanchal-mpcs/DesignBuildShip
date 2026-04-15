import { Game } from "@/lib/types";
import { formatGameTime } from "@/lib/utils/game-status";
import { NBA_TEAMS } from "@/lib/nba-teams";

export default function UpcomingGameCard({ game }: { game: Game }) {
  const homeTeam = NBA_TEAMS.find((t) => t.id === game.home_team_id);
  const awayTeam = NBA_TEAMS.find((t) => t.id === game.away_team_id);
  const timeDisplay = formatGameTime(game);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400">&#9733;</span>
            <span className="font-semibold text-zinc-900">{awayTeam?.city} {awayTeam?.name}</span>
            <span className="ml-auto text-xl font-bold text-zinc-300 tabular-nums">&mdash;</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400">&#9733;</span>
            <span className="font-semibold text-zinc-900">{homeTeam?.city} {homeTeam?.name}</span>
            <span className="ml-auto text-xl font-bold text-zinc-300 tabular-nums">&mdash;</span>
          </div>
        </div>
        <div className="ml-4">
          <span className="text-sm font-medium text-zinc-500">{timeDisplay}</span>
        </div>
      </div>
    </div>
  );
}
