import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

const NotificationsContext = createContext(null)

export const useNotifications = () => {
  const context = useContext(NotificationsContext)
  if (!context) {
    throw new Error('useNotifications must be used inside NotificationsProvider')
  }
  return context
}

export function NotificationsProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [confirmation, setConfirmation] = useState(null)
  const originalAlert = useRef(null)

  const dismissToast = useCallback((id) => {
    setToasts(current => current.filter(toast => toast.id !== id))
  }, [])

  const notify = useCallback((message, type = 'info') => {
    const text = String(message || '').trim()
    if (!text) return

    const id = `${Date.now()}-${Math.random()}`
    setToasts(current => [...current, { id, message: text, type }])
    window.setTimeout(() => dismissToast(id), type === 'error' ? 6000 : 4000)
  }, [dismissToast])

  const confirmAction = useCallback(({ title = 'Confirm action', message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false }) => (
    new Promise(resolve => {
      setConfirmation({ title, message, confirmLabel, cancelLabel, danger, resolve })
    })
  ), [])

  const closeConfirmation = (result) => {
    if (confirmation?.resolve) confirmation.resolve(result)
    setConfirmation(null)
  }

  useEffect(() => {
    originalAlert.current = window.alert
    window.alert = (message) => notify(message, 'info')
    return () => {
      if (originalAlert.current) window.alert = originalAlert.current
    }
  }, [notify])

  return (
    <NotificationsContext.Provider value={{ notify, confirmAction }}>
      {children}

      <div className="fixed right-4 top-4 z-[70] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`rounded-lg border p-4 shadow-lg ${
              toast.type === 'error'
                ? 'border-red-500 bg-red-950 text-red-100'
                : toast.type === 'success'
                  ? 'border-green-500 bg-green-950 text-green-100'
                  : 'border-bar-blue bg-bar-card text-white'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm leading-5">{toast.message}</p>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="text-lg leading-none text-gray-300 hover:text-white"
                aria-label="Dismiss notification"
              >
                x
              </button>
            </div>
          </div>
        ))}
      </div>

      {confirmation && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 p-0 md:items-center md:p-4">
          <div className="w-full max-w-md rounded-t-2xl bg-bar-card p-5 shadow-xl md:rounded-xl">
            <h2 className="text-lg font-bold">{confirmation.title}</h2>
            {confirmation.message && (
              <p className="mt-2 whitespace-pre-line text-sm text-gray-300">{confirmation.message}</p>
            )}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => closeConfirmation(false)}
                className="btn-secondary flex-1"
              >
                {confirmation.cancelLabel}
              </button>
              <button
                type="button"
                onClick={() => closeConfirmation(true)}
                className={`flex-1 rounded-lg px-4 py-2 font-semibold text-white transition ${
                  confirmation.danger ? 'bg-red-600 hover:bg-red-500' : 'bg-bar-accent hover:bg-red-600'
                }`}
              >
                {confirmation.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </NotificationsContext.Provider>
  )
}
