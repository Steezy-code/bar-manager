import { useEffect, useRef, useState } from 'react'

/**
 * Lightweight pull-to-refresh for touch devices. Attach the returned `bind`
 * props to a scroll container (or use the document by leaving target null) and
 * it calls `onRefresh` when the user pulls down from the top.
 *
 * Returns { pulling, distance } so a caller can render an indicator, plus
 * `bind` handlers to spread onto the element.
 *
 * Usage:
 *   const { pulling, distance, bind } = usePullToRefresh(fetchData)
 *   <div {...bind}> ... </div>
 */
const THRESHOLD = 70 // px pull required to trigger
const MAX = 120

export function usePullToRefresh(onRefresh) {
  const [distance, setDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef(null)
  const active = useRef(false)

  useEffect(() => {
    const atTop = () => (window.scrollY || document.documentElement.scrollTop || 0) <= 0

    const onStart = (e) => {
      if (!atTop() || refreshing) return
      startY.current = e.touches[0].clientY
      active.current = true
    }

    const onMove = (e) => {
      if (!active.current || startY.current == null) return
      const delta = e.touches[0].clientY - startY.current
      if (delta <= 0) {
        setDistance(0)
        return
      }
      // Resistance: ease the pull so it feels physical.
      setDistance(Math.min(MAX, delta * 0.5))
    }

    const onEnd = async () => {
      if (!active.current) return
      active.current = false
      const shouldRefresh = distance >= THRESHOLD
      setDistance(0)
      startY.current = null
      if (shouldRefresh && onRefresh) {
        setRefreshing(true)
        try {
          await onRefresh()
        } finally {
          setRefreshing(false)
        }
      }
    }

    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onEnd)
    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
    }
  }, [distance, refreshing, onRefresh])

  return { distance, refreshing, pulling: distance > 0 }
}

/**
 * Pages call this to participate in the app-level pull-to-refresh. The Layout
 * fires an 'app:refresh' event when the user pulls down; this re-runs the
 * page's own fetch callback. Decoupled so pages don't need to thread props.
 */
export function useAppRefresh(refreshFn) {
  const ref = useRef(refreshFn)
  ref.current = refreshFn
  useEffect(() => {
    const handler = () => ref.current?.()
    window.addEventListener('app:refresh', handler)
    return () => window.removeEventListener('app:refresh', handler)
  }, [])
}

export default usePullToRefresh
