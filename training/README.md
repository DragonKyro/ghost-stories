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
- The weights the game uses: `src/ai/nn/weights/ghost-net-v1.json` (a copy of
  `runs/rl-v4/step-50000.json`).

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

## Specialists (prepared, not started)

One network per monk, each fine-tuned from the shared 50k network on that monk's games only:

```sh
conda activate train
python training/specialists.py                    # all seven, weakest first; ~70-90 min each at 10k updates
python training/specialists.py --monks blue/heavenlyGust --updates 5000   # one monk, a shorter run
python training/specialists.py --ship             # also install those that beat the 50k network
```

- **Training** (`rl.py --monk seat/power`): every self-play game and play-test is that monk; a
  tether (`--tether 0.05`, a KL penalty to the 50k network's policy) keeps the shared skills while it
  specialises; danger hint with the extended Qi terms and a fixed split (Qi and haunting 0.15 each —
  rl-v5's loss-share split is off by default now, `--danger-split adaptive`); 30% of the games start
  from positions captured in its own recent games, in the phase it loses most; lr 5e-5 decaying to
  1.5e-5. Each run folder `training/runs/spec-<seat>-<power>/` has its own `progress.txt`
  (play-tests every 1,000 updates: 300 games of that monk, seeds 7001-7300); `training/runs/
  specialists.txt` gets a line per monk. Stopping and rerunning picks up where it stopped.
- **Selection**: the best 3 play-test checkpoints and the last one are re-tested on held-out seeds
  (9001-9600, 600 games of that monk); the best is the candidate.
- **Confirmation**: candidate vs the 50k network on fresh seeds (10001-10600) — choosing the best of
  four on one set flatters it, so the decision is made on another. With `--ship`, a specialist that
  wins by at least a point goes to `src/ai/nn/weights/<seat>-<power>.json`; otherwise the 50k network
  stays for that monk. (600 games give about +-3.5 points, so only clear gains count.)
- **The game** (`src/ui/game/aiNet.ts`) loads the playing monk's specialist if there is one, else the
  shared network, and downloads only that file; `play.test.ts` checks every weights file (a real monk,
  the current encoder, a legal game).

The 50k network per monk on the play-test seeds (300 games each, sampled at 0.75) — what each
specialist's play-tests start from:

| Monk | Wins |
|---|---|
| Blue / Heavenly Gust | 13.0% |
| Red / Dance of the Spires | 24.3% |
| Green / Gods' Favorite | 28.7% |
| Yellow / Enfeeblement Mantra | 31.3% |
| Green / Strength of the Mountain | 32.3% |
| Blue / Second Wind | 37.3% |
| Yellow / Bottomless Pockets | 40.7% |

## Continuing the shared network

The shared-network curriculum as tried in **rl-v5** (stopped at 57,400 updates and discarded — see
Results; note `--danger-split` now defaults to `fixed`):

```sh
python training/rl.py --run training/runs/rl-v5 --init training/runs/rl-v4/step-50000.pt \
  --total-updates 75000 --rl-lr 5e-5 --sched-start 50000 --sched-end 75000 --ent 0.003 \
  --beta-start 0.3 --beta-end 0.3 --kappa-start 0.15 --kappa-end 0.15 --danger-split adaptive \
  --start-frac 0.5 --monk-gamma 3 --captures 2 --eval-every 1000 --eval-temp 0.75 --seed-base 1500000
# Play-test any checkpoint on the evaluation seeds (7001-7300); --monk blue/heavenlyGust for one monk.
node scripts/nn/ts.mjs scripts/nn/eval.ts --weights training/runs/rl-v4/step-50000.json --sample --temp 0.75
# To ship new shared weights: copy the .json over src/ai/nn/weights/ghost-net-v1.json (run npm run test:run).
```

What's new in it, against rl-v4:

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
  (`step-N.curriculum.json`) and picked up by the next run; `rl-v4/step-50000.curriculum.json` is
  seeded from the 1,200-game evaluation.
- Play-tests sample at temperature 0.75 (how the game plays) and report the losses by phase and the
  wins by monk; `--eval-greedy` adds the most-likely-move test.
- Expected time: about 3.5 hours (25,000 updates of ~180-game rounds at 10-20 s of play each plus
  the PPO updates).

Notes:

- Self-play shards are written by the actors, loaded onto the GPU and deleted after each round; nothing
  accumulates. `rl.py` plays solo Normal only.
- Seeds 7001-7300 (and up to 8200 in the final evaluation) are never used for training.
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

**rl-v4** (`training/runs/rl-v4/progress.txt`): self-play from rl-v3/step-10000 to
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

1. Specialists per monk (above, prepared). Kept from rl-v5: the extended Qi danger terms; dropped:
   the loss-share danger split.
2. If wins flatten while the value fit and the policy loss on its own games keep falling, the network
   is short of capacity: distil it into d = 96 (0.54 M parameters, 15.5 ms per decision) or d = 128
   (0.9 M, 24.6 ms; d = 64 is 8.5 ms) and compare on the same seeds. Self-play costs about 2-3x as
   long per update.
3. Other setups: 2-4 players, Nightmare / Hell (which open with an incarnation in solo), White Moon,
   Black Secret each need their own self-play before the network replaces the rules-based AI there.
4. Optional: a network-guided lookahead at play time.
