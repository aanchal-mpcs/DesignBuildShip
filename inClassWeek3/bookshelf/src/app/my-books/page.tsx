"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { supabase } from "@/lib/supabase";

interface Favorite {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  ol_key: string;
}

export default function MyBooksPage() {
  const { userId } = useAuth();
  const [books, setBooks] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) return;

    async function fetchBooks() {
      const { data } = await supabase
        .from("favorites")
        .select("id, title, author, cover_url, ol_key")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      setBooks(data ?? []);
      setLoading(false);
    }

    fetchBooks();
  }, [userId]);

  async function handleRemove(id: string) {
    setRemoving((prev) => new Set(prev).add(id));
    await supabase.from("favorites").delete().eq("id", id);
    setBooks((prev) => prev.filter((b) => b.id !== id));
    setRemoving((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  if (!userId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 py-24">
        <p className="text-stone-500 text-lg">
          Sign in to see your saved books.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1">
      <div className="border-b border-stone-200 dark:border-stone-800">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <h1 className="text-4xl font-bold tracking-tight text-stone-900 dark:text-stone-100">
            My Books
          </h1>
          <p className="mt-2 text-stone-500">
            {loading
              ? "Loading..."
              : `${books.length} ${books.length === 1 ? "book" : "books"} saved`}
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {!loading && books.length === 0 && (
          <div className="text-center py-24">
            <p className="text-stone-400 text-lg">
              You haven&apos;t saved any books yet.
            </p>
            <a
              href="/search"
              className="mt-4 inline-block rounded-md bg-stone-900 px-5 py-2 text-sm font-medium text-white hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300"
            >
              Find books to add
            </a>
          </div>
        )}

        {books.length > 0 && (
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
                <button
                  onClick={() => handleRemove(book.id)}
                  disabled={removing.has(book.id)}
                  className="mt-2 self-start rounded-md px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 transition-colors hover:bg-red-100 disabled:opacity-50 dark:text-red-400 dark:bg-red-950 dark:hover:bg-red-900"
                >
                  {removing.has(book.id) ? "Removing..." : "Remove"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
