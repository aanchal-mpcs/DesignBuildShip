import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import TeamPicker from "@/components/onboarding/TeamPicker";
import Navbar from "@/components/nav/Navbar";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <Navbar isLoggedIn={true} userEmail={user.email ?? null} />
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-zinc-900">My Teams</h1>
          <p className="mt-2 text-zinc-500">
            Tap to follow or unfollow. You&apos;ll see their live scores on the Home page.
          </p>
        </div>
        <TeamPicker />
      </div>
    </div>
  );
}
