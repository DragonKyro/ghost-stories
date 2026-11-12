# Neural-network training

The network that plays the Taoists. Self-play and encoding run in Node (the
rules engine and encoder are TypeScript, in `src/`); training runs here, in
PyTorch. The web app only ever loads finished weights and runs the forward
pass (`src/ai/nn/model.ts`).

## Setup

Training runs with the conda env `train` (Python 3.11, PyTorch 2.13 with CUDA, numpy) directly —
no virtualenv:

```sh
conda activate train            # or call /c/ProgramData/anaconda3/envs/train/python.exe directly
python -c "import torch; print(torch.__version__, torch.cuda.is_available())"
```

`npm run nn:parity` finds it by itself (`TRAIN_PYTHON`, else that env, else the active conda env).
On another machine, any Python with `pip install -r training/requirements.txt` (CUDA builds:
`--index-url https://download.pytorch.org/whl/cu124`). `training/data/` and `training/runs/` are
gitignored.

## What's here

- `nn/model.py` — `GhostNet`, the same network as `src/ai/nn/model.ts`
  (tensor names match; weights move between the two as JSON, `nn/weights.py`).
- `nn/data.py` — encoded samples → batched tensors.
- `parity.py` — makes `src/ai/nn/fixtures/parity.json`; `model.test.ts` checks the
  TypeScript forward pass matches PyTorch on it. **Run `npm run nn:parity` after
  any encoder change** (the test fails with the schema hash otherwise).
- `nn/dataset.py` — sparse shards (`scripts/nn/shard.ts`) → GPU-resident batches.
- `migrate.py` — brings a checkpoint or weights file to the current encoder schema without changing
  how it plays: input layers get zero columns for new features (matched by field name from schema
  version 2 on; version 1's columns are the first ones of each layout, as fields are only appended),
  AdamW moments likewise, then a check that old and new give the same outputs. Token types, slots,
  relations and pointers must stay the same (anything else needs retraining).
- `rl.py` — self-play PPO from a checkpoint (see "Continuing training"); `nn/curriculum.py` — which
  monk each self-play game is, where it starts, how the danger hint is split (checked by
  `test_curriculum.py`); `train.py` — supervised
  training on shards (policy cross-entropy + value), the tool for warm-starting a new network
  by imitating data; `selftest.py` — checks the shard pipeline; `smoke.py` — forward + backward
  on the GPU, prints samples/s.
- `scripts/nn/`: `actor.ts` (the self-play server `rl.py` drives), `eval.ts` (play-test any
  checkpoint on fixed seeds, any setup: `--setup norm4`, `--sample --temp 0.75`, `--attempts 16`),
  `qi.ts` (where the Qi goes, how turns are used, per monk), `gen.ts` (shards of the rules-based AI's
  games), `diagnose.ts` (where the network disagrees with that AI), `configs.ts`, `shard.ts`.
- The weights the game uses: a specialist per monk, `src/ai/nn/weights/<seat>-<power>.json` (round 3,
  below), and `ghost-net-v1.json`, the shared 50k network (the fallback for a monk without one, and
  the reference the specialists are compared with; its training checkpoints are gone).

## The network

Input: the state as up to 81 tokens in the deciding Taoist's frame (they sit at
seat 0; colours and positions turn with the table), from `src/ai/nn/encode.ts`:

| Token | Slots | Features |
|---|---|---|
| global | 1 | 227 |
| prompt | 1 | 280 |
| seat (board + Taoist) | 4 | 73 |
| village tile | 9 | 71 |
| ghost space | 12 | 242 |
| White Moon family | 12 | 22 |
| catacomb space | 9 | 24 |
| demon | 3 | 23 |
| curse token | 24 | 32 |
| Bloody Mantra | 6 | 14 |

The base game uses the first 27 tokens (4,342 numbers); both expansions, all 81
(5,743). Plus a relation id per token pair (24 kinds: adjacency, the tile a
space faces, its line, same board, who stands where, …) that each attention head
turns into a learned bias.

