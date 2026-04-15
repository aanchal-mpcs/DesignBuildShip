import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { team_abbrs } = await request.json();

  if (!Array.isArray(team_abbrs)) {
    return NextResponse.json(
      { error: "team_abbrs must be an array" },
      { status: 400 }
    );
  }

  // Delete existing favorites
  await supabase.from("nba_favorites").delete().eq("user_id", user.id);

  // Insert new favorites
  if (team_abbrs.length > 0) {
    const favorites = team_abbrs.map((team_abbr: string) => ({
      user_id: user.id,
      team_abbr,
    }));

    const { error } = await supabase.from("nba_favorites").insert(favorites);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
