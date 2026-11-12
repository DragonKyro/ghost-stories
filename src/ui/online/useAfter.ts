import { useEffect, useState } from 'react'

/** True once `on` has held for `ms` (false again as soon as it stops). For "Reconnecting…" banners. */
export function useAfter(on: boolean, ms: number): boolean {
  const [late, setLate] = useState(false)
  useEffect(() => {
    if (!on) {
      setLate(false)
      return
    }
    const t = setTimeout(() => setLate(true), ms)
    return () => clearTimeout(t)
  }, [on, ms])
  return late
}

/** A blip shorter than this isn't worth a banner (the SDK reconnects on its own). */
export const RECONNECT_GRACE_MS = 2000
