// Where does the network's Qi go? Plays solo Normal games (sampled, as in the
// game) and tallies every Qi lost by cause (the engine's event text), per monk
// and overall, split into games won / lost.
//
//   node scripts/nn/ts.mjs scripts/nn/qi.ts --weights training/runs/rl-v4/step-50000.json [--games 600] [--workers 18]

import fs from 'node:fs'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads'
import { hash } from '@/ai/sim'
import { nnSampleAction } from '@/ai/nn/index'
import { Net, type WeightsFile } from '@/ai/nn/model'
import { applyAction, createGame, waitingFor } from '@/game/engine'
import { COLORS } from '@/game/types'
import { evalConfig } from './configs'

interface Tally {
  games: number
  wins: number
  turns: number
  /** Qi lost by cause. */
  lost: Record<string, number>
  gained: Record<string, number>
  /** Per game: Qi lost in the game / in a won game / in a lost game. */
  qiLostWon: number
  qiLostLost: number
  /** Yang turns, help / exorcism actions taken, turns with both, turns with no action at all. */
  turnCount: number
  helps: number
  exorcisms: number
  both: number
  idle: number
}

const cause = (text: string): string => {
  const m = /\(([^)]*)\)/.exec(text)
  let why = m ? m[1]! : text.slice(0, 60)
  if (/ arrives$/.test(why)) why = "a ghost's arrival ability"
  if (/Death Army|Haunter|ghost|Devourer/.test(why) && !/no room/.test(why) && why !== "a ghost's arrival ability") why = why.replace(/^[A-Z][^()]*$/, 'a ghost ability')
  return (text.startsWith('The neutral') ? 'neutral board: ' : '') + why
}

function work(job: { seeds: number[]; weights: string }): void {
  const net = Net.fromJson(JSON.parse(fs.readFileSync(job.weights, 'utf8')) as WeightsFile)
  const out: Record<string, Tally> = {}
  for (const seed of job.seeds) {
    let u = hash(seed, 99) >>> 0 || 1
    const rand = () => {
      u ^= u << 13
      u >>>= 0
      u ^= u >>> 17
      u ^= u << 5
      u >>>= 0
      return u / 4294967296
    }
    let s = createGame(evalConfig(seed, 'normal'))
    const seat = COLORS[seed % 4]!
    const lost: Record<string, number> = {}
    const gained: Record<string, number> = {}
    let turnCount = 0
    let helps = 0
    let exorcisms = 0
    let both = 0
    let idle = 0
    for (let i = 0; i < 6000 && s.phase !== 'gameOver'; i++) {
      const who = waitingFor(s)!
      const a = nnSampleAction(net, s, who, rand)!
      if (a.type === 'endTurn' && s.yang) {
        turnCount++
        helps += s.yang.helps
        exorcisms += s.yang.exorcisms
        if (s.yang.helps > 0 && s.yang.exorcisms > 0) both++
        if (s.yang.helps + s.yang.exorcisms === 0) idle++
      }
      s = applyAction(s, a)
      for (const e of s.events) {
        if (e.kind !== 'qi' || e.n == null) continue
        const k = cause(e.text)
        if (e.n < 0) lost[k] = (lost[k] ?? 0) - e.n
        else gained[k] = (gained[k] ?? 0) + e.n
      }
    }
    const key = `${seat}/${s.boards[seat].power}`
    const win = s.outcome?.result === 'win'
    for (const k2 of [key, 'all']) {
      const t = (out[k2] ??= { games: 0, wins: 0, turns: 0, lost: {}, gained: {}, qiLostWon: 0, qiLostLost: 0, turnCount: 0, helps: 0, exorcisms: 0, both: 0, idle: 0 })
      t.games++
      t.wins += win ? 1 : 0
      t.turns += s.turn
      const total = Object.values(lost).reduce((a, b) => a + b, 0)
      if (win) t.qiLostWon += total
      else t.qiLostLost += total
      for (const [k, v] of Object.entries(lost)) t.lost[k] = (t.lost[k] ?? 0) + v
      for (const [k, v] of Object.entries(gained)) t.gained[k] = (t.gained[k] ?? 0) + v
      t.turnCount += turnCount
      t.helps += helps
      t.exorcisms += exorcisms
      t.both += both
      t.idle += idle
    }
  }
  parentPort!.postMessage(out)
}

