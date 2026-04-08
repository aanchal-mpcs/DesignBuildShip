import Image from "next/image";
import { createClient } from "@supabase/supabase-js";

interface UserWithBooks {
  clerk_id: string;
  name: string | null;
  email: string | null;
  books: {
    id: string;
    title: string;
    author: string;
    cover_url: string | null;
    ol_key: string;
    status: string;
  }[];
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

export default async function CommunityPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: users } = await supabase
    .from("users")
    .select("clerk_id, name, email")
    .order("created_at", { ascending: true });

  const { data: allFavorites } = await supabase
    .from("favorites")
    .select("id, title, author, cover_url, ol_key, status, user_id")
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  const booksByUser = new Map<string, UserWithBooks["books"]>();
  for (const fav of allFavorites ?? []) {
    if (!booksByUser.has(fav.user_id)) booksByUser.set(fav.user_id, []);
    booksByUser.get(fav.user_id)!.push(fav);
  }

  // Get follower counts
  const { data: followData } = await supabase
    .from("follows")
    .select("following_id");

  const followerCounts = new Map<string, number>();
  for (const f of followData ?? []) {
    followerCounts.set(f.following_id, (followerCounts.get(f.following_id) ?? 0) + 1);
  }

  const members: (UserWithBooks & { followers: number })[] = (users ?? []).map((u) => ({
    ...u,
    books: booksByUser.get(u.clerk_id) ?? [],
    followers: followerCounts.get(u.clerk_id) ?? 0,
  }));

  // Sort by followers (influencer vibe), then by book count
  members.sort((a, b) => b.followers - a.followers || b.books.length - a.books.length);

  const totalMembers = members.length;
  const totalBooks = (allFavorites ?? []).length;
  const activeReaders = members.filter(
    (m) => m.books.some((b) => b.status === "reading")
  ).length;

  return (
    <div className="flex-1">
      <div className="border-b border-stone-200 dark:border-stone-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Community
          </h1>
          <p className="mt-2 sm:mt-3 text-base sm:text-lg text-stone-500 dark:text-stone-400 max-w-xl">
            See what everyone in the club is reading. Click a member to explore
            their full reading list.
          </p>
          <div className="mt-4 sm:mt-6 flex gap-6">
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100">
                {totalMembers}
              </span>
              <span className="text-xs sm:text-sm text-stone-500">
                {totalMembers === 1 ? "member" : "members"}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100">
                {totalBooks}
              </span>
              <span className="text-xs sm:text-sm text-stone-500">
                public books
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100">
                {activeReaders}
              </span>
              <span className="text-xs sm:text-sm text-stone-500">
                active readers
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {members.length === 0 && (
          <div className="text-center py-16">
            <p className="text-stone-400 text-lg">No members yet.</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {members.map((member) => {
            const displayName = member.name ?? member.email ?? "Anonymous";
            const readingCount = member.books.filter(
              (b) => b.status === "reading"
            ).length;
            const finishedCount = member.books.filter(
              (b) => b.status === "finished"
            ).length;
            const previewBooks = member.books.slice(0, 4);

            return (
              <a
                key={member.clerk_id}
                href={`/user/${member.clerk_id}`}
                className="rounded-xl border border-stone-200 p-5 transition-all hover:shadow-md hover:-translate-y-0.5 dark:border-stone-800"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">
                      {displayName}
                    </h2>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {member.books.length} {member.books.length === 1 ? "book" : "books"}
                      {member.followers > 0 && (
                        <span className="ml-2">{member.followers} {member.followers === 1 ? "follower" : "followers"}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {readingCount > 0 && (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusStyle.reading}`}>
                        {readingCount} reading
                      </span>
                    )}
                    {finishedCount > 0 && (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusStyle.finished}`}>
                        {finishedCount} finished
                      </span>
                    )}
                  </div>
                </div>

                {previewBooks.length > 0 ? (
                  <div className="flex gap-2">
                    {previewBooks.map((book) => (
                      <div
                        key={book.id}
                        className="relative w-16 aspect-[2/3] rounded overflow-hidden shadow-sm"
                      >
                        {book.cover_url ? (
                          <Image
                            src={book.cover_url}
                            alt={book.title}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        ) : (
                          <div className="w-full h-full bg-stone-200 dark:bg-stone-800 flex items-center justify-center text-stone-400 text-[8px] text-center px-1">
                            No cover
                          </div>
                        )}
                      </div>
                    ))}
                    {member.books.length > 4 && (
                      <div className="w-16 aspect-[2/3] rounded bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-xs text-stone-400 font-medium">
                        +{member.books.length - 4}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-stone-400">
                    No public books yet.
                  </p>
                )}
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
