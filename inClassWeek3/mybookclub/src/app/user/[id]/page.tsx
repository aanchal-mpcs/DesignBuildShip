import Image from "next/image";
import { createClient } from "@supabase/supabase-js";
import FollowButton from "@/components/FollowButton";

interface Favorite {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  ol_key: string;
  status: string;
  created_at: string;
  finished_at: string | null;
}

interface Review {
  rating: number;
}

interface Challenge {
  id: string;
  goal: number;
  year: number;
}

const statusLabel: Record<string, string> = {
  want_to_read: "Want to Read",
  reading: "Reading",
  finished: "Finished",
};

const statusStyle: Record<string, string> = {
  want_to_read: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  reading: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  finished: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
};

export const dynamic = "force-dynamic";

export default async function UserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: user } = await supabase
    .from("users")
    .select("clerk_id, name, email, created_at")
    .eq("clerk_id", id)
    .single();

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center py-24">
        <p className="text-stone-600 text-lg">User not found.</p>
      </div>
    );
  }

  const { data: books } = await supabase
    .from("favorites")
    .select("id, title, author, cover_url, ol_key, status, created_at, finished_at")
    .eq("user_id", id)
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  const favorites = (books ?? []) as Favorite[];
  const displayName = user.name ?? user.email ?? "Anonymous";

  // Stats
  const currentYear = new Date().getFullYear();
  const finishedTotal = favorites.filter((b) => b.status === "finished").length;
  const finishedThisYear = favorites.filter(
    (b) => b.status === "finished" && b.finished_at && new Date(b.finished_at).getFullYear() === currentYear
  ).length;
  const readingNow = favorites.filter((b) => b.status === "reading").length;

  // Average rating
  const { data: reviewData } = await supabase
    .from("reviews")
    .select("rating")
    .eq("user_id", id);

  const reviews = (reviewData ?? []) as Review[];
  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  // Reading challenge
  const { data: challengeData } = await supabase
    .from("challenges")
    .select("id, goal, year")
    .eq("user_id", id)
    .eq("year", currentYear)
    .single();

  const challenge = challengeData as Challenge | null;

  // Top genres from subjects — skip for now, would need separate query

  // Group by status
  const grouped: Record<string, Favorite[]> = {
    reading: [],
    want_to_read: [],
    finished: [],
  };
  for (const book of favorites) {
    grouped[book.status]?.push(book);
  }

  // Follower counts
  const { count: followerCount } = await supabase
    .from("follows")
    .select("id", { count: "exact", head: true })
    .eq("following_id", id);

  const { count: followingCount } = await supabase
    .from("follows")
    .select("id", { count: "exact", head: true })
    .eq("follower_id", id);

  const memberSince = user.created_at ? new Date(user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : null;

  return (
    <div className="flex-1">
      <div className="border-b border-stone-200 dark:border-stone-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-heading">
            {displayName}
          </h1>
          {memberSince && <p className="text-sm text-stone-500 mt-1">Member since {memberSince}</p>}

          <FollowButton
            targetUserId={id}
            initialFollowers={followerCount ?? 0}
            initialFollowing={followingCount ?? 0}
          />

          {/* Stats */}
          <div className="mt-5 flex flex-wrap gap-6">
            <div className="flex flex-col">
              <span className="text-xl font-bold text-heading">{favorites.length}</span>
              <span className="text-xs text-stone-600">books</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-heading">{finishedTotal}</span>
              <span className="text-xs text-stone-600">finished</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold text-heading">{readingNow}</span>
              <span className="text-xs text-stone-600">reading</span>
            </div>
            {avgRating && (
              <div className="flex flex-col">
                <span className="text-xl font-bold text-amber-500">{avgRating} <span className="text-sm">★</span></span>
                <span className="text-xs text-stone-600">avg rating ({reviews.length} reviews)</span>
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-xl font-bold text-heading">{finishedThisYear}</span>
              <span className="text-xs text-stone-600">finished in {currentYear}</span>
            </div>
          </div>

          {/* Reading challenge */}
          {challenge && (
            <div className="mt-6 max-w-sm">
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="font-medium text-stone-500 dark:text-stone-300">{currentYear} Reading Challenge</span>
                <span className="text-stone-600">{finishedThisYear} / {challenge.goal}</span>
              </div>
              <div className="h-3 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${Math.min(100, (finishedThisYear / challenge.goal) * 100)}%` }}
                />
              </div>
              {finishedThisYear >= challenge.goal && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">Challenge complete!</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {favorites.length === 0 && (
          <p className="text-stone-500 text-center py-16 text-lg">No public books on this list yet.</p>
        )}

        {(["reading", "want_to_read", "finished"] as const).map((status) => {
          const items = grouped[status];
          if (!items || items.length === 0) return null;

          return (
            <section key={status} className="mb-10 sm:mb-14">
              <h2 className="text-lg sm:text-xl font-semibold text-heading mb-4 sm:mb-6">
                {statusLabel[status]}
                <span className="ml-2 text-sm font-normal text-stone-500">{items.length}</span>
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
                {items.map((book) => {
                  const bookKey = book.ol_key.replace("/works/", "");
                  return (
                    <a key={book.id} href={`/book/${bookKey}`} className="group flex flex-col">
                      <div className="relative aspect-[2/3] overflow-hidden rounded-lg shadow-sm transition-all duration-200 group-hover:shadow-lg group-hover:-translate-y-1">
                        {book.cover_url ? (
                          <Image src={book.cover_url} alt={`Cover of ${book.title}`} fill className="object-cover"
                            sizes="(max-width: 640px) 45vw, (max-width: 768px) 30vw, (max-width: 1024px) 22vw, 16vw" />
                        ) : (
                          <div className="w-full h-full bg-stone-200 dark:bg-stone-800 flex items-center justify-center text-stone-400 text-xs text-center px-3">No cover</div>
                        )}
                      </div>
                      <h3 className="mt-2 sm:mt-3 text-xs sm:text-sm font-medium leading-snug line-clamp-2 text-heading">{book.title}</h3>
                      <p className="mt-0.5 text-[11px] sm:text-xs text-stone-600 line-clamp-1">{book.author}</p>
                    </a>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
