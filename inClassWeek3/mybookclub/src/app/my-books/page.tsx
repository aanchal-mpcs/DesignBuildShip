"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { supabase } from "@/lib/supabase";
import { sortBooks, type SortKey } from "@/lib/sort-filter";
import SortFilterBar from "@/components/SortFilterBar";

type Status = "want_to_read" | "reading" | "finished";

interface Favorite {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  ol_key: string;
  status: Status;
  is_public: boolean;
  created_at: string;
}

const statuses: { key: Status; label: string }[] = [
  { key: "want_to_read", label: "Want to Read" },
  { key: "reading", label: "Reading" },
  { key: "finished", label: "Finished" },
];

const statusStyle: Record<Status, string> = {
  want_to_read:
    "bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-400 dark:hover:bg-amber-900",
  reading:
    "bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-400 dark:hover:bg-blue-900",
  finished:
    "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-400 dark:hover:bg-emerald-900",
};

export default function MyBooksPage() {
  const { userId } = useAuth();
  const [books, setBooks] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Status | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("date-desc");
  const [challengeGoal, setChallengeGoal] = useState<number | null>(null);
  const [challengeInput, setChallengeInput] = useState("");
  const [showChallengeForm, setShowChallengeForm] = useState(false);

  useEffect(() => {
    if (!userId) return;

    async function fetchBooks() {
      const { data, error: fetchError } = await supabase
        .from("favorites")
        .select("id, title, author, cover_url, ol_key, status, is_public, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (fetchError) {
        setError("Failed to load your books. Please refresh.");
      } else {
        setBooks((data ?? []) as Favorite[]);
      }
      setLoading(false);
    }

    fetchBooks();

    // Load reading challenge
    const year = new Date().getFullYear();
    supabase
      .from("challenges")
      .select("goal")
      .eq("user_id", userId)
      .eq("year", year)
      .single()
      .then(({ data }) => {
        if (data) setChallengeGoal(data.goal);
      });
  }, [userId]);

  async function handleStatusChange(id: string, newStatus: Status) {
    setError(null);
    const { error: updateError } = await supabase
      .from("favorites")
      .update({ status: newStatus })
      .eq("id", id);

    if (updateError) {
      setError("Failed to update status.");
    } else {
      setBooks((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status: newStatus } : b))
      );
    }
  }

  async function handleToggleVisibility(id: string, current: boolean) {
    const { error: updateError } = await supabase
      .from("favorites")
      .update({ is_public: !current })
      .eq("id", id);

    if (!updateError) {
      setBooks((prev) =>
        prev.map((b) => (b.id === id ? { ...b, is_public: !current } : b))
      );
    }
  }

  async function handleRemove(id: string) {
    setRemoving((prev) => new Set(prev).add(id));
    setError(null);
    const { error: deleteError } = await supabase
      .from("favorites")
      .delete()
      .eq("id", id);

    if (deleteError) {
      setError("Failed to remove book.");
    } else {
      setBooks((prev) => prev.filter((b) => b.id !== id));
    }
    setRemoving((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  const filtered =
    filter === "all" ? books : books.filter((b) => b.status === filter);
  const sorted = sortBooks(filtered, sortKey);

  const counts = {
    all: books.length,
    want_to_read: books.filter((b) => b.status === "want_to_read").length,
    reading: books.filter((b) => b.status === "reading").length,
    finished: books.filter((b) => b.status === "finished").length,
  };

  if (!userId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 py-24">
        <p className="text-stone-600 text-lg">Sign in to see your reading list.</p>
      </div>
    );
  }

  return (
    <div className="flex-1">
      <div className="border-b border-stone-200 dark:border-stone-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-heading">
            My Reading List
          </h1>
          <p className="mt-2 text-stone-600">
            {loading
              ? "Loading..."
              : `${books.length} ${books.length === 1 ? "book" : "books"} on your list`}
          </p>

          {/* Actions */}
          <div className="mt-4 flex flex-wrap gap-3">
            <a href={`/api/export?user_id=${userId}`}
              className="rounded-md border border-stone-300 px-4 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800">
              Export CSV
            </a>
            <a href="/shelves"
              className="rounded-md border border-stone-300 px-4 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800">
              My Shelves
            </a>
            <a href="/recommendations"
              className="rounded-md border border-stone-300 px-4 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800">
              Recommendations
            </a>
          </div>

          {/* Reading challenge */}
          {!loading && (
            <div className="mt-5 max-w-sm">
              {challengeGoal ? (
                <>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="font-medium text-stone-700 dark:text-stone-300">{new Date().getFullYear()} Reading Challenge</span>
                    <span className="text-stone-600">{counts.finished} / {challengeGoal}</span>
                  </div>
                  <div className="h-3 rounded-full bg-stone-200 dark:bg-stone-800 overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${Math.min(100, (counts.finished / challengeGoal) * 100)}%` }} />
                  </div>
                  {counts.finished >= challengeGoal && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">Challenge complete!</p>
                  )}
                </>
              ) : showChallengeForm ? (
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const goal = parseInt(challengeInput);
                  if (!goal || !userId) return;
                  await supabase.from("challenges").upsert({ user_id: userId, goal, year: new Date().getFullYear() }, { onConflict: "user_id,year" });
                  setChallengeGoal(goal);
                  setShowChallengeForm(false);
                }} className="flex gap-2 items-center">
                  <span className="text-sm text-stone-600 dark:text-stone-400">I want to read</span>
                  <input type="number" min="1" value={challengeInput} onChange={(e) => setChallengeInput(e.target.value)}
                    className="w-16 rounded-md border border-stone-300 bg-white px-2 py-1 text-sm text-center dark:border-stone-700 dark:bg-stone-900 dark:text-white" placeholder="10" />
                  <span className="text-sm text-stone-600 dark:text-stone-400">books in {new Date().getFullYear()}</span>
                  <button type="submit" className="rounded-md bg-stone-900 px-3 py-1 text-xs font-medium text-white hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900">Set</button>
                </form>
              ) : (
                <button onClick={() => setShowChallengeForm(true)}
                  className="text-sm text-stone-500 hover:text-stone-700 dark:hover:text-stone-300">
                  + Set a reading challenge for {new Date().getFullYear()}
                </button>
              )}
            </div>
          )}
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

        {loading && (
          <div className="flex justify-center py-20" role="status">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-stone-900 dark:border-stone-700 dark:border-t-stone-100" />
            <span className="sr-only">Loading</span>
          </div>
        )}

        {!loading && books.length === 0 && (
          <div className="text-center py-16 sm:py-24">
            <div className="text-5xl mb-4">📖</div>
            <p className="text-stone-600 text-lg font-medium">Your reading list is empty.</p>
            <p className="text-stone-500 text-sm mt-1 mb-6">Search for books and start building your list.</p>
            <a
              href="/search"
              className="inline-block rounded-md bg-stone-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300"
            >
              Find books to add
            </a>
          </div>
        )}

        {!loading && books.length > 0 && (
          <>
            <SortFilterBar
              sortKey={sortKey}
              onSortChange={setSortKey}
              filter={filter}
              onFilterChange={setFilter}
              counts={counts}
            />

            {sorted.length === 0 && (
              <div className="text-center py-16">
                <p className="text-stone-500 text-lg">No books in this category.</p>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
              {sorted.map((book) => {
                const bookKey = book.ol_key.replace("/works/", "");
                return (
                  <div key={book.id} className="group flex flex-col">
                    <a
                      href={`/book/${bookKey}`}
                      className="relative aspect-[2/3] overflow-hidden rounded-lg shadow-sm transition-all duration-200 group-hover:shadow-lg group-hover:-translate-y-1"
                    >
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
                    </a>
                    <a
                      href={`/book/${bookKey}`}
                      className="mt-2 sm:mt-3 text-xs sm:text-sm font-medium leading-snug line-clamp-2 text-stone-950 hover:underline dark:text-stone-50"
                    >
                      {book.title}
                    </a>
                    <p className="mt-0.5 text-[11px] sm:text-xs text-stone-600 line-clamp-1">
                      {book.author}
                    </p>

                    {/* Status switcher */}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {statuses.map((s) => (
                        <button
                          key={s.key}
                          onClick={() => handleStatusChange(book.id, s.key)}
                          className={`rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-medium transition-colors ${
                            book.status === s.key
                              ? statusStyle[s.key]
                              : "bg-stone-100 text-stone-400 hover:text-stone-600 dark:bg-stone-800 dark:text-stone-500 dark:hover:text-stone-300"
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>

                    {/* Visibility + Remove */}
                    <div className="mt-1.5 flex items-center gap-3">
                      <button
                        onClick={() =>
                          handleToggleVisibility(book.id, book.is_public)
                        }
                        className="text-[11px] sm:text-xs text-stone-400 hover:text-stone-600 transition-colors dark:hover:text-stone-300"
                        title={book.is_public ? "Make private" : "Make public"}
                      >
                        {book.is_public ? "Public" : "Private"}
                      </button>
                      <button
                        onClick={() => handleRemove(book.id)}
                        disabled={removing.has(book.id)}
                        className="text-[11px] sm:text-xs text-stone-400 hover:text-red-600 transition-colors disabled:opacity-50 dark:hover:text-red-400"
                      >
                        {removing.has(book.id) ? "Removing..." : "Remove"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
