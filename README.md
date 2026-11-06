# Ghost Stories

A web version of the cooperative board game *Ghost Stories* (Antoine Bauza, Repos Production, 2008), built for private play with friends. The physical game is out of print and there is no official digital version.

**Play:** https://dragonkyro.github.io/ghost-stories/

## What you can play

- **On one device:** solo, or hot-seat for 2–4 players, with AI on any seat. Every difficulty (Initiation / Normal / Nightmare / Hell), each board's power chosen or random, the 1–3 player rules (neutral boards, power tokens, the solo bonuses).
- **Online:** create a room, share the 4-letter code or link, sit at the boards, start. Seats can be people, AI (run by the host) or neutral. Rejoin a game in progress from the same browser; anyone else who opens the link watches. In-game chat.
- **White Moon:** villagers and their families, fleeing and Devourers, Su-Ling, moon crystals, the receptacles and the Mystic Barrier, the Portal and the Kung-Fu School.
- **Black Secret:** one more player (or the AI) is Wu-Feng — every ghost drawn is theirs to place, turn into a demon or spend on a curse; catacombs under the village with ladders, demons and tokens; Bloody Mantras, blood brothers, the Shadow of Wu-Feng, the Calligrapher.

The turn follows the rulebook step by step: the Yin phase resolves on its own (and stops for every choice the rules give the players: where an arriving ghost goes, who takes a possessed board's Qi loss, the Gods' Favorite reroll, …); the Yang phase panel shows the three steps in order with only the moves the rules allow at that moment. A searchable rulebook is one click away.

## What is Ghost Stories?

1–4 Taoist monks defend a Chinese village from the ghosts of Wu-Feng. Every turn a ghost arrives on one of the 4 player boards around the 3×3 village; the active Taoist moves, then either asks a villager for help or exorcises a ghost with the Tao dice. Hold out until the incarnation of Wu-Feng hidden near the bottom of the deck appears, exorcise it, and the monks win. It is famously hard.

The Esoteric Order of Gamers rules summary in [`ghost stories rules.pdf`](./ghost%20stories%20rules.pdf) is the canonical reference. Where it is silent (the printed card list, the White Moon family tiles, the Black Secret curse tokens and Mantra cards…), this version uses its own designs; the in-game rulebook lists them under "About this version".

## Roadmap

- [x] Rules engine following the summary: base game, White Moon, Black Secret (deterministic, seeded dice, step-by-step prompts)
- [x] Heuristic AI for Taoists and for Wu-Feng
- [x] Game screen and hand-drawn ink-painting art set
- [x] Online multiplayer on Firebase Realtime Database
- [x] Rulebook with search
- [ ] Stronger AI (lookahead)
- [ ] End-of-game stats
- [ ] Phone-sized layout

## Ideas for later

- **Last Bastion** — Antoine Bauza's re-themed version of Ghost Stories (fantasy heroes defending a fortress from the horde). Possibly recreate it here on top of the same engine.

## Tech stack

- **TypeScript** + **Vite** + **React 19**, **Zustand**, **Vitest**
- Inline **SVG** art, drawn for this project
- **Firebase Realtime Database** (anonymous auth) for online rooms — shared project, this app's data under `ghost-stories`

Same layering as the [`catan/`](../catan/) project: `game` (pure rules engine) / `ai` / `net` / `store` / `ui` / `rulebook`. See [CLAUDE.md](./CLAUDE.md).

## Local development

```sh
npm install
npm run dev        # http://localhost:5173/ghost-stories/
npm run test:run   # all tests once
npm run build      # typecheck + production build to dist/
npm run deploy:rules   # deploy the database rules (merged with the other apps' rules)
```

Testing online with two windows on one computer: add `?fresh` to each window's address so they count as different players.

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the site and publishes it to GitHub Pages.

## Scope

Not included on purpose: user accounts, matchmaking, monetization, anti-cheat, saved games, art from the physical game.

## Credits

- Original game design: Antoine Bauza; publisher: Repos Production (2008)
- Rules summary: Peter Gifford (Universal Head), Esoteric Order of Gamers
- This implementation: a private, friends-only fan project, no affiliation with the publisher
