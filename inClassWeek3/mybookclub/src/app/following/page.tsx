"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { supabase } from "@/lib/supabase";

interface Activity {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  ol_key: string;
  status: string;
  created_at: string;
  user_id: string;
  users: { name: string | null; email: string | null }[] | null;
}

const statusVerb: Record<string, string> = {
  want_to_read: "wants to read",
  reading: "started reading",
  finished: "finished",
};

export default function FollowingPage() {
  const { userId } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    async function load() {
      // Get who I follow
      const { data: followData } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", userId);

      const followingIds = (followData ?? []).map((f) => f.following_id);

      if (followingIds.length === 0) {
        setLoading(false);
        return;
      }

      // Get their recent public activity
      const { data } = await supabase
        .from("favorites")
        .select("id, title, author, cover_url, ol_key, status, created_at, user_id, users!favorites_user_id_fkey(name, email)")
        .in("user_id", followingIds)
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(30);

      setActivities((data ?? []) as Activity[]);
      setLoading(false);
    }

    load();
  }, [userId]);

  if (!userId) {
    return (
      <div className="flex-1 flex items-center justify-center py-24">
        <p className="text-stone-600 text-lg">Sign in to see your feed.</p>
      </div>
    );
  }

  return (
    <div className="flex-1">
      <div className="border-b border-stone-200 dark:border-stone-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-stone-950 dark:text-stone-50">
            Following
          </h1>
          <p className="mt-2 text-stone-600">Recent activity from people you follow.</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {loading && (
          <div className="flex justify-center py-20" role="status">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-stone-900 dark:border-stone-700 dark:border-t-stone-100" />
          </div>
        )}

        {!loading && activities.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">👥</div>
            <p className="text-stone-600 text-lg font-medium">No activity yet.</p>
            <p className="text-stone-500 text-sm mt-1 mb-6">
              Follow readers in the <a href="/community" className="underline">Community</a> to see their updates here.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {activities.map((a) => {
            const name = a.users?.[0]?.name ?? a.users?.[0]?.email ?? "Someone";
            const bk = a.ol_key.replace("/works/", "");
            return (
              <div key={a.id} className="flex items-center gap-4 rounded-lg border border-stone-200 dark:border-stone-800 px-4 py-3">
                <a href={`/book/${bk}`} className="shrink-0">
                  {a.cover_url ? (
                    <Image src={a.cover_url} alt={a.title} width={40} height={60} className="rounded shadow-sm" />
                  ) : (
                    <div className="w-[40px] h-[60px] bg-stone-200 dark:bg-stone-800 rounded" />
                  )}
                </a>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-stone-700 dark:text-stone-300">
                    <a href={`/user/${a.user_id}`} className="font-medium hover:underline">{name}</a>
                    {" "}{statusVerb[a.status] ?? "saved"}{" "}
                    <a href={`/book/${bk}`} className="font-medium hover:underline">{a.title}</a>
                  </p>
                  <p className="text-[11px] text-stone-500 mt-0.5">{new Date(a.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
