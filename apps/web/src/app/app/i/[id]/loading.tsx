export default function WorkspaceLoading() {
  return (
    <div className="mx-auto max-w-[1360px]" aria-busy="true" aria-label="Loading note">
      <div className="skeleton h-3 w-16 rounded-full" />
      <div className="skeleton mt-4 h-3 w-60 rounded-full" />
      <div className="skeleton mt-3 h-9 w-[28rem] max-w-full rounded-2xl" />
      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-6">
        <div className="skeleton aspect-video rounded-[24px]" />
        <div className="rounded-[28px] border border-line bg-card p-4">
          <div className="flex gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton h-8 w-24 rounded-full" />
            ))}
          </div>
          <div className="mt-6 space-y-3">
            <div className="skeleton h-28 rounded-2xl" />
            <div className="skeleton h-4 w-4/5 rounded-full" />
            <div className="skeleton h-4 w-3/5 rounded-full" />
            <div className="skeleton h-20 rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