**Dice maths as inputs** (schema version 2, `src/ai/nn/calc.ts`): the exact chance an exorcism
succeeds and the Tao it costs, from every outcome of the Tao dice (white faces, the Gods' Favorite
reroll, Strength of the Mountain's fourth die, tokens of the Taoists on the tile, crystals, the Circle
of Prayer and the Mantra). Each ghost space: the deciding Taoist's chance from the tile facing it,
by the dice alone, and the expected Tao spent; each tile: the best one-ghost chance from there and,
on a corner, both ghosts / at least one; each candidate: an exorcism's chance (all / any / dice
alone / expected spend), a move's best chance at the destination (and where it stands now), the Gods'
Favorite reroll's chance after rerolling those dice (and as they are), the Mantra's chance on that
ghost (and without), Bottomless Pockets' best chance this turn with that token (and without). The
network still has to learn whether a chance is worth taking — Tao, Qi, turns — just not the dice.
`calc.test.ts` checks the numbers against `src/ai/prob.ts` and, roll by roll, the engine's cheapest
spend.

Outputs: a logit per legal action (every action the rules allow, with every
parameter — `src/ai/nn/legal.ts`; each action is 151 features plus pointers to up
to 8 tokens it involves), and a value head: P(win), the fraction of the deck the
game gets through, and the outcome class (win / all dead / third haunting / deck
exhausted / villagers).

Default size: d = 64, 4 heads, 3 layers, FFN 128 → 234k parameters (d = 128,
8 heads, 4 layers → 903k). On the RTX A2000, base-game batches train at about
4,000 samples/s (d = 64) / 2,000 samples/s (d = 128).

## Specialists

