import { NBA_TEAMS } from "@/lib/nba-teams";
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(NBA_TEAMS, {
    headers: {
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400",
    },
  });
}
