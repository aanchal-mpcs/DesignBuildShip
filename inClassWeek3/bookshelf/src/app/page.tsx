import Image from "next/image";
import { createClient } from "@supabase/supabase-js";

interface Favorite {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  ol_key: string;
  status: string;
  user_id: string;
  created_at: string;
  users: { name: string | null; email: string | null }[] | null;
}

const statusStyle: Record<string, string> = {
  want_to_read: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  reading: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  finished: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
};

const statusLabel: Record<string, string> = {
  want_to_read: "Want to read",
  reading: "Reading",
  finished: "Finished",
};

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: allData } = await supabase
    .from("favorites")
    .select("id, title, author, cover_url, ol_key, status, user_id, created_at, users!favorites_user_id_fkey(name, email)")
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  const favorites = (allData ?? []) as Favorite[];

  // Currently reading spotlight
  const currentlyReading = favorites.filter((f) => f.status === "reading").slice(0, 4);

  // Trending: books saved by multiple users
  const countMap = new Map<string, { title: string; author: string; cover_url: string | null; ol_key: string; users: Set<string> }>();
  for (const b of favorites) {
    const existing = countMap.get(b.ol_key);
    if (existing) { existing.users.add(b.user_id); }
    else { countMap.set(b.ol_key, { title: b.title, author: b.author, cover_url: b.cover_url, ol_key: b.ol_key, users: new Set([b.user_id]) }); }
  }
  const trending = [...countMap.values()].filter((b) => b.users.size > 1).sort((a, b) => b.users.size - a.users.size).slice(0, 6);

  // Group by user
  const grouped = new Map<string, { name: string; userId: string; books: Favorite[] }>();
  for (const fav of favorites) {
    if (!grouped.has(fav.user_id)) {
      const user = fav.users?.[0];
      grouped.set(fav.user_id, { name: user?.name ?? user?.email ?? "Anonymous", userId: fav.user_id, books: [] });
    }
    grouped.get(fav.user_id)!.books.push(fav);
  }

  const { data: usersData } = await supabase.from("users").select("clerk_id").order("created_at");
  const totalMembers = usersData?.length ?? 0;
  const totalBooks = favorites.length;

  return (
    <div className="flex-1">
      {/* Hero */}
      <div className="border-b border-stone-200 dark:border-stone-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Book Club
          </h1>
          <p className="mt-2 sm:mt-3 text-base sm:text-lg text-stone-500 dark:text-stone-400 max-w-xl">
            See what everyone is reading, discover new books, and track your progress together.
          </p>
          <div className="mt-4 sm:mt-6 flex gap-6">
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100">{totalMembers}</span>
              <span className="text-xs sm:text-sm text-stone-500">{totalMembers === 1 ? "member" : "members"}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100">{totalBooks}</span>
              <span className="text-xs sm:text-sm text-stone-500">books</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100">{currentlyReading.length}</span>
              <span className="text-xs sm:text-sm text-stone-500">reading now</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Currently reading spotlight */}
        {currentlyReading.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-100 mb-4">
              Currently Reading
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {currentlyReading.map((book) => {
                const bk = book.ol_key.replace("/works/", "");
                const name = book.users?.[0]?.name ?? book.users?.[0]?.email ?? "Someone";
                return (
                  <a key={book.id} href={`/book/${bk}`}
                    className="flex gap-4 rounded-xl border border-stone-200 dark:border-stone-800 p-4 hover:shadow-md transition-shadow">
                    <div className="shrink-0 relative w-16 aspect-[2/3] rounded-lg overflow-hidden shadow-sm">
                      {book.cover_url ? (
                        <Image src={book.cover_url} alt={book.title} fill className="object-cover" sizes="64px" />
                      ) : (
                        <div className="w-full h-full bg-stone-200 dark:bg-stone-800" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-900 dark:text-stone-100 line-clamp-1">{book.title}</p>
                      <p className="text-xs text-stone-500 mt-0.5">{book.author}</p>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                        <span className="font-medium">{name}</span> is reading this
                      </p>
                    </div>
                  </a>
                );
              })}
            </div>
          </section>
        )}

        {/* Trending */}
        {trending.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-100 mb-4">
              Trending <span className="text-sm font-normal text-stone-400">Saved by multiple readers</span>
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
              {trending.map((b) => {
                const bk = b.ol_key.replace("/works/", "");
                return (
                  <a key={b.ol_key} href={`/book/${bk}`} className="group flex flex-col">
                    <div className="relative aspect-[2/3] rounded-lg overflow-hidden shadow-sm transition-all group-hover:shadow-md group-hover:-translate-y-0.5">
                      {b.cover_url ? (
                        <Image src={b.cover_url} alt={b.title} fill className="object-cover" sizes="120px" />
                      ) : (
                        <div className="w-full h-full bg-stone-200 dark:bg-stone-800 flex items-center justify-center text-stone-400 text-[10px]">No cover</div>
                      )}
                    </div>
                    <p className="mt-1.5 text-xs font-medium line-clamp-2 text-stone-700 dark:text-stone-300">{b.title}</p>
                    <p className="text-[10px] text-stone-400">{b.users.size} readers</p>
                  </a>
                );
              })}
            </div>
          </section>
        )}

        {/* Empty state */}
        {grouped.size === 0 && (
          <div className="text-center py-16 sm:py-24">
            <div className="text-5xl mb-4">📚</div>
            <p className="text-stone-500 text-lg font-medium">The book club is empty!</p>
            <p className="text-stone-400 text-sm mt-1 mb-6">Be the first to add books to your reading list.</p>
            <a href="/search" className="inline-block rounded-md bg-stone-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300">
              Search for books
            </a>
          </div>
        )}

        {/* Member shelves */}
        {[...grouped.entries()].map(([, { name, userId: uid, books }]) => (
          <section key={uid} className="mb-10 sm:mb-14">
            <div className="flex items-baseline gap-3 mb-4 sm:mb-6">
              <a href={`/user/${uid}`} className="text-lg sm:text-xl font-semibold text-stone-900 hover:underline dark:text-stone-100">
                {name}&apos;s list
              </a>
              <span className="text-xs sm:text-sm text-stone-400">
                {books.length} {books.length === 1 ? "book" : "books"}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
              {books.slice(0, 6).map((book) => {
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
                    <h3 className="mt-2 sm:mt-3 text-xs sm:text-sm font-medium leading-snug line-clamp-2 text-stone-800 dark:text-stone-200">{book.title}</h3>
                    <p className="mt-0.5 text-[11px] sm:text-xs text-stone-500 line-clamp-1">{book.author}</p>
                    <span className={`mt-1.5 self-start rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-medium ${statusStyle[book.status] ?? ""}`}>
                      {statusLabel[book.status] ?? book.status}
                    </span>
                  </a>
                );
              })}
              {books.length > 6 && (
                <a href={`/user/${uid}`} className="flex items-center justify-center rounded-lg border border-stone-200 dark:border-stone-800 text-sm font-medium text-stone-500 hover:bg-stone-50 dark:hover:bg-stone-900 transition-colors">
                  +{books.length - 6} more
                </a>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
