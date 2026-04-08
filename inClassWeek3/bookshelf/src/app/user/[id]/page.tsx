import Image from "next/image";
import { createClient } from "@supabase/supabase-js";

interface UserProfile {
  clerk_id: string;
  name: string | null;
  email: string | null;
}

interface Favorite {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  ol_key: string;
  status: string;
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
    .select("clerk_id, name, email")
    .eq("clerk_id", id)
    .single();

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center py-24">
        <p className="text-stone-500 text-lg">User not found.</p>
      </div>
    );
  }

  const { data: books } = await supabase
    .from("favorites")
    .select("id, title, author, cover_url, ol_key, status")
    .eq("user_id", id)
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  const favorites = (books ?? []) as Favorite[];
  const displayName = user.name ?? user.email ?? "Anonymous";

  const grouped: Record<string, Favorite[]> = {
    reading: [],
    want_to_read: [],
    finished: [],
  };
  for (const book of favorites) {
    grouped[book.status]?.push(book);
  }

  return (
    <div className="flex-1">
      <div className="border-b border-stone-200 dark:border-stone-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            {displayName}&apos;s Reading List
          </h1>
          <p className="mt-2 text-stone-500">
            {favorites.length} {favorites.length === 1 ? "book" : "books"}
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {favorites.length === 0 && (
          <p className="text-stone-400 text-center py-16 text-lg">
            No books on this list yet.
          </p>
        )}

        {(["reading", "want_to_read", "finished"] as const).map((status) => {
          const items = grouped[status];
          if (!items || items.length === 0) return null;

          return (
            <section key={status} className="mb-10 sm:mb-14">
              <h2 className="text-lg sm:text-xl font-semibold text-stone-900 dark:text-stone-100 mb-4 sm:mb-6">
                {statusLabel[status]}
                <span className="ml-2 text-sm font-normal text-stone-400">
                  {items.length}
                </span>
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
                {items.map((book) => {
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
                          <div className="w-full h-full bg-stone-200 dark:bg-stone-800 flex items-center justify-center text-stone-400 text-xs text-center px-3">
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
