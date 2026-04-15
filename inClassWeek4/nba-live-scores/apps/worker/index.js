const { createClient } = require("@supabase/supabase-js");

// --- Config ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const POLL_INTERVAL = 30_000; // 30 seconds

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const NBA_SCOREBOARD_URL =
  "https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json";

// --- Helpers ---

function parseGameClock(game) {
  const statusText = game.gameStatusText || "";
  const period = game.period || 0;
  const rawClock = game.gameClock || "";

  // Final
  if (game.gameStatus === 3) {
    return statusText || "Final";
  }

  // Scheduled
  if (game.gameStatus === 1) {
    return null;
  }

  // Live — parse ISO duration (PT05M30.00S)
  if (statusText.toLowerCase().includes("half")) {
    return "Halftime";
  }

  let clockStr = "";
  const match = rawClock.match(/PT(\d+)M([\d.]+)S/);
  if (match) {
    const mins = parseInt(match[1], 10);
    const secs = Math.floor(parseFloat(match[2]));
    clockStr = `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  if (period <= 4) {
    return `Q${period} ${clockStr}`.trim();
  }
  const ot = period - 4;
  return `OT${ot > 1 ? ot : ""} ${clockStr}`.trim();
}

function mapStatus(gameStatus) {
  if (gameStatus === 2) return "live";
  if (gameStatus === 3) return "final";
  return "scheduled";
}

function logoUrl(teamId) {
  return `https://cdn.nba.com/logos/nba/${teamId}/global/L/logo.svg`;
}

// --- Poll ---

async function poll() {
  const start = Date.now();

  try {
    const res = await fetch(NBA_SCOREBOARD_URL);
    if (!res.ok) {
      console.error(`NBA API error: ${res.status}`);
      return;
    }

    const data = await res.json();
    const games = data.scoreboard?.games || [];

    if (games.length === 0) {
      console.log(`[${new Date().toISOString()}] No games today`);
      return;
    }

    const rows = games.map((g) => ({
      id: parseInt(g.gameId, 10),
      home_team: g.homeTeam.teamTricode,
      away_team: g.awayTeam.teamTricode,
      home_score: g.homeTeam.score,
      away_score: g.awayTeam.score,
      status: mapStatus(g.gameStatus),
      game_clock: parseGameClock(g),
      home_logo: logoUrl(g.homeTeam.teamId),
      away_logo: logoUrl(g.awayTeam.teamId),
      date: data.scoreboard.gameDate,
      scheduled_at: g.gameTimeUTC,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from("nba_games")
      .upsert(rows, { onConflict: "id" });

    if (error) {
      console.error("Upsert error:", error.message);
      return;
    }

    const elapsed = Date.now() - start;
    const summary = rows
      .map((r) => `${r.away_team}@${r.home_team} ${r.away_score}-${r.home_score} [${r.status}]`)
      .join(", ");
    console.log(
      `[${new Date().toISOString()}] Updated ${rows.length} games in ${elapsed}ms — ${summary}`
    );
  } catch (err) {
    console.error("Poll failed:", err.message);
  }
}

// --- Main loop ---

async function main() {
  console.log("NBA Score Worker starting");
  console.log(`Supabase: ${SUPABASE_URL}`);
  console.log(`Poll interval: ${POLL_INTERVAL / 1000}s`);
  console.log("---");

  // Run immediately, then on interval
  await poll();
  setInterval(poll, POLL_INTERVAL);
}

main();
