// Bundle a TypeScript entry that imports from src/ (with the @/ alias) and run it.
//   node scripts/nn/ts.mjs scripts/nn/<entry>.ts [args…]
// The bundle goes to node_modules/.cache/nn/<checkout>, so nothing lands in the
// repo, and two checkouts sharing one node_modules (a git worktree with a
// linked node_modules) never run each other's bundles.
import { build } from 'esbuild'
import { createHash } from 'node:crypto'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const checkout = createHash('sha1').update(root.toLowerCase()).digest('hex').slice(0, 8)
const cache = path.join(root, 'node_modules/.cache/nn', checkout)

export async function bundle(entry) {
  fs.mkdirSync(cache, { recursive: true })
  const outfile = path.join(cache, path.basename(entry).replace(/\.ts$/, '.mjs'))
  const alias = {
    name: 'alias',
    setup(b) {
      b.onResolve({ filter: /^@\// }, (args) => {
        const p = path.join(root, 'src', args.path.slice(2))
        for (const ext of ['.ts', '.tsx', '/index.ts']) if (fs.existsSync(p + ext)) return { path: p + ext }
        return { path: p }
      })
    },
  }
  await build({ entryPoints: [path.resolve(root, entry)], bundle: true, format: 'esm', platform: 'node', outfile, plugins: [alias], logLevel: 'error', sourcemap: 'inline' })
  return outfile
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const [entry, ...rest] = process.argv.slice(2)
  const out = await bundle(entry)
  process.argv = [process.argv[0], out, ...rest]
  await import(pathToFileURL(out).href)
}
