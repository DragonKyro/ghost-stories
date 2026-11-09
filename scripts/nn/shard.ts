// Columnar, sparse training shards (read by training/nn/dataset.py).
//
// One directory per worker. Per decision ("sample"):
//   s_off.u32 / s_idx.u16 / s_val.f16  nonzero state features: index into the
//                                      concatenation of every token type's
//                                      slots × features (schema order)
//   present.u8                         N × N_TOKENS
//   rel_off.u32 / rel.u8               relation ids among the present tokens
//                                      (n × n, slot order)
//   c_off.u32                          candidate range per sample
//   target.u16 / game.u32 / kind.u8    the action taken (index into the
//                                      candidates), game seed, decision kind
//                                      (0 = Yang, 1 + PROMPT_KIND otherwise)
//   blogp.f32                          log-probability the acting policy gave it
//                                      (self-play; 0 for a teacher's choice)
//   phi.f32                            minus the danger score (ai/nn/danger.ts) at the decision
// Per candidate:
//   cf_off.u32 / cf_idx.u8 / cf_val.f16  nonzero candidate features
//   ptr.i8                               N_PTR token slots (−1 = none)
// games.json: per game seed, seat, power, result. Offsets start at 0 (N + 1 entries).

import fs from 'node:fs'
import path from 'node:path'
import type { EncodedCandidates } from '@/ai/nn/candidates'
import type { Encoded } from '@/ai/nn/encode'
import { CAND, N_PTR, N_TOKENS, TOKENS } from '@/ai/nn/schema'

type Typed = Uint8Array | Int8Array | Uint16Array | Uint32Array | Float32Array

class Grow<T extends Typed> {
  buf: T
  n = 0
  constructor(private readonly make: (n: number) => T) {
    this.buf = make(1 << 16)
  }
  push(v: number): void {
    if (this.n === this.buf.length) {
      const b = this.make(this.buf.length * 2)
      b.set(this.buf)
      this.buf = b
    }
    this.buf[this.n++] = v
  }
  bytes(): Buffer {
    return Buffer.from(this.buf.buffer, this.buf.byteOffset, this.n * this.buf.BYTES_PER_ELEMENT)
  }
}

const f32 = new Float32Array(1)
const u32 = new Uint32Array(f32.buffer)
/** IEEE half-precision bits of v (round to nearest). */
export function toHalf(v: number): number {
  f32[0] = v
  const x = u32[0]!
  const sign = (x >>> 16) & 0x8000
  const exp = ((x >>> 23) & 0xff) - 127 + 15
  const mant = x & 0x7fffff
  if (exp <= 0) {
    if (exp < -10) return sign
    const m = (mant | 0x800000) >> (1 - exp)
    return sign | ((m + 0x1000) >> 13)
  }
  if (exp >= 31) return sign | 0x7c00
  const h = sign | (exp << 10) | (mant >> 13)
  return mant & 0x1000 ? h + 1 : h
}

const u8 = (n: number) => new Uint8Array(n)
const i8 = (n: number) => new Int8Array(n)
const u16 = (n: number) => new Uint16Array(n)
const u32a = (n: number) => new Uint32Array(n)
const f32a = (n: number) => new Float32Array(n)

export class ShardWriter {
  samples = 0
  candidates = 0
  private readonly cols = {
    s_off: new Grow(u32a),
    s_idx: new Grow(u16),
    s_val: new Grow(u16),
    present: new Grow(u8),
    rel_off: new Grow(u32a),
    rel: new Grow(u8),
    c_off: new Grow(u32a),
    cf_off: new Grow(u32a),
    cf_idx: new Grow(u8),
    cf_val: new Grow(u16),
    ptr: new Grow(i8),
    target: new Grow(u16),
    game: new Grow(u32a),
    kind: new Grow(u8),
    blogp: new Grow(f32a),
    phi: new Grow(f32a),
  }
  readonly games: unknown[] = []

  constructor(readonly dir: string) {
    const c = this.cols
    c.s_off.push(0)
    c.rel_off.push(0)
    c.c_off.push(0)
    c.cf_off.push(0)
  }

  /** `logp`: log-probability the acting policy gave the chosen action (0 for a teacher's choice). */
  add(enc: Encoded, cands: EncodedCandidates, target: number, game: number, kind: number, logp = 0, phi = 0): void {
    const c = this.cols
    for (const t of TOKENS) {
      const x = enc.x[t.type]
      const base = offsetOf(t.type)
      for (let i = 0; i < x.length; i++) {
        const v = x[i]!
        if (v !== 0) {
          c.s_idx.push(base + i)
          c.s_val.push(toHalf(v))
        }
      }
    }
    c.s_off.push(c.s_idx.n)
    const present: number[] = []
    for (let i = 0; i < N_TOKENS; i++) {
      c.present.push(enc.present[i]!)
      if (enc.present[i]) present.push(i)
    }
    for (const a of present) for (const b of present) c.rel.push(enc.rel[a * N_TOKENS + b]!)
    c.rel_off.push(c.rel.n)
    for (let k = 0; k < cands.n; k++) {
      for (let j = 0; j < CAND.size; j++) {
        const v = cands.feat[k * CAND.size + j]!
        if (v !== 0) {
          c.cf_idx.push(j)
          c.cf_val.push(toHalf(v))
        }
      }
      c.cf_off.push(c.cf_idx.n)
      for (let j = 0; j < N_PTR; j++) c.ptr.push(cands.ptr[k * N_PTR + j]!)
    }
    this.candidates += cands.n
    c.c_off.push(this.candidates)
    c.target.push(target)
    c.game.push(game)
    c.kind.push(kind)
    c.blogp.push(logp)
    c.phi.push(phi)
    this.samples++
  }

  write(meta: Record<string, unknown>): void {
    fs.mkdirSync(this.dir, { recursive: true })
    for (const [name, col] of Object.entries(this.cols)) {
      const ext = name === 's_val' || name === 'cf_val' ? 'f16' : col.buf instanceof Float32Array ? 'f32' : col.buf instanceof Uint32Array ? 'u32' : col.buf instanceof Uint16Array ? 'u16' : col.buf instanceof Int8Array ? 'i8' : 'u8'
      fs.writeFileSync(path.join(this.dir, `${name}.${ext}`), col.bytes())
    }
    fs.writeFileSync(path.join(this.dir, 'games.json'), JSON.stringify(this.games))
    fs.writeFileSync(path.join(this.dir, 'meta.json'), JSON.stringify({ ...meta, samples: this.samples, candidates: this.candidates }))
  }
}

const OFFSETS: Record<string, number> = (() => {
  const out: Record<string, number> = {}
  let o = 0
  for (const t of TOKENS) {
    out[t.type] = o
    o += t.slots * t.layout.size
  }
  if (o > 65535) throw new Error('state features no longer fit u16 indices')
  return out
})()
const offsetOf = (type: string) => OFFSETS[type]!
