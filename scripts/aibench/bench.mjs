// AI self-play benchmark / tuning harness.
//
//   node scripts/aibench/bench.mjs --setups init4,norm4 --seeds 1-40 [--variant cur|orig] [--workers 16] [--over '{"W.x":1}'] [--json out.json]
//
// Bundles scripts/aibench/entry.ts with esbuild (into node_modules/.cache, so
// nothing lands in the repo) and plays the games in worker threads.
import { build } from 'esbuild'
import { Worker } from 'node:worker_threads'
import path from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '../..')
const cache = path.join(root, 'node_modules/.cache/aibench')

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : def
}
function parseSeeds(spec) {
  const out = []
  for (const part of spec.split(',')) {
    const [a, b] = part.split('-').map(Number)
    if (b === undefined) out.push(a)
    else for (let x = a; x <= b; x++) out.push(x)
  }
  return out
}

export async function bundle(variant) {
  const outfile = path.join(cache, `bundle-${variant.replace(/[^a-zA-Z0-9]+/g, '_')}.mjs`)
  const aiDir = variant === 'orig' ? path.join(cache, 'orig/ai') : variant === 'cur' ? path.join(root, 'src/ai') : path.resolve(variant)
  const plugin = {
    name: 'alias',
    setup(b) {
      b.onResolve({ filter: /^@\// }, (args) => {
        let p = args.path.slice(2)
        if (p === 'ai/tuning' && variant === 'orig') return { path: path.join(cache, 'orig/tuning-stub.ts') }
        if (p.startsWith('ai/')) p = path.join(aiDir, p.slice(3))
        else p = path.join(root, 'src', p)
        for (const ext of ['.ts', '.tsx', '/index.ts']) if (fs.existsSync(p + ext)) return { path: p + ext }
        return { path: p }
      })
    },
  }
  await build({
    entryPoints: [path.join(here, 'entry.ts')],
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile,
    plugins: [plugin],
    logLevel: 'error',
    sourcemap: 'inline',
  })
  return outfile
}

export async function runJobs(bundleFile, jobs, workers, overrides) {
  const results = []
  let next = 0
  const workerSrc = `
    import { parentPort, workerData } from 'node:worker_threads'
    const mod = await import(workerData.url)
    parentPort.on('message', (job) => {
      try { parentPort.postMessage({ ok: true, r: mod.playGame(job.setup, job.seed, workerData.over) }) }
      catch (e) { parentPort.postMessage({ ok: false, job, err: String(e && e.stack || e) }) }
    })
  `
  const n = Math.min(workers, jobs.length)
  await Promise.all(
    Array.from({ length: n }, () => new Promise((resolve, reject) => {
      const w = new Worker(workerSrc, { eval: true, workerData: { url: pathToFileURL(bundleFile).href, over: overrides } })
      const feed = () => {
        if (next >= jobs.length) { w.terminate(); resolve(); return }
        w.postMessage(jobs[next++])
      }
      w.on('message', (m) => {
        if (m.ok) results.push(m.r)
        else { console.error('JOB FAILED', JSON.stringify(m.job), m.err); results.push({ ...m.job, win: false, reason: 'ERROR', turns: 0, decisions: 0, totalMs: 0, maxMs: 0, slow: 0 }) }
        feed()
      })
      w.on('error', reject)
      feed()
    })),
  )
  return results
}

export function summarize(results) {
  const by = new Map()
  for (const r of results) {
    if (!by.has(r.setup)) by.set(r.setup, [])
    by.get(r.setup).push(r)
  }
  const lines = []
  for (const [setup, rs] of by) {
    const wins = rs.filter((r) => r.win).length
    const turns = rs.reduce((n, r) => n + r.turns, 0) / rs.length
    const prog = rs.reduce((n, r) => n + (r.win ? 1 : r.drawn / r.deck0), 0) / rs.length
    const dec = rs.reduce((n, r) => n + r.decisions, 0)
    const ms = rs.reduce((n, r) => n + r.totalMs, 0)
    const max = Math.max(...rs.map((r) => r.maxMs))
    const slow = rs.reduce((n, r) => n + r.slow, 0)
    const reasons = {}
    for (const r of rs) reasons[r.reason] = (reasons[r.reason] ?? 0) + 1
    lines.push(
      `${setup.padEnd(7)} wins ${String(wins).padStart(3)}/${rs.length} (${((100 * wins) / rs.length).toFixed(1)}%)  turns ${turns.toFixed(1)}  prog ${prog.toFixed(3)}  avg ${(ms / dec).toFixed(1)}ms  max ${max.toFixed(0)}ms  >500ms ${slow}  ${JSON.stringify(reasons)}`,
    )
  }
  return lines.join('\n')
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let variant = arg('variant', 'cur')
  // --snap NAME: freeze a copy of src/ai (made once) so later edits don't leak into a batch.
  const snap = arg('snap')
  if (snap) {
    const dir = path.join(cache, 'snap-' + snap)
    if (!fs.existsSync(dir)) fs.cpSync(path.join(root, 'src/ai'), path.join(dir, 'ai'), { recursive: true })
    variant = path.join(dir, 'ai')
  }
  const setups = arg('setups', 'init4').split(',')
  const seeds = parseSeeds(arg('seeds', '1-40'))
  const workers = Number(arg('workers', String(Math.max(1, os.cpus().length - 2))))
  const over = arg('over') ? JSON.parse(arg('over')) : undefined
  const t0 = Date.now()
  const file = await bundle(variant)
  const jobs = setups.flatMap((setup) => seeds.map((seed) => ({ setup, seed })))
  const results = await runJobs(file, jobs, workers, over)
  console.log(summarize(results))
  console.log(`(${jobs.length} games, ${((Date.now() - t0) / 1000).toFixed(1)}s, variant ${variant})`)
  const out = arg('json')
  if (out) fs.writeFileSync(out, JSON.stringify(results))
}
