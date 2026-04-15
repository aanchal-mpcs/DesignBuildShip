"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { NBA_TEAMS } from "@/lib/nba-teams";

const MIN_TEAMS = 3;

export default function TeamPicker() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  // Load existing favorites on mount
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("nba_favorites")
        .select("team_abbr")
        .eq("user_id", user.id);

      if (data) {
        setSelected(new Set(data.map((f) => f.team_abbr)));
      }
      setLoading(false);
    }
    load();
  }, []);

  async function toggleTeam(abbr: string) {
    setError(null);
    setToggling(abbr);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Not authenticated");
      setToggling(null);
      return;
    }

    const isSelected = selected.has(abbr);

    if (isSelected) {
      // Delete from favorites
      const { error: delError } = await supabase
        .from("nba_favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("team_abbr", abbr);

      if (delError) {
        setError(delError.message);
        setToggling(null);
        return;
      }

      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(abbr);
        return next;
      });
    } else {
      // Insert into favorites
      const { error: insError } = await supabase
        .from("nba_favorites")
        .insert({ user_id: user.id, team_abbr: abbr });

      if (insError) {
        setError(insError.message);
        setToggling(null);
        return;
      }

      setSelected((prev) => new Set(prev).add(abbr));
    }

    setToggling(null);
  }

  const east = NBA_TEAMS.filter((t) => t.conference === "East");
  const west = NBA_TEAMS.filter((t) => t.conference === "West");
  const remaining = MIN_TEAMS - selected.size;

  function renderTeamButton(team: { abbreviation: string; city: string }) {
    const active = selected.has(team.abbreviation);
    const isToggling = toggling === team.abbreviation;

    return (
      <button
        key={team.abbreviation}
        onClick={() => toggleTeam(team.abbreviation)}
        disabled={isToggling}
        className={`relative rounded-lg border-2 px-3 py-3 text-center text-sm font-medium transition-all ${
          active
            ? "border-yellow-500 bg-yellow-50 text-yellow-800"
            : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"
        } ${isToggling ? "opacity-50" : ""}`}
      >
        {active && (
          <span className="absolute -top-1.5 -right-1.5 text-yellow-500 text-lg leading-none">
            &#9733;
          </span>
        )}
        <div className="font-bold text-base">{team.abbreviation}</div>
        <div className={`text-xs mt-0.5 ${active ? "text-yellow-600" : "text-zinc-500"}`}>
          {team.city}
        </div>
      </button>
    );
  }

  if (loading) {
    return (
      <div className="w-full max-w-3xl text-center py-12 text-zinc-400">
        Loading your teams...
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl">
      {error && (
        <p className="mb-4 text-sm text-red-600 text-center">{error}</p>
      )}

      <div className="mb-6 text-center">
        {remaining > 0 ? (
          <p className="text-sm text-zinc-500">
            Pick at least <span className="font-semibold text-zinc-700">{MIN_TEAMS} teams</span> to follow.
            {selected.size > 0 && (
              <span className="text-orange-600"> {remaining} more to go.</span>
            )}
          </p>
        ) : (
          <p className="text-sm text-green-600 font-medium">
            &#9733; Following {selected.size} team{selected.size !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3">
            Eastern Conference
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {east.map(renderTeamButton)}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3">
            Western Conference
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {west.map(renderTeamButton)}
          </div>
        </div>
      </div>
    </div>
  );
}
