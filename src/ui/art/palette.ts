// Shared colours for the art set. Player colours match src/index.css.
import type { Color, TaoColor } from '@/game/types'

export const INK = '#1d1712'
export const INK_SOFT = '#3b3129'
export const INK_FADED = '#6d5f50'
export const PAPER = '#efe4cc'
export const PAPER_LIGHT = '#f6eedb'
export const PAPER_AGED = '#d9c7a0'
export const PAPER_DEEP = '#c4ad80'
export const VERMILION = '#b8322a'
export const VERMILION_DARK = '#7e1d17'
export const GOLD = '#d4a857'
export const GOLD_LIGHT = '#f3dc95'
export const GOLD_DEEP = '#9c7426'
export const SKIN = '#ecd2ac'
export const SKIN_SHADE = '#c99f74'
export const SPIRIT = '#eef2ea' // pale ghost white
export const SPIRIT_SHADE = '#b9c3bf'
export const GHOST_GLOW = '#c8ffd9'
export const NIGHT = '#2b2537'
export const NIGHT_MID = '#4a4259'
export const NIGHT_INK = '#141019'
export const MIST = '#cfc8dc'

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

export const TAOIST_HEX: Record<Color, string> = {
  red: COLOR_HEX.red,
  blue: COLOR_HEX.blue,
  green: COLOR_HEX.green,
  yellow: COLOR_HEX.yellow,
}
