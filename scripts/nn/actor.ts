// Self-play actors for reinforcement learning (driven by training/rl.py).
//
//   node scripts/nn/ts.mjs scripts/nn/actor.ts --workers 18
//
// A long-running process with persistent worker threads. It reads one JSON
// command per line on stdin and answers each with one line on stdout that
// starts with "@@":
//   {"cmd":"play","weights":"…json","seeds":[…],"out":"dir","iter":3}
//       the network plays those solo games (every monk: seat = seed % 4, power
//       side = seed / 4 % 2), sampling its moves from its policy; every decision
//       is written to shards in `out` (scripts/nn/shard.ts, with the policy's
//       log-probability of the move taken, and minus the danger score with the
//       optional "danger" weights). → {"games","wins","samples","turns","progress","reasons"}
//   {"cmd":"eval","weights":"…json","seeds":[…]}
//       greedy play (most likely move) on evaluation setups (power sides random).
//       → {"games","wins","turns","progress","reasons","byMonk"}
//   {"cmd":"quit"}

import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { fileURLToPath } from 'node:url'
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads'
import { chooseAction } from '@/ai/index'
import { nnDecide } from '@/ai/nn/index'
import { Net, type WeightsFile } from '@/ai/nn/model'
import { PROMPT_KIND, schemaJson } from '@/ai/nn/schema'
import { hash, sanitize } from '@/ai/sim'
import { DANGER, danger, type DangerWeights } from '@/ai/nn/danger'
import { applyAction, createGame, waitingFor } from '@/game/engine'
import { COLORS } from '@/game/types'
import type { Color, GameState } from '@/game/types'
import { evalConfig, soloConfig } from './configs'
import { ShardWriter } from './shard'

interface Task {
  cmd: 'play' | 'eval'
  weights: string
  seeds: number[]
  out?: string
  iter?: number
  shard?: string
  /** Danger-hint weights (src/ai/nn/danger.ts); missing ones keep their defaults. */
  danger?: Partial<DangerWeights>
  /** Mid-game starts (scripts/nn/starts.ts): this share of the games begin from a bank position, with the unseen cards and dice re-dealt. */
  starts?: string
  startFrac?: number
  /** eval: sample moves at this temperature instead of taking the most likely one. */
  temp?: number
}

interface GameRecord {
  seed: number
  seat: string
  power: string
  win: boolean
  reason: string | null
  turns: number
  deck0: number
  left: number
  samples: number
  started: boolean
}

let bank: { path: string; lines: string[] } | null = null
function startBank(p: string): string[] {
  if (!bank || bank.path !== p) bank = { path: p, lines: fs.readFileSync(p, 'utf8').split(/\r?\n/).filter((l) => l.trim()) }
  return bank.lines
}

function rng(seed: number): () => number {
  let s = seed >>> 0 || 1
  return () => {
    s ^= s << 13
    s >>>= 0
    s ^= s >>> 17
    s ^= s << 5
    s >>>= 0
    return s / 4294967296
  }
}

let cached: { path: string; mtime: number; net: Net } | null = null
function loadNet(p: string): Net {
  const mtime = fs.statSync(p).mtimeMs
  if (cached && cached.path === p && cached.mtime === mtime) return cached.net
  const net = Net.fromJson(JSON.parse(fs.readFileSync(p, 'utf8')) as WeightsFile)
  cached = { path: p, mtime, net }
  return net
}

