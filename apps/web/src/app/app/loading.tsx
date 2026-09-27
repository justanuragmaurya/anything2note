export default function Loading() {
  return (
    <div className="mx-auto max-w-[1180px]" aria-busy="true" aria-label="Loading">
      <div className="skeleton h-3 w-24 rounded-full" />
      <div className="skeleton mt-4 h-10 w-72 max-w-full rounded-2xl" />
      <div className="skeleton mt-8 h-11 w-full rounded-full" />
      <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-[22px] border border-line bg-card p-4">
            <div className="skeleton h-20 rounded-xl" />
            <div className="skeleton mt-4 h-4 w-4/5 rounded-full" />
            <div className="skeleton mt-2 h-3 w-1/2 rounded-full" />
            <div className="mt-4 flex gap-1.5">
              <div className="skeleton h-5 w-16 rounded-full" />
              <div className="skeleton h-5 w-20 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
