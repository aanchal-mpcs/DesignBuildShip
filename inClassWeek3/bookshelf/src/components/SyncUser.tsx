"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

export default function SyncUser() {
  const { user, isSignedIn } = useUser();
  const synced = useRef(false);

  useEffect(() => {
    if (!isSignedIn || !user || synced.current) return;
    synced.current = true;

    async function sync() {
      const { data } = await supabase
        .from("users")
        .select("id")
        .eq("clerk_id", user!.id)
        .single();

      if (!data) {
        await supabase.from("users").insert({
          clerk_id: user!.id,
          email: user!.primaryEmailAddress?.emailAddress,
          name: user!.fullName,
        });
      }
    }

    sync();
  }, [isSignedIn, user]);

  return null;
}
