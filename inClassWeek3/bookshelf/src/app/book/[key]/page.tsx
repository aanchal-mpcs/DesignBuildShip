"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface BookDetail {
  title: string;
  description: string | { value: string } | null;
  subjects?: string[];
  first_publish_date?: string;
  covers?: number[];
  authors?: { author: { key: string } }[];
}

interface AuthorInfo {
  name: string;
}

interface Edition {
  key: string;
  title: string;
  ocaid?: string;
  ia?: string[];
  ebook_access?: string;
}

interface Review {
  id: string;
  user_id: string;
  rating: number;
  body: string | null;
  created_at: string;
  users: { name: string | null; email: string | null }[] | null;
}

type Status = "want_to_read" | "reading" | "finished";

const statusLabel: Record<Status, string> = {
  want_to_read: "Want to Read",
  reading: "Reading",
  finished: "Finished",
};

const statusStyle: Record<Status, string> = {
  want_to_read: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400",
  reading: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400",
  finished: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400",
};

export default function BookPage() {
  const { key } = useParams<{ key: string }>();
  const { userId } = useAuth();
  const olKey = `/works/${key}`;

  const [book, setBook] = useState<BookDetail | null>(null);
  const [authorName, setAuthorName] = useState<string>("");
  const [readUrl, setReadUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [myRating, setMyRating] = useState(0);
  const [myReview, setMyReview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState<{ id: string; status: Status } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch book details
  useEffect(() => {
    async function fetchBook() {
      try {
        const res = await fetch(`https://openlibrary.org/works/${key}.json`);
        if (!res.ok) throw new Error("Not found");
        const data: BookDetail = await res.json();
        setBook(data);

        // Fetch author
        if (data.authors?.[0]?.author?.key) {
          const authorRes = await fetch(
            `https://openlibrary.org${data.authors[0].author.key}.json`
          );
          if (authorRes.ok) {
            const authorData: AuthorInfo = await authorRes.json();
            setAuthorName(authorData.name);
          }
        }

        // Check for free editions
        const edRes = await fetch(
          `https://openlibrary.org/works/${key}/editions.json?limit=50`
        );
        if (edRes.ok) {
          const edData = await edRes.json();
          const freeEdition = (edData.entries ?? []).find(
            (e: Edition) =>
              e.ebook_access === "public" || e.ocaid || (e.ia && e.ia.length > 0)
          );
          if (freeEdition) {
            const id = freeEdition.ocaid ?? freeEdition.ia?.[0];
            if (id) {
              setReadUrl(`https://archive.org/details/${id}`);
            }
          }
        }
      } catch {
        setError("Could not load book details.");
      } finally {
        setLoading(false);
      }
    }

    fetchBook();
  }, [key]);

  // Fetch reviews
  useEffect(() => {
    async function fetchReviews() {
      const { data } = await supabase
        .from("reviews")
        .select("id, user_id, rating, body, created_at, users!reviews_user_id_fkey(name, email)")
        .eq("ol_key", olKey)
        .order("created_at", { ascending: false });

      if (data) setReviews(data as Review[]);
    }

    fetchReviews();
  }, [olKey]);

  // Check if saved
  useEffect(() => {
    if (!userId) return;

    async function checkSaved() {
      const { data } = await supabase
        .from("favorites")
        .select("id, status")
        .eq("user_id", userId)
        .eq("ol_key", olKey)
        .single();

      if (data) setSaved({ id: data.id, status: data.status as Status });
    }

    checkSaved();
  }, [userId, olKey]);

  async function handleSave() {
    if (!userId || !book) return;

    const { data, error: insertError } = await supabase
      .from("favorites")
      .insert({
        user_id: userId,
        title: book.title,
        author: authorName || "Unknown author",
        cover_url: book.covers?.[0]
          ? `https://covers.openlibrary.org/b/id/${book.covers[0]}-M.jpg`
          : null,
        ol_key: olKey,
        status: "want_to_read",
      })
      .select("id, status")
      .single();

    if (!insertError && data) {
      setSaved({ id: data.id, status: data.status as Status });
    }
  }

  async function handleStatusChange(newStatus: Status) {
    if (!saved) return;

    const { error: updateError } = await supabase
      .from("favorites")
      .update({ status: newStatus })
      .eq("id", saved.id);

    if (!updateError) {
      setSaved({ ...saved, status: newStatus });
    }
  }

  async function handleRemove() {
    if (!saved) return;

    const { error: deleteError } = await supabase
      .from("favorites")
      .delete()
      .eq("id", saved.id);

    if (!deleteError) {
      setSaved(null);
    }
  }

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || myRating === 0) return;

    setSubmitting(true);
    const { data, error: reviewError } = await supabase
      .from("reviews")
      .upsert(
        {
          user_id: userId,
          ol_key: olKey,
          rating: myRating,
          body: myReview.trim() || null,
        },
        { onConflict: "user_id,ol_key" }
      )
      .select("id, user_id, rating, body, created_at, users!reviews_user_id_fkey(name, email)")
      .single();

    if (!reviewError && data) {
      setReviews((prev) => {
        const without = prev.filter((r) => r.user_id !== userId);
        return [data as Review, ...without];
      });
      setMyReview("");
    }
    setSubmitting(false);
  }

  const description = book?.description
    ? typeof book.description === "string"
      ? book.description
      : book.description.value
    : null;

  const coverUrl = book?.covers?.[0]
    ? `https://covers.openlibrary.org/b/id/${book.covers[0]}-L.jpg`
    : null;

  if (loading) {
    return (
      <div className="flex-1 flex justify-center py-32" role="status">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-stone-900 dark:border-stone-700 dark:border-t-stone-100" />
        <span className="sr-only">Loading</span>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-24">
        <p className="text-stone-500 text-lg">{error ?? "Book not found."}</p>
        <a href="/search" className="mt-4 text-sm text-stone-500 underline">
          Back to search
        </a>
      </div>
    );
  }

  return (
    <div className="flex-1">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Book header */}
        <div className="flex flex-col sm:flex-row gap-6 sm:gap-10">
          <div className="shrink-0 self-center sm:self-start">
            {coverUrl ? (
              <Image
                src={coverUrl}
                alt={`Cover of ${book.title}`}
                width={200}
                height={300}
                className="rounded-lg shadow-md"
              />
            ) : (
              <div className="w-[200px] h-[300px] bg-stone-200 dark:bg-stone-800 rounded-lg flex items-center justify-center text-stone-400 text-sm">
                No cover
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-100">
              {book.title}
            </h1>
            {authorName && (
              <p className="mt-1 text-lg text-stone-500">{authorName}</p>
            )}
            {book.first_publish_date && (
              <p className="mt-1 text-sm text-stone-400">
                First published: {book.first_publish_date}
              </p>
            )}

            {/* Actions */}
            <div className="mt-5 flex flex-wrap gap-2">
              {saved ? (
                <>
                  {(["want_to_read", "reading", "finished"] as Status[]).map(
                    (s) => (
                      <button
                        key={s}
                        onClick={() => handleStatusChange(s)}
                        className={`rounded-full px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors ${
                          saved.status === s
                            ? statusStyle[s]
                            : "bg-stone-100 text-stone-500 hover:text-stone-700 dark:bg-stone-800 dark:text-stone-500 dark:hover:text-stone-300"
                        }`}
                      >
                        {statusLabel[s]}
                      </button>
                    )
                  )}
                  <button
                    onClick={handleRemove}
                    className="rounded-full px-3 py-1.5 text-xs sm:text-sm font-medium text-stone-400 hover:text-red-600 transition-colors dark:hover:text-red-400"
                  >
                    Remove
                  </button>
                </>
              ) : userId ? (
                <button
                  onClick={handleSave}
                  className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300"
                >
                  + Add to Reading List
                </button>
              ) : (
                <p className="text-sm text-stone-400">
                  Sign in to save this book.
                </p>
              )}
            </div>

            {readUrl && (
              <a
                href={readUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <path d="M2 2v12l6-3 6 3V2H2z" />
                </svg>
                Read for free
              </a>
            )}

            {/* Description */}
            {description && (
              <div className="mt-6">
                <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-300 mb-2">
                  About this book
                </h2>
                <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed whitespace-pre-line">
                  {description}
                </p>
              </div>
            )}

            {/* Subjects */}
            {book.subjects && book.subjects.length > 0 && (
              <div className="mt-4">
                <div className="flex flex-wrap gap-1.5">
                  {book.subjects.slice(0, 10).map((s) => (
                    <span
                      key={s}
                      className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs text-stone-600 dark:bg-stone-800 dark:text-stone-400"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Reviews section */}
        <div className="mt-12 border-t border-stone-200 dark:border-stone-800 pt-8">
          <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-100 mb-6">
            Reviews
          </h2>

          {/* Write review */}
          {userId && (
            <form
              onSubmit={handleSubmitReview}
              className="mb-8 rounded-lg border border-stone-200 dark:border-stone-800 p-4"
            >
              <p className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-3">
                Your review
              </p>
              <div className="flex gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setMyRating(star)}
                    className={`text-xl transition-colors ${
                      star <= myRating
                        ? "text-amber-400"
                        : "text-stone-300 dark:text-stone-600"
                    }`}
                    aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <textarea
                value={myReview}
                onChange={(e) => setMyReview(e.target.value)}
                placeholder="Share your thoughts... (optional)"
                rows={3}
                className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-stone-500 focus:ring-2 focus:ring-stone-200 dark:border-stone-700 dark:bg-stone-900 dark:text-white dark:focus:ring-stone-800"
              />
              <button
                type="submit"
                disabled={myRating === 0 || submitting}
                className="mt-3 rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300"
              >
                {submitting ? "Submitting..." : "Submit Review"}
              </button>
            </form>
          )}

          {/* Review list */}
          {reviews.length === 0 && (
            <p className="text-stone-400 text-sm">
              No reviews yet. Be the first to review this book!
            </p>
          )}

          <div className="space-y-4">
            {reviews.map((review) => {
              const reviewer =
                review.users?.[0]?.name ??
                review.users?.[0]?.email ??
                "Anonymous";
              return (
                <div
                  key={review.id}
                  className="rounded-lg border border-stone-200 dark:border-stone-800 p-4"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-stone-800 dark:text-stone-200">
                      {reviewer}
                    </span>
                    <span className="text-xs text-stone-400">
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex gap-0.5 mb-2 text-sm">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        className={
                          star <= review.rating
                            ? "text-amber-400"
                            : "text-stone-300 dark:text-stone-600"
                        }
                      >
                        ★
                      </span>
                    ))}
                  </div>
                  {review.body && (
                    <p className="text-sm text-stone-600 dark:text-stone-400">
                      {review.body}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
