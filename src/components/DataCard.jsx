/**
 * Mobile card used to replace data-table rows on small screens. Renders a
 * title, a list of label/value fields, and an optional action row.
 *
 * Props:
 *  - title: primary text (e.g. user email)
 *  - subtitle: optional secondary line
 *  - fields: array of { label, value } — value may be a node (e.g. a badge)
 *  - actions: optional node rendered full-width at the bottom
 */
export default function DataCard({ title, subtitle, fields = [], actions }) {
  return (
    <div className="card space-y-3">
      <div className="min-w-0">
        {title && <p className="truncate font-semibold text-white">{title}</p>}
        {subtitle && <p className="truncate text-xs text-gray-400">{subtitle}</p>}
      </div>

      {fields.length > 0 && (
        <dl className="grid grid-cols-2 gap-2 text-sm">
          {fields.map((f, i) => (
            <div key={i} className="min-w-0">
              <dt className="text-xs uppercase tracking-wide text-gray-500">{f.label}</dt>
              <dd className="mt-0.5 truncate text-gray-200">{f.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {actions && <div className="flex flex-wrap gap-2 pt-1">{actions}</div>}
    </div>
  )
}
