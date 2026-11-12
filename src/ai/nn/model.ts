// The network's forward pass in plain TypeScript (for the browser and the
// Node self-play workers). Mirrors training/nn/model.py tensor for tensor;
// model.test.ts checks the two agree on a fixture made by PyTorch.
//
//   tokens ──embed (per type) + slot embedding──▶ h
//   L × [ h += Attn(LN(h), relation bias) ; h += FFN(LN(h)) ]
//   hf = LN(h);  g = [hf_global, mean(hf)]
//   value head:  MLP(g) → [win logit, progress logit, outcome logits]
//   policy head: per candidate  MLP([W·feat + Σ_k P_k·hf[ptr_k], g]) → logit
//
// Only the tokens present in the state are computed (absent slots are masked
// out in PyTorch, which gives the same numbers).

import type { Encoded } from './encode'
import type { EncodedCandidates } from './candidates'
import { CAND, N_OUTCOME, N_PTR, N_REL, N_TOKENS, SCHEMA_HASH, TOKENS, schemaJson, type SchemaJson } from './schema'

export interface NetConfig {
  d: number
  heads: number
  layers: number
  ff: number
}

export interface WeightsFile {
  schema: SchemaJson
  config: NetConfig
  tensors: Record<string, { shape: number[]; data: string }>
}

export interface NetOutput {
  /** P(win) and its logit. */
  value: number
  valueLogit: number
  /** Predicted fraction of the deck the game gets through. */
  progress: number
  /** Outcome class probabilities: win, all dead, third haunting, deck exhausted, villagers. */
  outcome: Float32Array
  /** One logit per candidate. */
  logits: Float32Array
}

type Tensors = Record<string, Float32Array>

/** Tensor names and shapes for a config (the PyTorch state_dict names). */
export function tensorShapes(c: NetConfig): Record<string, number[]> {
  const { d, ff, heads } = c
  const out: Record<string, number[]> = {}
  for (const t of TOKENS) {
    out[`embed.${t.type}.weight`] = [d, t.layout.size]
    out[`embed.${t.type}.bias`] = [d]
  }
  out['slot'] = [N_TOKENS, d]
  for (let i = 0; i < c.layers; i++) {
    const p = `layers.${i}.`
    out[`${p}ln1.weight`] = [d]
    out[`${p}ln1.bias`] = [d]
    out[`${p}qkv.weight`] = [3 * d, d]
    out[`${p}qkv.bias`] = [3 * d]
    out[`${p}out.weight`] = [d, d]
    out[`${p}out.bias`] = [d]
    out[`${p}rel`] = [heads, N_REL]
    out[`${p}ln2.weight`] = [d]
    out[`${p}ln2.bias`] = [d]
    out[`${p}ff1.weight`] = [ff, d]
    out[`${p}ff1.bias`] = [ff]
    out[`${p}ff2.weight`] = [d, ff]
    out[`${p}ff2.bias`] = [d]
  }
  out['ln_f.weight'] = [d]
  out['ln_f.bias'] = [d]
  out['value.fc1.weight'] = [d, 2 * d]
  out['value.fc1.bias'] = [d]
  out['value.fc2.weight'] = [2 + N_OUTCOME, d]
  out['value.fc2.bias'] = [2 + N_OUTCOME]
  out['policy.cand.weight'] = [d, CAND.size]
  out['policy.cand.bias'] = [d]
  out['policy.ptr'] = [N_PTR, d, d]
  out['policy.fc1.weight'] = [d, 3 * d]
  out['policy.fc1.bias'] = [d]
  out['policy.fc2.weight'] = [1, d]
  out['policy.fc2.bias'] = [1]
  return out
}

const size = (shape: number[]) => shape.reduce((a, b) => a * b, 1)

function decodeF32(b64: string): Float32Array {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Float32Array(bytes.buffer)
}

