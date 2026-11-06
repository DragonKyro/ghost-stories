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

## Next

1. Data: the search AI plays solo Normal (any monk) in Node workers and writes
   encoded positions + its per-action preferences + the game result to
   `training/data/` (packed, not padded: Yang decisions average 104 legal actions
   and reach ~400).
2. Imitation: train the network on that; check it beats the quick policy alone.
3. Expert iteration: search guided by the network's policy and value; retrain on
   its games; keep a new network only if it wins more on held-out seeds.
