import type { ReactElement } from 'react'
import type { Wash } from './kit'

export interface SceneDef {
  /** Watercolour blobs on the day side. */
  washes: readonly Wash[]
  /** Moon position on the haunted side (null = no moon, e.g. indoors). */
  moon: readonly [number, number] | null
  /** Where the little vermilion seal goes on the day side. */
  seal: readonly [number, number]
  /** The vignette (y 0–192); `night` = the haunted side. */
  Scene: (p: { night: boolean }) => ReactElement
}
