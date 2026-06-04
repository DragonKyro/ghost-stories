# Ghost Stories

A web-based clone of the cooperative board game *Ghost Stories* (Antoine Bauza, Repos Production, 2008), built for private play with friends.

The physical game is out of print and there is no official digital version — this fills that gap.

**🎲 Play it (eventually):** https://dragonkyro.github.io/ghost-stories/

## What is Ghost Stories?

1–4 Taoist monks defend a Chinese village from the ghosts of Wu-Feng, who is trying to return to the realm of the living. Every turn, ghosts spawn on one of the 4 player boards arrayed around the 3×3 village; the active Taoist gets one move and one action — exorcise a ghost or use the village tile they're standing on — and ghosts close in. Hold out long enough to draw the bottom of the deck, exorcise every Wu-Feng incarnation hidden there, and the monks win.

It is brutally hard. Most cooperative games are cooperative-difficult; Ghost Stories is famously coop-*punishing*. The Esoteric Order of Gamers rules summary in [`ghost stories rules.pdf`](./ghost%20stories%20rules.pdf) is the canonical reference for this implementation.

## Roadmap

- [ ] **Phase 0** — Project scaffold
- [ ] **Phase 1** — Game logic engine (Yin / Yang phases, 9 village tiles, 8 Taoist powers, 9 Wu-Feng incarnations, ~55 ghost cards, neutral-board variant for 1-3 players)
- [ ] **Phase 2** — Hot-seat UI (SVG board, handoff screen, all dialogs)
- [ ] **Phase 3** — Heuristic AI for missing seats
- [ ] **Phase 4** — Online multiplayer (Trystero WebRTC peer-to-peer) + in-game chat
- [ ] **Phase 5** — End-of-game stats
- [ ] **Phase 6** — Self-contained rulebook with search
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