One network per monk, trained on that monk's games only, in rounds (`training/specialists.py
--round N`; every flag of a preset can be overridden):

```sh
conda activate train
python training/specialists.py --round 3              # all seven, weakest first; ~2 h each at 20k updates
python training/specialists.py --round 3 --monks blue/heavenlyGust --updates 5000   # one monk, a shorter run
python training/specialists.py --round 3 --ship       # also install those that beat their start and the 50k network
python training/specialists.py --round 3 --summary    # rewrite the dashboard
```

| | Round 1 (2026-11-10) | Round 2 (2026-11-10/11) | Round 3 (2026-11-11; shipped 2026-11-12) |
|---|---|---|---|
| Starts from | the 50k network | each monk's round-1 selected checkpoint | each monk's best so far (round 2's pick if it beat its start, else that start) |
| Updates per monk | 10,000 | 10,000 | 20,000 |
| Encoder | schema 1 | schema 2: + the dice maths (migrated, `migrate.py`: plays the same at the start) | schema 2 |
| Learning rate | 5e-5 -> 1.5e-5 | 1.5e-4 (300-update warm-up) -> 4.5e-5 | 1e-4 (1,000-update warm-up) -> 3e-5 |
| Tether (KL to the start) | 0.05 | 0.02 | 0.02 |
| Play-test / selection / confirmation seeds | 7001-7300 / 9001-9600 / 10001-10600 | 11001-11300 / 12001-12600 / 13001-13600 | 14001-14300 / 15001-15600 / 16001-16600 |
| Self-play seeds | 2,000,000 + 1,000,000 x monk | 20,000,000 + 1,000,000 x monk | 40,000,000 + 1,000,000 x monk |
| Folder (dashboard `specialists.md`, log `specialists.txt`) | `training/runs/` | `training/runs/r2/` | `training/runs/r3/` |

- **Start** (round 2 on): the start network and the 50k network are migrated to the current encoder
  into `<folder>/start/` and play-tested as that monk on the play-test seeds (`baseline.json` in the
  run folder), so the dashboard compares every play-test with both on the same games. (Round 2 uses
  fresh seed sets: round 1 picked its checkpoints on its own, which flatters them there.)
- **Training** (`rl.py --monk seat/power`): every self-play game and play-test is that monk; a tether
  (a KL penalty to the start network's policy) keeps it from drifting far; danger hint with the
  extended Qi terms and a fixed split (Qi and haunting 0.15 each); 30% of the games start from
  positions captured in its own recent games, in the phase it loses most. Each run folder
  `<folder>/spec-<seat>-<power>/` has its own `progress.txt` (play-tests every 1,000 updates: 300
  games of that monk). Stopping and rerunning picks up where it stopped.
- **Selection**: the best 3 play-test checkpoints and the last one are re-tested on the selection
  seeds (600 games of that monk); the best is the candidate.
- **Confirmation**: candidate vs its start and vs the 50k network on the confirmation seeds — choosing
  the best of four on one set flatters it, so the decision is made on another. With `--ship`, a
  specialist that beats both by at least a point goes to `src/ai/nn/weights/<seat>-<power>.json`.
  (600 games give about +-3.5 points, so only clear gains count.)
- **The game** (`src/ui/game/aiNet.ts`) loads the playing monk's specialist if there is one, else the
  shared network, and downloads only that file; `play.test.ts` checks every weights file (a real monk,
  the current encoder, a legal game).

Round 1, the 50k network per monk on its play-test seeds (300 games each, sampled at 0.75):

| Monk | Wins |
|---|---|
| Blue / Heavenly Gust | 13.0% |
| Red / Dance of the Spires | 24.3% |
| Green / Gods' Favorite | 28.7% |
| Yellow / Enfeeblement Mantra | 31.3% |
| Green / Strength of the Mountain | 32.3% |
| Blue / Second Wind | 37.3% |
| Yellow / Bottomless Pockets | 40.7% |

Results on each round's confirmation seeds (600 games per monk; the same games for every column in
a row, about +-3.5 points each):

| Monk | Round 1: 50k -> specialist (10001-10600) | Round 2: 50k / round 1 -> round 2 (13001-13600) |
|---|---|---|
| Blue / Heavenly Gust | 21.8% -> 24.2% | 16.0% / 22.5% -> 26.3% |
| Green / Gods' Favorite | 27.0% -> 28.3% | 20.5% / 23.0% -> 28.5% |
| Red / Dance of the Spires | 27.2% -> 31.5% | 25.2% / 28.2% -> 28.2% (not better) |
| Yellow / Enfeeblement Mantra | 31.3% -> 33.2% | 30.3% / 34.2% -> 33.7% (not better) |
| Green / Strength of the Mountain | 30.7% -> 35.5% | 27.3% / 30.2% -> 37.2% |
| Blue / Second Wind | 36.3% -> 43.2% | 32.7% / 40.8% -> 46.3% |
| Yellow / Bottomless Pockets | 44.7% -> 47.8% | 39.8% / 43.3% -> 53.0% |
| Overall (red 1/4, others 1/8) | 30.8% -> 34.4% | 27.1% / 31.3% -> 35.2% |

Round 3, on its confirmation seeds (16001-16600, 600 games per monk): 50k / start (the best so far)
-> round 3. All seven shipped as `src/ai/nn/weights/<seat>-<power>.json`.

| Monk | 50k | Start | Round 3 |
|---|---|---|---|
| Blue / Heavenly Gust | 18.5% | 28.3% | 42.8% (step 90,000) |
| Green / Gods' Favorite | 26.5% | 30.8% | 38.8% (83,000) |
| Red / Dance of the Spires | 25.8% | 27.2% | 32.8% (75,000) |
| Yellow / Enfeeblement Mantra | 34.5% | 38.2% | 45.7% (78,000) |
| Green / Strength of the Mountain | 29.3% | 45.2% | 51.5% (90,000) |
| Blue / Second Wind | 32.7% | 46.2% | 57.5% (89,000) |
| Yellow / Bottomless Pockets | 44.2% | 52.5% | 60.7% (88,000) |
| Overall (red 1/4, others 1/8) | 29.7% | 37.0% | 45.3% |

On Initiation (trained on Normal only; seeds 17001-17300, 300 games per monk) they win 53% overall
where the shared network wins 38%: Bottomless Pockets 66.7% (shared 50.3%), Second Wind 64.0%
(44.7%), Strength of the Mountain 56.3% (41.7%), Heavenly Gust 51.0% (27.3%), Gods' Favorite 50.0%
(36.0%), Enfeeblement Mantra 49.0% (37.7%), Dance of the Spires 43.3% (32.7%).

Round 3's play-tests (300 games each) averaged over its first 5k, 11-15k and last 5k updates rose
+2 to +9 points and then only -1 to +3: the gains are flattening, so another round of the same
would likely add a couple of points. Kept on disk (2026-11-12): only each monk's selected round-3
checkpoint (`r3/spec-*/step-N.*`, what a next round starts from) with its `selection.json`, logs and
baseline; rounds 1-2, `rl-v4` and every other checkpoint were deleted.

Round 2's play-tests dipped in the first 1,000 updates for five monks (the jump to 1.5e-4 while the
new inputs were learnt), were back to the start by about 5,000 and rose most in the second half, still
climbing at 10,000 (drift from the start 0.15-0.23, round 1 0.06): hence round 3's 20,000 updates at
1e-4 with a longer warm-up. The dice maths and the higher rate came together, so their shares of the
gain aren't known.

## Continuing training

Only round 3's selected checkpoints are left (`training/runs/r3/spec-*/step-N.pt`), so a next round
starts from them, with fresh seed sets (17001-17300 went to the Initiation check):

```sh
python training/specialists.py --round 3 --from-runs training/runs/r3 --runs-dir training/runs/r4 \
  --eval-seeds 18001-18300 --select-seeds 19001-19600 --confirm-seeds 20001-20600 --seed-base 60000000 \
  [--monks red/danceOfTheSpires,blue/heavenlyGust] [--updates 20000]
