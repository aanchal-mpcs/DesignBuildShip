"use client";

import Image from "next/image";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { supabase } from "@/lib/supabase";
import type { SortKey } from "@/lib/sort-filter";

interface BookResult {
  key: string;
  title: string;
  author_name?: string[];
  cover_i?: number;
}

interface SearchHistoryItem {
  id: string;
  query: string;
  searched_at: string;
}

interface PopularReader {
  clerk_id: string;
  name: string | null;
  email: string | null;
  followers: number;
}

interface UserResult {
  clerk_id: string;
  name: string | null;
  email: string | null;
}

const sortOptions: { key: SortKey; label: string }[] = [
  { key: "title-asc", label: "Title A–Z" },
  { key: "title-desc", label: "Title Z–A" },
  { key: "author-asc", label: "Author A–Z" },
  { key: "author-desc", label: "Author Z–A" },
];

function sortResults(results: BookResult[], sortKey: SortKey): BookResult[] {
  const sorted = [...results];
  switch (sortKey) {
    case "title-asc": return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case "title-desc": return sorted.sort((a, b) => b.title.localeCompare(a.title));
    case "author-asc": return sorted.sort((a, b) => (a.author_name?.[0] ?? "").localeCompare(b.author_name?.[0] ?? ""));
    case "author-desc": return sorted.sort((a, b) => (b.author_name?.[0] ?? "").localeCompare(a.author_name?.[0] ?? ""));
    default: return sorted;
  }
}

