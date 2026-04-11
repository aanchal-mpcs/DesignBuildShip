"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Props {
  targetUserId: string;
  initialFollowers: number;
  initialFollowing: number;
}

export default function FollowButton({ targetUserId, initialFollowers, initialFollowing }: Props) {
  const { userId } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [followers, setFollowers] = useState(initialFollowers);
  const [following] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  const isOwnProfile = userId === targetUserId;

  useEffect(() => {
    if (!userId || isOwnProfile) return;

    supabase
      .from("follows")
      .select("id")
      .eq("follower_id", userId)
      .eq("following_id", targetUserId)
      .single()
      .then(({ data }) => {
        if (data) setIsFollowing(true);
      });
  }, [userId, targetUserId, isOwnProfile]);

  async function handleToggle() {
    if (!userId || isOwnProfile) return;
    setLoading(true);

    if (isFollowing) {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", userId)
        .eq("following_id", targetUserId);
      setIsFollowing(false);
      setFollowers((prev) => prev - 1);
    } else {
      await supabase
        .from("follows")
        .insert({ follower_id: userId, following_id: targetUserId });
      setIsFollowing(true);
      setFollowers((prev) => prev + 1);
    }
    setLoading(false);
  }

  return (
    <div className="flex items-center gap-4 mt-4">
      <div className="flex gap-4 text-sm">
        <span className="text-stone-600 dark:text-stone-400">
          <span className="font-semibold text-stone-950 dark:text-stone-50">{followers}</span> {followers === 1 ? "follower" : "followers"}
        </span>
        <span className="text-stone-600 dark:text-stone-400">
          <span className="font-semibold text-stone-950 dark:text-stone-50">{following}</span> following
        </span>
      </div>

      {userId && !isOwnProfile && (
        <button
          onClick={handleToggle}
          disabled={loading}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            isFollowing
              ? "border border-stone-300 text-stone-700 hover:border-red-300 hover:text-red-600 dark:border-stone-700 dark:text-stone-300 dark:hover:border-red-800 dark:hover:text-red-400"
              : "bg-stone-900 text-white hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300"
          } disabled:opacity-50`}
        >
          {isFollowing ? "Following" : "Follow"}
        </button>
      )}
    </div>
  );
}