# Play-test a network on its own: any weights file, as one monk, any difficulty.
node scripts/nn/ts.mjs scripts/nn/eval.ts --weights src/ai/nn/weights/blue-secondWind.json --monk blue/secondWind \
  --seeds 7001-7300 --sample --temp 0.75 [--difficulty initiation]
```

The reference (`--ref`) defaults to `src/ai/nn/weights/ghost-net-v1.json`, the 50k network. The
self-play curriculum every run uses (`nn/curriculum.py`; introduced with rl-v5, a shared-network run
from the 50k network that was stopped and discarded — see Results):

- **Danger hint by how it loses** (`src/ai/nn/danger.ts`). Split in parts — haunting (haunted tiles,
  haunters about to add one), Qi (the Taoist's Qi; overrun on *every* board, a neutral board's own Qi
  — a possessed one passes its Qi losses to the Taoist and loses its power — boards one ghost from
  full, tormentors) and the deck clock. The trainer weights the Qi and haunting parts by the shares of
  recent whole-game losses to running out of Qi and to the third haunting (2:1 now, so 0.20 vs 0.10
  of kappa 0.15 x 2). Before, overrun counted on the Taoist's own board only, though 37% of the Qi
  lost is overrun and half of it on neutral boards.
- **Weak monks trained harder** (`nn/curriculum.py`). Each game's monk is drawn with weight
  (1 - its recent win rate) ** 3, floor 6%: from the measured rates, Heavenly Gust 24% of the games,
  Gods' Favorite / Dance of the Spires / Enfeeblement Mantra 15% each, Strength of the Mountain 12%,
  Second Wind 11%, Bottomless Pockets 8% (rl-v4: 12.5% each, red 25%). The win rates are moving
  averages over recent whole games, so the shares follow as monks improve.
- **More practice where it loses** (early / mid / late game, `src/ai/nn/phase.ts`). Half the games
  start from a position in a phase drawn by its share of recent whole-game losses (floor 15%): 15% /
  46% / 39% now. Positions come from the network's own games (each game captures 2 start-of-turn
  positions; 400 kept per monk and phase), unseen cards and dice re-dealt; the old bank of the search
  AI's positions is gone.
- The curriculum state (moving averages) is saved beside every checkpoint
  (`step-N.curriculum.json`) and picked up by the next run (the 50k network's was seeded from the
  1,200-game evaluation).
- Play-tests sample at temperature 0.75 (how the game plays) and report the losses by phase and the
  wins by monk; `--eval-greedy` adds the most-likely-move test.
- Expected time: about 3.5 hours (25,000 updates of ~180-game rounds at 10-20 s of play each plus
  the PPO updates).

Notes:

- Self-play shards are written by the actors, loaded onto the GPU and deleted after each round; nothing
  accumulates. `rl.py` plays solo Normal only.
- Seeds 7001-7300 (and up to 8200 in the final evaluation) are never used for training.
- Cleaned 2026-11-12: everything but round 3's selected checkpoints (rl-v4's 50k checkpoint and
  rounds 1-2 included; the 50k network lives on as `src/ai/nn/weights/ghost-net-v1.json`).
- Cleaned 2026-11-09: the earlier runs (bc-v1, rl-v1..v3, rl-v4's intermediate checkpoints), the
  2.1 GB imitation dataset (10,000 games of the rules-based search AI, 827k decisions) and the old
  start bank were deleted; the warm-start they gave is contained in `step-50000`. To regenerate the
  dataset (only for a new encoder layout / architecture): `node scripts/nn/ts.mjs scripts/nn/gen.ts
  --games 10000 --start 100000 --workers 18 --out training/data/solo-normal-v1`, then `train.py`
  (22 min + 9 min).

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
is what wins.

**rl-v1** (`rl.py`, 2026-11-06): 1,000 imitation updates, then 4,000 self-play
PPO updates with the win alone as the result (mid-game credit = change in the
estimated win chance). With the network winning ~0.5% of its games the estimate
fell to ~0 everywhere, its changes became noise, and play got worse: 0.7% wins
at the start of self-play, 0.3–2.0% after, 38–42 turns instead of 50.

**rl-v2** (`rl.py --init rl-v1/step-1000.pt --beta-start 0.5 --beta-end 0.1
--rl-lr 1.5e-4 --ent 0.003`): the same, plus a second result — beta x the
fraction of the deck the game got through, with its own estimate (the progress
head). Both estimates kept tracking outcomes (fit 0.4–0.8), the policy moved
steadily, and the network alone reached **4.3% (13/300)** at update 5,000
(0.7% at the start of self-play; best so far for the network alone), 50 turns,
49% of the deck; deaths fell (170 → 121 of 300). Deck progress plateaued at 49%
from update 2,000: most games end before the incarnation appears (~67% of the
deck), so the endgame is rarely practised. On Initiation the update-2,500
network wins 4.0% (Normal 3.0%).

**rl-v3** (`rl.py --init rl-v2/step-5000.pt --total-updates 10000 --rl-lr 1e-4
--ent 0.003 --beta-start 0.3 --beta-end 0.3 --kappa-start 0.25 --kappa-end 0.15
--seed-base 400000`): plus change-in-danger credit (`src/ai/nn/danger.ts`: haunted
tiles and haunters about to add one, low Qi, an overrun board, possessed boards,
the deck running out with Wu-Feng in play). The network alone: 4.3% → **7.3%
(22/300)** at update 10,000, still rising; 56 turns, 55% of the deck. Haunting
losses halved (166 → 87, fewer than the search AI's 148), games reaching the
incarnation 21% → 34% (search AI 43%), but it wins only 21% of those (search AI
33%) and running out of Qi is now the main loss (121 → 191; 69 of the 81 losses
after the incarnation appears).

**rl-v4** (its folder was deleted 2026-11-12): self-play from rl-v3/step-10000 to
50,000 updates in 5,000-update segments (`rl.py --init … --sched-start 10000
--sched-end 50000`, lr 7e-5 decaying to 2e-5 over the whole span, optimizer state
carried between segments). Segments 1–4 as rl-v3 (beta 0.3, kappa 0.15); 5: heavier
low-Qi danger (didn't help, reverted); 6–8: plus mid-game starts — 40% → 20% of
self-play games begin from late positions of the search AI's games
(1,708 positions from 5,000 search-AI games, since deleted; unseen
cards and dice re-dealt each time).

The network plays clearly better **sampling its moves** (temperature 0.5–1) than
taking its single most likely move — with so many near-equivalent legal actions,
the probability of a good plan is split across its variants and the top single
action is often a worse one. Sampled self-play wins by segment: 9.2%, 13.8%,
16.0%, 20.7%, 22.1% (updates 10k–35k), so it kept improving even where the
top-choice play-tests looked flat.

Final evaluation, step-50000, 1,200 unseen seeds (7001–8200), solo Normal, every monk:

| Player | Wins | Reach the incarnation | Win once it's out |
|---|---|---|---|
| **network, sampled (temperature 0.75)** | **28.2% ± 2.5** | 56% | 50% |
| network, most likely move | 22.2% ± 2.4 | 50% | 44% |
| search AI (the original teacher) | 14.8% ± 2.0 | 41% | 37% |
| quick policy | 1.7% ± 0.7 | 14% | 12% |

By monk (network sampled vs search AI): red / Dance of the Spires 26% vs 4%,
blue / Heavenly Gust 14% vs 12%, blue / Second Wind 34% vs 26%, green / Gods'
Favorite 26% vs 11%, green / Strength of the Mountain 32% vs 9%, yellow /
Bottomless Pockets 40% vs 47%, yellow / Enfeeblement Mantra 27% vs 5%.
About 20 ms per decision in TypeScript (no search).

### The network against the rules-based search AI, everywhere (2026-11-09)

Network = step-50000 sampling at temperature 0.75, every Taoist seat; search AI = the rules-based
AI; same seeds 7001-7300 (100 / 60 for the expansions). Win rates:

| Setup | Network | Search AI |
|---|---|---|
| Solo Initiation | **34.7%** | 19.3% |
| Solo Normal (1,200 games) | **28.2%** | 14.8% |
| Solo Nightmare | 3.7% | 5.0% |
| 2 players Initiation | 5.3% | 12.0% |
| 2 players Normal | 4.0% | 4.0% |
| 3 players Normal | 0.7% | 2.7% |
| 4 players Initiation | 1.3% | 8.0% |
| 4 players Normal | 0.0% | 2.3% |
| Solo Normal + White Moon | 2.0% | 5.0% |
| 4 players Normal + White Moon (60) | 0.0% | 1.7% |
| Solo Normal + Black Secret | 1.0% | 19.0% |
| 3 players Normal + Black Secret (60) | 1.7% | 15.0% |

So the game uses the network only where it is better (solo, base game, Initiation / Normal:
`networkPlays`); the rules-based AI plays everything else and Wu-Feng. Outside solo play the network
has simply never been trained (every game of the 50,000 updates was solo Normal), so it plays
other-player seats "as if solo": it also loses White Moon games to the twelfth dead villager (21 of
its 100 solo White Moon games) because nothing ever rewarded saving one.

**Why the network falls behind on Nightmare** (400 solo games each, `eval.ts --setup night1`):
Nightmare/Hell have 3 incarnations in solo (4 with 3-4 players), 10 ghost cards apart, and in
solo the deck is exactly 3 x (10 ghosts + an incarnation), so **the first card drawn is an
incarnation**. Network vs search AI: first incarnation destroyed in 52% vs 70% of games; given that,
a second in 33% vs 32%, given that a third in 36% vs 38%. Games that never destroy one end after
23 vs 31 turns. So the whole gap is the opening against an incarnation at turn 1, a situation the
network never met (every training game was Normal: one incarnation, arriving after ~19 ghosts);
once the first is down it plays as well as the search AI. Wins: 4.5% vs 6.0% (a tie within noise).
Initiation is Normal plus a Qi and a black Tao token, values the network meets in Normal anyway,
so it transfers (and does better with the extra Qi).

### Per monk (step-50000, sampled, 1,200 solo Normal games)

| Monk | Wins | Reach the incarnation | Win once it's out |
|---|---|---|---|
| Yellow / Bottomless Pockets | 40.0% | 61% | 66% |
| Blue / Second Wind | 34.0% | 59% | 57% |
| Green / Strength of the Mountain | 31.6% | 58% | 55% |
| Yellow / Enfeeblement Mantra | 27.3% | 61% | 45% |
| Red / Dance of the Spires | 26.3% | 55% | 48% |
| Green / Gods' Favorite | 25.7% | 59% | 44% |
| Blue / Heavenly Gust | 14.3% | 40% | 36% |

Every monk loses about two thirds of its games by running out of Qi (all of them roughly evenly
split between mid-game and after the incarnation appears); Heavenly Gust is the clear outlier
before the incarnation.

Ideas next: start part of the self-play games from late positions of the search
AI's games (endgame practice, more wins to learn from), moving the start points
earlier over the run; an Initiation → Normal curriculum; change-in-danger hints
(haunted tiles, Qi at 1, haunters about to haunt) as extra mid-game credit;
longer runs.

### Headroom and where the Qi goes (step-50000, sampled; 2026-11-09)

- **Headroom** (`eval.ts --attempts 16`, 300 seeds x 16 attempts = 4,800 games, mean 27.1%): 71% of
  the seeds were won at least once in 16 tries, but only 44% in a quarter of their tries, 25% in
  half, 12% in three quarters; 29% were never won. Ever won, per monk: Bottomless Pockets 85%,
  Second Wind 82%, Enfeeblement Mantra 71%, Strength of the Mountain 71%, Dance of the Spires 68%,
  Gods' Favorite 63%, Heavenly Gust 57% (30-45 seeds each, so about +-15 points).
- **Qi** (`scripts/nn/qi.ts`, 600 games): 6.0 Qi lost per game across all four boards (4.6 in won
  games, 6.6 in lost ones), 1.2 regained. Neutral board overrun 20% (1.2/game), own board overrun
  17% (1.0), Sorcerer's Hut 17% (1.0, the action costs a Qi), ghost arrival abilities 23% (1.4,
  mostly on neutral boards), the Silent Reaper's group loss 18% (1.1), curse die 5%. Overrun is the
  largest drain the Taoist can control, and the hint (`danger.ts`) only charged an overrun on the
  Taoist's own board.
- **Tempo**: 14-18 Yang turns per game; per turn 0.43-0.57 exorcisms, 0.53-0.79 helps, 1-8% idle.
  Heavenly Gust uses help + exorcise in the same turn in 24% of its turns and gets fewer turns
  (14 vs 16-18).

### rl-v5 (2026-11-09; stopped and deleted)

From step-50000 with the curriculum above (danger split by loss share, monks weighted by
(1 - win rate) ** 3, half the games started in the phase it loses most). Play-tests (300 evaluation
games, sampled at temperature 0.75) against rl-v4's last six (1,800 games: 27.2% wins, 148 Qi deaths
and 69 third hauntings per 300):

| Updates | Wins | Lost to Qi (of 300) | Lost to haunting | Red / Spires |
|---|---|---|---|---|
| 51k-55k (average) | 24.2% | 143 | 84 | 13/75 |
| 56k | 28.3% | 126 | 87 | 23/75 |
| 57k | 29.0% | 120 | 93 | 21/75 |

- It dipped for 5,000 updates, then recovered; pooled over 55k-57k, 27.3% — no net gain.
- Splitting the danger hint by loss share cut the haunting weight (0.15 -> about 0.10, Qi up to about
  0.20): third hauntings rose from 23% to 28-31% of games and stayed up. A danger that causes fewer
  losses can still be the one the network most needs warning about.
- The new Qi terms (overrun on every board, the neutral boards' Qi) did cut the deaths, to the lowest
  of any run (120-126 per 300 at the end).
- Weighting monks by weakness cut red from 25% of the games (rl-v4) to 15%; red fell from 27% to 18%
  before recovering. Heavenly Gust, the target, rose only from 11.5% to 16%.
- Lessons for the next scheme: keep the haunting weight; the extended Qi terms look useful; floor
  every monk's share of the games well above 6% (rl-v4 gave each 12.5%, red 25%).

## Next

1. Specialists per monk (above): three rounds trained, round 3 shipped (45% overall on fresh solo
   Normal seeds, the shared network 30%). More of the same is flattening out.
2. If wins flatten while the value fit and the policy loss on its own games keep falling, the network
   is short of capacity: distil it into d = 96 (0.54 M parameters, 15.5 ms per decision) or d = 128
   (0.9 M, 24.6 ms; d = 64 is 8.5 ms) and compare on the same seeds. Self-play costs about 2-3x as
   long per update.
3. Other setups: 2-4 players, Nightmare / Hell (which open with an incarnation in solo), White Moon,
   Black Secret each need their own self-play before the network replaces the rules-based AI there.
4. Optional: a network-guided lookahead at play time.
