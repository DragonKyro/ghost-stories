// Coordinate search over AI weights by self-play.
//
//   node scripts/aibench/tune.mjs --setups init4,init1,norm4 --seeds 1-300 --params W.ghostBase,W.tao [--base '{...}'] [--steps 0.6,1.5]
//
// Objective: mean over games of (win ? 1 + winBonus : cards drawn / deck size).
import { bundle, runJobs } from './bench.mjs'
import os from 'node:os'
import fs from 'node:fs'
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : d }
const seeds = []; for (const p of arg('seeds', '1-300').split(',')) { const [a, b] = p.split('-').map(Number); if (b === undefined) seeds.push(a); else for (let x = a; x <= b; x++) seeds.push(x) }
const setups = arg('setups', 'init4').split(',')
const params = arg('params', '').split(',').filter(Boolean)
const steps = arg('steps', '0.6,1.6').split(',').map(Number)
const winBonus = Number(arg('winBonus', '1'))
const rounds = Number(arg('rounds', '2'))
const eps = Number(arg('eps', '0.002'))
const workers = Number(arg('workers', String(os.cpus().length - 2)))
let base = arg('base') ? JSON.parse(arg('base')) : {}
const file = await bundle('cur')
const jobs = setups.flatMap((setup) => seeds.map((seed) => ({ setup, seed })))

// Default values of the parameters (read from the bundle).
const mod = await import((await import('node:url')).pathToFileURL(file).href)
const defaults = {}
for (const p of params) {
  const [obj, key] = p.split('.')
  const v = (obj === 'W' ? mod.WEIGHTS_ : mod.SEARCH_)?.[key]
  defaults[p] = v
}

async function score(over) {
  const rs = await runJobs(file, jobs, workers, over)
  let tot = 0, wins = 0
  for (const r of rs) { tot += r.win ? 1 + winBonus : r.drawn / r.deck0; if (r.win) wins++ }
  return { obj: tot / rs.length, wins: wins / rs.length }
}
const fmt = (o) => JSON.stringify(o)
let cur = await score(base)
console.log(`base ${cur.obj.toFixed(4)} wins ${(cur.wins * 100).toFixed(1)}%  ${fmt(base)}`)
for (let round = 0; round < rounds; round++) {
  for (const p of params) {
    const v0 = base[p] ?? defaults[p]
    if (typeof v0 !== 'number') { console.log(`skip ${p} (${v0})`); continue }
    let improved = false
    for (const m of steps) {
      const v = Math.round(v0 * m * 1000) / 1000
      const trial = { ...base, [p]: v }
      const r = await score(trial)
      const better = r.obj > cur.obj + eps
      console.log(`  ${p}=${v} -> ${r.obj.toFixed(4)} wins ${(r.wins * 100).toFixed(1)}% ${better ? '*' : ''}`)
      if (better) { base = trial; cur = r; improved = true; break }
    }
    if (improved) console.log(`accept ${p}=${base[p]}  obj ${cur.obj.toFixed(4)}`)
  }
  console.log(`round ${round} done: ${cur.obj.toFixed(4)} wins ${(cur.wins * 100).toFixed(1)}%  ${fmt(base)}`)
  fs.writeFileSync('node_modules/.cache/aibench/tune-last.json', fmt(base))
}