export function encodeF32(a: Float32Array): string {
  const bytes = new Uint8Array(a.buffer, a.byteOffset, a.byteLength)
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

/** y[o] = b[o] + Σ_i W[o, i] x[i]  (W row-major [out, in]). */
function linear(W: Float32Array, b: Float32Array | null, x: Float32Array, xOff: number, nIn: number, y: Float32Array, yOff: number, nOut: number): void {
  for (let o = 0; o < nOut; o++) {
    let acc = b ? b[o]! : 0
    const w = o * nIn
    for (let i = 0; i < nIn; i++) acc += W[w + i]! * x[xOff + i]!
    y[yOff + o] = acc
  }
}

function layerNorm(x: Float32Array, off: number, n: number, w: Float32Array, b: Float32Array, y: Float32Array, yOff: number): void {
  let mean = 0
  for (let i = 0; i < n; i++) mean += x[off + i]!
  mean /= n
  let v = 0
  for (let i = 0; i < n; i++) {
    const d = x[off + i]! - mean
    v += d * d
  }
  const inv = 1 / Math.sqrt(v / n + 1e-5)
  for (let i = 0; i < n; i++) y[yOff + i] = (x[off + i]! - mean) * inv * w[i]! + b[i]!
}

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z))

export class Net {
  readonly config: NetConfig
  private readonly t: Tensors

  constructor(config: NetConfig, tensors: Tensors) {
    const shapes = tensorShapes(config)
    for (const [name, shape] of Object.entries(shapes)) {
      const a = tensors[name]
      if (!a) throw new Error(`nn weights: missing ${name}`)
      if (a.length !== size(shape)) throw new Error(`nn weights: ${name} has ${a.length} values, expected ${size(shape)} (${shape.join('×')})`)
    }
    if (config.d % config.heads !== 0) throw new Error('nn weights: d must divide by heads')
    this.config = config
    this.t = tensors
  }

  static fromJson(w: WeightsFile): Net {
    if (w.schema.hash !== SCHEMA_HASH) {
      throw new Error(`nn weights: trained on encoder schema ${w.schema.hash}, this build encodes ${SCHEMA_HASH}`)
    }
    const tensors: Tensors = {}
    for (const [name, v] of Object.entries(w.tensors)) tensors[name] = decodeF32(v.data)
    return new Net(w.config, tensors)
  }

  /** Small random weights (deterministic), for tests and as a starting point. */
  static random(config: NetConfig, seed = 1): Net {
    let st = seed >>> 0 || 1
    const rand = () => {
      st ^= st << 13
      st ^= st >>> 17
      st ^= st << 5
      return ((st >>> 0) / 4294967296) * 2 - 1
    }
    const tensors: Tensors = {}
    for (const [name, shape] of Object.entries(tensorShapes(config))) {
      const a = new Float32Array(size(shape))
      const fanIn = shape.length > 1 ? shape[shape.length - 1]! : 1
      const isNormWeight = name.endsWith('ln1.weight') || name.endsWith('ln2.weight') || name === 'ln_f.weight'
      for (let i = 0; i < a.length; i++) a[i] = isNormWeight ? 1 + 0.1 * rand() : rand() / Math.sqrt(fanIn)
      tensors[name] = a
    }
    return new Net(config, tensors)
  }

  toJson(): WeightsFile {
    const tensors: WeightsFile['tensors'] = {}
    for (const [name, shape] of Object.entries(tensorShapes(this.config))) tensors[name] = { shape, data: encodeF32(this.t[name]!) }
    return { schema: schemaJson(), config: this.config, tensors }
  }

