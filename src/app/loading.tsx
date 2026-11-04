export default function Loading() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-8">
      <div className="h-8 w-56 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
      <div className="h-4 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
      <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
    </main>
  );
}
