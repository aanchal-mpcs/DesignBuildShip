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
  const currentlyReading = favorites.filter((f) => f.status === "reading").slice(0, 4);

  // Trending
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

  const { data: usersData } = await supabase.from("users").select("clerk_id");
  const totalMembers = usersData?.length ?? 0;
  const totalBooks = favorites.length;

  return (
    <div className="flex-1">
      {/* Hero */}
      <div className="border-b border-[var(--grey-light)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
          <p className="text-xs tracking-[0.25em] uppercase text-[var(--gold)] font-body mb-4">A Shared Collection</p>
          <h1 className="font-display text-5xl sm:text-7xl font-bold italic tracking-tight text-[var(--foreground)]">
            Book Club
          </h1>
          <p className="mt-4 text-base sm:text-lg font-body italic text-[var(--grey)] max-w-lg mx-auto">
            Discover what your classmates are reading, share recommendations, and build your reading list together.
          </p>
          <div className="mt-8 flex justify-center gap-12">
            <div className="flex flex-col items-center">
              <span className="font-display text-3xl font-bold text-[var(--foreground)]">{totalMembers}</span>
              <span className="text-xs tracking-[0.15em] uppercase text-[var(--grey)] font-body mt-1">{totalMembers === 1 ? "Member" : "Members"}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-display text-3xl font-bold text-[var(--foreground)]">{totalBooks}</span>
              <span className="text-xs tracking-[0.15em] uppercase text-[var(--grey)] font-body mt-1">Books</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="font-display text-3xl font-bold text-[var(--gold)]">{currentlyReading.length}</span>
              <span className="text-xs tracking-[0.15em] uppercase text-[var(--grey)] font-body mt-1">Reading Now</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Currently reading spotlight */}
        {currentlyReading.length > 0 && (
          <section className="py-12 sm:py-16 border-b border-[var(--grey-light)]">
            <p className="text-xs tracking-[0.2em] uppercase text-[var(--gold)] font-body mb-6">Currently Reading</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {currentlyReading.map((book) => {
                const bk = book.ol_key.replace("/works/", "");
                const name = book.users?.[0]?.name ?? book.users?.[0]?.email ?? "Someone";
                return (
                  <a key={book.id} href={`/book/${bk}`}
                    className="flex gap-5 border border-[var(--grey-light)] p-5 transition-colors hover:border-[var(--gold)]">
                    <div className="shrink-0 relative w-16 aspect-[2/3] border border-[var(--grey-light)] overflow-hidden">
                      {book.cover_url ? (
                        <Image src={book.cover_url} alt={book.title} fill className="object-cover" sizes="64px" />
                      ) : <div className="w-full h-full bg-[var(--cream)]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-medium text-[var(--foreground)] line-clamp-1">{book.title}</p>
                      <p className="text-sm font-body italic text-[var(--grey)] mt-0.5">{book.author}</p>
                      <p className="text-xs font-body text-[var(--gold)] mt-2">
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
          <section className="py-12 sm:py-16 border-b border-[var(--grey-light)]">
            <p className="text-xs tracking-[0.2em] uppercase text-[var(--gold)] font-body mb-6">
              Trending <span className="text-[var(--grey)] normal-case tracking-normal">— saved by multiple readers</span>
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-5">
              {trending.map((b) => {
                const bk = b.ol_key.replace("/works/", "");
                return (
                  <a key={b.ol_key} href={`/book/${bk}`} className="group flex flex-col">
                    <div className="relative aspect-[2/3] border border-[var(--grey-light)] overflow-hidden transition-all group-hover:shadow-md group-hover:-translate-y-0.5">
                      {b.cover_url ? (
                        <Image src={b.cover_url} alt={b.title} fill className="object-cover" sizes="120px" />
                      ) : <div className="w-full h-full bg-[var(--cream)] flex items-center justify-center text-[var(--grey)] text-[10px] font-body italic">No cover</div>}
                    </div>
                    <p className="mt-2 text-xs font-display font-medium line-clamp-2 text-[var(--foreground)]">{b.title}</p>
                    <p className="text-[10px] font-body italic text-[var(--gold)]">{b.users.size} readers</p>
                  </a>
                );
              })}
            </div>
          </section>
        )}

        {/* Empty state */}
        {grouped.size === 0 && (
          <div className="text-center py-24">
            <p className="font-display text-2xl italic text-[var(--grey)]">The bookshelf awaits.</p>
            <p className="font-body text-sm text-[var(--grey)] mt-2 mb-6">Be the first to add books to your reading list.</p>
            <a href="/search" className="border border-[var(--foreground)] bg-[var(--foreground)] px-8 py-3 text-sm font-body italic text-[var(--background)] transition-colors hover:bg-transparent hover:text-[var(--foreground)]">
              Search for books
            </a>
          </div>
        )}

        {/* Member shelves */}
        {[...grouped.entries()].map(([, { name, userId: uid, books }]) => (
          <section key={uid} className="py-12 sm:py-16 border-b border-[var(--grey-light)]">
            <div className="flex items-baseline gap-3 mb-6">
              <a href={`/user/${uid}`} className="font-display text-xl font-semibold italic text-[var(--foreground)] hover:text-[var(--gold)] transition-colors">
                {name}&apos;s list
              </a>
              <span className="text-xs font-body text-[var(--grey)]">
                {books.length} {books.length === 1 ? "book" : "books"}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5 sm:gap-6">
              {books.slice(0, 6).map((book) => {
                const bookKey = book.ol_key.replace("/works/", "");
                return (
                  <a key={book.id} href={`/book/${bookKey}`} className="group flex flex-col">
                    <div className="relative aspect-[2/3] overflow-hidden border border-[var(--grey-light)] transition-all duration-200 group-hover:shadow-md group-hover:-translate-y-1">
                      {book.cover_url ? (
                        <Image src={book.cover_url} alt={book.title} fill className="object-cover" sizes="(max-width: 640px) 45vw, 16vw" />
                      ) : <div className="w-full h-full bg-[var(--cream)] flex items-center justify-center text-[var(--grey)] text-xs font-body italic">No cover</div>}
                    </div>
                    <h3 className="mt-2 text-xs sm:text-sm font-display font-medium leading-snug line-clamp-2 text-[var(--foreground)]">{book.title}</h3>
                    <p className="mt-0.5 text-[11px] font-body italic text-[var(--grey)] line-clamp-1">{book.author}</p>
                    <span className="mt-1 text-[10px] font-body text-[var(--gold)]">{statusLabel[book.status] ?? book.status}</span>
                  </a>
                );
              })}
              {books.length > 6 && (
                <a href={`/user/${uid}`} className="flex items-center justify-center border border-[var(--grey-light)] text-sm font-body italic text-[var(--grey)] hover:border-[var(--gold)] hover:text-[var(--gold)] transition-colors">
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