  evaluate(enc: Encoded, cands?: EncodedCandidates): NetOutput {
    const { d, heads, ff } = this.config
    const T = this.t
    const dh = d / heads
    // Present tokens, in slot order.
    const slots: number[] = []
    const where = new Int16Array(N_TOKENS).fill(-1)
    for (let i = 0; i < N_TOKENS; i++) {
      if (enc.present[i]) {
        where[i] = slots.length
        slots.push(i)
      }
    }
    const n = slots.length
    const h = new Float32Array(n * d)
    for (const spec of TOKENS) {
      const W = T[`embed.${spec.type}.weight`]!
      const b = T[`embed.${spec.type}.bias`]!
      const F = spec.layout.size
      const x = enc.x[spec.type]
      for (let s = 0; s < spec.slots; s++) {
        const j = where[spec.start + s]!
        if (j < 0) continue
        linear(W, b, x, s * F, F, h, j * d, d)
      }
    }
    const slotEmb = T['slot']!
    for (let j = 0; j < n; j++) for (let k = 0; k < d; k++) h[j * d + k]! += slotEmb[slots[j]! * d + k]!
    // Relation ids between present tokens.
    const rel = new Uint8Array(n * n)
    for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) rel[a * n + b] = enc.rel[slots[a]! * N_TOKENS + slots[b]!]!

