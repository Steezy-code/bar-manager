import { useEffect, useState } from 'react'

/**
 * Fixed banner shown while the device is offline. Paired with the service
 * worker's NetworkFirst cache, the app still renders last-known data; this
 * just tells the user why things may be stale.
 */
export default function OfflineIndicator() {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)

  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  if (online) return null

  return (
    <div className="fixed inset-x-0 top-0 z-[90] bg-yellow-600 px-4 py-2 pt-safe text-center text-sm font-semibold text-white shadow-md">
      You’re offline — showing the last saved data.
    </div>
  )
}
