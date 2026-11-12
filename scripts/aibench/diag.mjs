// node scripts/aibench/diag.mjs --setups init4 --seeds 1-100 [--variant orig]
import { bundle } from './bench.mjs'
import { Worker } from 'node:worker_threads'
import { pathToFileURL } from 'node:url'
import os from 'node:os'
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : d }
const seeds = []; for (const p of arg('seeds', '1-100').split(',')) { const [a, b] = p.split('-').map(Number); if (b === undefined) seeds.push(a); else for (let x = a; x <= b; x++) seeds.push(x) }
const setups = arg('setups', 'init4').split(',')
const over = arg('over') ? JSON.parse(arg('over')) : undefined
const file = await bundle(arg('variant', 'cur'))
const jobs = setups.flatMap((setup) => seeds.map((seed) => ({ setup, seed })))
const src = `import { parentPort, workerData } from 'node:worker_threads'; const m = await import(workerData.url); parentPort.on('message', (j) => parentPort.postMessage({ setup: j.setup, t: m.diagnose(j.setup, j.seed, workerData.over) }))`
const totals = {}
let next = 0
await Promise.all(Array.from({ length: Math.min(os.cpus().length - 2, jobs.length) }, () => new Promise((res) => {
  const w = new Worker(src, { eval: true, workerData: { url: pathToFileURL(file).href, over } })
  const feed = () => { if (next >= jobs.length) { w.terminate(); res(); } else w.postMessage(jobs[next++]) }
  w.on('message', (m) => { const T = (totals[m.setup] ??= {}); for (const [k, v] of Object.entries(m.t)) T[k] = (T[k] ?? 0) + v; feed() })
  feed()
})))
for (const [setup, T] of Object.entries(totals)) {
  console.log(`== ${setup} (per game, ${seeds.length} games)`)
  for (const [k, v] of Object.entries(T).sort()) console.log(`  ${k.padEnd(40)} ${(v / seeds.length).toFixed(2)}`)
}
