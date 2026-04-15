const BASE_URL = "https://api.balldontlie.io/v1";

interface BDLTeam {
  id: number;
  conference: string;
  division: string;
  city: string;
  name: string;
  full_name: string;
  abbreviation: string;
}

interface BDLGame {
  id: number;
  date: string;
  season: number;
  status: string;
  period: number;
  time: string;
  home_team: BDLTeam;
  visitor_team: BDLTeam;
  home_team_score: number;
  visitor_team_score: number;
}

interface BDLResponse<T> {
  data: T[];
  meta?: {
    next_cursor?: number;
    per_page?: number;
  };
}

function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    Accept: "application/json",
  };
  if (process.env.BALLDONTLIE_API_KEY) {
    headers["Authorization"] = process.env.BALLDONTLIE_API_KEY;
  }
  return headers;
}

export async function fetchGames(date: string): Promise<BDLGame[]> {
  const url = `${BASE_URL}/games?dates[]=${date}`;
  const res = await fetch(url, { headers: getHeaders() });
  if (!res.ok) {
    throw new Error(`balldontlie API error: ${res.status}`);
  }
  const json: BDLResponse<BDLGame> = await res.json();
  return json.data;
}

export function mapGameStatus(
  bdlStatus: string
): "scheduled" | "live" | "final" {
  const s = bdlStatus.toLowerCase();
  if (s === "final" || s.startsWith("final")) return "final";
  if (
    s.includes("qtr") ||
    s.includes("half") ||
    s.includes("ot") ||
    s === "in progress"
  ) {
    return "live";
  }
  return "scheduled";
}

export type { BDLGame, BDLTeam };