    const a = new Float32Array(n * d)
    const qkv = new Float32Array(n * 3 * d)
    const att = new Float32Array(n * d)
    const proj = new Float32Array(d)
    const hid = new Float32Array(ff)
    const scores = new Float64Array(n)
    const scale = 1 / Math.sqrt(dh)
    for (let l = 0; l < this.config.layers; l++) {
      const p = `layers.${l}.`
      for (let j = 0; j < n; j++) layerNorm(h, j * d, d, T[`${p}ln1.weight`]!, T[`${p}ln1.bias`]!, a, j * d)
      for (let j = 0; j < n; j++) linear(T[`${p}qkv.weight`]!, T[`${p}qkv.bias`]!, a, j * d, d, qkv, j * 3 * d, 3 * d)
      const relB = T[`${p}rel`]!
      for (let hd = 0; hd < heads; hd++) {
        const qo = hd * dh
        const ko = d + hd * dh
        const vo = 2 * d + hd * dh
        for (let i = 0; i < n; i++) {
          let max = -Infinity
          for (let j = 0; j < n; j++) {
            let dot = 0
            for (let k = 0; k < dh; k++) dot += qkv[i * 3 * d + qo + k]! * qkv[j * 3 * d + ko + k]!
            const sc = dot * scale + relB[hd * N_REL + rel[i * n + j]!]!
            scores[j] = sc
            if (sc > max) max = sc
          }
          let sum = 0
          for (let j = 0; j < n; j++) {
            const e = Math.exp(scores[j]! - max)
            scores[j] = e
            sum += e
          }
          for (let k = 0; k < dh; k++) {
            let acc = 0
            for (let j = 0; j < n; j++) acc += scores[j]! * qkv[j * 3 * d + vo + k]!
            att[i * d + qo + k] = acc / sum
          }
        }
      }
      for (let j = 0; j < n; j++) {
        linear(T[`${p}out.weight`]!, T[`${p}out.bias`]!, att, j * d, d, proj, 0, d)
        for (let k = 0; k < d; k++) h[j * d + k]! += proj[k]!
      }
      for (let j = 0; j < n; j++) {
        layerNorm(h, j * d, d, T[`${p}ln2.weight`]!, T[`${p}ln2.bias`]!, a, j * d)
        linear(T[`${p}ff1.weight`]!, T[`${p}ff1.bias`]!, a, j * d, d, hid, 0, ff)
        for (let k = 0; k < ff; k++) if (hid[k]! < 0) hid[k] = 0
        linear(T[`${p}ff2.weight`]!, T[`${p}ff2.bias`]!, hid, 0, ff, proj, 0, d)
        for (let k = 0; k < d; k++) h[j * d + k]! += proj[k]!
      }
    }
    const hf = new Float32Array(n * d)
    for (let j = 0; j < n; j++) layerNorm(h, j * d, d, T['ln_f.weight']!, T['ln_f.bias']!, hf, j * d)
    // Pooled state: the global token and the mean of all present tokens.
    const g = new Float32Array(2 * d)
    const gj = where[TOKENS[0]!.start]!
    for (let k = 0; k < d; k++) g[k] = hf[gj * d + k]!
    for (let j = 0; j < n; j++) for (let k = 0; k < d; k++) g[d + k]! += hf[j * d + k]! / n
    // Value head.
    const v1 = new Float32Array(d)
    linear(T['value.fc1.weight']!, T['value.fc1.bias']!, g, 0, 2 * d, v1, 0, d)
    for (let k = 0; k < d; k++) if (v1[k]! < 0) v1[k] = 0
    const vOut = new Float32Array(2 + N_OUTCOME)
    linear(T['value.fc2.weight']!, T['value.fc2.bias']!, v1, 0, d, vOut, 0, 2 + N_OUTCOME)
    const outcome = new Float32Array(N_OUTCOME)
    let max = -Infinity
    for (let k = 0; k < N_OUTCOME; k++) max = Math.max(max, vOut[2 + k]!)
    let sum = 0
    for (let k = 0; k < N_OUTCOME; k++) sum += outcome[k] = Math.exp(vOut[2 + k]! - max)
    for (let k = 0; k < N_OUTCOME; k++) outcome[k]! /= sum
    // Policy head.
    const nc = cands?.n ?? 0
    const logits = new Float32Array(nc)
    if (cands && nc > 0) {
      const A = CAND.size
      const Pw = T['policy.ptr']!
      // P_k · hf[j], computed once per (role, token) that some candidate points at.
      const pcache = new Map<number, Float32Array>()
      const pointed = (k: number, j: number): Float32Array => {
        const key = k * n + j
        let y = pcache.get(key)
        if (!y) {
          y = new Float32Array(d)
          linear(Pw.subarray(k * d * d, (k + 1) * d * d), null, hf, j * d, d, y, 0, d)
          pcache.set(key, y)
        }
        return y
      }
      // fc1 acts on [e, g]: the g half is the same for every candidate, so it's computed once.
      const W1 = T['policy.fc1.weight']!
      const b1 = T['policy.fc1.bias']!
      const gPart = new Float32Array(d)
      for (let o = 0; o < d; o++) {
        let acc = b1[o]!
        for (let q = 0; q < 2 * d; q++) acc += W1[o * 3 * d + d + q]! * g[q]!
        gPart[o] = acc
      }
      const e = new Float32Array(d)
      const u = new Float32Array(d)
      const fc2 = T['policy.fc2.weight']!
      const fc2b = T['policy.fc2.bias']![0]!
      for (let c = 0; c < nc; c++) {
        linear(T['policy.cand.weight']!, T['policy.cand.bias']!, cands.feat, c * A, A, e, 0, d)
        for (let k = 0; k < N_PTR; k++) {
          const slot = cands.ptr[c * N_PTR + k]!
          if (slot < 0) continue
          const j = where[slot]!
          if (j < 0) continue
          const y = pointed(k, j)
          for (let q = 0; q < d; q++) e[q]! += y[q]!
        }
        for (let o = 0; o < d; o++) {
          let acc = gPart[o]!
          const w = o * 3 * d
          for (let q = 0; q < d; q++) acc += W1[w + q]! * e[q]!
          u[o] = acc
        }
        let z = fc2b
        for (let q = 0; q < d; q++) if (u[q]! > 0) z += fc2[q]! * u[q]!
        logits[c] = z
      }
    }
    return { value: sigmoid(vOut[0]!), valueLogit: vOut[0]!, progress: sigmoid(vOut[1]!), outcome, logits }
  }
}

/** Softmax over candidate logits. */
export function softmax(logits: Float32Array): Float32Array {
  const out = new Float32Array(logits.length)
  let max = -Infinity
  for (const z of logits) max = Math.max(max, z)
  let sum = 0
  for (let i = 0; i < logits.length; i++) sum += out[i] = Math.exp(logits[i]! - max)
  for (let i = 0; i < logits.length; i++) out[i]! /= sum
  return out
}
