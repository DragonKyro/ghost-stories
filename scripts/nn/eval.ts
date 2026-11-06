// Play-test a policy on fixed solo seeds (same setups as scripts/aibench: the
// seat is seed % 4, power sides random).
//
//   node scripts/nn/ts.mjs scripts/nn/eval.ts --weights run/step-1000.json [--seeds 7001-7300] [--workers 10] [--json out.json]
//   node scripts/nn/ts.mjs scripts/nn/eval.ts --policy quick|search
//
// The network plays its most likely action at every decision (no search).

import fs from 'node:fs'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads'
import { chooseAction } from '@/ai/index'
import { nnChooseAction } from '@/ai/nn/index'
import { Net, type WeightsFile } from '@/ai/nn/model'
import { SEARCH } from '@/ai/tuning'
import { applyAction, createGame, waitingFor } from '@/game/engine'
import type { Color, Difficulty } from '@/game/types'
import { evalConfig } from './configs'
import { COLORS } from '@/game/types'

interface Job {
  seeds: number[]
  policy: string
  weights: string | null
  difficulty: Difficulty
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
}

function work(job: Job): void {
  const net = job.weights ? Net.fromJson(JSON.parse(fs.readFileSync(job.weights, 'utf8')) as WeightsFile) : null
  SEARCH.on = job.policy !== 'quick'
  for (const seed of job.seeds) {
    const t0 = performance.now()
    let s = createGame(evalConfig(seed, job.difficulty))
    const seat = COLORS[seed % 4]!
    const deck0 = s.deck.length
    for (let i = 0; i < 6000 && s.phase !== 'gameOver'; i++) {
      const who = waitingFor(s)!
      const a = net && who === seat ? nnChooseAction(net, s, who)! : chooseAction(s, who)!
      s = applyAction(s, a)
    }
    const o = s.outcome
    const win = o?.result === 'win'
    const r: GameResult = { seed, seat, power: s.boards[seat].power, win, reason: o?.result === 'loss' ? o.reason : null, turns: s.turn, progress: win ? 1 : (deck0 - s.deck.length) / deck0, ms: performance.now() - t0 }
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
  const file = fileURLToPath(import.meta.url)
  const results: GameResult[] = []
  const t0 = Date.now()
  await Promise.all(
    Array.from({ length: workers }, (_, k) => {
      const job: Job = { seeds: seeds.filter((_, i) => i % workers === k), policy, weights, difficulty }
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
    const k = `${r.seat}/${r.power}`
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
  }
  const json = arg('json', null)
  if (json) fs.writeFileSync(json, JSON.stringify(summary, null, 1))
  console.log(
    `eval ${weights ? weights.split(/[\\/]/).slice(-1)[0] : policy}: ${wins}/${n} wins (${((100 * wins) / n).toFixed(1)}%), turns ${summary.turns.toFixed(1)}, deck progress ${(100 * summary.progress).toFixed(0)}%, ${JSON.stringify(reasons)}, ${summary.seconds.toFixed(0)}s`,
  )
}

if (isMainThread) await main()
else work(workerData as Job)
