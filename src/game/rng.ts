// Seeded pseudo-random number generator (mulberry32).
//
// All engine randomness — deck shuffling, village layout, board/side
// assignment — flows through this. For in-game randomness (dice, curse die,
// ghost draws) the result is decided by the acting peer and carried in the
// action payload, so the engine itself doesn't draw entropy at apply time.
//
// The state is a single u32 stored on `GameState.rngState`. Mutations return
// the next state value so reducers stay pure.

export type RngState = number

export function seedRng(seed: number): RngState {
  // Hash a seed (which may be 0) into a non-zero state.
  let x = (seed | 0) >>> 0
  x ^= 0x9e3779b9
  x = (x + 0x6d2b79f5) >>> 0
  return x || 1
}

/** Returns [next-state, value-in-[0,1)]. */
export function nextFloat(state: RngState): [RngState, number] {
  let t = (state + 0x6d2b79f5) >>> 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  const v = ((t ^ (t >>> 14)) >>> 0) / 4294967296
  return [t >>> 0, v]
}

/** Returns [next-state, integer in [0, n)]. n must be positive. */
export function nextInt(state: RngState, n: number): [RngState, number] {
  const [next, v] = nextFloat(state)
  return [next, Math.floor(v * n)]
}

/** Fisher-Yates shuffle. Returns [next-state, shuffled-copy]. */
export function shuffle<T>(state: RngState, arr: readonly T[]): [RngState, T[]] {
  const out = arr.slice()
  let s = state
  for (let i = out.length - 1; i > 0; i--) {
    const [ns, j] = nextInt(s, i + 1)
    s = ns
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return [s, out]
}

/** Pick one element. Returns [next-state, element, index]. */
export function pick<T>(state: RngState, arr: readonly T[]): [RngState, T, number] {
  const [next, idx] = nextInt(state, arr.length)
  return [next, arr[idx], idx]
}
