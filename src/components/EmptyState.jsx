/**
 * Friendly empty-state placeholder for lists with no data yet.
 *
 * Props:
 *  - icon: optional heroicon component
 *  - title: headline (e.g. "No items yet")
 *  - message: supporting line
 *  - action: optional node (e.g. an "Add item" button)
 */
export default function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div className="card flex flex-col items-center justify-center gap-3 py-10 text-center">
      {Icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-bar-blue text-bar-accent">
          <Icon className="h-6 w-6" />
        </div>
      )}
      {title && <p className="text-base font-semibold text-white">{title}</p>}
      {message && <p className="max-w-xs text-sm text-gray-400">{message}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
