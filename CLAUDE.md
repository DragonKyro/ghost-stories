# CLAUDE.md

Context for Claude working in this repo.

## What this is

A web-based clone of the cooperative board game *Ghost Stories* (Antoine Bauza, Repos Production, 2008), hosted on GitHub Pages, played privately with friends. 1–4 players cooperate as Taoist monks defending a village from the ghosts of Wu-Feng. Out-of-print physical copies are scarce and there is no official digital version — this fills that gap.

Source rules: [`ghost stories rules.pdf`](./ghost%20stories%20rules.pdf) (v3.3 Esoteric Order of Gamers summary, Oct 2019). When in doubt, that PDF is canonical for this implementation.

## Tech stack (locked)

TypeScript, Vite, React 19, hand-rolled SVG for the board and components, Trystero for WebRTC peer-to-peer multiplayer, Zustand for state, Vitest for tests. No backend — GitHub Pages is static-only.

Mirrors the [`catan/`](../catan/) project on purpose: same layering, same store conventions, same multiplayer model, same deployment story. Read the Catan CLAUDE.md alongside this one — most architectural decisions there carry over.

## Architecture

Five layers, separated by directory. Same shape as Catan:

- **`src/game/`** — pure TypeScript game logic. No React, no DOM, no network imports. All state mutations go through `applyAction(state, action) => state`. Deterministic — randomness (dice rolls, ghost-card draws) is decided by the acting player and baked into the action payload so all peers reduce to the same state. Unit-tested.
- **`src/ai/`** — pure heuristic AI for empty / AI Taoist seats. Exports `chooseAction(state, taoistId) => Action | null`. No React or store imports — same purity contract as `src/game/`. Returns null to signal "end turn".
- **`src/net/`** — Trystero/torrent wrapper. Typed channels for hello / lobby / start / action / snapshot / chat. Persistent UUID via `localStorage`. Short 4-char room codes. Consumed only by `networkStore`.
- **`src/ui/`** — React components + SVG board. Reads state from `src/store`, dispatches actions via the store, hosts the `AIDriver` component that runs AI moves.
- **`src/rulebook/`** — self-contained rulebook (TSX topics + inline SVG diagrams), rendered either as a full screen from the main menu or inside an overlay via the in-game `?` button.

Three Zustand stores under `src/store/`:

- **`gameStore`** — `GameState` + UI mode + dialogs + `handoffPending` (hot-seat) + `lastActionSnapshot` (game + logStore pair captured for the last reversible action, so `undo()` works in solo/hot-seat). Exposes `dispatch(action)` (broadcasts) and `applyLocal(action)` (silent, used by network receivers). `undo()` restores both `game` and `logStore` from the snapshot; solo/hot-seat only.
- **`networkStore`** — connection state, role (solo / host / guest / spectator), lobby, chat, online peer tracking. Registers with `gameStore` via `registerBroadcastHandler` to avoid circular imports.
- **`logStore`** — game-event log + per-turn timeline snapshots (Qi totals, ghosts exorcised, villagers killed, tiles haunted, dice rolled). Populated as a side effect of every successful `dispatch` / `applyLocal`. Exposes `snapshot()` / `restore()` so `gameStore.undo()` can keep both stores in sync. Lives outside `GameState` so the engine stays deterministic.

## Game model

Ghost Stories is a **cooperative** game. 1–4 Taoist players vs. the deck of ghost cards + Wu-Feng incarnations. There is no "winner" among players — they either all win (last incarnation exorcised) or all lose (any of three loss conditions).

### Core entities

- **Village** — 3×3 grid of 9 location tiles in a fixed layout. Each tile has two sides: **active** (with its villager — provides an action) and **haunted** (face-down, no action available). Center tile (1,1) always holds the **Circle of Prayer** for our default layout (configurable). Corner tiles let a Taoist exorcise / Buddha-place across two adjacent ghost spaces in one action.
- **Player boards** — 4 colored boards (red, blue, green, yellow), one per side of the village. Each board has:
  - 3 **ghost spaces** (rectangles) where ghost cards sit
  - 6 **haunting stones** (2 per ghost space — the 1st and 2nd "step" toward haunting the village)
  - 3 **Buddha spaces** (one per ghost space) for placed Buddha figurines
  - A **power stone** showing the Taoist's color-coded power (each board is double-sided with two different powers)