export default function SearchPage() {
  const { userId } = useAuth();
  const [query, setQuery] = useState("");
  const [searchMode, setSearchMode] = useState<"books" | "people">("books");
  const [results, setResults] = useState<BookResult[]>([]);
  const [userResults, setUserResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("title-asc");
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [popularReaders, setPopularReaders] = useState<PopularReader[]>([]);
  const [trendingSearches, setTrendingSearches] = useState<string[]>([]);

  // Load existing favorites
  useEffect(() => {
    if (!userId) return;
    supabase.from("favorites").select("ol_key").eq("user_id", userId)
      .then(({ data }) => { if (data) setSaved(new Set(data.map((d) => d.ol_key))); });
  }, [userId]);

  // Load search history
  useEffect(() => {
    if (!userId) return;
    supabase.from("search_history").select("id, query, searched_at").eq("user_id", userId)
      .order("searched_at", { ascending: false }).limit(20)
      .then(({ data }) => {
        if (data) {
          const seen = new Set<string>();
          const deduped: SearchHistoryItem[] = [];
          for (const item of data) {
            const lower = item.query.toLowerCase();
            if (!seen.has(lower)) { seen.add(lower); deduped.push(item); }
          }
          setHistory(deduped.slice(0, 8));
        }
      });
  }, [userId]);

  // Load popular readers (most followed)
  useEffect(() => {
    async function load() {
      const { data: follows } = await supabase.from("follows").select("following_id");
      const counts = new Map<string, number>();
      for (const f of follows ?? []) {
        counts.set(f.following_id, (counts.get(f.following_id) ?? 0) + 1);
      }

      const { data: users } = await supabase.from("users").select("clerk_id, name, email");
      if (!users) return;

      const ranked: PopularReader[] = users
        .map((u) => ({ ...u, followers: counts.get(u.clerk_id) ?? 0 }))
        .sort((a, b) => b.followers - a.followers)
        .slice(0, 5);

      setPopularReaders(ranked);
    }
    load();
  }, []);

  // Load trending searches (most common across all users)
  useEffect(() => {
    supabase.from("search_history").select("query").order("searched_at", { ascending: false }).limit(100)
      .then(({ data }) => {
        if (!data) return;
        const counts = new Map<string, number>();
        for (const item of data) {
          const lower = item.query.toLowerCase().trim();
          counts.set(lower, (counts.get(lower) ?? 0) + 1);
        }
        const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([q]) => q);
        setTrendingSearches(sorted);
      });
  }, []);

  const doSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setQuery(searchQuery);
    setSearched(true);

    if (searchMode === "people") {
      setLoading(true);
      const { data } = await supabase.from("users").select("clerk_id, name, email")
        .or(`name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
      setUserResults((data ?? []) as UserResult[]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(searchQuery)}&limit=12`);
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      setResults(data.docs ?? []);
    } catch {
      setError("Could not reach Open Library.");
      setResults([]);
    } finally {
      setLoading(false);
    }

    if (userId) {
      supabase.from("search_history").insert({ user_id: userId, query: searchQuery.trim() });
    }
  }, [userId, searchMode]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    doSearch(query);
  }

  async function handleFavorite(book: BookResult) {
    if (!userId) return;
    setError(null);
    const { error: insertError } = await supabase.from("favorites").insert({
      user_id: userId, title: book.title, author: book.author_name?.[0] ?? "Unknown author",
      cover_url: book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg` : null,
      ol_key: book.key, status: "want_to_read",
    });
    if (insertError) { setError("Failed to save book."); }
    else { setSaved((prev) => new Set(prev).add(book.key)); }
  }

  async function handleDeleteHistory(id: string) {
    await supabase.from("search_history").delete().eq("id", id);
    setHistory((prev) => prev.filter((h) => h.id !== id));
  }

  async function handleClearHistory() {
    if (!userId) return;
    await supabase.from("search_history").delete().eq("user_id", userId);
    setHistory([]);
  }

  const sortedResults = results.length > 0 ? sortResults(results, sortKey) : [];

  return (
    <div className="flex-1">
      {/* Header */}
      <div className="border-b border-[var(--grey-light)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-20 text-center">
          <p className="text-xs tracking-[0.25em] uppercase text-[var(--gold)] font-body mb-4">Discover</p>
          <h1 className="font-display text-4xl sm:text-6xl font-bold italic tracking-tight text-[var(--foreground)]">
            Search
          </h1>

          {/* Mode toggle */}
          <div className="mt-6 flex justify-center gap-1">
            <button onClick={() => { setSearchMode("books"); setSearched(false); setResults([]); setUserResults([]); }}
              className={`px-4 py-1.5 text-sm font-body border transition-colors ${searchMode === "books" ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]" : "border-[var(--grey-light)] text-[var(--grey)] hover:text-[var(--foreground)]"}`}>
              Books
            </button>
            <button onClick={() => { setSearchMode("people"); setSearched(false); setResults([]); setUserResults([]); }}
              className={`px-4 py-1.5 text-sm font-body border transition-colors ${searchMode === "people" ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]" : "border-[var(--grey-light)] text-[var(--grey)] hover:text-[var(--foreground)]"}`}>
              People
            </button>
          </div>

          <form onSubmit={handleSearch} className="mt-6 flex flex-col sm:flex-row gap-3 max-w-xl mx-auto">
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder={searchMode === "books" ? "Title, author, or keyword..." : "Search by name or email..."}
              aria-label={`Search ${searchMode}`}
              className="flex-1 border-b border-[var(--grey-light)] bg-transparent px-2 py-3 text-base font-body outline-none text-center transition-colors focus:border-[var(--gold)] placeholder:text-[var(--grey)]" />
            <button type="submit" disabled={loading}
              className="border border-[var(--foreground)] bg-[var(--foreground)] px-8 py-3 text-sm font-body italic text-[var(--background)] transition-colors hover:bg-transparent hover:text-[var(--foreground)] disabled:opacity-50">
              {loading ? "Searching..." : "Search"}
            </button>
          </form>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {error && (
          <div role="alert" className="mb-6 border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Book results */}
        {searchMode === "books" && sortedResults.length > 0 && (
          <>
            <div className="flex justify-between items-center mb-6">
              <p className="text-sm text-[var(--grey)]">{results.length} results</p>
              <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="border border-[var(--grey-light)] bg-transparent px-3 py-1.5 text-sm font-body text-[var(--grey-dark)] outline-none" aria-label="Sort results">
                {sortOptions.map((opt) => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 sm:gap-8">
              {sortedResults.map((book) => {
                const bookKey = book.key.replace("/works/", "");
                return (
                  <div key={book.key} className="group flex flex-col">
                    <a href={`/book/${bookKey}`} className="relative aspect-[2/3] overflow-hidden border border-[var(--grey-light)] transition-all duration-200 group-hover:shadow-lg group-hover:-translate-y-1">
                      {book.cover_i ? (
                        <Image src={`https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`} alt={book.title} fill className="object-cover" sizes="(max-width: 640px) 45vw, 16vw" />
                      ) : (
                        <div className="w-full h-full bg-[var(--cream)] flex items-center justify-center text-[var(--grey)] text-xs font-body italic">No cover</div>
                      )}
                    </a>
                    <a href={`/book/${bookKey}`} className="mt-3 text-sm font-display font-medium leading-snug line-clamp-2 text-[var(--foreground)] hover:text-[var(--gold)]">{book.title}</a>
                    <p className="mt-0.5 text-xs font-body italic text-[var(--grey)] line-clamp-1">{book.author_name?.[0] ?? "Unknown"}</p>
                    <button onClick={() => handleFavorite(book)} disabled={saved.has(book.key) || !userId}
                      className={`mt-2 self-start text-xs font-body transition-colors ${saved.has(book.key) ? "text-[var(--gold)]" : "text-[var(--grey)] hover:text-[var(--gold)]"} disabled:cursor-default`}>
                      {saved.has(book.key) ? "✓ On your list" : "+ Add to list"}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* People results */}
        {searchMode === "people" && searched && !loading && (
          <div className="space-y-3">
            {userResults.length === 0 && <p className="text-center text-[var(--grey)] py-12 font-body italic">No readers found.</p>}
            {userResults.map((u) => (
              <a key={u.clerk_id} href={`/user/${u.clerk_id}`}
                className="flex items-center gap-4 border border-[var(--grey-light)] px-5 py-4 transition-colors hover:border-[var(--gold)]">
                <div className="w-10 h-10 rounded-full bg-[var(--cream)] flex items-center justify-center font-display font-bold text-[var(--gold)] text-lg">
                  {(u.name?.[0] ?? u.email?.[0] ?? "?").toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-display font-medium text-[var(--foreground)]">{u.name ?? u.email ?? "Anonymous"}</p>
                  {u.name && u.email && <p className="text-xs font-body text-[var(--grey)]">{u.email}</p>}
                </div>
              </a>
            ))}
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-20" role="status">
            <div className="h-8 w-8 animate-spin rounded-full border border-[var(--grey-light)] border-t-[var(--gold)]" />
          </div>
        )}

        {/* Empty state with discovery sections */}
        {!loading && !searched && (
          <div className="space-y-16">
            {/* Recent searches */}
            {history.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs tracking-[0.2em] uppercase text-[var(--gold)] font-body">Recent Searches</p>
                  <button onClick={handleClearHistory} className="text-xs font-body text-[var(--grey)] hover:text-red-600">Clear all</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {history.map((item) => (
                    <div key={item.id} className="flex items-center gap-1.5 border border-[var(--grey-light)] pl-3 pr-1.5 py-1.5">
                      <button onClick={() => doSearch(item.query)} className="text-sm font-body text-[var(--grey-dark)] hover:text-[var(--foreground)]">{item.query}</button>
                      <button onClick={() => handleDeleteHistory(item.id)} className="p-0.5 text-[var(--grey)] hover:text-red-500" aria-label={`Remove "${item.query}"`}>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 3l6 6M9 3l-6 6" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Trending searches */}
            {trendingSearches.length > 0 && (
              <section>
                <p className="text-xs tracking-[0.2em] uppercase text-[var(--gold)] font-body mb-4">Trending Searches</p>
                <div className="flex flex-wrap gap-2">
                  {trendingSearches.map((q) => (
                    <button key={q} onClick={() => doSearch(q)}
                      className="border border-[var(--grey-light)] px-4 py-2 text-sm font-body text-[var(--grey-dark)] hover:border-[var(--gold)] hover:text-[var(--gold)] transition-colors capitalize">
                      {q}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Popular readers */}
            {popularReaders.length > 0 && (
              <section>
                <p className="text-xs tracking-[0.2em] uppercase text-[var(--gold)] font-body mb-4">Popular Readers</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {popularReaders.map((reader) => (
                    <a key={reader.clerk_id} href={`/user/${reader.clerk_id}`}
                      className="flex items-center gap-4 border border-[var(--grey-light)] p-4 transition-colors hover:border-[var(--gold)]">
                      <div className="w-12 h-12 rounded-full bg-[var(--cream)] flex items-center justify-center font-display font-bold text-[var(--gold)] text-xl">
                        {(reader.name?.[0] ?? reader.email?.[0] ?? "?").toUpperCase()}
                      </div>
                      <div>
                        <p className="font-display font-medium text-[var(--foreground)]">{reader.name ?? reader.email ?? "Anonymous"}</p>
                        <p className="text-xs font-body text-[var(--grey)]">
                          {reader.followers} {reader.followers === 1 ? "follower" : "followers"}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              </section>
            )}

            {/* Prompt */}
            <div className="text-center py-8">
              <p className="font-body italic text-[var(--grey)]">Search for books or people to get started.</p>
            </div>
          </div>
        )}

        {!loading && searched && searchMode === "books" && results.length === 0 && !error && (
          <p className="text-center py-16 font-body italic text-[var(--grey)]">No results for &ldquo;{query}&rdquo;</p>
        )}
      </div>
    </div>
  );
}
