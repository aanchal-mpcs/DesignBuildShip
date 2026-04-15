import { Game } from "@/lib/types";

export default function CompletedGameCard({ game }: { game: Game }) {
  const awayWon = game.away_score > game.home_score;
  const homeWon = game.home_score > game.away_score;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            {game.away_logo && (
              <img src={game.away_logo} alt="" className="h-6 w-6 object-contain" />
            )}
            <span className={`font-semibold ${awayWon ? "text-zinc-900" : "text-zinc-400"}`}>
              {game.away_team}
            </span>
            <span className={`ml-auto text-xl font-bold tabular-nums ${awayWon ? "text-zinc-900" : "text-zinc-400"}`}>
              {game.away_score}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {game.home_logo && (
              <img src={game.home_logo} alt="" className="h-6 w-6 object-contain" />
            )}
            <span className={`font-semibold ${homeWon ? "text-zinc-900" : "text-zinc-400"}`}>
              {game.home_team}
            </span>
            <span className={`ml-auto text-xl font-bold tabular-nums ${homeWon ? "text-zinc-900" : "text-zinc-400"}`}>
              {game.home_score}
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
