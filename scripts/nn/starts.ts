// Mid-game start positions for self-play (endgame practice): the search AI
// plays solo games and, at a random point late in each (between --min and
// --max cards left in the deck), the position is saved. The network never
// sees these games; it only starts some of its own from these positions
// (scripts/nn/actor.ts, training/rl.py --starts), with the unseen cards and
// the dice re-dealt each time.
//
//   node scripts/nn/ts.mjs scripts/nn/starts.ts --games 3000 --start 2000000 --workers 18 --out training/data/starts-v1.jsonl [--min 3 --max 16]

import fs from 'node:fs'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads'
import { chooseAction } from '@/ai/index'
import { hash } from '@/ai/sim'
import { applyAction, createGame, waitingFor } from '@/game/engine'
import { COLORS } from '@/game/types'
import { soloConfig } from './configs'

interface Job {
  seeds: number[]
  min: number
  max: number
}

function work(job: Job): void {
  const lines: string[] = []
  for (const seed of job.seeds) {
    const seat = COLORS[seed % 4]!
    let s = createGame(soloConfig(seed, 'normal'))
    const deck0 = s.deck.length
    const target = job.min + (hash(seed, 77) % (job.max - job.min + 1))
    for (let i = 0; i < 6000 && s.phase !== 'gameOver'; i++) {
      const who = waitingFor(s)!
      if (who === seat && !s.prompt && s.phase === 'yang' && s.deck.length <= target) {
        lines.push(JSON.stringify({ seed, seat, deck0, left: s.deck.length, state: { ...s, events: [] } }))
        break
      }
      s = applyAction(s, chooseAction(s, who)!)
    }
    parentPort!.postMessage({ type: 'game' })
  }
  parentPort!.postMessage({ type: 'done', lines })
}

function arg(name: string, def: string): string {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1]! : def
}

async function main(): Promise<void> {
  const games = Number(arg('games', '3000'))
  const start = Number(arg('start', '2000000'))
  const workers = Number(arg('workers', String(Math.max(1, os.cpus().length - 2))))
  const out = arg('out', 'training/data/starts-v1.jsonl')
  const min = Number(arg('min', '3'))
  const max = Number(arg('max', '16'))
  if (fs.existsSync(out) && !process.argv.includes('--force')) throw new Error(`${out} exists: pass --force to overwrite`)
  const seeds = Array.from({ length: games }, (_, i) => start + i)
  const file = fileURLToPath(import.meta.url)
  const t0 = Date.now()
  let done = 0
  const all: string[] = []
  await Promise.all(
    Array.from({ length: workers }, (_, k) => new Promise<void>((resolve, reject) => {
      const wk = new Worker(file, { workerData: { seeds: seeds.filter((_, i) => i % workers === k), min, max } })
      wk.on('message', (m: { type: string; lines?: string[] }) => {
        if (m.type === 'game') {
          done++
          if (done % 500 === 0) console.log(`starts: ${done}/${games} games, ${((Date.now() - t0) / 1000).toFixed(0)}s`)
        } else {
          all.push(...m.lines!)
          resolve()
        }
      })
      wk.on('error', reject)
    })),
  )
  fs.writeFileSync(out, all.join('\n') + '\n')
  console.log(`starts: ${all.length} positions from ${games} search-AI games (${min}-${max} cards left) -> ${out}, ${((Date.now() - t0) / 1000).toFixed(0)}s`)
}

if (isMainThread) await main()
else work(workerData as Job)