- **Taoists** — one per player board, started on the central village tile. Identified by board color (red, blue, green, yellow). Each color has two possible powers, picked at setup by the board's facing side.
- **Ghost cards** — deck of ~55. Each ghost has: color (red / green / blue / yellow / black), resistance (number of colored faces required for exorcism), 0–3 abilities split across left stone (on-arrival), center stone (each Yin phase), right stone (on-exorcism), and an optional reward.
- **Wu-Feng incarnations** — 9 boss cards (Howling Nightmare, Uncatchable, Death Army, Forgotten Ones, Bonecracker, Dark Mistress, Creeping Horror, Vampire Lord, Hope Killer, Nameless). Shuffled randomly, then **one** is inserted facedown 10 cards before the bottom of the deck (Normal/Initiation). On Nightmare/Hell, 4 incarnations are spaced 10 cards apart.
- **Tokens**: Qi (life), Yin-Yang (one-shot power), Tao (5 colored: red / green / blue / yellow / black), power tokens (let you use a neutral board's power), Buddha figurines (2 total, on the Buddhist Temple), Haunting figurines (4 — one per board, tracks how close a board is to having a tile haunted).
- **Dice**: 3 colored **Tao dice** (each face: red / green / blue / yellow / white-wild / black-curse; for exorcism only the colored + wild faces count as wild) and a single **curse die** (faces: no-effect / haunt-tile / spawn-ghost / lose-all-tao / lose-Qi, with various weights depending on the actual physical die — we'll match the rulebook summary).

### Turn structure

Players take turns clockwise. Each player's turn is two phases: **Yin** (the ghosts act) then **Yang** (the Taoist acts).

#### Yin Phase (Ghosts) — automatic, no choices except curse-die resolution

1. **Ghost actions** — for each ghost on the active player's board, apply its center-stone ability in left-to-right order if it has multiple:

   a. **Haunters** — advance the Haunting figure on that ghost's track. Card → first stone → second stone (flip the first active tile in front of the ghost to its haunted side; if already haunted, flip the next tile on the same line; Haunting figure returns to the card).

   b. **Tormentors** — roll the curse die:
   - **No effect** — nothing
   - **Haunt** — first active village tile in front of the ghost becomes haunted (same flipping rules as above)
   - **Spawn ghost** — bring a ghost card into play (Step 3 placement rules)
   - **Lose all Tao** — active player discards all Tao tokens
   - **Lose Qi** — active player loses 1 Qi

   For multi-ability ghosts, abilities apply **right-to-left** in White Moon — keep base-game left-to-right unless the expansion is loaded.

2. **Board overrun check** — if all 3 ghost spaces on the active board are occupied: lose 1 Qi and **end the Yin phase immediately** (skip step 3).

3. **Arrival of a ghost** — draw the top ghost card and place it:
   - **Color placement rule** — red/green/blue/yellow ghosts go on the matching color board; black ghosts go on the **active player's** board.
   - If the targeted board is full (3 ghosts), the active player chooses any other board with an empty space.
   - If all 12 spaces are occupied: lose 1 Qi instead of placing.
   - Apply the ghost's **left-stone** ability immediately on arrival.
   - **Wu-Feng incarnations** are not affected by the Sorcerer's Hut or Buddhas (Uncatchable excepted — it requires a Buddha). An incarnation placed on a Buddha space sends the Buddha back to the Temple but does not exorcise the incarnation.

#### Yang Phase (Taoist) — the active player's choices

The Yin-Yang power may be used **before or after** any step.

1. **Move (optional)** — move the Taoist to an **adjacent** village tile. Diagonal movement is allowed. Movement is to one of the 4 cardinal-or-diagonal neighbors (King's move) — Ghost Stories uses 8-way adjacency on the 3×3 grid.

2. **Request help OR attempt an exorcism** — choose exactly one:

   **Request help** — perform the action of the village tile the Taoist is standing on. Each of the 9 tile types has its own action (see "Village tiles" below). Haunted tiles have no action.

   **Exorcise** — pick a ghost on a space adjacent to the Taoist's tile (the ghost's board edge must touch the tile's edge). Roll 3 Tao dice. The exorcism succeeds if the colored faces match the ghost's resistance (e.g., a resistance "2 red + 1 green" needs two red faces and one green face among the three dice; white faces are wild; black faces never help). If dice don't match, the player may **spend Tao tokens** of the needed color to make up the difference (pooled from any Taoist standing on the same village tile). If insufficient: the exorcism **fails** — nothing happens (no penalty, but the action is spent).

   **Corner exorcism** — if the Taoist is on one of the 4 corner village tiles, they may attempt to exorcise **two adjacent ghosts in one roll** (combined resistance is the sum). Same rule for Buddha placement (place 2 Buddhas at once).

   On a successful exorcism: discard the ghost, apply its **right-stone** ability (curses always before rewards).

3. **Place a Buddha (optional)** — if you obtained a Buddha figurine on a previous turn (via the Buddhist Temple tile), you may place it on a Buddha space facing the Taoist's tile *iff* the corresponding ghost space is empty. Corner-tile rule: 2 Buddhas. Buddhas auto-discard any ghost (or incarnation, with exceptions) that arrives on / moves to that space, then return to the Temple.

### Yin-Yang power

Once per game per Taoist (or as refreshed by ghost rewards), spend the Yin-Yang token to either (a) request the action of **any** village tile (regardless of current position) **or** (b) flip a haunted tile back to active. Then return the token to the supply.

### Taoist powers (8 total — 2 per color)

Each board is double-sided. At setup, randomly assign a color and pick a side.

- **Red — Dance of the Spires** — fly to any village tile during your move (instead of adjacent-only).
- **Red — Dance of the Twin Winds** — before your move, move 1 other Taoist 1 space.
- **Blue — Heavenly Gust** — request help and attempt an exorcism in the same turn (in either order).
- **Blue — Second Wind** — request help twice OR attempt 2 exorcisms (independent rolls — can't combine partial dice across the two).
- **Green — The Gods' Favorite** — reroll any Tao dice during a support/exorcism action, and may reroll the curse die. Must keep the second result.
- **Green — Strength of a Mountain** — exorcisms use a 4th gray die; never roll the curse die.
- **Yellow — Bottomless Pockets** — before your move, take 1 Tao token of any color from the supply.
- **Yellow — Enfeeblement Mantra** — before your move, place a Mantra token on any ghost in play; its resistance drops by 1 (any color). Recovered when that ghost leaves play.

### Death of a Taoist

A Taoist at 0 Qi dies. All their possessions (Tao tokens, Buddha figurines, Yin-Yang, power tokens) are lost. Figure is laid on the **Cemetery** tile. Ghosts on their board **remain in play**. The board becomes **possessed**: its power token is flipped inactive, and Yin phase still runs (steps 1+2 — no step 3, no Yang phase) — the **active player** absorbs any Qi loss caused by a ghost ability on that board (green Taoist's power is ineffective if the loss is due to a die roll). The player continues to participate (advise / discuss) and can come back via Cemetery action.

### Winning and losing

**Win**: the last Wu-Feng incarnation is exorcised. If a final curse from that incarnation kills a Taoist or triggers the 3rd haunting, the players still **lose**.

**Lose** — any of:
1. All Taoists are dead (0 Qi each)
2. A **3rd** village tile is haunted
3. The ghost deck is exhausted while a Wu-Feng incarnation is still in the deck or in play

### Difficulty levels

- **Initiation** — 4 Qi start, all 5 Tao token colors including black, 1 incarnation.
- **Normal** — 3 Qi start, no starting black Tao, 1 incarnation.
- **Nightmare** — Normal rules + 4 incarnations (or 3 for 1-2p) spaced every 10 cards from the deck bottom.
- **Hell** — Nightmare + no starting Yin-Yang token.

### 1, 2, 3 player rules (neutral boards)

Empty Taoist colors become **neutral boards**. Neutral board's Yin phase has no Step 3 (no ghost-arrival on its turn), no Yang phase at all. They start with 3 Qi (not 4). Removing 5 ghost cards (unseen) from the deck per missing player.

In solo: the red board must use **Dance of the Spires**; player starts with 1 Tao of each color (+ black on Initiation) and 3 power tokens; no Cemetery aid; the Pavilion of the Heavenly Wind action moves your own Taoist instead.

**Power tokens** let the active player use a neutral board's power during their Yang phase (one per power, multiple tokens may be spent in one turn). After a Taoist dies, their power tokens land on the central village tile and can be reclaimed by any Taoist ending their turn there.

### Village tiles — 9 actions (every base-game game uses all 9)

The 9 tiles are arranged randomly in the 3×3 layout at setup, all face-up:

| Tile | Action |
|---|---|
| **Circle of Prayer** | Place a Tao token from supply on the tile (or change the existing one). All ghosts of the token's color get -1 resistance for any exorcism, anywhere. The token stays after an exorcism. |
| **Buddhist Temple** | Take a Buddha figurine. Place it on a Buddha space at the **end of your next Yang phase** (or this turn's Step 3). |
| **Cemetery** | Bring a dead Taoist back: they return with 2 Qi, then roll the curse die. A "haunt" face haunts the Cemetery itself. |
| **Taoist Altar** | Nullify the haunting of 1 village tile (flip it active again), then bring a ghost into play. |
| **Herbalist's Shop** | Roll 2 Tao dice and take Tao tokens of those colors from supply. Each white face → free choice of color. |
| **Sorcerer's Hut** | Discard any 1 ghost in play (no curse, no reward). Lose 1 Qi. |
| **Night Watchman's Beat** | Move all Haunting figures on 1 chosen board backward 1 stone. |
| **Pavilion of the Heavenly Wind** | Move any ghost in play to any free space (any board), then move another Taoist normally. (Solo: move your own Taoist.) Ghost properties travel with it (Haunting figure relative position, mantra, inactive-power marker). |
| **Tea House** | Take a Tao token of any color + gain 1 Qi (max 4 Qi total, or 3 on Normal+). Then bring a ghost into play. |

### Ghost ability icon legend

| Icon family | Meaning |
|---|---|
| **Left stone** (on arrival) | Add a ghost · Haunt a tile · Lose 1 Qi · Haunter setup (place haunting figure) · Direct-haunting (place figure on board, skipping card) |
| **Center stone** (each Yin) | Haunter (advance haunting figure) · Tormentor (roll curse die) · Power-blocker (inactive power token on this board) · Tao-blocker (Inactive Tao marker — no Tao spends allowed) · Die-captor (holds 1 Tao die — exorcisms roll N-1 dice) · Dice-immune (Tao dice don't work on this ghost; Tao tokens / Circle of Prayer / Buddha / Sorcerer still work) · Group-effect (applies to every player and every board) |
| **Right stone** (on exorcism) | Roll curse die · Receive 1 Qi or regain Yin-Yang · Receive 1 Tao of choice · Receive 2 Tao of choice · Lose 1 Tao · Incarnation: return 1 Qi + 1 Yin-Yang to the group (players assign) |

Buddha- or Sorcerer-discarded ghosts do **not** apply their curses or grant their rewards.

### Incarnation special rules

- **Howling Nightmare** — Taoists can exorcise this only if the haunting stone facing it on the opposite board is **not** occupied by a ghost.
- **Uncatchable** — must be on a tile with a Buddha to be exorcised. Only incarnation affected by Buddhas (a Buddha doesn't auto-discard it — it just enables the exorcism).
- **Death Army** — active player rolls the curse die each Yin phase, and again when this incarnation is destroyed.
- **Forgotten Ones** — while in play, all Taoist powers (including power tokens) are disabled.
- **Bonecracker** — every player discards a Tao token on its arrival; the player who hosts it discards another at the start of each of their Yin phases (even on a neutral board).
- **Dark Mistress** — Tao tokens cannot be spent (the Inactive Tao marker comes out) while it lives.
- **Creeping Horror** — captures one Tao die on arrival; exorcisms roll 2 dice instead of 3 until killed.
- **Vampire Lord** — a Haunter with resistance 4.
- **Hope Killer** — resistance 8 (2 of each color). Roll curse die on destruction.
- **Nameless** — resistance 1 of each color (5 total). On arrival, discards the Tao token on the Circle of Prayer. White faces no longer wild while alive.

## Engine action union (draft)

```ts
type Action =
  | { type: 'startGame', config: GameConfig, deckSeed: number, layoutSeed: number }
  | { type: 'rollCurseDie', taoistId: TaoistId, source: CurseSource, result: CurseFace }
  | { type: 'haunterAdvance', boardColor: BoardColor, ghostSpaceIdx: 0|1|2 }
  | { type: 'spawnGhost', card: GhostCardId, targetBoard: BoardColor, targetSpace: 0|1|2 }
  | { type: 'requestHelp', taoistId: TaoistId, tileId: VillageTileId, params?: ActionParams }
  | { type: 'rollExorcism', taoistId: TaoistId, ghostRefs: GhostRef[], dice: TaoDieResult[], reroll?: TaoDieResult[] }
  | { type: 'commitExorcism', taoistId: TaoistId, ghostRefs: GhostRef[], spentTao: TaoColor[] }
  | { type: 'moveTaoist', taoistId: TaoistId, tileId: VillageTileId }
  | { type: 'placeBuddha', taoistId: TaoistId, ghostSpaceRef: GhostSpaceRef }
  | { type: 'useYinYang', taoistId: TaoistId, effect: YinYangEffect }
  | { type: 'spendPowerToken', taoistId: TaoistId, neutralBoard: BoardColor }
  | { type: 'usePower', taoistId: TaoistId, powerEffect: PowerEffectParams }
  | { type: 'reviveTaoist', deadTaoistId: TaoistId, byTaoistId: TaoistId, curseResult: CurseFace }
  | { type: 'endTurn', taoistId: TaoistId }
  // Yin-phase resolution sub-actions
  | { type: 'resolveYinStep1', taoistId: TaoistId, curseRolls: CurseFace[] }
  | { type: 'overrunCheck', boardColor: BoardColor }
```

**Determinism**: every random outcome (dice, curse die, ghost draws) is the **result**, not the seed. The acting peer rolls locally and sends the result in the action payload. All peers reduce identically. This is the same model as Catan.

The engine drives the Yin phase as a sequence of sub-actions (one per ghost ability) so each peer can stream the resolution; alternatively a single `runYinPhase` action carrying all sub-results works too. We'll prototype with sub-actions for log clarity, then consolidate if it's noisy.

## Multiplayer model

- **Trystero `/torrent`** for WebRTC signaling (BitTorrent trackers). No backend. App ID `ghost-stories-v1`; room code doubles as the password for E2E encryption.
- Trystero `peerId` is volatile. Stable identity is a `localStorage` UUID (`ghoststories.uuid`), exchanged via the `hello` channel.
  - **Local testing escape hatch**: appending `?fresh` to the URL switches identity storage to `sessionStorage` so two windows in the same incognito session don't collide on the same UUID.
- Full state replication: every peer holds the full `GameState`.
- Actions broadcast as `{ action, byUuid }` envelopes; receivers verify the UUID owns the action's Taoist seat.
- Randomness baked into actions (see Determinism above).
- **Lobby** is host-authoritative. Host owns `LobbyState`, broadcasts on change. Host clicks Start → broadcasts initial `GameState`.
- **Rejoin / spectator**: late peer joining mid-game gets a `snap` (full state + chat + seat-UUID mapping). UUID matches a seat → guest. Else spectator.
- **Disconnect**: pause indefinitely. UI shows offline dot + `ConnectionStatusOverlay`.
- **AI in online**: only the host runs `AIDriver`. If host drops, AIs freeze.
- **Chat**: in-memory in `networkStore.chat`, not part of `GameState`.
- No anti-cheat — friends-only.

## Hot-seat model

- Single-device play. After each turn, a **handoff screen** (`HandoffOverlay`) covers the board until the next player taps to reveal — keeps the next player from seeing the previous player's Yin-Yang state, hidden Tao tokens, etc.
- In Ghost Stories most info is open (Tao tokens are placed in front of the player but visible to all). The handoff is more about pacing — letting the next player center on their own board — than information hiding. Still worth the screen.
- Hot-seat supports AI seats: AI takes its turn automatically with a `~700ms` delay between sub-actions for visibility, no handoff needed for AI→AI or AI→human transitions (just brief animation).

## AI model

Pure heuristic, stateless across turns. Defined in `src/ai/`.

- `chooseAction(state, taoistId)` returns the next action or null (meaning "end Yang phase"). The React `AIDriver` schedules these with ~700 ms delays for visibility (~3 s for high-impact moves like exorcism rolls).
- **Priority tree** (rough; tune with playtests):
  1. **Critical exorcism** — a ghost about to advance to "haunt a tile" AND we'd hit the 3rd haunting → must try.
  2. **Lethal-prevention exorcism** — a ghost about to kill a Taoist at 1 Qi → must try.
  3. **High-success exorcism** — ghost adjacent, expected success ≥ 80% given hand + dice + Circle-of-Prayer / Mantra.
  4. **Critical request help** — Cemetery to revive (if a Taoist is dead and we're on it), Taoist Altar (if a tile is haunted), Night Watchman's (if a haunting figure is on stone 2 of any board).
  5. **Buddha placement** — if a Buddha is in hand and a ghost is on the matching space.
  6. **Tao accumulation** — Herbalist / Tea House / Circle of Prayer to set up future exorcisms.
  7. **Move to threat** — reposition adjacent to the highest-resistance ghost we have the colors for.
  8. **End turn**.
- **Threat model** (`src/ai/threats.ts`): per-board "pressure" score = (ghosts on board × 1) + (haunting figures × 1.5) + (Tormentors × 0.7) + (board possessed × 2). Drives target selection.
- **Exorcism expected value**: simulate dice roll given current Tao tokens + Circle of Prayer discount + Mantra + power adjustments. Threshold ~70% for non-critical attempts.
- **Resource value**: Tao token weights tuned to board state (a red token is worth more when there are 2 red ghosts in play). Yin-Yang weighted 5+ (saved for emergencies). Buddha weighted ~4.
- One competent difficulty level. No state in the AI between turns.

## UI conventions

- **Layout**: a CSS grid centered on the 3×3 village. The 4 player boards live on the outer sides: red on top, blue on right, green on bottom, yellow on left (matching the physical game). Bottom strip holds `HandPanel` (active player's Tao tokens / Yin-Yang / Buddha figurines) + `ActionBar`. Right side panel: `SidePanelTabs` (Log / Chat / Help).
- **Board rendering**: `VillageSVG` is a pure presentational component that takes `game: GameState` as a prop. Sub-components (`VillageTile`, `Taoist`, `GhostCard`, `HauntingFigure`, `BuddhaFigure`, `PowerStone`, `TaoToken`) take their state via prop.
- **Tile orientation**: village tiles render with their action graphic in a fixed orientation; the Taoist figure overlays the tile they occupy. Each tile has an "edge" facing each of the 4 player boards (top/right/bottom/left). When a Taoist exorcises, the highlight shows which ghost spaces are reachable.
- **Active-board indicator**: the active player's board gets a glowing border + their Taoist's color halo. There is no "phase banner" — phase is implicit from the action prompts in `ActionBar`.
- **Docked dialogs**: exorcism roll dialog, curse-die roll dialog, place-Buddha selection, request-help parameters (e.g., Pavilion ghost-move target). Same `DialogShell` pattern as Catan with `variant="docked"` / `"modal"`.
- **Player colors** come from `src/ui/shared/playerColors.ts` — `TAOIST_COLORS`, `TAOIST_COLOR_HEX`, `taoistColorVar(c)`. Red, blue, green, yellow are canonical. Don't add more colors — only 4 boards exist in the base game.
- **Clocks**: `GameClock` shows total wall-clock time. No per-turn timer in v1 (the game is short; the value isn't proven).
- **Game log**: `LogPanel` reads from `logStore.entries`. Curse die rolls, exorcism rolls (dice + spent Tao), Yin-Yang spends, deaths, hauntings, ghost arrivals all log. Auto-scroll only when at bottom.

## SVG art

The game is visually distinct — pen-and-ink Chinese ink-painting style in the original. We render:

- **Village tiles** (9 tile types × 2 sides) as inline SVG modules under `src/ui/svg/tiles/`. Each tile is roughly a 240×240 square with a stylized illustration of the location (Circle of Prayer, Buddhist Temple, etc.) and an icon strip for the action.
- **Ghost cards** (`src/ui/svg/GhostCard.tsx`) as a parametric component that reads `(color, resistance, leftAbility, centerAbility, rightAbility, reward)` and composes the card from primitives — colored border, resistance pips at top, 3 ability stones, optional reward stone.
- **Taoist figures** (`src/ui/svg/Taoist.tsx`) — 4 colored standing-monk silhouettes. Lay on Cemetery when dead.
- **Tokens** — Qi (red dot), Yin-Yang (yin-yang symbol), Tao tokens (5 colored coins), power tokens (small circle with the color of the board), Buddha figurine, Haunting figurine (a stylized wisp).
- **Dice** — 3 Tao dice (cube face SVG, with colored / wild / curse faces), curse die (5 faces).
- **Player boards** (`src/ui/svg/PlayerBoard.tsx`) — 1 per color, parametric on which side (which power) is active. 3 ghost-card slots + Haunting track + 3 Buddha spots + power stone.

Where the original art is copyrighted, we use **silhouette / pictographic** equivalents (e.g., a torii gate icon for the Buddhist Temple; a calligraphy brush for the Sorcerer's Hut). No copyrighted art in the repo.

Inline SVG (not external `.svg` files) so the components animate cleanly and don't add network requests on Pages.

## Non-goals (do not implement)

- Persistent game saves between sessions
- User accounts, matchmaking, lobby browser
- Anti-cheat / verifiable randomness
- Monetization, ads, telemetry
- Server-side anything
- Asset extraction from the physical game (we redraw our own SVG)

## Conventions

- Strict TypeScript. No `any` unless genuinely necessary.
- Co-locate tests next to the code: `engine.ts` and `engine.test.ts` side by side.
- The game logic layer must not import from `src/ui`, `src/net`, or `src/store`.
- The net layer may import from `src/game` but not `src/ui`.
- Path alias: `@/` → `src/`.

## Commands

- `npm run dev` — local dev server at http://localhost:5173/ghost-stories/
- `npm run build` — production build (`tsc` typecheck then `vite build`)
- `npm run test` — Vitest watch
- `npm run test:run` — Vitest single run
- `npm run typecheck` — `tsc` (no emit)

## Deployment

`.github/workflows/deploy.yml` builds and deploys to GitHub Pages on push to `main`. The Vite `base` is `/ghost-stories/` to match the repo name. If the repo is renamed, update `base` in `vite.config.ts`.

## Roadmap

- [x] **Phase 0** — Project scaffold (Vite, React, TS, dirs, deploy workflow, placeholder UI)
- [x] **Phase 1** — Game logic engine (18/18 tests passing)
  - 1a. Types + initial state generator (`createGame` in [src/game/setup.ts](src/game/setup.ts))
  - 1b. Yin phase resolution ([src/game/actions/yin.ts](src/game/actions/yin.ts))
  - 1c. Yang phase actions ([src/game/actions/yang.ts](src/game/actions/yang.ts))
  - 1d. Right-stone abilities (curses-before-rewards in `applyOnExorcism`)
  - 1e. Win/lose detection ([src/game/actions/winLose.ts](src/game/actions/winLose.ts))
  - 1f. Village tile actions ([src/game/actions/villageTiles.ts](src/game/actions/villageTiles.ts))
  - 1g. Taoist powers (all 8 wired in [src/game/actions/yang.ts](src/game/actions/yang.ts))
  - 1h. Death / revival / possessed-board ([src/game/actions/hauntingAndQi.ts](src/game/actions/hauntingAndQi.ts))
  - 1i. Neutral boards (1-3 player mode)
  - 1j. Ghost catalogue: 45 base ghosts + 9 incarnations ([src/game/ghostCatalogue.ts](src/game/ghostCatalogue.ts))
- [x] **Phase 2** — Hot-seat UI
  - MainMenu + NewGame (difficulty + per-seat config) under [src/ui/](src/ui/)
  - GameView with 4 player boards (rotated to face the village), VillageBoardSVG with Taoist figures + Circle-of-Prayer token + Cemetery dead-figure overlay
  - ActionBar with Move / Request help / Exorcise / Place Buddha / Yin-Yang / End turn
  - ExorcismDialog (Tao-die roll, Tao token spend across same-tile Taoists, Gods' Favorite reroll, success/fail verdict)
  - RequestHelpDialog with a sub-form for every tile that needs params (Circle / Cemetery / Altar / Herbalist / Sorcerer / Watchman / Pavilion / Tea House / Buddhist Temple)
  - YinPhaseRunner auto-rolls curse dice + spawns ghosts deterministically (RNG outside the engine)
  - HandoffOverlay between hot-seat turns
  - LogPanel reading from `logStore.recordAction`
  - GameOverOverlay on win/loss
- [x] **Phase 3** — Heuristic AI
  - [src/ai/value.ts](src/ai/value.ts) — `exorcismSuccessProbability`, `planTaoSpend` (greedy min-spend planner, black-first because wilds can't substitute, expected colored yield per die for pessimistic planning), `ghostThreat`, `boardPressure`, `taoistHandValue`.
  - [src/ai/main.ts](src/ai/main.ts) — `chooseAction(state, taoistId)` returns `Action | null`; null = end Yang phase. 7-tier priority tree: (1) critical exorcism when `hauntedCount >= 2`, (2) lethal-prevention when `qi <= 1`, (3) high-success exorcism (threshold 0.55), (4) Buddha placement on highest-pressure reachable board, (5) critical tile actions (Cemetery revive, Altar unhaunt, Night Watchman on most-haunted board, Sorcerer's Hut against dice-immune ghosts), (6) Tao accumulation (Herbalist if hand < 4, Tea House if Qi/hand low, Buddhist Temple when hand empty, Circle of Prayer on most-prevalent ghost color), (7) reposition toward highest-threat ghost via 1-step Chebyshev-shortest move.
  - [src/ui/game/AIDriver.tsx](src/ui/game/AIDriver.tsx) — React component watching the store. When the active seat is AI, dispatches one action per ~700ms tick (~1.5s for exorcism so the dice roll is visible). Suspended when a human dialog overlay is open. On exception ends turn rather than spinning.
  - 4 AI smoke tests: returns null on quiet state, ignores non-active seat queries, places a Buddha when available, drives 16 rounds end-to-end without throwing.
- [ ] **Phase 4** — Online multiplayer (Trystero peer-to-peer) + in-game chat
- [ ] **Phase 5** — End-of-game match stats (Qi over time, ghosts exorcised per Taoist, dice luck, curse die history)
- [ ] **Phase 6** — Self-contained rulebook with search
- [ ] **Phase 7** — White Moon expansion (Su-Ling, moon crystals, villager families, mystic barrier, devourer ghosts, new ghost cards, new tile: Kung-Fu School)
- [ ] **Phase 8** — Black Secret expansion (Wu-Feng player, catacombs board, bloody mantras, blood brothers, demons, Shadow of Wu-Feng) — note this changes the multiplayer shape from full-coop to one-vs-many; lobby UI needs a mode toggle
- [ ] **Phase 9** — Difficulty tuning + Hell-mode polish

## Where to start next

Phases 0–3 complete; engine + UI + AI are wired and tested. A solo game (1 human + 3 AI) plays end-to-end at Initiation difficulty.

**Phase 4 — Online multiplayer.** Trystero `/torrent` WebRTC. Channels and stable-UUID protocol are described in the "Multiplayer model" section above. Implement [src/net/index.ts](src/net/index.ts) with `joinRoom(code) → { send, listen, peers, role }`, hook up the lobby UI alongside `NewGame.tsx`, and add the broadcast side of `gameStore.dispatch` (every successful dispatch sends an `{ action, byUuid }` envelope; receivers verify seat ownership before calling `applyLocal`). AI seats are owned by the host (only the host runs `AIDriver`).

**Phase 2 / 3 polish backlog (still worth doing):**
- Power-token spending UI (engine supports `spendPowerToken` but no button surfaces it)
- Corner-tile dual exorcism (engine supports `ghosts: [r1, r2]`; UI currently caps at 1)
- AI: corner-tile dual exorcism, better Tao spend (currently planning is pessimistic — many viable exorcisms slip below threshold)
- AI: Pavilion / Yin-Yang usage (no current heuristics for these)
- Bonecracker / Nameless arrival animations (left-stone events fire silently)
- Pavilion of Heavenly Wind: surface the forced second Taoist move (currently auto-skipped)
- Tile-action `arrival` sub-step (Taoist Altar / Tea House should chain a ghost arrival — currently the UI omits the payload)
- Wider screen sizes (the rotated boards consume horizontal space)
