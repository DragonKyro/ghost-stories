// Imitation data: the search AI plays solo games; every decision of the
// player's seat is recorded (encoded state, every legal action, the one the
// AI chose) with the game's result.
//
//   node scripts/nn/ts.mjs scripts/nn/gen.ts --games 10000 --start 100000 --workers 18 --out training/data/solo-normal-v1 [--difficulty normal] [--dump 6]
//
// It won't write into a directory that already holds shards unless --force.
// Regenerating part of a set (generation is deterministic): --only-mod M --only-rem 0-5
// keeps the seeds with (seed - start) % M in that range; --prefix names the shard dirs.
//
// The solo seat rotates red / blue / green / yellow (seed % 4) and the power
// side alternates (seed / 4 % 2; red is always the Dance of the Spires solo).
// Seeds 7001+ are kept for evaluation (scripts/nn/eval.ts): don't train on them.

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads'
import { chooseAction } from '@/ai/index'
import { encodeCandidates } from '@/ai/nn/candidates'
import { encodeState } from '@/ai/nn/encode'
import { indexOfAction, legalActions } from '@/ai/nn/legal'
import { PROMPT_KIND, TOKENS, schemaJson } from '@/ai/nn/schema'
import { applyAction, createGame, waitingFor } from '@/game/engine'
import type { Difficulty } from '@/game/types'
import { COLORS } from '@/game/types'
import { soloConfig } from './configs'
import { ShardWriter } from './shard'

interface Job {
  seeds: number[]
  dir: string
  difficulty: Difficulty
  dump: number
  dumpFile: string | null
}

function work(job: Job): void {
  const w = new ShardWriter(job.dir)
  const dense: unknown[] = []
  let missing = 0
  for (const seed of job.seeds) {
    const config = soloConfig(seed, job.difficulty)
    const seat = COLORS[seed % 4]!
    let s = createGame(config)
    const deck0 = s.deck.length
    const power = s.boards[seat].power
    let samples = 0
    for (let i = 0; i < 6000 && s.phase !== 'gameOver'; i++) {
      const who = waitingFor(s)!
      const a = chooseAction(s, who)!
      if (who === seat) {
        const { actions, heuristic } = legalActions(s, who)
        const target = indexOfAction(actions, a)
        if (target < 0) missing++
        else if (!heuristic) {
          const enc = encodeState(s, who)
          const cands = encodeCandidates(s, enc, actions, heuristic)
          const kind = s.prompt ? 1 + PROMPT_KIND[s.prompt.kind] : 0
          w.add(enc, cands, target, seed, kind)
          samples++
          if (dense.length < job.dump) {
            dense.push({
              x: Object.fromEntries(TOKENS.map((t) => [t.type, Array.from(enc.x[t.type])])),
              present: Array.from(enc.present),
              rel: Array.from(enc.rel),
              feat: Array.from(cands.feat),
              ptr: Array.from(cands.ptr),
              n: cands.n,
              target,
            })
          }
        }
      }
      s = applyAction(s, a)
    }
    const o = s.outcome
    w.games.push({ seed, seat, power, win: o?.result === 'win', reason: o?.result === 'loss' ? o.reason : null, turns: s.turn, deck0, left: s.deck.length, samples })
    parentPort?.postMessage({ type: 'game', win: o?.result === 'win', samples })
  }
  w.write({ schema: schemaJson().hash, difficulty: job.difficulty, missing })
  if (job.dumpFile && dense.length) fs.writeFileSync(job.dumpFile, JSON.stringify({ schema: schemaJson(), samples: dense }))
  parentPort?.postMessage({ type: 'done', missing })
}

function arg(name: string, def: string): string {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1]! : def
}

