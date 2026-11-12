// Where does the network disagree with its teacher? Replays held-out teacher
// games (training seeds with seed % 25 == 0, which train.py never trains on)
// and tallies, per kind of decision the teacher made, how often the network's
// top choice matches and what it picks instead.
//
//   node scripts/nn/ts.mjs scripts/nn/diagnose.ts --weights training/runs/bc-v1/step-5000.json [--games 120] [--workers 12]

import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads'
import type { Action } from '@/game/actions'
import { chooseAction } from '@/ai/index'
import { nnDecide } from '@/ai/nn/index'
import { indexOfAction } from '@/ai/nn/legal'
import { Net, type WeightsFile } from '@/ai/nn/model'
import { applyAction, createGame, waitingFor } from '@/game/engine'
import type { GameState } from '@/game/types'
import { COLORS } from '@/game/types'
import { soloConfig } from './configs'

interface Tally {
  n: number
  agree: number
  pTeacher: number
  instead: Record<string, number>
}

function category(s: GameState, a: Action): string {
  if (a.type === 'respond') return `prompt:${s.prompt?.kind ?? '?'}`
  if (a.type === 'help') return `help:${a.params.kind}`
  if (a.type === 'yinYang') return a.use.kind === 'flip' ? 'yinYang:flip' : `yinYang:help:${a.use.params.kind}`
  if (a.type === 'power') return `power:${a.use.power}`
  if (a.type === 'exorcise') return `exorcise:${a.targets.length}`
  return a.type
}

function work(job: { seeds: number[]; weights: string }): void {
  const net = Net.fromJson(JSON.parse(fs.readFileSync(job.weights, 'utf8')) as WeightsFile)
  const tally: Record<string, Tally> = {}
  for (const seed of job.seeds) {
    let s = createGame(soloConfig(seed, 'normal'))
    const seat = COLORS[seed % 4]!
    for (let i = 0; i < 6000 && s.phase !== 'gameOver'; i++) {
      const who = waitingFor(s)!
      const a = chooseAction(s, who)!
      if (who === seat) {
        const d = nnDecide(net, s, who)
        if (d && d.actions.length > 1) {
          const t = indexOfAction(d.actions, a)
          let best = 0
          for (let k = 1; k < d.probs.length; k++) if (d.probs[k]! > d.probs[best]!) best = k
          const cat = category(s, a)
          const x = (tally[cat] ??= { n: 0, agree: 0, pTeacher: 0, instead: {} })
          x.n++
          if (best === t) x.agree++
          else {
            const other = category(s, d.actions[best]!)
            x.instead[other] = (x.instead[other] ?? 0) + 1
          }
          x.pTeacher += t >= 0 ? d.probs[t]! : 0
        }
      }
      s = applyAction(s, a)
    }
  }
  parentPort!.postMessage(tally)
}

function arg(name: string, def: string): string {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1]! : def
}

async function main(): Promise<void> {
  const weights = arg('weights', 'training/runs/bc-v1/step-5000.json')
  const games = Number(arg('games', '120'))
  const workers = Number(arg('workers', '12'))
  const seeds = Array.from({ length: games }, (_, i) => 100000 + 25 * i)
  const file = fileURLToPath(import.meta.url)
  const parts = await Promise.all(
    Array.from({ length: workers }, (_, k) => new Promise<Record<string, Tally>>((resolve, reject) => {
      const wk = new Worker(file, { workerData: { seeds: seeds.filter((_, i) => i % workers === k), weights } })
      wk.on('message', resolve)
      wk.on('error', reject)
    })),
  )
  const all: Record<string, Tally> = {}
  for (const p of parts) {
    for (const [k, v] of Object.entries(p)) {
      const x = (all[k] ??= { n: 0, agree: 0, pTeacher: 0, instead: {} })
      x.n += v.n
      x.agree += v.agree
      x.pTeacher += v.pTeacher
      for (const [o, c] of Object.entries(v.instead)) x.instead[o] = (x.instead[o] ?? 0) + c
    }
  }
  const total = Object.values(all).reduce((a, x) => a + x.n, 0)
  console.log(`diagnose ${weights}: ${games} held-out teacher games, ${total} decisions with a choice`)
  console.log('teacher chose'.padEnd(34) + 'share   agree  p(teacher)  network picked instead')
  for (const [k, x] of Object.entries(all).sort((a, b) => b[1].n - a[1].n)) {
    const inst = Object.entries(x.instead).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([o, c]) => `${o} ${c}`).join(', ')
    console.log(`${k.padEnd(34)}${((100 * x.n) / total).toFixed(1).padStart(5)}%  ${((100 * x.agree) / x.n).toFixed(0).padStart(4)}%  ${(x.pTeacher / x.n).toFixed(2).padStart(9)}   ${inst}`)
  }
}

if (isMainThread) await main()
else work(workerData as { seeds: number[]; weights: string })
