"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { supabase } from "@/lib/supabase";

interface Recommendation {
  id: string;
  from_user_id: string;
  ol_key: string;
  title: string;
  author: string | null;
  cover_url: string | null;
  note: string | null;
  is_read: boolean;
  created_at: string;
  users: { name: string | null; email: string | null }[] | null;
}

export default function RecommendationsPage() {
  const { userId } = useAuth();
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("recommendations")
      .select("id, from_user_id, ol_key, title, author, cover_url, note, is_read, created_at, users!recommendations_from_user_id_fkey(name, email)")
      .eq("to_user_id", userId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setRecs(data as Recommendation[]);
        setLoading(false);
      });
  }, [userId]);

  async function handleMarkRead(id: string) {
    await supabase.from("recommendations").update({ is_read: true }).eq("id", id);
    setRecs((prev) => prev.map((r) => (r.id === id ? { ...r, is_read: true } : r)));
  }

  async function handleDismiss(id: string) {
    await supabase.from("recommendations").delete().eq("id", id);
    setRecs((prev) => prev.filter((r) => r.id !== id));
  }

  const unread = recs.filter((r) => !r.is_read);
  const read = recs.filter((r) => r.is_read);

  if (!userId) {
    return (
      <div className="flex-1 flex items-center justify-center py-24">
        <p className="text-stone-600 text-lg">Sign in to see your recommendations.</p>
      </div>
    );
  }

  return (
    <div className="flex-1">
      <div className="border-b border-stone-200 dark:border-stone-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Recommendations
          </h1>
          <p className="mt-2 text-stone-600">Books your classmates think you should read.</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {loading && (
          <div className="flex justify-center py-20" role="status">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-stone-900 dark:border-stone-700 dark:border-t-stone-100" />
          </div>
        )}

        {!loading && recs.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">💌</div>
            <p className="text-stone-600 text-lg font-medium">No recommendations yet.</p>
            <p className="text-stone-500 text-sm mt-1">When classmates recommend books to you, they&apos;ll show up here.</p>
          </div>
        )}

        {unread.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">
              New <span className="ml-1 text-sm font-normal text-stone-500">{unread.length}</span>
            </h2>
            <div className="space-y-3">
              {unread.map((rec) => {
                const from = rec.users?.[0]?.name ?? rec.users?.[0]?.email ?? "Someone";
                const bookKey = rec.ol_key.replace("/works/", "");
                return (
                  <div key={rec.id} className="flex gap-4 rounded-lg border border-stone-200 dark:border-stone-800 p-4 bg-amber-50/50 dark:bg-amber-950/20">
                    <a href={`/book/${bookKey}`} className="shrink-0">
                      {rec.cover_url ? (
                        <Image src={rec.cover_url} alt={rec.title} width={60} height={90} className="rounded shadow-sm" />
                      ) : (
                        <div className="w-[60px] h-[90px] bg-stone-200 dark:bg-stone-800 rounded flex items-center justify-center text-stone-400 text-[8px]">No cover</div>
                      )}
                    </a>
                    <div className="flex-1 min-w-0">
                      <a href={`/book/${bookKey}`} className="text-sm font-medium text-stone-900 hover:underline dark:text-stone-100">{rec.title}</a>
                      {rec.author && <p className="text-xs text-stone-600 mt-0.5">{rec.author}</p>}
                      <p className="text-xs text-stone-600 mt-1">Recommended by <span className="font-medium text-stone-700 dark:text-stone-300">{from}</span></p>
                      {rec.note && <p className="text-xs text-stone-600 dark:text-stone-400 mt-1 italic">&ldquo;{rec.note}&rdquo;</p>}
                      <div className="mt-2 flex gap-2">
                        <button onClick={() => handleMarkRead(rec.id)}
                          className="rounded-md bg-stone-900 px-3 py-1 text-xs font-medium text-white hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300">
                          Got it
                        </button>
                        <button onClick={() => handleDismiss(rec.id)}
                          className="text-xs text-stone-400 hover:text-red-600 dark:hover:text-red-400">Dismiss</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {read.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">
              Previous <span className="ml-1 text-sm font-normal text-stone-500">{read.length}</span>
            </h2>
            <div className="space-y-3">
              {read.map((rec) => {
                const from = rec.users?.[0]?.name ?? rec.users?.[0]?.email ?? "Someone";
                const bookKey = rec.ol_key.replace("/works/", "");
                return (
                  <div key={rec.id} className="flex gap-4 rounded-lg border border-stone-200 dark:border-stone-800 p-4 opacity-60">
                    <a href={`/book/${bookKey}`} className="shrink-0">
                      {rec.cover_url ? (
                        <Image src={rec.cover_url} alt={rec.title} width={48} height={72} className="rounded shadow-sm" />
                      ) : (
                        <div className="w-[48px] h-[72px] bg-stone-200 dark:bg-stone-800 rounded flex items-center justify-center text-stone-400 text-[8px]">No cover</div>
                      )}
                    </a>
                    <div className="flex-1 min-w-0">
                      <a href={`/book/${bookKey}`} className="text-sm font-medium text-stone-800 hover:underline dark:text-stone-200">{rec.title}</a>
                      <p className="text-xs text-stone-600 mt-0.5">From {from}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
