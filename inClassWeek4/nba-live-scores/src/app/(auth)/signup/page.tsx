import SignupForm from "@/components/auth/SignupForm";
import Navbar from "@/components/nav/Navbar";

export const dynamic = "force-dynamic";

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <Navbar isLoggedIn={false} userEmail={null} />
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-zinc-900">
            Create an account
          </h1>
          <p className="mt-2 text-zinc-500">Get started with personalized NBA scores</p>
        </div>
        <SignupForm />
      </div>
    </div>
  );
}
