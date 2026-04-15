import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  fetchGames,
  mapGameStatus,
} from "@/lib/sports-api/balldontlie";
import { NBA_TEAMS } from "@/lib/nba-teams";

// Use service role key to bypass RLS
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Map balldontlie team IDs to abbreviations
const TEAM_ID_TO_ABBR: Record<number, string> = Object.fromEntries(
  NBA_TEAMS.map((t) => [t.id, t.abbreviation])
);

// NBA team logo URLs (via CDN)
function logoUrl(abbr: string): string {
  return `https://cdn.nba.com/logos/nba/${getNbaTeamId(abbr)}/global/L/logo.svg`;
}

// balldontlie IDs don't match nba.com IDs, so map abbreviation -> nba.com team ID
const NBA_DOT_COM_IDS: Record<string, number> = {
  ATL: 1610612737, BOS: 1610612738, BKN: 1610612751, CHA: 1610612766,
  CHI: 1610612741, CLE: 1610612739, DAL: 1610612742, DEN: 1610612743,
  DET: 1610612765, GSW: 1610612744, HOU: 1610612745, IND: 1610612754,
  LAC: 1610612746, LAL: 1610612747, MEM: 1610612763, MIA: 1610612748,
  MIL: 1610612749, MIN: 1610612750, NOP: 1610612740, NYK: 1610612752,
  OKC: 1610612760, ORL: 1610612753, PHI: 1610612755, PHX: 1610612756,
  POR: 1610612757, SAC: 1610612758, SAS: 1610612759, TOR: 1610612761,
  UTA: 1610612762, WAS: 1610612764,
};

function getNbaTeamId(abbr: string): number {
  return NBA_DOT_COM_IDS[abbr] ?? 0;
}

function buildGameClock(bdlStatus: string, bdlTime: string): string | null {
  const s = bdlStatus.toLowerCase();
  if (s.includes("1st")) return `Q1 ${bdlTime}`.trim();
  if (s.includes("2nd")) return `Q2 ${bdlTime}`.trim();
  if (s === "halftime") return "Halftime";
  if (s.includes("3rd")) return `Q3 ${bdlTime}`.trim();
  if (s.includes("4th")) return `Q4 ${bdlTime}`.trim();
  const otMatch = s.match(/ot(\d*)/);
  if (otMatch) return `OT${otMatch[1] || ""} ${bdlTime}`.trim();
  return null;
}

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServiceClient();
  const today = new Date().toISOString().split("T")[0];

  try {
    const bdlGames = await fetchGames(today);

    if (bdlGames.length === 0) {
      return NextResponse.json({ message: "No games today", count: 0 });
    }

    const rows = bdlGames.map((g) => {
      const homeAbbr = TEAM_ID_TO_ABBR[g.home_team.id] ?? g.home_team.abbreviation;
      const awayAbbr = TEAM_ID_TO_ABBR[g.visitor_team.id] ?? g.visitor_team.abbreviation;

      return {
        id: g.id,
        home_team: homeAbbr,
        away_team: awayAbbr,
        home_score: g.home_team_score,
        away_score: g.visitor_team_score,
        status: mapGameStatus(g.status),
        game_clock: buildGameClock(g.status, g.time),
        home_logo: logoUrl(homeAbbr),
        away_logo: logoUrl(awayAbbr),
        date: today,
        scheduled_at: g.date,
        updated_at: new Date().toISOString(),
      };
    });

    const { error } = await supabase
      .from("nba_games")
      .upsert(rows, { onConflict: "id" });

    if (error) {
      console.error("Upsert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: `Updated ${rows.length} games`,
      count: rows.length,
    });
  } catch (err) {
    console.error("Poll error:", err);
    return NextResponse.json(
      { error: "Failed to poll scores" },
      { status: 500 }
    );
  }
}
