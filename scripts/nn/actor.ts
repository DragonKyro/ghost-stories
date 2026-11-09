// Self-play actors for reinforcement learning (driven by training/rl.py).
//
//   node scripts/nn/ts.mjs scripts/nn/actor.ts --workers 18
//
// A long-running process with persistent worker threads. It reads one JSON
// command per line on stdin and answers each with one line on stdout that
// starts with "@@":
//   {"cmd":"play","weights":"…json","out":"dir","iter":3,"captures":2,"danger":{…},
//    "games":[{"seed":…,"seat":"blue","power":"heavenlyGust"},
//             {"seed":…,"seat":…,"power":…,"deck0":30,"phase":"mid","state":{…}}, …]}
//       the network plays those solo games, sampling its moves from its policy:
//       from the start, or from the given position (its unseen cards and dice
//       re-dealt). Every decision is written to shards in `out`
//       (scripts/nn/shard.ts: the policy's log-probability of the move taken,
//       minus the danger score and its Qi and haunting parts — ai/nn/danger.ts
//       with the optional "danger" weights). `captures` positions per game (the
//       start of a Yang phase, picked at random) go to out/captures-NN.jsonl for
//       the trainer's start bank, tagged with their game phase (ai/nn/phase.ts).
//       games.json records each game's monk, result, start phase and end phase.
//       → {"games","wins","samples","turns","progress","reasons","byMonk","lossPhase", …}
//   {"cmd":"eval","weights":"…json","seeds":[…],"temp":0.75}
//       evaluation setups (seat = seed % 4, power sides random), sampling at
//       `temp` (or the most likely move without it). → the same summary
//   {"cmd":"eval","weights":"…json","games":[{"seed":…,"seat":…,"power":…}, …],"temp":0.75}
//       the same, as the given monks (a specialist's play-tests)
//   {"cmd":"quit"}

import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { fileURLToPath } from 'node:url'
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads'
import { chooseAction } from '@/ai/index'
import { DANGER, dangerParts, type DangerWeights } from '@/ai/nn/danger'
import { nnDecide } from '@/ai/nn/index'
import { Net, type WeightsFile } from '@/ai/nn/model'
import { gamePhase, type GamePhase } from '@/ai/nn/phase'
import { PROMPT_KIND, schemaJson } from '@/ai/nn/schema'
import { hash, sanitize } from '@/ai/sim'
import { applyAction, createGame, waitingFor } from '@/game/engine'
import type { Color, GameState, PowerId } from '@/game/types'
import { COLORS } from '@/game/types'
import { evalConfig, monkConfig } from './configs'
import { ShardWriter } from './shard'

interface GameSpec {
  seed: number
  seat: Color
  power: PowerId
  /** A start position (from an earlier game), with its game's starting deck size and phase. */
  state?: GameState
  deck0?: number
  phase?: GamePhase
}

interface Task {
  cmd: 'play' | 'eval'
  weights: string
  /** eval: evaluation setups (seat = seed % 4, power sides random) */
  seeds?: number[]
  /** play, or eval as given monks */
  games?: GameSpec[]
  out?: string
  iter?: number
  shard?: string
  captureFile?: string
  captures?: number
  /** Danger-hint weights (src/ai/nn/danger.ts); missing ones keep their defaults. */
  danger?: Partial<DangerWeights>
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
  /** The phase the game started in (null: from the beginning) and the one it ended in. */
  startPhase: GamePhase | null
  endPhase: GamePhase
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

function pick(probs: Float32Array, rand: () => number, temp: number): number {
  const p = temp === 1 ? Array.from(probs) : Array.from(probs, (q) => Math.pow(q, 1 / temp))
  let u = rand() * p.reduce((x, y) => x + y, 0)
  for (let j = 0; j < p.length; j++) {
    u -= p[j]!
    if (u <= 0) return j
  }
  return p.length - 1
}

function runTask(t: Task): GameRecord[] {
  const net = loadNet(t.weights)
  const play = t.cmd === 'play'
  const w = play ? new ShardWriter(t.shard!) : null
  const dw: DangerWeights = { ...DANGER, ...(t.danger ?? {}) }
  // Given games are played as their monk; bare eval seeds use the evaluation setups.
  const asMonk = !!t.games
  const specs: GameSpec[] = t.games ?? t.seeds!.map((seed) => ({ seed, seat: COLORS[seed % 4]!, power: 'danceOfTheSpires' as PowerId }))
  const captureLines: string[] = []
  const out: GameRecord[] = []
  for (const g of specs) {
    const seed = g.seed
    const seat = g.seat
    let s: GameState
    let deck0: number
    if (g.state) {
      s = sanitize(g.state, hash(seed, (t.iter ?? 0) + 7))
      deck0 = g.deck0!
    } else {
      s = createGame(asMonk ? monkConfig(seed, seat, g.power) : evalConfig(seed, 'normal'))
      deck0 = s.deck.length
    }
    const rand = rng(hash(seed, (t.iter ?? 0) + 1))
    // Reservoir of start-of-Yang positions to capture.
    const want = play ? (t.captures ?? 0) : 0
    const reservoir: Array<{ s: GameState; phase: GamePhase }> = []
    let eligible = 0
    let samples = 0
    for (let i = 0; i < 6000 && s.phase !== 'gameOver'; i++) {
      const who = waitingFor(s)!
      let a
      if (who === seat) {
        if (want > 0 && !s.prompt && s.phase === 'yang' && s.yang && !s.yang.moved && s.yang.helps + s.yang.exorcisms === 0) {
          eligible++
          const entry = { s, phase: gamePhase(s, deck0) }
          if (reservoir.length < want) reservoir.push(entry)
          else {
            const j = Math.floor(rand() * eligible)
            if (j < want) reservoir[j] = entry
          }
        }
        const d = nnDecide(net, s, who)!
        let k = 0
        if (d.actions.length > 1) {
          if (play || t.temp) k = pick(d.probs, rand, play ? 1 : t.temp!)
          else for (let j = 1; j < d.probs.length; j++) if (d.probs[j]! > d.probs[k]!) k = j
        }
        a = d.actions[k]!
        if (w && !d.heuristic) {
          const kind = s.prompt ? 1 + PROMPT_KIND[s.prompt.kind] : 0
          const p = dangerParts(s, seat, dw)
          w.add(d.enc, d.cands, k, seed, kind, Math.log(Math.max(1e-30, d.probs[k]!)), -(p.haunt + p.qi + p.clock), -p.qi, -p.haunt)
          samples++
        }
      } else a = chooseAction(s, who)!
      s = applyAction(s, a)
    }
    const o = s.outcome
    const rec: GameRecord = {
      seed,
      seat,
      power: s.boards[seat].power,
      win: o?.result === 'win',
      reason: o?.result === 'loss' ? o.reason : null,
      turns: s.turn,
      deck0,
      left: s.deck.length,
      samples,
      started: !!g.state,
      startPhase: g.state ? (g.phase ?? null) : null,
      endPhase: gamePhase(s, deck0),
    }
    out.push(rec)
    w?.games.push(rec)
    for (const c of reservoir) captureLines.push(JSON.stringify({ seat, power: rec.power, deck0, phase: c.phase, state: { ...c.s, events: [] } }))
  }
  w?.write({ schema: schemaJson().hash, missing: 0, iter: t.iter ?? 0 })
  if (t.captureFile && captureLines.length) fs.writeFileSync(t.captureFile, captureLines.join('\n') + '\n')
  return out
}

function arg(name: string, def: string): string {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1]! : def
}

