// Regenerate src/ai/nn/fixtures/parity.json: the TypeScript encoder writes
// sample positions, PyTorch (training/parity.py) runs a small random network
// on them, and model.test.ts checks the TypeScript forward pass matches.
//   npm run nn:parity        (needs training/.venv, see training/README.md)
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { bundle } from './ts.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const samples = path.join(root, 'node_modules/.cache/nn/parity-samples.json')
const fixture = path.join(root, 'src/ai/nn/fixtures/parity.json')
fs.mkdirSync(path.dirname(fixture), { recursive: true })

const entry = await bundle('scripts/nn/parity-samples.ts')
process.argv = [process.argv[0], entry, samples]
await import(pathToFileURL(entry).href)

const venv = process.platform === 'win32' ? 'training/.venv/Scripts/python.exe' : 'training/.venv/bin/python'
const python = process.env.TRAIN_PYTHON ?? path.join(root, venv)
execFileSync(python, [path.join(root, 'training/parity.py'), samples, fixture], { stdio: 'inherit' })
