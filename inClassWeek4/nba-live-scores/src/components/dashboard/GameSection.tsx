import { Game } from "@/lib/types";
import LiveGameCard from "./LiveGameCard";
import CompletedGameCard from "./CompletedGameCard";
import UpcomingGameCard from "./UpcomingGameCard";

interface GameSectionProps {
  title: string;
  games: Game[];
  type: "live" | "final" | "upcoming";
}

export default function GameSection({ title, games, type }: GameSectionProps) {
  if (games.length === 0) return null;

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
        {title}
        {type === "live" && (
          <span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
            {games.length}
          </span>
        )}
      </h2>
      <div className="space-y-2">
        {games.map((game) => {
          switch (type) {
            case "live":
              return <LiveGameCard key={game.id} game={game} />;
            case "final":
              return <CompletedGameCard key={game.id} game={game} />;
            case "upcoming":
              return <UpcomingGameCard key={game.id} game={game} />;
          }
        })}
      </div>
    </div>
  );
}
