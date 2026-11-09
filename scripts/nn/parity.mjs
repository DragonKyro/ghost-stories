// Regenerate src/ai/nn/fixtures/parity.json: the TypeScript encoder writes
// sample positions, PyTorch (training/parity.py) runs a small random network
// on them, and model.test.ts checks the TypeScript forward pass matches.
//   npm run nn:parity        (needs a Python with torch: TRAIN_PYTHON, else the conda env `train`, else the
//                             active conda env; see training/README.md)
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

// TRAIN_PYTHON, else the conda env `train`, else the active conda env, else whatever `python` is.
const condaTrain = 'C:/ProgramData/anaconda3/envs/train/python.exe'
const fromPrefix = process.env.CONDA_PREFIX ? path.join(process.env.CONDA_PREFIX, process.platform === 'win32' ? 'python.exe' : 'bin/python') : null
const python = process.env.TRAIN_PYTHON ?? (fs.existsSync(condaTrain) ? condaTrain : fromPrefix && fs.existsSync(fromPrefix) ? fromPrefix : 'python')
execFileSync(python, [path.join(root, 'training/parity.py'), samples, fixture], { stdio: 'inherit' })
