"use client";

import { useAuth } from "@clerk/nextjs";
import { createClient } from "@supabase/supabase-js";
import { useMemo } from "react";

export function useSupabase() {
  const { getToken } = useAuth();

  return useMemo(
    () =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          accessToken: async () => {
            return (await getToken({ template: "supabase" })) ?? "";
          },
        }
      ),
    [getToken]
  );
}
