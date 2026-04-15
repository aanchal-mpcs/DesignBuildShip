export type GameStatus = "scheduled" | "live" | "final";

export interface Game {
  id: number;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  status: GameStatus;
  game_clock: string | null;
  home_logo: string | null;
  away_logo: string | null;
  date: string;
  scheduled_at: string | null;
  updated_at: string;
}

export interface NbaFavorite {
  id: string;
  user_id: string;
  team_abbr: string;
  created_at: string;
}
