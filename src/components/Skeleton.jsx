/**
 * Shimmer placeholders shown during initial data loads instead of bare
 * "Loading..." text. Uses the .skeleton class defined in index.css.
 */
export function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} />
}

/** A stack of card-shaped skeletons for list/grid pages. */
export function SkeletonList({ rows = 4, className = '' }) {
  return (
    <div className={`space-y-3 ${className}`} aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="card flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

/** A grid of card skeletons (e.g. inventory tiles). */
export function SkeletonGrid({ count = 6, className = '' }) {
  return (
    <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${className}`} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card space-y-3">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  )
}

export default Skeleton
