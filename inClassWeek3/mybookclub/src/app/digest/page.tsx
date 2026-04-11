import Image from "next/image";
import { createClient } from "@supabase/supabase-js";

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

export const dynamic = "force-dynamic";

export default async function DigestPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Recent activity
  const { data: recentData } = await supabase
    .from("favorites")
    .select("id, title, author, cover_url, ol_key, status, created_at, user_id, users!favorites_user_id_fkey(name, email)")
    .eq("is_public", true)
    .gte("created_at", oneWeekAgo)
    .order("created_at", { ascending: false })
    .limit(20);

  const recent = (recentData ?? []) as Activity[];

  // Trending: books saved by multiple users
  const { data: allPublic } = await supabase
    .from("favorites")
    .select("ol_key, title, author, cover_url, user_id")
    .eq("is_public", true);

  const countMap = new Map<string, { title: string; author: string; cover_url: string | null; ol_key: string; users: Set<string> }>();
  for (const b of allPublic ?? []) {
    const existing = countMap.get(b.ol_key);
    if (existing) {
      existing.users.add(b.user_id);
    } else {
      countMap.set(b.ol_key, { title: b.title, author: b.author, cover_url: b.cover_url, ol_key: b.ol_key, users: new Set([b.user_id]) });
    }
  }

  const trending = [...countMap.values()]
    .filter((b) => b.users.size > 1)
    .sort((a, b) => b.users.size - a.users.size)
    .slice(0, 8);

  // Recently finished
  const { data: finishedData } = await supabase
    .from("favorites")
    .select("id, title, author, cover_url, ol_key, user_id, finished_at, users!favorites_user_id_fkey(name, email)")
    .eq("is_public", true)
    .eq("status", "finished")
    .not("finished_at", "is", null)
    .order("finished_at", { ascending: false })
    .limit(6);

  const recentlyFinished = (finishedData ?? []) as (Activity & { finished_at: string })[];

  return (
    <div className="flex-1">
      <div className="border-b border-stone-200 dark:border-stone-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-stone-950 dark:text-stone-50">
            Weekly Digest
          </h1>
          <p className="mt-2 sm:mt-3 text-base sm:text-lg text-stone-600 dark:text-stone-400 max-w-xl">
            What&apos;s been happening in the book club this week.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Trending */}
        {trending.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-stone-950 dark:text-stone-50 mb-4">
              Trending
              <span className="ml-2 text-sm font-normal text-stone-500">Saved by multiple readers</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
              {trending.map((b) => {
                const bk = b.ol_key.replace("/works/", "");
                return (
                  <a key={b.ol_key} href={`/book/${bk}`} className="group flex flex-col">
                    <div className="relative aspect-[2/3] rounded-lg overflow-hidden shadow-sm transition-all group-hover:shadow-md group-hover:-translate-y-0.5">
                      {b.cover_url ? (
                        <Image src={b.cover_url} alt={b.title} fill className="object-cover" sizes="100px" />
                      ) : (
                        <div className="w-full h-full bg-stone-200 dark:bg-stone-800 flex items-center justify-center text-stone-400 text-[10px] text-center">No cover</div>
                      )}
                    </div>
                    <p className="mt-1.5 text-[11px] sm:text-xs font-medium line-clamp-2 text-stone-700 dark:text-stone-300">{b.title}</p>
                    <p className="text-[10px] text-stone-500">{b.users.size} readers</p>
                  </a>
                );
              })}
            </div>
          </section>
        )}

        {/* Recently finished */}
        {recentlyFinished.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-stone-950 dark:text-stone-50 mb-4">Recently Finished</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              {recentlyFinished.map((b) => {
                const bk = b.ol_key.replace("/works/", "");
                const name = b.users?.[0]?.name ?? b.users?.[0]?.email ?? "Someone";
                return (
                  <a key={b.id} href={`/book/${bk}`} className="group flex flex-col">
                    <div className="relative aspect-[2/3] rounded-lg overflow-hidden shadow-sm transition-all group-hover:shadow-md group-hover:-translate-y-0.5">
                      {b.cover_url ? (
                        <Image src={b.cover_url} alt={b.title} fill className="object-cover" sizes="120px" />
                      ) : (
                        <div className="w-full h-full bg-stone-200 dark:bg-stone-800 flex items-center justify-center text-stone-400 text-[10px]">No cover</div>
                      )}
                    </div>
                    <p className="mt-1.5 text-xs font-medium line-clamp-2 text-stone-700 dark:text-stone-300">{b.title}</p>
                    <p className="text-[10px] text-stone-500">Finished by {name}</p>
                  </a>
                );
              })}
            </div>
          </section>
        )}

        {/* Activity feed */}
        <section>
          <h2 className="text-xl font-semibold text-stone-950 dark:text-stone-50 mb-4">This Week</h2>
          {recent.length === 0 ? (
            <p className="text-stone-500">No activity this week.</p>
          ) : (
            <div className="space-y-3">
              {recent.map((a) => {
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
          )}
        </section>
      </div>
    </div>
  );
}
