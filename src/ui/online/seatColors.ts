import type { CSSProperties } from 'react'
import type { Seat } from '@/game/types'
import type { LobbyState } from '@/net/types'
import { seatsHeldBy } from '@/store/lobby'

export const SEAT_LABEL: Record<Seat, string> = {
  red: 'Red',
  blue: 'Blue',
  green: 'Green',
  yellow: 'Yellow',
  wufeng: 'Wu-Feng',
}

/** A seat's colour as a CSS value (the theme's --taoist-* variables). */
export function seatColorVar(seat: Seat): string {
  return seat === 'wufeng' ? 'var(--wufeng, #9a7bc4)' : `var(--taoist-${seat})`
}

/** Inline style giving an element the seat's colour as `--seat-color` (online.css uses it). */
export function seatStyle(seat: Seat): CSSProperties {
  return { '--seat-color': seatColorVar(seat) } as CSSProperties
}

/** The colour a person's name shows in: their first seat's, or null when they have none. */
export function personColor(lobby: LobbyState, uuid: string): string | null {
  const first = seatsHeldBy(lobby, uuid)[0]
  return first ? seatColorVar(first) : null
}