function summarize(games: GameRecord[], seconds: number): Record<string, unknown> {
  const reasons: Record<string, number> = {}
  const byMonk: Record<string, [number, number]> = {}
  const lossPhase: Record<string, number> = { early: 0, mid: 0, late: 0 }
  const started: Record<string, [number, number]> = {}
  for (const g of games) {
    reasons[g.reason ?? 'win'] = (reasons[g.reason ?? 'win'] ?? 0) + 1
    const m = (byMonk[`${g.seat}/${g.power}`] ??= [0, 0])
    m[1]++
    if (g.win) m[0]++
    if (!g.win && !g.started) lossPhase[g.endPhase]!++
    if (g.started) {
      const p = (started[g.startPhase ?? 'early'] ??= [0, 0])
      p[1]++
      if (g.win) p[0]++
    }
  }
  const mean = (f: (g: GameRecord) => number) => games.reduce((a, g) => a + f(g), 0) / Math.max(1, games.length)
  const fmt = (r: Record<string, [number, number]>) => Object.fromEntries(Object.entries(r).sort().map(([k, [w, t]]) => [k, `${w}/${t}`]))
  return {
    games: games.length,
    wins: games.filter((g) => g.win).length,
    samples: games.reduce((a, g) => a + g.samples, 0),
    turns: mean((g) => g.turns),
    progress: mean((g) => (g.win ? 1 : (g.deck0 - g.left) / g.deck0)),
    reasons,
    byMonk: fmt(byMonk),
    lossPhase,
    gamesStarted: games.filter((g) => g.started).length,
    winsStarted: games.filter((g) => g.started && g.win).length,
    winsFull: games.filter((g) => !g.started && g.win).length,
    startedByPhase: fmt(started),
    seconds,
  }
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
  const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity })
  for await (const line of rl) {
    if (!line.trim()) continue
    let cmd: Task
    try {
      cmd = JSON.parse(line) as Task
    } catch {
      reply({ error: 'bad json' })
      continue
    }
    if ((cmd.cmd as string) === 'quit') break
    const t0 = Date.now()
    try {
      if (cmd.out) fs.mkdirSync(cmd.out, { recursive: true })
      const parts = await Promise.all(
        workers.map((wk, k) => {
          const shard = cmd.out ? path.join(cmd.out, `shard-${String(k).padStart(2, '0')}`) : undefined
          const captureFile = cmd.out ? path.join(cmd.out, `captures-${String(k).padStart(2, '0')}.jsonl`) : undefined
          if (cmd.cmd === 'play') {
            const games = (cmd.games ?? []).filter((_, i) => i % n === k)
            return games.length ? run(wk, { ...cmd, games, shard, captureFile }) : Promise.resolve([])
          }
          if (cmd.games) {
            const games = cmd.games.filter((_, i) => i % n === k)
            return games.length ? run(wk, { ...cmd, games }) : Promise.resolve([])
          }
          const seeds = (cmd.seeds ?? []).filter((_, i) => i % n === k)
          return seeds.length ? run(wk, { ...cmd, seeds }) : Promise.resolve([])
        }),
      )
      reply(summarize(parts.flat(), (Date.now() - t0) / 1000))
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
