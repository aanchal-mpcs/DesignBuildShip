import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("user_id");
  if (!userId) return NextResponse.json({ error: "Missing user_id" }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase
    .from("favorites")
    .select("title, author, status, ol_key, created_at, started_at, finished_at, notes")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const rows = data ?? [];
  const header = "Title,Author,Status,Open Library Key,Date Added,Started,Finished,Notes";
  const csvRows = rows.map((r) => {
    const escape = (s: string | null) => {
      if (!s) return "";
      return `"${s.replace(/"/g, '""')}"`;
    };
    return [
      escape(r.title),
      escape(r.author),
      r.status,
      r.ol_key,
      r.created_at ? new Date(r.created_at).toLocaleDateString() : "",
      r.started_at ? new Date(r.started_at).toLocaleDateString() : "",
      r.finished_at ? new Date(r.finished_at).toLocaleDateString() : "",
      escape(r.notes),
    ].join(",");
  });

  const csv = [header, ...csvRows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=reading-list.csv",
    },
  });
}
