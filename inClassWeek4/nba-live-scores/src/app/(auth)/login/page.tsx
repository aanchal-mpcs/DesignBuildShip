import LoginForm from "@/components/auth/LoginForm";
import Navbar from "@/components/nav/Navbar";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <Navbar isLoggedIn={false} userEmail={null} />
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-zinc-900">
            Welcome back
          </h1>
          <p className="mt-2 text-zinc-500">Sign in to see your favorite teams</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