async function main(): Promise<void> {
  const games = Number(arg('games', '1000'))
  const start = Number(arg('start', '100000'))
  const workers = Number(arg('workers', String(Math.max(1, os.cpus().length - 2))))
  const out = path.resolve(arg('out', 'training/data/solo-normal-v1'))
  const difficulty = arg('difficulty', 'normal') as Difficulty
  const dump = Number(arg('dump', '0'))
  const prefix = arg('prefix', '')
  const force = process.argv.includes('--force')
  if (start <= 7300 && start + games > 7001) throw new Error('seeds 7001–7300 are the evaluation seeds')
  if (!force && fs.existsSync(out) && fs.readdirSync(out).some((f) => f.startsWith(`shard-${prefix}`))) {
    throw new Error(`${out} already holds shards: pass --force to overwrite, or another --out / --prefix`)
  }
  fs.mkdirSync(out, { recursive: true })
  let seeds = Array.from({ length: games }, (_, i) => start + i)
  const mod = Number(arg('only-mod', '0'))
  if (mod > 0) {
    const [lo, hi] = arg('only-rem', '0').split('-').map(Number)
    seeds = seeds.filter((x) => (x - start) % mod >= lo! && (x - start) % mod <= (hi ?? lo!))
  }
  const t0 = Date.now()
  let done = 0
  let wins = 0
  let samples = 0
  let missing = 0
  const file = fileURLToPath(import.meta.url)
  await Promise.all(
    Array.from({ length: workers }, (_, k) => {
      const job: Job = { seeds: seeds.filter((_, i) => i % workers === k), dir: path.join(out, `shard-${prefix}${String(k).padStart(2, '0')}`), difficulty, dump: k === 0 ? dump : 0, dumpFile: k === 0 && dump ? path.join(out, 'dense-check.json') : null }
      return new Promise<void>((resolve, reject) => {
        const wk = new Worker(file, { workerData: job })
        wk.on('message', (m: { type: string; win?: boolean; samples?: number; missing?: number }) => {
          if (m.type === 'game') {
            done++
            if (m.win) wins++
            samples += m.samples!
            if (done % 500 === 0 || done === seeds.length) {
              const sec = (Date.now() - t0) / 1000
              console.log(`gen: ${done}/${seeds.length} games, ${samples} samples, teacher wins ${((100 * wins) / done).toFixed(1)}%, ${(done / sec).toFixed(1)} games/s, eta ${Math.round(((seeds.length - done) * sec) / done)}s`)
            }
          } else if (m.type === 'done') {
            missing += m.missing!
            resolve()
          }
        })
        wk.on('error', reject)
      })
    }),
  )
  writeMeta(out, { start, difficulty })
  console.log(`gen: done — ${seeds.length} games, ${samples} samples (${missing} teacher actions not matched), teacher wins ${((100 * wins) / seeds.length).toFixed(1)}%, ${((Date.now() - t0) / 1000).toFixed(0)}s -> ${out}`)
}

/** The set's meta.json, totalled over every shard in it. */
function writeMeta(out: string, extra: Record<string, unknown>): void {
  let games = 0
  let wins = 0
  let samples = 0
  let missing = 0
  for (const d of fs.readdirSync(out).filter((f) => f.startsWith('shard-')).sort()) {
    const g = JSON.parse(fs.readFileSync(path.join(out, d, 'games.json'), 'utf8')) as Array<{ win: boolean }>
    const m = JSON.parse(fs.readFileSync(path.join(out, d, 'meta.json'), 'utf8')) as { samples: number; missing: number }
    games += g.length
    wins += g.filter((x) => x.win).length
    samples += m.samples
    missing += m.missing
  }
  const prev = fs.existsSync(path.join(out, 'meta.json')) ? (JSON.parse(fs.readFileSync(path.join(out, 'meta.json'), 'utf8')) as Record<string, unknown>) : {}
  fs.writeFileSync(path.join(out, 'meta.json'), JSON.stringify({ ...prev, ...extra, schema: schemaJson(), games, wins, samples, missing }, null, 1))
}

if (isMainThread) await main()
else work(workerData as Job)
