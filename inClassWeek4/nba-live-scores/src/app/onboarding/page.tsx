import TeamPicker from "@/components/onboarding/TeamPicker";

export const dynamic = "force-dynamic";

export default function OnboardingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center bg-zinc-50 px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-zinc-900">
          Pick Your Teams
        </h1>
        <p className="mt-2 text-zinc-500">
          Select the teams you want to follow. You&apos;ll see their live scores on your dashboard.
        </p>
      </div>
      <TeamPicker />
    </div>
  );
}
