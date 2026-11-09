// Play-test a policy on fixed seeds. Default: solo, the seat is seed % 4, power
// sides random. `--setup norm4` etc. (scripts/nn/configs.ts setupConfig) plays
// other player counts / difficulties / expansions: the network then plays every
// Taoist seat (Wu-Feng stays on the heuristic).
//
//   node scripts/nn/ts.mjs scripts/nn/eval.ts --weights run/step-1000.json [--seeds 7001-7300] [--workers 10] [--json out.json] [--sample --temp 0.75] [--setup norm4]
//   node scripts/nn/ts.mjs scripts/nn/eval.ts --policy quick|search [--setup norm4]
//   ... --sample --attempts 16   (each seed 16 times: how many seeds are ever won; perGame has `attempt`)
//
// Without --sample the network plays its most likely action at every decision (no search).

import fs from 'node:fs'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads'
import { chooseAction } from '@/ai/index'
import { nnChooseAction, nnDecide } from '@/ai/nn/index'
import { hash } from '@/ai/sim'
import { Net, type WeightsFile } from '@/ai/nn/model'
import { SEARCH } from '@/ai/tuning'
import { applyAction, createGame, waitingFor } from '@/game/engine'
import type { Color, Difficulty } from '@/game/types'
import { evalConfig, setupConfig, soloConfig } from './configs'
import { COLORS } from '@/game/types'

interface Job {
  seeds: number[]
  policy: string
  weights: string | null
  difficulty: Difficulty
  /** Sample the network's moves from its policy instead of taking the most likely one. */
  sample: boolean
  /** Use the training setups (power side = seed / 4 % 2) instead of random power sides. */
  trainSetups: boolean
  /** Sampling temperature (1 = the policy as is; lower = sharper). */
  temp: number
  setup: string | null
  /** Play each seed this many times (the network's sampling differs; the deck order is the seed's). */
  attempts: number
}

interface GameResult {
  seed: number
  seat: Color
  power: string
  win: boolean
  reason: string | null
  turns: number
  progress: number
  ms: number
  attempt: number
  /** Incarnations of Wu-Feng destroyed (Nightmare / Hell have several). */
  incs: number
}

function work(job: Job): void {
  const net = job.weights ? Net.fromJson(JSON.parse(fs.readFileSync(job.weights, 'utf8')) as WeightsFile) : null
  SEARCH.on = job.policy !== 'quick'
  for (const seed of job.seeds) for (let attempt = 0; attempt < job.attempts; attempt++) {
    const t0 = performance.now()
    let s = createGame(job.setup ? setupConfig(job.setup, seed) : job.trainSetups ? soloConfig(seed, job.difficulty) : evalConfig(seed, job.difficulty))
    let u = hash(seed, 4242 + attempt * 7919) >>> 0 || 1
    const rand = () => {
      u ^= u << 13
      u >>>= 0
      u ^= u >>> 17
      u ^= u << 5
      u >>>= 0
      return u / 4294967296
    }
    const solo = s.config.seats && COLORS.filter((c) => s.config.seats[c] !== 'neutral').length === 1
    const seat = solo ? COLORS.find((c) => s.config.seats[c] !== 'neutral')! : COLORS[seed % 4]!
    const deck0 = s.deck.length
    for (let i = 0; i < 6000 && s.phase !== 'gameOver'; i++) {
      const who = waitingFor(s)!
      let a
      if (net && who !== 'wufeng' && job.sample) {
        const d = nnDecide(net, s, who)!
        const p = Array.from(d.probs, (q) => Math.pow(q, 1 / job.temp))
        const z = p.reduce((a2, b2) => a2 + b2, 0)
        let x = rand() * z
        let k = p.length - 1
        for (let j = 0; j < p.length; j++) {
          x -= p[j]!
          if (x <= 0) {
            k = j
            break
          }
        }
        a = d.actions[k]!
      } else a = net && who !== 'wufeng' ? nnChooseAction(net, s, who)! : chooseAction(s, who)!
      s = applyAction(s, a)
    }
    const o = s.outcome
    const win = o?.result === 'win'
    const r: GameResult = { seed, seat, power: s.boards[seat].power, win, reason: o?.result === 'loss' ? o.reason : null, turns: s.turn, progress: win ? 1 : (deck0 - s.deck.length) / deck0, ms: performance.now() - t0, attempt, incs: s.discard.filter((c) => c.startsWith('wf-')).length }
    parentPort!.postMessage(r)
  }
  parentPort!.postMessage(null)
}

