// Write the encoded sample positions for the PyTorch parity fixture
// (run by scripts/nn/parity.mjs; the recipe is read back by model.test.ts).
import fs from 'node:fs'
import { encodeCandidates } from '@/ai/nn/candidates'
import { encodeState } from '@/ai/nn/encode'
import { PARITY_RECIPE, samplePositions } from '@/ai/nn/index'
import { legalActions } from '@/ai/nn/legal'
import { TOKENS, schemaJson } from '@/ai/nn/schema'

const out = process.argv[2]!
const samples = samplePositions(PARITY_RECIPE.every, PARITY_RECIPE.perGame).map(({ s, seat }) => {
  const enc = encodeState(s, seat)
  const { actions, heuristic } = legalActions(s, seat)
  const c = encodeCandidates(s, enc, actions, heuristic)
  return {
    x: Object.fromEntries(TOKENS.map((t) => [t.type, Array.from(enc.x[t.type])])),
    present: Array.from(enc.present),
    rel: Array.from(enc.rel),
    feat: Array.from(c.feat),
    ptr: Array.from(c.ptr),
    n: c.n,
  }
})
fs.writeFileSync(out, JSON.stringify({ schema: schemaJson(), recipe: PARITY_RECIPE, samples }))
console.log(`parity samples: ${samples.length} positions -> ${out}`)
