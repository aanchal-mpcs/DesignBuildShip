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

export async function fetchGames(
  date: string
): Promise<BDLGame[]> {
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
  // balldontlie statuses: "Final", "1st Qtr", "2nd Qtr", "3rd Qtr", "4th Qtr", "Halftime", "OT1", etc., or a time like "7:00 PM ET"
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

export function parsePeriod(bdlStatus: string): number | null {
  const s = bdlStatus.toLowerCase();
  if (s.includes("1st")) return 1;
  if (s.includes("2nd") || s === "halftime") return 2;
  if (s.includes("3rd")) return 3;
  if (s.includes("4th")) return 4;
  const otMatch = s.match(/ot(\d*)/);
  if (otMatch) return 4 + (parseInt(otMatch[1] || "1", 10));
  if (s === "final") return 4;
  return null;
}

export function parseTime(bdlStatus: string, bdlTime: string): string | null {
  // During live games, the `time` field has the clock value
  if (bdlTime && bdlTime.trim() !== "") return bdlTime.trim();

  const s = bdlStatus.toLowerCase();
  if (s === "halftime") return "Halftime";
  return null;
}

export type { BDLGame, BDLTeam };
