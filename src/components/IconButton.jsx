/**
 * 44x44 icon-only button with a guaranteed touch target. Wraps the .btn-icon
 * class so every icon action across the app is tappable on mobile.
 *
 * Props:
 *  - icon: a heroicon component (e.g. TrashIcon)
 *  - label: accessible label (required — icon buttons need a name)
 *  - onClick, type, disabled: standard button props
 *  - tone: 'default' | 'danger' | 'accent' — icon color
 *  - className: extra classes merged in
 */
export default function IconButton({
  icon: Icon,
  label,
  onClick,
  type = 'button',
  disabled = false,
  tone = 'default',
  className = '',
  ...rest
}) {
  const toneClass =
    tone === 'danger'
      ? 'text-red-400 hover:text-red-300'
      : tone === 'accent'
        ? 'text-bar-accent hover:text-red-400'
        : ''

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`btn-icon ${toneClass} ${className}`}
      {...rest}
    >
      {Icon && <Icon className="h-5 w-5" />}
    </button>
  )
}
