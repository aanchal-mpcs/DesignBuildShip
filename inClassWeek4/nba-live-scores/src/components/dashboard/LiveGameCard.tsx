import { Game } from "@/lib/types";
import { formatGameTime } from "@/lib/utils/game-status";

export default function LiveGameCard({ game }: { game: Game }) {
  const timeDisplay = formatGameTime(game);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            {game.away_logo && (
              <img src={game.away_logo} alt="" className="h-6 w-6 object-contain" />
            )}
            <span className="font-semibold text-zinc-900">{game.away_team}</span>
            <span className="ml-auto text-xl font-bold text-zinc-900 tabular-nums">
              {game.away_score}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {game.home_logo && (
              <img src={game.home_logo} alt="" className="h-6 w-6 object-contain" />
            )}
            <span className="font-semibold text-zinc-900">{game.home_team}</span>
            <span className="ml-auto text-xl font-bold text-zinc-900 tabular-nums">
              {game.home_score}
            </span>
          </div>
        </div>
        <div className="ml-4 flex flex-col items-end">
          <span className="flex items-center gap-1.5 text-sm font-medium text-red-600">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
            </span>
            {timeDisplay}
          </span>
        </div>
      </div>
    </div>
  );
}
