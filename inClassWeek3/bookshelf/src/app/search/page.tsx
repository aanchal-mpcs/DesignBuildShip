"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { supabase } from "@/lib/supabase";

interface BookResult {
  key: string;
  title: string;
  author_name?: string[];
  cover_i?: number;
}

export default function SearchPage() {
  const { userId } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  // Load existing favorites to prevent duplicates
  useEffect(() => {
    if (!userId) return;

    async function loadExisting() {
      const { data } = await supabase
        .from("favorites")
        .select("ol_key")
        .eq("user_id", userId);

      if (data) {
        setSaved(new Set(data.map((d) => d.ol_key)));
      }
    }

    loadExisting();
  }, [userId]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const res = await fetch(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=12`
      );

      if (!res.ok) {
        throw new Error("API error");
      }

      const data = await res.json();
      setResults(data.docs ?? []);
    } catch {
      setError(
        "Could not reach Open Library. Please check your connection and try again."
      );
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleFavorite(book: BookResult) {
    if (!userId) return;
    setError(null);

    const { error: insertError } = await supabase.from("favorites").insert({
      user_id: userId,
      title: book.title,
      author: book.author_name?.[0] ?? "Unknown author",
      cover_url: book.cover_i
        ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`
        : null,
      ol_key: book.key,
    });

    if (insertError) {
      setError("Failed to save book. Please try again.");
    } else {
      setSaved((prev) => new Set(prev).add(book.key));
    }
  }

  return (
    <div className="flex-1">
      <div className="border-b border-stone-200 dark:border-stone-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-stone-900 dark:text-stone-100 mb-4 sm:mb-6">
            Search Books
          </h1>
          <form
            onSubmit={handleSearch}
            className="flex flex-col sm:flex-row gap-3 max-w-2xl"
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title, author, or keyword..."
              aria-label="Search books"
              className="flex-1 rounded-lg border border-stone-300 bg-white px-4 py-3 text-base outline-none transition-colors focus:border-stone-500 focus:ring-2 focus:ring-stone-200 dark:border-stone-700 dark:bg-stone-900 dark:text-white dark:focus:ring-stone-800"
            />
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-stone-900 px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-stone-700 disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300"
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {error && (
          <div
            role="alert"
            className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400"
          >
            {error}
          </div>
        )}

        {results.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
            {results.map((book) => (
              <div key={book.key} className="group flex flex-col">
                <div className="relative aspect-[2/3] overflow-hidden rounded-lg shadow-sm transition-all duration-200 group-hover:shadow-lg group-hover:-translate-y-1">
                  {book.cover_i ? (
                    <Image
                      src={`https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`}
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
                  {book.author_name?.[0] ?? "Unknown author"}
                </p>
                <button
                  onClick={() => handleFavorite(book)}
                  disabled={saved.has(book.key) || !userId}
                  className={`mt-2 self-start rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    saved.has(book.key)
                      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
                      : "bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
                  } disabled:cursor-default`}
                >
                  {saved.has(book.key) ? "Saved!" : "+ Favorite"}
                </button>
              </div>
            ))}
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-20" role="status">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-stone-900 dark:border-stone-700 dark:border-t-stone-100" />
            <span className="sr-only">Loading results</span>
          </div>
        )}

        {!loading && !searched && (
          <div className="text-center py-16 sm:py-24">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-stone-400 text-lg">
              Search for your favorite books to get started.
            </p>
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <div className="text-center py-16 sm:py-20">
            <p className="text-stone-400 text-lg">
              No results found for &ldquo;{query}&rdquo;
            </p>
            <p className="text-stone-400 text-sm mt-1">
              Try a different title or author name.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
