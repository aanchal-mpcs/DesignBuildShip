export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
          <div className="h-6 w-48 animate-pulse rounded bg-zinc-200" />
          <div className="h-8 w-20 animate-pulse rounded bg-zinc-200" />
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
          >
            <div className="space-y-3">
              <div className="flex justify-between">
                <div className="h-5 w-40 animate-pulse rounded bg-zinc-200" />
                <div className="h-5 w-12 animate-pulse rounded bg-zinc-200" />
              </div>
              <div className="flex justify-between">
                <div className="h-5 w-36 animate-pulse rounded bg-zinc-200" />
                <div className="h-5 w-12 animate-pulse rounded bg-zinc-200" />
              </div>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
