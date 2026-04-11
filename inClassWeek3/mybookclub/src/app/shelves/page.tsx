"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { supabase } from "@/lib/supabase";

interface Shelf {
  id: string;
  name: string;
  created_at: string;
  books: { id: string; title: string; author: string; cover_url: string | null; ol_key: string }[];
}

interface Favorite {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  ol_key: string;
}

export default function ShelvesPage() {
  const { userId } = useAuth();
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [allBooks, setAllBooks] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [selectedBook, setSelectedBook] = useState("");

  useEffect(() => {
    if (!userId) return;

    async function load() {
      // Fetch shelves
      const { data: shelfData } = await supabase
        .from("shelves")
        .select("id, name, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      const fetchedShelves: Shelf[] = [];
      for (const s of shelfData ?? []) {
        const { data: sbData } = await supabase
          .from("shelf_books")
          .select("favorite_id, favorites!shelf_books_favorite_id_fkey(id, title, author, cover_url, ol_key)")
          .eq("shelf_id", s.id);

        const books = (sbData ?? [])
          .map((sb: { favorites: Favorite | Favorite[] | null }) => {
            const f = sb.favorites;
            return Array.isArray(f) ? f[0] : f;
          })
          .filter(Boolean) as Favorite[];

        fetchedShelves.push({ ...s, books });
      }
      setShelves(fetchedShelves);

      // Fetch all user books for adding
      const { data: bookData } = await supabase
        .from("favorites")
        .select("id, title, author, cover_url, ol_key")
        .eq("user_id", userId)
        .order("title");

      setAllBooks(bookData ?? []);
      setLoading(false);
    }

    load();
  }, [userId]);

  async function handleCreateShelf(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !newName.trim()) return;

    const { data } = await supabase
      .from("shelves")
      .insert({ user_id: userId, name: newName.trim() })
      .select("id, name, created_at")
      .single();

    if (data) {
      setShelves((prev) => [...prev, { ...data, books: [] }]);
      setNewName("");
    }
  }

  async function handleDeleteShelf(id: string) {
    await supabase.from("shelves").delete().eq("id", id);
    setShelves((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleAddBook(shelfId: string) {
    if (!selectedBook) return;

    await supabase.from("shelf_books").insert({ shelf_id: shelfId, favorite_id: selectedBook });

    const book = allBooks.find((b) => b.id === selectedBook);
    if (book) {
      setShelves((prev) =>
        prev.map((s) => (s.id === shelfId ? { ...s, books: [...s.books, book] } : s))
      );
    }
    setSelectedBook("");
    setAddingTo(null);
  }

  async function handleRemoveBook(shelfId: string, favoriteId: string) {
    await supabase.from("shelf_books").delete().eq("shelf_id", shelfId).eq("favorite_id", favoriteId);
    setShelves((prev) =>
      prev.map((s) => (s.id === shelfId ? { ...s, books: s.books.filter((b) => b.id !== favoriteId) } : s))
    );
  }

  if (!userId) {
    return (
      <div className="flex-1 flex items-center justify-center py-24">
        <p className="text-stone-600 text-lg">Sign in to manage your shelves.</p>
      </div>
    );
  }

  return (
    <div className="flex-1">
      <div className="border-b border-stone-200 dark:border-stone-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-stone-950 dark:text-stone-50">
            My Shelves
          </h1>
          <p className="mt-2 text-stone-600">Organize your books into custom collections.</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Create shelf */}
        <form onSubmit={handleCreateShelf} className="flex gap-3 mb-8">
          <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
            placeholder="New shelf name..." className="flex-1 rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-stone-500 dark:border-stone-700 dark:bg-stone-900 dark:text-white" />
          <button type="submit" disabled={!newName.trim()}
            className="rounded-lg bg-stone-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300">
            Create
          </button>
        </form>

        {loading && (
          <div className="flex justify-center py-20" role="status">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-stone-900 dark:border-stone-700 dark:border-t-stone-100" />
          </div>
        )}

        {!loading && shelves.length === 0 && (
          <div className="text-center py-12">
            <p className="text-stone-500 text-lg">No shelves yet. Create one above!</p>
          </div>
        )}

        <div className="space-y-8">
          {shelves.map((shelf) => (
            <div key={shelf.id} className="rounded-xl border border-stone-200 dark:border-stone-800 p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-stone-950 dark:text-stone-50">{shelf.name}
                  <span className="ml-2 text-sm font-normal text-stone-500">{shelf.books.length}</span>
                </h2>
                <div className="flex gap-2">
                  <button onClick={() => setAddingTo(addingTo === shelf.id ? null : shelf.id)}
                    className="text-xs text-stone-500 hover:text-stone-700 dark:hover:text-stone-300">
                    + Add book
                  </button>
                  <button onClick={() => handleDeleteShelf(shelf.id)}
                    className="text-xs text-stone-400 hover:text-red-600 dark:hover:text-red-400">Delete</button>
                </div>
              </div>

              {addingTo === shelf.id && (
                <div className="flex gap-2 mb-4">
                  <select value={selectedBook} onChange={(e) => setSelectedBook(e.target.value)}
                    className="flex-1 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900 dark:text-white">
                    <option value="">Select a book...</option>
                    {allBooks.filter((b) => !shelf.books.some((sb) => sb.id === b.id)).map((b) => (
                      <option key={b.id} value={b.id}>{b.title} — {b.author}</option>
                    ))}
                  </select>
                  <button onClick={() => handleAddBook(shelf.id)} disabled={!selectedBook}
                    className="rounded-md bg-stone-900 px-4 py-2 text-xs font-medium text-white hover:bg-stone-700 disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900">
                    Add
                  </button>
                </div>
              )}

              {shelf.books.length === 0 ? (
                <p className="text-sm text-stone-500">No books on this shelf.</p>
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {shelf.books.map((book) => {
                    const bk = book.ol_key.replace("/works/", "");
                    return (
                      <div key={book.id} className="shrink-0 w-20 flex flex-col">
                        <a href={`/book/${bk}`} className="relative aspect-[2/3] rounded overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                          {book.cover_url ? (
                            <Image src={book.cover_url} alt={book.title} fill className="object-cover" sizes="80px" />
                          ) : (
                            <div className="w-full h-full bg-stone-200 dark:bg-stone-800 flex items-center justify-center text-stone-400 text-[8px] text-center">No cover</div>
                          )}
                        </a>
                        <p className="mt-1 text-[10px] line-clamp-2 text-stone-600 dark:text-stone-400">{book.title}</p>
                        <button onClick={() => handleRemoveBook(shelf.id, book.id)}
                          className="mt-0.5 text-[9px] text-stone-400 hover:text-red-500 self-start">Remove</button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
