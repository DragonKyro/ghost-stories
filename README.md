# Ghost Stories

A web-based clone of the cooperative board game *Ghost Stories* (Antoine Bauza, Repos Production, 2008), built for private play with friends.

The physical game is out of print and there is no official digital version — this fills that gap.

**🎲 Play it (eventually):** https://dragonkyro.github.io/ghost-stories/

### Playable today

**Local hot-seat (Phase 2 build):** 1–4 humans on the same device. Configure difficulty (Initiation / Normal / Nightmare / Hell) and per-seat assignment (human / AI / neutral board) from the New Game screen. The Yin phase auto-resolves; the active Taoist's Yang phase is fully interactive (move, request help, exorcise with dice, place Buddha, spend Yin-Yang). Pass-device handoff screen between human turns. All 9 village tile actions, all 4 Taoist boards with both possible powers, win/loss detection for all three loss conditions and the incarnation-exorcism win.

**AI seats (Phase 3 build):** Any seat can be set to AI from the New Game screen. The heuristic prioritises critical-now exorcism (preventing the 3rd haunting), lethal-prevention exorcism (saving a 1-Qi Taoist), high-success exorcism, Buddha placement on high-pressure boards, critical tile actions (Cemetery revive, Taoist Altar unhaunt, Night Watchman rollback, Sorcerer's Hut on dice-immune ghosts), Tao accumulation (Herbalist / Tea House / Buddhist Temple / Circle of Prayer), and repositioning toward the highest-threat ghost. Pure heuristic, stateless across turns. AI seats also enable solo play — pick one human seat + three AI seats for a 4-Taoist game.

**Online multiplayer (Phase 4 build):** Click *Online Multiplayer* on the main menu, pick a display name, then host a room or join one with a 4-character code. The host's machine drives the Yin phase (curse dice, ghost arrivals) and any AI seats; all peers run the same deterministic engine on every action. Drop out and re-join with the same code to reclaim your seat (identity persists via a `localStorage` UUID). Players without a matching UUID join as read-only spectators. In-game chat with history is auto-shipped to new joiners via the snapshot. WebRTC over BitTorrent trackers (Trystero) — no backend, no accounts.

**White Moon expansion (Phase 7 build):** Toggle from the New Game screen. Adds 24 villagers across 12 families (8 stacks of 3), 10 new ghost cards including the Devourer ability, Moon Crystals (captured from the Herbalist's white face, spendable like wild Tao), the Portal tile for saving villagers, and the Kung-Fu School tile replacing Night Watchman's Beat. Hauntings kill villagers on the tile instead of flipping it; lose immediately at 12 villager deaths. See the rulebook's *White Moon* topic for what's simplified (per-family curses/rewards, Su-Ling movement, mystic barrier — deferred).

## What is Ghost Stories?

1–4 Taoist monks defend a Chinese village from the ghosts of Wu-Feng, who is trying to return to the realm of the living. Every turn, ghosts spawn on one of the 4 player boards arrayed around the 3×3 village; the active Taoist gets one move and one action — exorcise a ghost or use the village tile they're standing on — and ghosts close in. Hold out long enough to draw the bottom of the deck, exorcise every Wu-Feng incarnation hidden there, and the monks win.

It is brutally hard. Most cooperative games are cooperative-difficult; Ghost Stories is famously coop-*punishing*. The Esoteric Order of Gamers rules summary in [`ghost stories rules.pdf`](./ghost%20stories%20rules.pdf) is the canonical reference for this implementation.

## Roadmap

- [x] **Phase 0** — Project scaffold
- [x] **Phase 1** — Game logic engine (Yin / Yang phases, 9 village tiles, 8 Taoist powers, 9 Wu-Feng incarnations, 45 base ghost cards, neutral-board variant for 1-3 players, full win/loss detection)
- [x] **Phase 2** — Hot-seat UI (SVG board, 4 rotated player boards, request-help dialog for every tile, exorcism dialog with dice rolls + Tao spending, place-Buddha selector, Yin-Yang flip-tile mode, Yin-phase auto-runner, pass-device handoff screen, event log, game-over overlay)
- [x] **Phase 3** — Heuristic AI for missing seats (priority tree: critical exorcism → lethal-prevention → high-success exorcism → Buddha placement → critical tile actions → Tao accumulation → reposition; AIDriver paces moves at ~700ms/1.5s for visibility)
- [x] **Phase 4** — Online multiplayer (Trystero WebRTC peer-to-peer) + in-game chat with history (host-authoritative lobby, stable UUID identity, 7 typed channels: hello / lobby / start / action / snap / reqSnap / chat; spectator mode for unrecognised UUIDs; snapshot rejoin including chat history)
- [x] **Phase 6** — Self-contained rulebook with search (12 topics across 5 categories; inline SVG diagrams; main-menu entry + floating in-game `?` button). Fixed two rulebook violations along the way: 3-player Nightmare/Hell incarnation count and solo bonuses.
- [x] **Phase 7** — White Moon expansion (core mechanics in: 24 villagers / 12 families, 10 new ghost cards with Devourers, Moon Crystals, Save Villager action, Kung-Fu School tile, 12-dead loss condition. Per-family curses/rewards + Su-Ling movement + mystic barrier deferred — documented in the rulebook topic.)
- [ ] **Phase 5** — End-of-game stats
- [ ] **Phase 7** — White Moon expansion (Su-Ling, villager families, moon crystals, mystic barrier)
- [ ] **Phase 8** — Black Secret expansion (one player plays Wu-Feng — asymmetric)
- [ ] **Phase 9** — Difficulty tuning + Hell-mode polish

## Tech stack

- **TypeScript** + **Vite** + **React 19**
- **SVG** for the board (hand-rolled, no Canvas)
- **Zustand** for state management
- **Vitest** for tests
- **Trystero** (BitTorrent-tracker signaling) for WebRTC peer-to-peer multiplayer

Mirrors the [`catan/`](../catan/) project structure on purpose: same five-layer architecture (`game` / `ai` / `net` / `ui` / `rulebook`), same store conventions, same deployment story.

## Local development

```sh
npm install
npm run dev        # http://localhost:5173/ghost-stories/
npm run test       # Vitest watch
npm run test:run   # Vitest single run
npm run build      # Production build to dist/
npm run typecheck
```

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the site and publishes it to GitHub Pages.

### Testing online multiplayer locally

Two browser windows in the same incognito session share `localStorage`, which gives them the same identity UUID and breaks seat assignment. Append `?fresh` to the URL of each test window to force a per-tab UUID via `sessionStorage` instead.

## Scope

Intentionally **not** included: user accounts, matchmaking, monetization, anti-cheat, persistent saves, asset extraction from the physical game. Friends-only project — none of that pays for itself at this scale.

## Credits

- Original game design: Antoine Bauza
- Original publisher: Repos Production (2008)
- Rules summary reference: Peter Gifford (Universal Head), Esoteric Order of Gamers
- This implementation: a private friends-only fan project, no affiliation with the publisher