function arg(name: string, def: string | null): string | null {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1]! : def
}

function seedList(spec: string): number[] {
  const out: number[] = []
  for (const part of spec.split(',')) {
    const [a, b] = part.split('-').map(Number)
    if (b === undefined) out.push(a!)
    else for (let x = a!; x <= b; x++) out.push(x)
  }
  return out
}

async function main(): Promise<void> {
  const weights = arg('weights', null)
  const policy = weights ? 'nn' : arg('policy', 'search')!
  const seeds = seedList(arg('seeds', '7001-7300')!)
  const workers = Math.min(seeds.length, Number(arg('workers', String(Math.max(1, os.cpus().length - 4)))))
  const difficulty = arg('difficulty', 'normal') as Difficulty
  const setup = arg('setup', null)
  const file = fileURLToPath(import.meta.url)
  const results: GameResult[] = []
  const t0 = Date.now()
  await Promise.all(
    Array.from({ length: workers }, (_, k) => {
      const job: Job = { seeds: seeds.filter((_, i) => i % workers === k), policy, weights, difficulty, sample: process.argv.includes('--sample'), trainSetups: process.argv.includes('--train-setups'), temp: Number(arg('temp', '1')), setup: arg('setup', null), attempts: Number(arg('attempts', '1')) }
      return new Promise<void>((resolve, reject) => {
        const wk = new Worker(file, { workerData: job })
        wk.on('message', (m: GameResult | null) => (m ? results.push(m) : resolve()))
        wk.on('error', reject)
      })
    }),
  )
  const n = results.length
  const wins = results.filter((r) => r.win).length
  const mean = (f: (r: GameResult) => number) => results.reduce((a, r) => a + f(r), 0) / Math.max(1, n)
  const byMonk = new Map<string, { n: number; w: number }>()
  for (const r of results) {
    const k = setup && !/1/.test(setup) ? 'all' : `${r.seat}/${r.power}`
    const m = byMonk.get(k) ?? { n: 0, w: 0 }
    m.n++
    if (r.win) m.w++
    byMonk.set(k, m)
  }
  const reasons: Record<string, number> = {}
  for (const r of results) reasons[r.reason ?? 'win'] = (reasons[r.reason ?? 'win'] ?? 0) + 1
  const summary = {
    policy: weights ?? policy,
    games: n,
    wins,
    winRate: wins / n,
    turns: mean((r) => r.turns),
    progress: mean((r) => r.progress),
    msPerGame: mean((r) => r.ms),
    reasons,
    byMonk: Object.fromEntries([...byMonk.entries()].sort().map(([k, m]) => [k, `${m.w}/${m.n}`])),
    seconds: (Date.now() - t0) / 1000,
    perGame: results.sort((x, y) => x.seed - y.seed),
  }
  const json = arg('json', null)
  if (json) fs.writeFileSync(json, JSON.stringify(summary, null, 1))
  console.log(
    `eval ${weights ? weights.split(/[\\/]/).slice(-1)[0] : policy}: ${wins}/${n} wins (${((100 * wins) / n).toFixed(1)}%), turns ${summary.turns.toFixed(1)}, deck progress ${(100 * summary.progress).toFixed(0)}%, ${JSON.stringify(reasons)}, ${summary.seconds.toFixed(0)}s`,
  )
}

if (isMainThread) await main()
else work(workerData as Job)
