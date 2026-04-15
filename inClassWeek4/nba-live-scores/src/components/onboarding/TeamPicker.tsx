"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { NBA_TEAMS } from "@/lib/nba-teams";

export default function TeamPicker() {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  function toggleTeam(teamId: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) {
        next.delete(teamId);
      } else {
        next.add(teamId);
      }
      return next;
    });
  }

  async function handleSave() {
    if (selected.size === 0) {
      setError("Pick at least one team!");
      return;
    }

    setSaving(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Not authenticated");
      setSaving(false);
      return;
    }

    // Insert favorites
    const favorites = Array.from(selected).map((team_id) => ({
      user_id: user.id,
      team_id,
    }));

    const { error: insertError } = await supabase
      .from("user_favorites")
      .upsert(favorites, { onConflict: "user_id,team_id" });

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  // Group teams by conference
  const east = NBA_TEAMS.filter((t) => t.conference === "East");
  const west = NBA_TEAMS.filter((t) => t.conference === "West");

  return (
    <div className="w-full max-w-3xl">
      {error && (
        <p className="mb-4 text-sm text-red-600 text-center">{error}</p>
      )}

      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3">
            Eastern Conference
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {east.map((team) => (
              <button
                key={team.id}
                onClick={() => toggleTeam(team.id)}
                className={`rounded-lg border-2 px-3 py-3 text-center text-sm font-medium transition-all ${
                  selected.has(team.id)
                    ? "border-orange-500 bg-orange-50 text-orange-700"
                    : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"
                }`}
              >
                <div className="font-bold text-base">{team.abbreviation}</div>
                <div className="text-xs text-zinc-500 mt-0.5">{team.city}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3">
            Western Conference
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {west.map((team) => (
              <button
                key={team.id}
                onClick={() => toggleTeam(team.id)}
                className={`rounded-lg border-2 px-3 py-3 text-center text-sm font-medium transition-all ${
                  selected.has(team.id)
                    ? "border-orange-500 bg-orange-50 text-orange-700"
                    : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"
                }`}
              >
                <div className="font-bold text-base">{team.abbreviation}</div>
                <div className="text-xs text-zinc-500 mt-0.5">{team.city}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-center">
        <button
          onClick={handleSave}
          disabled={saving || selected.size === 0}
          className="rounded-lg bg-orange-600 px-8 py-3 text-sm font-semibold text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {saving ? "Saving..." : `Continue with ${selected.size} team${selected.size !== 1 ? "s" : ""}`}
        </button>
      </div>
    </div>
  );
}
