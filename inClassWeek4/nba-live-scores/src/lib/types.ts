export type GameStatus = "scheduled" | "live" | "final";

export interface Team {
  id: number;
  name: string;
  abbreviation: string;
  city: string;
  conference: string;
  division: string;
}

export interface Game {
  id: number;
  date: string;
  status: GameStatus;
  period: number | null;
  time: string | null;
  home_team_id: number;
  away_team_id: number;
  home_team_score: number;
  away_team_score: number;
  scheduled_at: string;
  updated_at: string;
  // Joined fields
  home_team?: Team;
  away_team?: Team;
}

export interface Profile {
  id: string;
  username: string;
  created_at: string;
}

export interface UserFavorite {
  user_id: string;
  team_id: number;
}
