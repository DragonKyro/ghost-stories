// Shared colours for the art set. Player colours match src/index.css.
import type { TaoColor } from '@/game/types'

export const INK = '#1d1712'
export const INK_FADED = '#6d5f50'
export const VERMILION = '#b8322a'
export const GOLD = '#d4a857'
export const GOLD_DEEP = '#9c7426'

export const COLOR_HEX: Record<TaoColor, string> = {
  red: '#c1392b',
  blue: '#2c69b8',
  green: '#2f8f5d',
  yellow: '#d4a857',
  black: '#1a1410',
}

/** A lighter tint of each colour, for highlights and washes. */
export const COLOR_LIGHT: Record<TaoColor, string> = {
  red: '#e8826f',
  blue: '#79a7e0',
  green: '#74c39a',
  yellow: '#f3d98a',
  black: '#6b625a',
}

/** A deeper shade of each colour, for outlines and shadows. */
export const COLOR_DARK: Record<TaoColor, string> = {
  red: '#7a1f16',
  blue: '#163d70',
  green: '#17543a',
  yellow: '#8a6620',
  black: '#0a0806',
}

