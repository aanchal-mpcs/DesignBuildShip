import LoginForm from "@/components/auth/LoginForm";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-zinc-900">
          <span className="text-orange-600">NBA</span> Live Scores
        </h1>
        <p className="mt-2 text-zinc-500">Sign in to track your favorite teams</p>
      </div>
      <LoginForm />
    </div>
  );
}
