import { useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

/**
 * Mobile-first dialog. Renders as a bottom sheet on phones and a centered card
 * from md: up (via the shared .modal-overlay / .modal-sheet classes in index.css).
 *
 * Props:
 *  - open: boolean — whether the dialog is shown
 *  - onClose: () => void — called on overlay click, Escape, or the close button
 *  - title: string — heading text
 *  - children: dialog body
 *  - footer: optional node rendered in a sticky-feeling action row
 *  - dismissible: boolean (default true) — allow overlay/Escape close
 */
export default function Modal({ open, onClose, title, children, footer, dismissible = true }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape' && dismissible) onClose?.()
    }
    document.addEventListener('keydown', onKey)
    // Lock background scroll while the sheet is open.
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, dismissible, onClose])

  if (!open) return null

  return (
    <div
      className="modal-overlay"
      onClick={() => dismissible && onClose?.()}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-3">
          {title && <h2 className="text-lg font-bold">{title}</h2>}
          {dismissible && (
            <button type="button" onClick={onClose} className="btn-icon -mr-2 -mt-2" aria-label="Close">
              <XMarkIcon className="h-6 w-6" />
            </button>
          )}
        </div>
        <div>{children}</div>
        {footer && <div className="mt-5 flex gap-2">{footer}</div>}
      </div>
    </div>
  )
}
