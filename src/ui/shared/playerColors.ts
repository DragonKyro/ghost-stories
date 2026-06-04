import type { TaoistColor } from '@/game/types'

export const TAOIST_COLORS: TaoistColor[] = ['red', 'blue', 'green', 'yellow']

export const TAOIST_COLOR_HEX: Record<TaoistColor, string> = {
  red: '#c1392b',
  blue: '#2c69b8',
  green: '#2f8f5d',
  yellow: '#d4a857',
}

export const TAOIST_COLOR_DARK: Record<TaoistColor, string> = {
  red: '#7d2820',
  blue: '#1a447a',
  green: '#1f5d3c',
  yellow: '#8a6e34',
}

export function taoistColorVar(c: TaoistColor): string {
  return `var(--taoist-${c}, ${TAOIST_COLOR_HEX[c]})`
}