function arg(name: string, def: string): string {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1]! : def
}

async function main(): Promise<void> {
  const weights = arg('weights', 'training/runs/rl-v4/step-50000.json')
  const games = Number(arg('games', '600'))
  const workers = Number(arg('workers', String(Math.max(1, os.cpus().length - 2))))
  const seeds = Array.from({ length: games }, (_, i) => 7001 + i)
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
    for (const [key, v] of Object.entries(p)) {
      const t = (all[key] ??= { games: 0, wins: 0, turns: 0, lost: {}, gained: {}, qiLostWon: 0, qiLostLost: 0, turnCount: 0, helps: 0, exorcisms: 0, both: 0, idle: 0 })
      t.games += v.games
      t.wins += v.wins
      t.turns += v.turns
      t.qiLostWon += v.qiLostWon
      t.qiLostLost += v.qiLostLost
      t.turnCount += v.turnCount
      t.helps += v.helps
      t.exorcisms += v.exorcisms
      t.both += v.both
      t.idle += v.idle
      for (const [k, n] of Object.entries(v.lost)) t.lost[k] = (t.lost[k] ?? 0) + n
      for (const [k, n] of Object.entries(v.gained)) t.gained[k] = (t.gained[k] ?? 0) + n
    }
  }
  const show = (key: string) => {
    const t = all[key]!
    const tot = Object.values(t.lost).reduce((a, b) => a + b, 0)
    const gain = Object.values(t.gained).reduce((a, b) => a + b, 0)
    console.log(`\n== ${key}: ${t.games} games, ${t.wins} wins, ${(t.turns / t.games).toFixed(1)} turns; Qi lost per game ${(tot / t.games).toFixed(2)} (won games ${(t.qiLostWon / Math.max(1, t.wins)).toFixed(2)}, lost games ${(t.qiLostLost / Math.max(1, t.games - t.wins)).toFixed(2)}), regained per game ${(gain / t.games).toFixed(2)}`)
    for (const [k, v] of Object.entries(t.lost).sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(`   lost   ${((100 * v) / tot).toFixed(0).padStart(3)}%  ${(v / t.games).toFixed(2).padStart(5)}/game  ${k}`)
    for (const [k, v] of Object.entries(t.gained).sort((a, b) => b[1] - a[1]).slice(0, 5)) console.log(`   gained ${((100 * v) / gain).toFixed(0).padStart(3)}%  ${(v / t.games).toFixed(2).padStart(5)}/game  ${k}`)
  }
  show('all')
  for (const k of Object.keys(all).filter((x) => x !== 'all').sort()) {
    const t = all[k]!
    const tot = Object.values(t.lost).reduce((a, b) => a + b, 0)
    console.log(`${k.padEnd(28)} per Yang turn: ${(t.exorcisms / t.turnCount).toFixed(2)} exorcisms, ${(t.helps / t.turnCount).toFixed(2)} helps, ${((100 * t.both) / t.turnCount).toFixed(0)}% both, ${((100 * t.idle) / t.turnCount).toFixed(0)}% idle (${(t.turnCount / t.games).toFixed(0)} turns/game)`)
    console.log(`${k.padEnd(28)} ${t.games} games, ${((100 * t.wins) / t.games).toFixed(0)}% wins, Qi lost/game ${(tot / t.games).toFixed(2)}, top causes: ${Object.entries(t.lost).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c, v]) => `${((100 * v) / tot).toFixed(0)}% ${c}`).join(' | ')}`)
  }
}

if (isMainThread) await main()
else work(workerData as { seeds: number[]; weights: string })
