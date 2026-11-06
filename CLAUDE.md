# CLAUDE.md

Context for Claude working in this repo.

## What this is

A web version of the cooperative board game *Ghost Stories* (Antoine Bauza, Repos Production, 2008), hosted on GitHub Pages, played privately with friends: solo, hot-seat on one device (with AI seats), or online. Includes the **White Moon** and **Black Secret** expansions.

Source rules: [`ghost stories rules.pdf`](./ghost%20stories%20rules.pdf) (Esoteric Order of Gamers summary v3.3, Oct 2019). **That PDF is canonical.** Where it is silent, the decisions are listed under "Rules decisions" below and in the in-game rulebook's "About this version" topic — keep the two in sync.

## Tech stack

TypeScript (strict), Vite, React 19, Zustand, Vitest, hand-drawn inline SVG art, Firebase Realtime Database for online play (shared project `github-games-e7c7d`, this app's data under the `ghost-stories` key). No backend of our own — GitHub Pages is static.

Same layering and multiplayer model as the sibling [`catan/`](../catan/) project.

## Architecture

- **`src/game/`** — the rules engine. Pure TypeScript, no React / DOM / network / store imports.
  - `createGame(config)` and `applyAction(state, action)` in `engine.ts`; `actionSeat(state, action)` (who may send it) and `waitingFor(state)` (whose input the game needs).
  - **Deterministic**: every die roll comes from the seeded RNG on the state (`state.rng`), inside the reducer. Actions carry intents and choices only, so every device that applies the same actions to the same start reaches the same state. `applyAction` works on a JSON deep copy and throws on an illegal action (the caller's state is untouched).
  - **Effect queue + prompts**: the turn is a queue of effects (`state.queue`) resolved front-first by `flow.ts#run` until the game needs a decision (`state.prompt`) or the active Taoist's Yang phase begins. Prompts (placement of an arriving ghost, curse rerolls, which Tao to discard, Qi payer for possessed boards, rewards, the exorcism roll, Wu-Feng's choices, …) are answered with `{ type: 'respond', by: seat, r }`. Only the prompt's owner may answer.
  - **Yang phase bookkeeping** (`state.yang`) enforces step order: before-move powers → step 1 move → step 2 help / exorcise (Heavenly Gust, Second Wind) → step 3 Buddha / crystal; Yin-Yang between steps.
  - `state.events` lists what the last action did (for the log and UI).
  - Files: `types.ts` (vocabulary), `actions.ts` (Action / Response unions), `setup.ts`, `flow.ts` (turn + Yin phase + effect handlers), `yang.ts`, `tiles.ts` (village tile actions), `exorcism.ts` (coverage maths, commit, cheapest-spend suggestions), `respond.ts`, `ops.ts` (shared mutations: haunting, Qi, death, placing/removing ghosts, win/loss), `rules.ts` (read-only queries used by engine, UI and AI), `geometry.ts`, `catalogue.ts` (ghost deck), `whiteMoon.ts`, `blackSecret.ts`, `rng.ts`.
- **`src/ai/`** — the AI, pure and deterministic (no `Math.random`, no clock). `chooseAction(state, seat) → Action | null` returns one step at a time (powers, move, action, Buddha, end turn; or a prompt answer); `fallbackAction` for when a choice turns out illegal.
  - **Search** (`taoist.ts`, `sim.ts`): at each Yang step it lists candidate plans (moves × every step-2 option, corner double exorcisms, Yin-Yang, Twin Winds, power-token flights, Buddha spots, end turn), keeps the best `SEARCH.maxPlans` by a quick pre-score, and plays each forward through the real engine to the start of the next Taoist's Yang phase (so the next Yin phase is included), narrowing by successive halving (12 → 24 → 48 rollouts, shared samples). `SEARCH.on = false` uses the quick policy alone.
  - **Fair play** (`sanitize` in `sim.ts`): every rollout re-seeds the dice and re-deals what the players can't see (unseen ghost cards, keeping incarnation positions but not identities; hidden villagers; Black Secret's face-down curses, Wu-Feng's hand, catacomb tokens, Mantra deck).
  - `policy.ts` — the fast greedy policy that plays every Taoist inside rollouts (and is the fallback); `prob.ts` — exact exorcism odds; `value.ts` — the position score; `tuning.ts` — every weight (`W`) and search setting (`SEARCH`), tuned by self-play; `prompts.ts` — answers to every prompt; `fast.ts` — in-place apply for rollouts (same handlers as `applyAction`, tested identical); `wufeng.ts` plays Wu-Feng.
  - Benchmark / tuning harness: `node scripts/aibench/bench.mjs --setups init4,norm4,solo1 --seeds 1-40` (also `tune.mjs` coordinate search, `diag.mjs` loss causes); bundles go to `node_modules/.cache/aibench`.
  - **`src/ai/nn/`** — the neural-network Taoist (being built; not wired into the game yet). `encode.ts`: the state as up to 81 tokens (global, prompt, 4 seats, 9 tiles, 12 ghost spaces; White Moon families; Black Secret catacombs / demons / curse tokens / Bloody Mantras) in the deciding Taoist's frame (`frame.ts`: the table turned so they sit at seat 0; clockwise order kept), plus a token-pair relation matrix; public information only (sanitized copies encode identically — tested). `legal.ts`: every legal action with every parameter (generated from the domains, each checked by applying it; exorcism commits offer every cheapest way to pay). `candidates.ts`: action → features + pointers to tokens. `model.ts`: the forward pass (transformer trunk with relation-biased attention, value head, per-candidate policy head), weights as JSON. `schema.ts` holds every layout and `SCHEMA_HASH`; after changing the encoder run `npm run nn:parity` (regenerates the PyTorch parity fixture `model.test.ts` checks).
- **`training/`** — PyTorch side (`nn/model.py` mirrors `model.ts`), its own venv (`training/README.md`); nothing in the web app depends on it.
- **`src/net/`** — Firebase room transport (see `src/net/README.md`): anonymous auth, rooms at `ghost-stories/rooms/{CODE}` with meta / lobby (transactional) / start (write-once) / actions (write-once `aNNNNNN` log slots) / chat / presence, stale-room sweep by day buckets. Lazy-loaded, so the SDK downloads only when someone goes online. `fakeTransport.ts` is the in-memory server for tests. No imports from `@/ui` or `@/store`.
- **`src/store/`** — Zustand stores:
  - `gameStore` — the live `GameState`, `uiMode`, error toast, hot-seat `handoff`, undo stack (offline, moves without dice only). `dispatch` (guarded online, applied at once, then handed to the network) / `applyLocal` (moves from the log) / `takeSnapshot` / `restoreSnapshot`. The network store registers through `registerBroadcastHandler` / `registerDispatchGuard` / `registerOnlinePredicate` (no circular import).
  - `networkStore` + `actionSync` (optimistic moves, rollback when another device's move takes the slot) + `lobby.ts` (lobby rules, `lobbyStartProblem`, `lobbyToConfig`). Helpers `controlledSeats`, `canActFor`, `runsAi`, `isSeatOnline`, `seatName`, `resumeFromUrl`.
  - `logStore` — the game log, fed from `state.events`, plus a per-turn `timeline` (Qi, Tao, ghosts, haunted tiles, deck) for the stats; both snapshot / restore with undo and network rollbacks, and every device (re)builds them by replaying the log. `uiStore` — the current board selection (move / exorcise / Buddha / tile-action drafts / Yin-Yang), the stats screen toggle.
- **`src/ui/`** — React. `stats/` is the end-of-game stats screen (`computeStats` from the log + timeline; hand-rolled SVG charts with legends, hover readouts and table views; chart colours validated for the dark surface). `game/` is the game screen (`GameScreen`, `Board` (village + 4 boards + corner plates), `interaction.ts` (what's clickable now and what a click does), `TurnPanel` (Yang steps), `PromptPanel`, `ExorcismPanel`, `Inspector`, `AIDriver`, `Overlays`, `ExpansionPanel`). `online/` is the online screen, lobby, chat, connection badge. `art/` is the art set. `demo.ts` is a dev-only `?demo=N` hook.
- **`src/rulebook/`** — the in-game rulebook, written from the PDF, with pictures from the art set.

## Layout

`GameScreen#computeLayout` sizes the village tile (`--t`) from the viewport: **wide** (board + side panel), **stacked** (phones in portrait / narrow windows: board on top, tabbed Play / Log / Chat panel below) and **short** (phones in landscape: tabs in the side column). Below 112 px tiles the plates go compact and tile names hide. Touch: tap a non-target tile / ghost to inspect it (hover inspects with a mouse only); hints say "Tap". Check with `node scripts/render-app.mjs --demo 40 --players 2 --size 390,844 --mobile`.

## Rules decisions (where the PDF is silent or ambiguous)

- **Ghost deck**: the printed card list isn't in the summary, so `catalogue.ts` is an original deck with the real structure: 9 per colour, resistance in the ghost's own colour, every ability from the reference sheet; 10 incarnations per the summary's "Powers of the Incarnations" (their colours / resistances, except Vampire Lord, Hope Killer and Nameless, are ours).
- No Qi maximum (none is given); neutral boards can't gain Qi.
- The deck is "exhausted" the moment its last card is drawn while an incarnation is in play (immediate loss).
- All 12 spaces full: the card stays on the deck and the active player loses 1 Qi.
- A ghost placed on a Buddha is destroyed before its arrival ability applies.
- Death Army: while in play, the active player rolls the curse die every board's turn ("each turn"; a haunt strikes in front of Death Army), plus its curse on destruction.
- Bonecracker on a neutral / possessed board: the players choose which Taoist discards.
- Howling Nightmare: the opposite board's space on the same line must be empty.
- Circle of Prayer: −1 on the token's colour for any ghost needing that colour (so it helps multicolour incarnations on the matching colour). Mantra: −1 on a colour of the player's choice.
- Corner double exorcism: partial success allowed, but any target the dice alone beat must be exorcised.
- Group abilities hit all four boards; possessed / exhausted boards pass their Qi loss to a Taoist of the players' choice.
- The Mantra comes back when its ghost leaves play (usable from the next turn); it is removed from the game when its board loses its power (possession, power blocker).
- Tao supply: 10 tokens per colour.
- White Moon: family death curses / rewards and artifacts are our own designs on the summary's hints (Sheng's death haunts a tile, Xiang's kills a villager, one-member families give artifacts — Chang's is Moon Dust). Artifacts are one-shot items used between Yang steps. Pre-saved villagers in 1–3 player games are picked at random.
- Black Secret: an incarnation that finds no room stays in Wu-Feng's hand as an owed summon (`pendingSummons`) and comes in at the next arrival; it blocks the win meanwhile. The Restore-ladders Mantra picks the first eligible tiles; the pre-saved one-member-family artifact (White Moon, 1–3 players) goes to the first player seat. Curse token effects, Bloody Mantra effects, catacomb board colours / entrances and the token layer mix are our own designs on the summary's rules; the 5 new incarnations and 10 new ghosts aren't printed in the summary (the new ghosts are ours; Wu-Feng draws from the base 10 incarnations).

When you change one of these, update the rulebook's "About this version" topic too.

## Multiplayer

- Every device holds the full `GameState`, built with `createGame(config)` from the room's start record (which carries the config + seed and a checksum), then replays the action log in slot order.
- The dispatch guard allows an action when `seatUuids[actionSeat(state, action)]` is this device, or the seat has no owner (AI / neutral) and this device is the host. Only the host runs the AI.
- Security rules: `database.rules.json` covers only `ghost-stories`. Deploy with `npm run deploy:rules` — the predeploy hook `scripts/merge-db-rules.mjs` merges this app's key into the live rules of the shared database and keeps the other apps' keys (catan, card-collecting, tractor, …). Never deploy a rules file that defines other apps' keys, and never open the root.
- `?room=CODE` in the URL rejoins / invites; `?fresh` keeps identity per tab (two windows on one computer).
- Live tests: `LIVE_FIREBASE=1 npx vitest run src/store/networkStore.live.test.ts`; two-browser check: `node scripts/e2e-online.mjs` (with `npx vite --port 5181` running).

## npm / registry

This machine's user-level npm registry is a corporate Artifactory; the repo's `.npmrc` pins `registry=https://registry.npmjs.org/` and `package-lock.json` must only contain `registry.npmjs.org` URLs (`grep -o '"resolved": "https://[^/]*' package-lock.json | sort | uniq -c`). This network may reset downloads from npmjs.org; installs can be completed from the npm cache / sibling projects, but keep the lockfile public.

## Conventions

- Strict TypeScript, no `any`. Co-locate tests (`x.ts` + `x.test.ts`). Path alias `@/` → `src/`.
- `src/game` and `src/ai` import nothing from `src/ui`, `src/net` or `src/store`.
- Engine tests use `src/game/testUtil.ts` (`yangFor`, `putGhost`, `rigDice`, `rigCurse` to force die results through the seeded RNG).
- Screenshots: `node scripts/render-app.mjs --demo 40 --seed 3 [--wm] [--bs] [--players N]` (dev server on 5181), art gallery `?gallery` + `scripts/render-gallery.mjs`. Output in `art-renders/` (gitignored).

## Commands

- `npm run dev` — dev server at http://localhost:5173/ghost-stories/
- `npm run build` — typecheck + production build
- `npm run test:run` — all tests once
- `npm run typecheck`
- `npm run deploy:rules` — deploy the database rules (merged)
- `npm run nn:parity` — regenerate the TS ↔ PyTorch parity fixture (needs `training/.venv`)

## Deployment

`.github/workflows/deploy.yml` builds and deploys to GitHub Pages on push to `main`. Vite `base` is `/ghost-stories/`.

## Roadmap

Done: engine rewrite to the rules summary (base game, White Moon, Black Secret), heuristic AI (Taoists + Wu-Feng), new UI and art set, Firebase multiplayer, rulebook, end-of-game stats, phone / tablet layouts.

Next:
- **AI strength** — self-play win rates (seeds 7001–7300, 300 games each): 4 AI Initiation 8% (10–13% on other seed sets), Normal 2%; solo Initiation 19%, Normal 14%; 2 players Initiation 12%, Normal 4% (the old AI: 0–1%). Most 4-player losses come in the last ~10 cards, after the incarnation shows up. Next: re-tune `W` with the search on and more seeds; the AI ignores White Moon villagers (many expansion games are lost to the 12th dead villager) and never goes underground in Black Secret; Wu-Feng's AI is unchanged.
- **Neural-network AI** (`src/ai/nn/`, `training/`) — encoder, every-legal-action enumeration, network (TS + PyTorch, parity-tested) done; phase 1 (imitation of the search AI, solo Normal, `training/README.md` → Results) gives a calibrated value head (AUC 0.85) and a policy that alone wins ~3% (search: 14%). Next: the network inside the search (policy prior for the shortlist, value at the rollout leaves), then expert iteration.
- Scoring (rulebook scoring isn't in the summary).
