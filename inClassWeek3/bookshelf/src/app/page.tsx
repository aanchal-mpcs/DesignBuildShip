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
  users: { name: string | null; email: string | null }[] | null;
}

const statusLabel: Record<string, string> = {
  want_to_read: "Want to read",
  reading: "Reading",
  finished: "Finished",
};

const statusStyle: Record<string, string> = {
  want_to_read:
    "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  reading:
    "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  finished:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
};

async function getFavorites() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase
    .from("favorites")
    .select(
      "id, title, author, cover_url, ol_key, status, user_id, users!favorites_user_id_fkey(name, email)"
    )
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  if (error) return [];
  return (data ?? []) as Favorite[];
}

export const dynamic = "force-dynamic";

export default async function Home() {
  const favorites = await getFavorites();

  const grouped = new Map<string, { name: string; books: Favorite[] }>();
  for (const fav of favorites) {
    if (!grouped.has(fav.user_id)) {
      const user = fav.users?.[0];
      const name = user?.name ?? user?.email ?? "Anonymous";
      grouped.set(fav.user_id, { name, books: [] });
    }
    grouped.get(fav.user_id)!.books.push(fav);
  }

  const totalBooks = favorites.length;
  const totalReaders = grouped.size;
  const currentlyReading = favorites.filter(
    (f) => f.status === "reading"
  ).length;

  return (
    <div className="flex-1">
      {/* Hero */}
      <div className="border-b border-stone-200 dark:border-stone-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Book Club
          </h1>
          <p className="mt-2 sm:mt-3 text-base sm:text-lg text-stone-500 dark:text-stone-400 max-w-xl">
            See what everyone in the class is reading, wants to read, and has
            finished. Add books to your own reading list.
          </p>
          <div className="mt-4 sm:mt-6 flex gap-6">
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100">
                {totalBooks}
              </span>
              <span className="text-xs sm:text-sm text-stone-500">
                {totalBooks === 1 ? "book" : "books"}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100">
                {totalReaders}
              </span>
              <span className="text-xs sm:text-sm text-stone-500">
                {totalReaders === 1 ? "reader" : "readers"}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100">
                {currentlyReading}
              </span>
              <span className="text-xs sm:text-sm text-stone-500">
                reading now
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Shelves */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {grouped.size === 0 && (
          <div className="text-center py-16 sm:py-24">
            <div className="text-5xl mb-4">📚</div>
            <p className="text-stone-500 text-lg font-medium">
              The book club is empty!
            </p>
            <p className="text-stone-400 text-sm mt-1 mb-6">
              Be the first to add books to your reading list.
            </p>
            <a
              href="/search"
              className="inline-block rounded-md bg-stone-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300"
            >
              Search for books
            </a>
          </div>
        )}

        {[...grouped.entries()].map(([userId, { name, books }]) => (
          <section key={userId} className="mb-10 sm:mb-14">
            <div className="flex items-baseline gap-3 mb-4 sm:mb-6">
              <a
                href={`/user/${userId}`}
                className="text-lg sm:text-xl font-semibold text-stone-900 hover:underline dark:text-stone-100"
              >
                {name}&apos;s list
              </a>
              <span className="text-xs sm:text-sm text-stone-400">
                {books.length} {books.length === 1 ? "book" : "books"}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
              {books.map((book) => {
                const bookKey = book.ol_key.replace("/works/", "");
                return (
                  <a
                    key={book.id}
                    href={`/book/${bookKey}`}
                    className="group flex flex-col"
                  >
                    <div className="relative aspect-[2/3] overflow-hidden rounded-lg shadow-sm transition-all duration-200 group-hover:shadow-lg group-hover:-translate-y-1">
                      {book.cover_url ? (
                        <Image
                          src={book.cover_url}
                          alt={`Cover of ${book.title}`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 45vw, (max-width: 768px) 30vw, (max-width: 1024px) 22vw, 16vw"
                        />
                      ) : (
                        <div
                          className="w-full h-full bg-stone-200 dark:bg-stone-800 flex items-center justify-center text-stone-400 text-xs text-center px-3"
                          aria-label={`No cover available for ${book.title}`}
                        >
                          No cover
                        </div>
                      )}
                    </div>
                    <h3 className="mt-2 sm:mt-3 text-xs sm:text-sm font-medium leading-snug line-clamp-2 text-stone-800 dark:text-stone-200">
                      {book.title}
                    </h3>
                    <p className="mt-0.5 text-[11px] sm:text-xs text-stone-500 line-clamp-1">
                      {book.author}
                    </p>
                    <span
                      className={`mt-1.5 self-start rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-medium ${statusStyle[book.status] ?? ""}`}
                    >
                      {statusLabel[book.status] ?? book.status}
                    </span>
                  </a>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
