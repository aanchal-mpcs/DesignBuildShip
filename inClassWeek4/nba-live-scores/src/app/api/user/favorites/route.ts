import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { team_ids } = await request.json();

  if (!Array.isArray(team_ids)) {
    return NextResponse.json(
      { error: "team_ids must be an array" },
      { status: 400 }
    );
  }

  // Delete existing favorites
  await supabase.from("user_favorites").delete().eq("user_id", user.id);

  // Insert new favorites
  if (team_ids.length > 0) {
    const favorites = team_ids.map((team_id: number) => ({
      user_id: user.id,
      team_id,
    }));

    const { error } = await supabase.from("user_favorites").insert(favorites);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
