import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  fetchGames,
  mapGameStatus,
  parsePeriod,
  parseTime,
} from "@/lib/sports-api/balldontlie";

// Use service role key to bypass RLS
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
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

    // Upsert each game
    const rows = bdlGames.map((g) => ({
      id: g.id,
      date: today,
      status: mapGameStatus(g.status),
      period: parsePeriod(g.status),
      time: parseTime(g.status, g.time),
      home_team_id: g.home_team.id,
      away_team_id: g.visitor_team.id,
      home_team_score: g.home_team_score,
      away_team_score: g.visitor_team_score,
      scheduled_at: g.date,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from("games")
      .upsert(rows, { onConflict: "id" });

    if (error) {
      console.error("Upsert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: `Updated ${rows.length} games`,
      count: rows.length,
      statuses: rows.map((r) => r.status),
    });
  } catch (err) {
    console.error("Poll error:", err);
    return NextResponse.json(
      { error: "Failed to poll scores" },
      { status: 500 }
    );
  }
}