function runTask(t: Task): GameRecord[] {
  const net = loadNet(t.weights)
  const sample = t.cmd === 'play'
  const w = sample ? new ShardWriter(t.shard!) : null
  const dw: DangerWeights = { ...DANGER, ...(t.danger ?? {}) }
  const out: GameRecord[] = []
  const lines = sample && t.starts && (t.startFrac ?? 0) > 0 ? startBank(t.starts) : null
  for (const seed of t.seeds) {
    let s: GameState
    let seat: Color
    let deck0: number
    let started = false
    if (lines && (hash(seed, 991) % 1000) / 1000 < t.startFrac!) {
      const e = JSON.parse(lines[hash(seed, 313) % lines.length]!) as { seat: Color; deck0: number; state: GameState }
      s = sanitize(e.state, hash(seed, (t.iter ?? 0) + 7))
      seat = e.seat
      deck0 = e.deck0
      started = true
    } else {
      s = createGame(sample ? soloConfig(seed, 'normal') : evalConfig(seed, 'normal'))
      seat = COLORS[seed % 4]!
      deck0 = s.deck.length
    }
    const rand = rng(hash(seed, (t.iter ?? 0) + 1))
    let samples = 0
    for (let i = 0; i < 6000 && s.phase !== 'gameOver'; i++) {
      const who = waitingFor(s)!
      let a
      if (who === seat) {
        const d = nnDecide(net, s, who)!
        let k = 0
        if (d.actions.length > 1) {
          if (sample || t.temp) {
            const T = sample ? 1 : t.temp!
            const p = T === 1 ? Array.from(d.probs) : Array.from(d.probs, (q) => Math.pow(q, 1 / T))
            let u = rand() * p.reduce((x, y) => x + y, 0)
            k = p.length - 1
            for (let j = 0; j < p.length; j++) {
              u -= p[j]!
              if (u <= 0) {
                k = j
                break
              }
            }
          } else {
            for (let j = 1; j < d.probs.length; j++) if (d.probs[j]! > d.probs[k]!) k = j
          }
        }
        a = d.actions[k]!
        if (w && !d.heuristic) {
          const kind = s.prompt ? 1 + PROMPT_KIND[s.prompt.kind] : 0
          w.add(d.enc, d.cands, k, seed, kind, Math.log(Math.max(1e-30, d.probs[k]!)), -danger(s, seat, dw))
          samples++
        }
      } else a = chooseAction(s, who)!
      s = applyAction(s, a)
    }
    const o = s.outcome
    const g: GameRecord = { seed, seat, power: s.boards[seat].power, win: o?.result === 'win', reason: o?.result === 'loss' ? o.reason : null, turns: s.turn, deck0, left: s.deck.length, samples, started }
    out.push(g)
    w?.games.push(g)
  }
  w?.write({ schema: schemaJson().hash, missing: 0, iter: t.iter ?? 0 })
  return out
}

function arg(name: string, def: string): string {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1]! : def
}

async function main(): Promise<void> {
  const n = Number(arg('workers', '18'))
  const file = fileURLToPath(import.meta.url)
  const workers = Array.from({ length: n }, () => new Worker(file, { workerData: null }))
  const run = (wk: Worker, t: Task) =>
    new Promise<GameRecord[]>((resolve, reject) => {
      const onMsg = (m: { ok: boolean; games?: GameRecord[]; error?: string }) => {
        wk.off('message', onMsg)
        if (m.ok) resolve(m.games!)
        else reject(new Error(m.error))
      }
      wk.on('message', onMsg)
      wk.postMessage(t)
    })
  const reply = (x: unknown) => process.stdout.write(`@@${JSON.stringify(x)}\n`)
  const rl = readline.createInterface({ input: process.stdin })
  for await (const line of rl) {
    if (!line.trim()) continue
    let cmd: Task & { cmd: string }
    try {
      cmd = JSON.parse(line)
    } catch {
      reply({ error: 'bad json' })
      continue
    }
    if (cmd.cmd === 'quit') break
    const t0 = Date.now()
    try {
      if (cmd.out) fs.mkdirSync(cmd.out, { recursive: true })
      const parts = await Promise.all(
        workers.map((wk, k) => {
          const seeds = cmd.seeds.filter((_, i) => i % n === k)
          if (seeds.length === 0) return Promise.resolve([])
          return run(wk, { ...cmd, seeds, shard: cmd.out ? path.join(cmd.out, `shard-${String(k).padStart(2, '0')}`) : undefined })
        }),
      )
      const games = parts.flat()
      const reasons: Record<string, number> = {}
      const byMonk: Record<string, [number, number]> = {}
      for (const g of games) {
        reasons[g.reason ?? 'win'] = (reasons[g.reason ?? 'win'] ?? 0) + 1
        const m = (byMonk[`${g.seat}/${g.power}`] ??= [0, 0])
        m[1]++
        if (g.win) m[0]++
      }
      const mean = (f: (g: GameRecord) => number) => games.reduce((a, g) => a + f(g), 0) / Math.max(1, games.length)
      reply({
        games: games.length,
        wins: games.filter((g) => g.win).length,
        samples: games.reduce((a, g) => a + g.samples, 0),
        turns: mean((g) => g.turns),
        progress: mean((g) => (g.win ? 1 : (g.deck0 - g.left) / g.deck0)),
        reasons,
        byMonk: Object.fromEntries(Object.entries(byMonk).sort().map(([k, [w, t]]) => [k, `${w}/${t}`])),
        gamesStarted: games.filter((g) => g.started).length,
        winsStarted: games.filter((g) => g.started && g.win).length,
        winsFull: games.filter((g) => !g.started && g.win).length,
        seconds: (Date.now() - t0) / 1000,
      })
    } catch (e) {
      reply({ error: String(e) })
    }
  }
  await Promise.all(workers.map((w) => w.terminate()))
}

if (isMainThread) await main()
else {
  parentPort!.on('message', (t: Task) => {
    try {
      parentPort!.postMessage({ ok: true, games: runTask(t) })
    } catch (e) {
      parentPort!.postMessage({ ok: false, error: e instanceof Error ? `${e.message}\n${e.stack}` : String(e) })
    }
  })
  void workerData
}
