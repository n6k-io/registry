export default function Page01() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-sm text-neutral-500">
        A page layout wrapper with document title interpolation.
      </p>
      <div className="grid grid-cols-3 gap-4">
        {["Revenue", "Users", "Orders"].map((label) => (
          <div
            key={label}
            className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900"
          >
            <p className="mb-1 text-xs text-neutral-500">{label}</p>
            <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              —
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
