# Neural-network training

The network that plays the Taoists. Self-play and encoding run in Node (the
rules engine and encoder are TypeScript, in `src/`); training runs here, in
PyTorch. The web app only ever loads finished weights and runs the forward
pass (`src/ai/nn/model.ts`).

## Setup

PyTorch with CUDA is large and this network resets downloads from public
PyPI, so the venv is built on top of an existing PyTorch install:

```sh
# from the repo root; any Python 3.11 that already has torch (+ CUDA) and numpy
/c/ProgramData/anaconda3/envs/train/python.exe -m venv --system-site-packages training/.venv
training/.venv/Scripts/python -c "import torch; print(torch.__version__, torch.cuda.is_available())"
```

On a machine with open internet: `python -m venv training/.venv` then
`training/.venv/Scripts/pip install -r training/requirements.txt` (CUDA builds:
`--index-url https://download.pytorch.org/whl/cu124`). Set `TRAIN_PYTHON` to use
another interpreter. `training/.venv`, `training/data/` and `training/runs/` are
gitignored.

## What's here

- `nn/model.py` — `GhostNet`, the same network as `src/ai/nn/model.ts`
  (tensor names match; weights move between the two as JSON, `nn/weights.py`).
- `nn/data.py` — encoded samples → batched tensors.
- `parity.py` — makes `src/ai/nn/fixtures/parity.json`; `model.test.ts` checks the
  TypeScript forward pass matches PyTorch on it. **Run `npm run nn:parity` after
  any encoder change** (the test fails with the schema hash otherwise).
- `smoke.py` — forward + backward on the GPU, prints samples/s.

## The network

Input: the state as up to 81 tokens in the deciding Taoist's frame (they sit at
seat 0; colours and positions turn with the table), from `src/ai/nn/encode.ts`:

| Token | Slots | Features |
|---|---|---|
| global | 1 | 227 |
| prompt | 1 | 280 |
| seat (board + Taoist) | 4 | 73 |
| village tile | 9 | 66 |
| ghost space | 12 | 239 |
| White Moon family | 12 | 22 |
| catacomb space | 9 | 24 |
| demon | 3 | 23 |
| curse token | 24 | 32 |
| Bloody Mantra | 6 | 14 |

The base game uses the first 27 tokens (4,261 numbers); both expansions, all 81
(5,662). Plus a relation id per token pair (24 kinds: adjacency, the tile a
space faces, its line, same board, who stands where, …) that each attention head
turns into a learned bias.

Outputs: a logit per legal action (every action the rules allow, with every
parameter — `src/ai/nn/legal.ts`; each action is 144 features plus pointers to up
to 8 tokens it involves), and a value head: P(win), the fraction of the deck the
game gets through, and the outcome class (win / all dead / third haunting / deck
exhausted / villagers).

Default size: d = 64, 4 heads, 3 layers, FFN 128 → 234k parameters (d = 128,
8 heads, 4 layers → 903k). On the RTX A2000, base-game batches train at about
4,000 samples/s (d = 64) / 2,000 samples/s (d = 128).

## Imitation training (phase 1)

```sh
# 1. Data: the search AI plays solo games (seat = seed % 4, power side = seed / 4 % 2);
#    every decision of the player is recorded. ~10 min for 10k games on 18 workers.
node scripts/nn/ts.mjs scripts/nn/gen.ts --games 10000 --start 100000 --workers 18 --out training/data/solo-normal-v1 --dump 8
# 2. Check the pipeline (packed == padded forward; shards == encoder output).
training/.venv/Scripts/python training/selftest.py training/data/solo-normal-v1
# 3. Train (progress every 100 updates; checkpoints + background play-tests every 1000).
training/.venv/Scripts/python training/train.py --data training/data/solo-normal-v1 --run training/runs/bc-v1
# 4. Play-test any checkpoint, or the baselines, on the evaluation seeds (7001-7300).
node scripts/nn/ts.mjs scripts/nn/eval.ts --weights training/runs/bc-v1/step-5000.json
node scripts/nn/ts.mjs scripts/nn/eval.ts --policy quick      # or search
```

- Shards (`scripts/nn/shard.ts`) are sparse and columnar: ~2.7 KB per decision;
  `nn/dataset.py` loads them onto the GPU and assembles each batch there
  (dense state, relations, candidates packed back to back — no padding).
- Validation is whole held-out games (seed % 25 == 0). The progress line shows
  policy loss / agreement with the teacher (overall, Yang steps, ghost
  placement, exorcism commits), value BCE / Brier / AUC / calibration, and
  samples per second.
- Seeds 7001-7300 are the evaluation seeds (the same setups the search AI was
  benchmarked on); `gen.ts` refuses to train on them.

## Results

**bc-v1** (2026-11-06): imitation of the search AI on 10,000 solo Normal games
(827k decisions, all 7 monk/power combinations), d = 64 / 3 layers (234k params),
5,000 updates × 256 (1.6 epochs), 8.5 min on the RTX A2000.

- Held-out agreement with the teacher: 84.1% (Yang steps 81.9%, ghost placement
  99.0%, exorcism commits 93.3%); train and held-out loss stayed equal (no overfitting).
- Value head: AUC 0.85, calibrated (mean prediction 0.208 vs 0.198 actual).
- Network alone (argmax, no search), 300 eval games: 0.7% → 3.0% → 2.7% → 3.7% →
  2.3% at updates 1k–5k; 56.7 turns, 52% of the deck. Quick policy: 2.0%, 47.1
  turns, 44%. Search AI (teacher): 14.3%, 60.9 turns, 61%.
- `scripts/nn/diagnose.ts`: the misses are mostly moves (73% agreement; where the
  teacher's search matters most — red with the Dance of the Spires, who can fly
  anywhere, won 1/75), Tao colour picks (12–27%, mostly ties the teacher breaks in
  a fixed colour order the network can't see), and rare Yin-Yang remote helps.

So the network has learnt a sound value function and a policy that survives
longer than the quick policy, but playing alone it doesn't win more; the search
is what wins. Next is putting the network inside the search.

## Next

1. Expert iteration: search guided by the network's policy and value; retrain on
   its games; keep a new network only if it wins more on held-out seeds.
