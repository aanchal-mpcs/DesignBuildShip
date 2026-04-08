import Image from "next/image";
import { createClient } from "@supabase/supabase-js";

interface Favorite {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  ol_key: string;
  user_id: string;
  users: { name: string | null; email: string | null } | null;
}

async function getFavorites() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data } = await supabase
    .from("favorites")
    .select(
      "id, title, author, cover_url, ol_key, user_id, users!favorites_user_id_fkey(name, email)"
    )
    .order("created_at", { ascending: false });

  return (data ?? []) as Favorite[];
}

export const dynamic = "force-dynamic";

export default async function Home() {
  const favorites = await getFavorites();

  const grouped = new Map<string, { name: string; books: Favorite[] }>();
  for (const fav of favorites) {
    if (!grouped.has(fav.user_id)) {
      const name = fav.users?.name ?? fav.users?.email ?? "Anonymous";
      grouped.set(fav.user_id, { name, books: [] });
    }
    grouped.get(fav.user_id)!.books.push(fav);
  }

  const totalBooks = favorites.length;
  const totalReaders = grouped.size;

  return (
    <div className="flex-1">
      {/* Hero */}
      <div className="border-b border-stone-200 dark:border-stone-800">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <h1 className="text-5xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            Class Bookshelf
          </h1>
          <p className="mt-3 text-lg text-stone-500 dark:text-stone-400 max-w-xl">
            A shared collection of favorite books from everyone in the class.
            Discover what your classmates are reading.
          </p>
          <div className="mt-6 flex gap-6">
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-stone-900 dark:text-stone-100">
                {totalBooks}
              </span>
              <span className="text-sm text-stone-500">
                {totalBooks === 1 ? "book" : "books"}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-stone-900 dark:text-stone-100">
                {totalReaders}
              </span>
              <span className="text-sm text-stone-500">
                {totalReaders === 1 ? "reader" : "readers"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Shelves */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        {grouped.size === 0 && (
          <div className="text-center py-24">
            <p className="text-stone-400 text-lg">No favorites yet.</p>
            <a
              href="/search"
              className="mt-4 inline-block rounded-md bg-stone-900 px-5 py-2 text-sm font-medium text-white hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300"
            >
              Search for books
            </a>
          </div>
        )}

        {[...grouped.entries()].map(([userId, { name, books }]) => (
          <section key={userId} className="mb-14">
            <div className="flex items-baseline gap-3 mb-6">
              <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-100">
                {name}&apos;s picks
              </h2>
              <span className="text-sm text-stone-400">
                {books.length} {books.length === 1 ? "book" : "books"}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {books.map((book) => (
                <div key={book.id} className="group flex flex-col">
                  <div className="relative aspect-[2/3] overflow-hidden rounded-lg shadow-sm transition-all duration-200 group-hover:shadow-lg group-hover:-translate-y-1">
                    {book.cover_url ? (
                      <Image
                        src={book.cover_url}
                        alt={book.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 16vw"
                      />
                    ) : (
                      <div className="w-full h-full bg-stone-200 dark:bg-stone-800 flex items-center justify-center text-stone-400 text-xs text-center px-3">
                        No cover
                      </div>
                    )}
                  </div>
                  <h3 className="mt-3 text-sm font-medium leading-snug line-clamp-2 text-stone-800 dark:text-stone-200">
                    {book.title}
                  </h3>
                  <p className="mt-0.5 text-xs text-stone-500 line-clamp-1">
                    {book.author}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
