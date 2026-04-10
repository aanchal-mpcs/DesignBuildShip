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

interface AuthorInfo { name: string }

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

interface Discussion {
  id: string;
  user_id: string;
  body: string;
  parent_id: string | null;
  created_at: string;
  users: { name: string | null; email: string | null }[] | null;
}

interface SimilarBook {
  title: string;
  author: string;
  cover_url: string | null;
  ol_key: string;
  count: number;
}

interface UserOption {
  clerk_id: string;
  name: string | null;
  email: string | null;
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
  const [authorName, setAuthorName] = useState("");
  const [readUrl, setReadUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [myRating, setMyRating] = useState(0);
  const [myReview, setMyReview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState<{ id: string; status: Status; notes: string; started_at: string | null; finished_at: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [similar, setSimilar] = useState<SimilarBook[]>([]);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  // Recommend state
  const [showRecommend, setShowRecommend] = useState(false);
  const [recUsers, setRecUsers] = useState<UserOption[]>([]);
  const [recTo, setRecTo] = useState("");
  const [recNote, setRecNote] = useState("");
  const [recSending, setRecSending] = useState(false);
  const [recSent, setRecSent] = useState(false);

  // Fetch book details
  useEffect(() => {
    async function fetchBook() {
      try {
        const res = await fetch(`https://openlibrary.org/works/${key}.json`);
        if (!res.ok) throw new Error("Not found");
        const data: BookDetail = await res.json();
        setBook(data);

        if (data.authors?.[0]?.author?.key) {
          const authorRes = await fetch(`https://openlibrary.org${data.authors[0].author.key}.json`);
          if (authorRes.ok) {
            const ad: AuthorInfo = await authorRes.json();
            setAuthorName(ad.name);
          }
        }

        const edRes = await fetch(`https://openlibrary.org/works/${key}/editions.json?limit=50`);
        if (edRes.ok) {
          const edData = await edRes.json();
          const free = (edData.entries ?? []).find(
            (e: Edition) => e.ebook_access === "public" || e.ocaid || (e.ia && e.ia.length > 0)
          );
          if (free) {
            const id = free.ocaid ?? free.ia?.[0];
            if (id) setReadUrl(`https://archive.org/details/${id}`);
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
    supabase
      .from("reviews")
      .select("id, user_id, rating, body, created_at, users!reviews_user_id_fkey(name, email)")
      .eq("ol_key", olKey)
      .order("created_at", { ascending: false })
      .then(({ data }) => { if (data) setReviews(data as Review[]); });
  }, [olKey]);

  // Check if saved
  useEffect(() => {
    if (!userId) return;
    supabase
      .from("favorites")
      .select("id, status, notes, started_at, finished_at")
      .eq("user_id", userId)
      .eq("ol_key", olKey)
      .single()
      .then(({ data }) => {
        if (data) {
          setSaved({ id: data.id, status: data.status as Status, notes: data.notes ?? "", started_at: data.started_at, finished_at: data.finished_at });
          setNotes(data.notes ?? "");
        }
      });
  }, [userId, olKey]);

  // Fetch discussions
  useEffect(() => {
    supabase
      .from("discussions")
      .select("id, user_id, body, parent_id, created_at, users!discussions_user_id_fkey(name, email)")
      .eq("ol_key", olKey)
      .order("created_at", { ascending: true })
      .then(({ data }) => { if (data) setDiscussions(data as Discussion[]); });
  }, [olKey]);

  // Fetch similar books ("if you liked X, try Y")
  useEffect(() => {
    async function fetchSimilar() {
      // Find users who saved this book, then find other books they saved
      const { data: userIds } = await supabase
        .from("favorites")
        .select("user_id")
        .eq("ol_key", olKey);

      if (!userIds || userIds.length === 0) return;

      const ids = userIds.map((u) => u.user_id);
      const { data: otherBooks } = await supabase
        .from("favorites")
        .select("title, author, cover_url, ol_key, user_id")
        .in("user_id", ids)
        .neq("ol_key", olKey)
        .eq("is_public", true);

      if (!otherBooks) return;

      const countMap = new Map<string, SimilarBook>();
      for (const b of otherBooks) {
        const existing = countMap.get(b.ol_key);
        if (existing) {
          existing.count++;
        } else {
          countMap.set(b.ol_key, { title: b.title, author: b.author, cover_url: b.cover_url, ol_key: b.ol_key, count: 1 });
        }
      }

      const sorted = [...countMap.values()].sort((a, b) => b.count - a.count).slice(0, 6);
      setSimilar(sorted);
    }
    fetchSimilar();
  }, [olKey]);

  // Load users for recommend
  useEffect(() => {
    if (!showRecommend || recUsers.length > 0) return;
    supabase
      .from("users")
      .select("clerk_id, name, email")
      .then(({ data }) => {
        if (data) setRecUsers(data.filter((u) => u.clerk_id !== userId));
      });
  }, [showRecommend, userId, recUsers.length]);

  async function handleSave() {
    if (!userId || !book) return;
    const { data, error: e } = await supabase
      .from("favorites")
      .insert({
        user_id: userId,
        title: book.title,
        author: authorName || "Unknown author",
        cover_url: book.covers?.[0] ? `https://covers.openlibrary.org/b/id/${book.covers[0]}-M.jpg` : null,
        ol_key: olKey,
        status: "want_to_read",
        started_at: null,
        finished_at: null,
      })
      .select("id, status, notes, started_at, finished_at")
      .single();
    if (!e && data) setSaved({ id: data.id, status: data.status as Status, notes: data.notes ?? "", started_at: data.started_at, finished_at: data.finished_at });
  }

  async function handleStatusChange(newStatus: Status) {
    if (!saved) return;
    const updates: Record<string, unknown> = { status: newStatus };
    if (newStatus === "reading" && !saved.started_at) updates.started_at = new Date().toISOString();
    if (newStatus === "finished" && !saved.finished_at) updates.finished_at = new Date().toISOString();

    const { error: e } = await supabase.from("favorites").update(updates).eq("id", saved.id);
    if (!e) setSaved({ ...saved, status: newStatus, ...(updates.started_at ? { started_at: updates.started_at as string } : {}), ...(updates.finished_at ? { finished_at: updates.finished_at as string } : {}) });
  }

  async function handleRemove() {
    if (!saved) return;
    const { error: e } = await supabase.from("favorites").delete().eq("id", saved.id);
    if (!e) { setSaved(null); setNotes(""); }
  }

  async function handleSaveNotes() {
    if (!saved) return;
    setSavingNotes(true);
    await supabase.from("favorites").update({ notes }).eq("id", saved.id);
    setSaved({ ...saved, notes });
    setSavingNotes(false);
  }

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || myRating === 0) return;
    setSubmitting(true);
    const { data, error: re } = await supabase
      .from("reviews")
      .upsert({ user_id: userId, ol_key: olKey, rating: myRating, body: myReview.trim() || null }, { onConflict: "user_id,ol_key" })
      .select("id, user_id, rating, body, created_at, users!reviews_user_id_fkey(name, email)")
      .single();
    if (!re && data) {
      setReviews((prev) => [data as Review, ...prev.filter((r) => r.user_id !== userId)]);
      setMyReview("");
    }
    setSubmitting(false);
  }

  async function handlePostComment(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !newComment.trim()) return;
    const { data } = await supabase
      .from("discussions")
      .insert({ ol_key: olKey, user_id: userId, body: newComment.trim(), parent_id: null })
      .select("id, user_id, body, parent_id, created_at, users!discussions_user_id_fkey(name, email)")
      .single();
    if (data) { setDiscussions((prev) => [...prev, data as Discussion]); setNewComment(""); }
  }

  async function handlePostReply(parentId: string) {
    if (!userId || !replyText.trim()) return;
    const { data } = await supabase
      .from("discussions")
      .insert({ ol_key: olKey, user_id: userId, body: replyText.trim(), parent_id: parentId })
      .select("id, user_id, body, parent_id, created_at, users!discussions_user_id_fkey(name, email)")
      .single();
    if (data) { setDiscussions((prev) => [...prev, data as Discussion]); setReplyText(""); setReplyTo(null); }
  }

  async function handleRecommend(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !recTo || !book) return;
    setRecSending(true);
    await supabase.from("recommendations").insert({
      from_user_id: userId,
      to_user_id: recTo,
      ol_key: olKey,
      title: book.title,
      author: authorName || "Unknown",
      cover_url: book.covers?.[0] ? `https://covers.openlibrary.org/b/id/${book.covers[0]}-M.jpg` : null,
      note: recNote.trim() || null,
    });
    setRecSending(false);
    setRecSent(true);
    setRecNote("");
    setTimeout(() => { setShowRecommend(false); setRecSent(false); }, 2000);
  }

  const description = book?.description
    ? typeof book.description === "string" ? book.description : book.description.value
    : null;
  const coverUrl = book?.covers?.[0] ? `https://covers.openlibrary.org/b/id/${book.covers[0]}-L.jpg` : null;

  const topLevel = discussions.filter((d) => !d.parent_id);
  const replies = (parentId: string) => discussions.filter((d) => d.parent_id === parentId);

  if (loading) {
    return (
      <div className="flex-1 flex justify-center py-32" role="status">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-stone-900 dark:border-stone-700 dark:border-t-stone-100" />
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-24">
        <p className="text-stone-500 text-lg">{error ?? "Book not found."}</p>
        <a href="/search" className="mt-4 text-sm text-stone-500 underline">Back to search</a>
      </div>
    );
  }

  return (
    <div className="flex-1">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-6 sm:gap-10">
          <div className="shrink-0 self-center sm:self-start">
            {coverUrl ? (
              <Image src={coverUrl} alt={`Cover of ${book.title}`} width={200} height={300} className="rounded-lg shadow-md" />
            ) : (
              <div className="w-[200px] h-[300px] bg-stone-200 dark:bg-stone-800 rounded-lg flex items-center justify-center text-stone-400 text-sm">No cover</div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-100">{book.title}</h1>
            {authorName && <p className="mt-1 text-lg text-stone-500">{authorName}</p>}
            {book.first_publish_date && <p className="mt-1 text-sm text-stone-400">First published: {book.first_publish_date}</p>}

            {/* Actions */}
            <div className="mt-5 flex flex-wrap gap-2">
              {saved ? (
                <>
                  {(["want_to_read", "reading", "finished"] as Status[]).map((s) => (
                    <button key={s} onClick={() => handleStatusChange(s)}
                      className={`rounded-full px-3 py-1.5 text-xs sm:text-sm font-medium transition-colors ${saved.status === s ? statusStyle[s] : "bg-stone-100 text-stone-500 hover:text-stone-700 dark:bg-stone-800 dark:text-stone-500 dark:hover:text-stone-300"}`}>
                      {statusLabel[s]}
                    </button>
                  ))}
                  <button onClick={handleRemove} className="rounded-full px-3 py-1.5 text-xs sm:text-sm font-medium text-stone-400 hover:text-red-600 transition-colors dark:hover:text-red-400">Remove</button>
                </>
              ) : userId ? (
                <button onClick={handleSave} className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300">+ Add to Reading List</button>
              ) : <p className="text-sm text-stone-400">Sign in to save this book.</p>}
            </div>

            {/* Reading dates */}
            {saved && (saved.started_at || saved.finished_at) && (
              <div className="mt-3 flex gap-4 text-xs text-stone-400">
                {saved.started_at && <span>Started: {new Date(saved.started_at).toLocaleDateString()}</span>}
                {saved.finished_at && <span>Finished: {new Date(saved.finished_at).toLocaleDateString()}</span>}
                {saved.started_at && saved.finished_at && (
                  <span>{Math.ceil((new Date(saved.finished_at).getTime() - new Date(saved.started_at).getTime()) / (1000 * 60 * 60 * 24))} days</span>
                )}
              </div>
            )}

            <div className="mt-4 flex gap-2">
              {readUrl && (
                <a href={readUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 2v12l6-3 6 3V2H2z" /></svg>
                  Read for free
                </a>
              )}
              {userId && (
                <button onClick={() => setShowRecommend(!showRecommend)}
                  className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800">
                  Recommend
                </button>
              )}
            </div>

            {/* Recommend form */}
            {showRecommend && (
              <form onSubmit={handleRecommend} className="mt-3 rounded-lg border border-stone-200 dark:border-stone-800 p-4 space-y-3">
                {recSent ? (
                  <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Sent!</p>
                ) : (
                  <>
                    <select value={recTo} onChange={(e) => setRecTo(e.target.value)}
                      className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-black dark:border-stone-700" required>
                      <option value="">Select a classmate...</option>
                      {recUsers.map((u) => (
                        <option key={u.clerk_id} value={u.clerk_id}>{u.name ?? u.email ?? "Anonymous"}</option>
                      ))}
                    </select>
                    <input type="text" value={recNote} onChange={(e) => setRecNote(e.target.value)}
                      placeholder="Add a note (optional)" className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-black dark:border-stone-700" />
                    <button type="submit" disabled={recSending}
                      className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300">
                      {recSending ? "Sending..." : "Send Recommendation"}
                    </button>
                  </>
                )}
              </form>
            )}

            {/* Description */}
            {description && (
              <div className="mt-6">
                <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-300 mb-2">About this book</h2>
                <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed whitespace-pre-line">{description}</p>
              </div>
            )}

            {book.subjects && book.subjects.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {book.subjects.slice(0, 10).map((s) => (
                  <span key={s} className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs text-stone-600 dark:bg-stone-800 dark:text-stone-400">{s}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        {saved && (
          <div className="mt-10 border-t border-stone-200 dark:border-stone-800 pt-8">
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-3">My Notes</h2>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4}
              placeholder="Private notes, quotes, page numbers..."
              className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-black outline-none focus:border-stone-500 focus:ring-2 focus:ring-stone-200 dark:border-stone-700" />
            <button onClick={handleSaveNotes} disabled={savingNotes || notes === saved.notes}
              className="mt-2 rounded-md bg-stone-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300">
              {savingNotes ? "Saving..." : "Save Notes"}
            </button>
          </div>
        )}

        {/* If you liked this */}
        {similar.length > 0 && (
          <div className="mt-10 border-t border-stone-200 dark:border-stone-800 pt-8">
            <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">Readers also saved</h2>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {similar.map((b) => {
                const bk = b.ol_key.replace("/works/", "");
                return (
                  <a key={b.ol_key} href={`/book/${bk}`} className="group flex flex-col">
                    <div className="relative aspect-[2/3] rounded-lg overflow-hidden shadow-sm transition-all group-hover:shadow-md group-hover:-translate-y-0.5">
                      {b.cover_url ? (
                        <Image src={b.cover_url} alt={b.title} fill className="object-cover" sizes="100px" />
                      ) : (
                        <div className="w-full h-full bg-stone-200 dark:bg-stone-800 flex items-center justify-center text-stone-400 text-[10px] text-center px-1">No cover</div>
                      )}
                    </div>
                    <p className="mt-1.5 text-[11px] font-medium line-clamp-2 text-stone-700 dark:text-stone-300">{b.title}</p>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Reviews */}
        <div className="mt-10 border-t border-stone-200 dark:border-stone-800 pt-8">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-6">Reviews</h2>
          {userId && (
            <form onSubmit={handleSubmitReview} className="mb-8 rounded-lg border border-stone-200 dark:border-stone-800 p-4">
              <p className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-3">Your review</p>
              <div className="flex gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} type="button" onClick={() => setMyRating(star)}
                    className={`text-xl transition-colors ${star <= myRating ? "text-amber-400" : "text-stone-300 dark:text-stone-600"}`}
                    aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}>★</button>
                ))}
              </div>
              <textarea value={myReview} onChange={(e) => setMyReview(e.target.value)} placeholder="Share your thoughts... (optional)" rows={3}
                className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-black outline-none focus:border-stone-500 focus:ring-2 focus:ring-stone-200 dark:border-stone-700" />
              <button type="submit" disabled={myRating === 0 || submitting}
                className="mt-3 rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300">
                {submitting ? "Submitting..." : "Submit Review"}
              </button>
            </form>
          )}
          {reviews.length === 0 && <p className="text-stone-400 text-sm">No reviews yet.</p>}
          <div className="space-y-4">
            {reviews.map((r) => (
              <div key={r.id} className="rounded-lg border border-stone-200 dark:border-stone-800 p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-stone-800 dark:text-stone-200">
                    {r.users?.[0]?.name ?? r.users?.[0]?.email ?? "Anonymous"}
                  </span>
                  <span className="text-xs text-stone-400">{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex gap-0.5 mb-2 text-sm">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span key={s} className={s <= r.rating ? "text-amber-400" : "text-stone-300 dark:text-stone-600"}>★</span>
                  ))}
                </div>
                {r.body && <p className="text-sm text-stone-600 dark:text-stone-400">{r.body}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* Discussion */}
        <div className="mt-10 border-t border-stone-200 dark:border-stone-800 pt-8">
          <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-6">Discussion</h2>
          {userId && (
            <form onSubmit={handlePostComment} className="mb-6 flex gap-3">
              <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)}
                placeholder="Start a discussion..."
                className="flex-1 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-black outline-none focus:border-stone-500 dark:border-stone-700" />
              <button type="submit" disabled={!newComment.trim()}
                className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300">
                Post
              </button>
            </form>
          )}
          {topLevel.length === 0 && <p className="text-stone-400 text-sm">No comments yet. Start the conversation!</p>}
          <div className="space-y-4">
            {topLevel.map((comment) => (
              <div key={comment.id} className="rounded-lg border border-stone-200 dark:border-stone-800 p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-stone-800 dark:text-stone-200">
                    {comment.users?.[0]?.name ?? comment.users?.[0]?.email ?? "Anonymous"}
                  </span>
                  <span className="text-xs text-stone-400">{new Date(comment.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-stone-600 dark:text-stone-400">{comment.body}</p>

                {/* Replies */}
                {replies(comment.id).length > 0 && (
                  <div className="mt-3 ml-4 space-y-3 border-l-2 border-stone-200 dark:border-stone-700 pl-4">
                    {replies(comment.id).map((reply) => (
                      <div key={reply.id}>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-medium text-stone-700 dark:text-stone-300">
                            {reply.users?.[0]?.name ?? reply.users?.[0]?.email ?? "Anonymous"}
                          </span>
                          <span className="text-[10px] text-stone-400">{new Date(reply.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-stone-600 dark:text-stone-400">{reply.body}</p>
                      </div>
                    ))}
                  </div>
                )}

                {userId && (
                  <>
                    {replyTo === comment.id ? (
                      <div className="mt-3 flex gap-2">
                        <input type="text" value={replyText} onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Write a reply..." autoFocus
                          className="flex-1 rounded-md border border-stone-300 bg-white px-2 py-1.5 text-xs text-black outline-none dark:border-stone-700" />
                        <button onClick={() => handlePostReply(comment.id)} disabled={!replyText.trim()}
                          className="rounded-md bg-stone-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-600 disabled:opacity-50 dark:bg-stone-200 dark:text-stone-900">
                          Reply
                        </button>
                        <button onClick={() => { setReplyTo(null); setReplyText(""); }}
                          className="text-xs text-stone-400 hover:text-stone-600">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => setReplyTo(comment.id)} className="mt-2 text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-300">
                        Reply
                      </button>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
