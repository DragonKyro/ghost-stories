// Tiny drawing helpers for the Bastion tile scenes.
import { LB_INK } from '../palette'

/** A filled path with the set's ink outline (sw 0 = no outline). */
export function P({ d, fill, sw = 1.6, stroke = LB_INK, o }: { d: string; fill: string; sw?: number; stroke?: string; o?: number }) {
  return <path d={d} fill={fill} stroke={sw ? stroke : undefined} strokeWidth={sw || undefined} strokeLinejoin="round" opacity={o} />
}

/** Stroked lines only (joints, folds, ropes). */
export function Ln({ d, stroke = LB_INK, sw = 1.2, o }: { d: string; stroke?: string; sw?: number; o?: number }) {
  return <path d={d} fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" opacity={o} />
}
