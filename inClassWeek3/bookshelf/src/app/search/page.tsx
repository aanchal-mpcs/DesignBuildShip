"use client";

import Image from "next/image";
import { useState } from "react";
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

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    const res = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=12`
    );
    const data = await res.json();
    setResults(data.docs ?? []);
    setLoading(false);
  }

  async function handleFavorite(book: BookResult) {
    if (!userId) return;

    const { error } = await supabase.from("favorites").insert({
      user_id: userId,
      title: book.title,
      author: book.author_name?.[0] ?? "Unknown author",
      cover_url: book.cover_i
        ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`
        : null,
      ol_key: book.key,
    });

    if (!error) {
      setSaved((prev) => new Set(prev).add(book.key));
    }
  }

  return (
    <div className="flex-1">
      <div className="border-b border-stone-200 dark:border-stone-800">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <h1 className="text-4xl font-bold tracking-tight text-stone-900 dark:text-stone-100 mb-6">
            Search Books
          </h1>
          <form onSubmit={handleSearch} className="flex gap-3 max-w-2xl">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title, author, or keyword..."
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

      <div className="max-w-6xl mx-auto px-6 py-10">
        {results.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {results.map((book) => (
              <div key={book.key} className="group flex flex-col">
                <div className="relative aspect-[2/3] overflow-hidden rounded-lg shadow-sm transition-all duration-200 group-hover:shadow-lg group-hover:-translate-y-1">
                  {book.cover_i ? (
                    <Image
                      src={`https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`}
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
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-stone-900 dark:border-stone-700 dark:border-t-stone-100" />
          </div>
        )}

        {!loading && results.length === 0 && query && (
          <p className="text-stone-400 text-center py-20 text-lg">
            No results found for &ldquo;{query}&rdquo;
          </p>
        )}
      </div>
    </div>
  );
}
