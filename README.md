# Ghost Stories & Last Bastion

A web version of the cooperative board games *Ghost Stories* (Antoine Bauza, Repos Production, 2008) and its fantasy re-implementation *Last Bastion* (Antoine Bauza, Repos Production, 2019), built for private play with friends.

**▶ Play it here: [dragonkyro.github.io/ghost-stories](https://dragonkyro.github.io/ghost-stories/)** (runs in the browser on desktop, tablet or phone; nothing to install)

## What you can play

- **Game selection on the home screen:** choose between **Ghost Stories** (Taoist monks defending a village from the ghosts of Wu-Feng) and **Last Bastion** (fantasy heroes defending the Bastion of the Ancient Kings against the Monstrous hordes and Warlords of the Baleful Queen).
- **On one device:** solo, or hot-seat for 2–4 players, with AI on any seat. Every difficulty (Initiation / Normal / Nightmare / Hell in Ghost Stories; Novice / Normal / Difficult / Heroic in Last Bastion), each board's power / hero chosen or random, the 1–3 player rules.
- **Online:** create a room (for Ghost Stories or Last Bastion), share the 4-letter code or link, sit at the boards, start. Seats can be people, AI (run by the host) or neutral. Rejoin a game in progress from the same browser; anyone else who opens the link watches. In-game chat.
- **Ghost Stories expansions:**
  - **White Moon:** villagers and their families, fleeing and Devourers, Su-Ling, moon crystals, the receptacles and the Mystic Barrier, the Portal and the Kung-Fu School.
  - **Black Secret:** one more player (or the AI) is Wu-Feng — every ghost drawn is theirs to place, turn into a demon or spend on a curse; catacombs under the village with ladders, demons and tokens; Bloody Mantras, blood brothers, the Shadow of Wu-Feng, the Calligrapher.
- **Last Bastion (no expansions):** all 8 Heroes (Twindalli, Elmer & Chestnut, Sindara, Teagaan, Feng-Li, Kazgin, Arne & Soko, Mylfaar), all 9 Bastion tiles (Standard, Dwarven Quarry, Dispensary, Trebuchet, Market, Tomb of the Ancient Kings, Divine Fountain, Strategist's Tower, Tavern), 50 Monster cards + 10 Warlords, the 4 Horde board overrun powers, wounded vs dead heroes, Act-and-Move in either order, and Call to Arms on any Bastion tile (even in the Grasp of Evil).

It works on phones (portrait and landscape) and tablets as well as desktops, and every game ends with a stats screen.

The turn follows the rulebook step by step: the Yin phase resolves on its own (and stops for every choice the rules give the players: where an arriving ghost goes, who takes a possessed board's Qi loss, the Gods' Favorite reroll, …); the Yang phase panel shows the three steps in order with only the moves the rules allow at that moment. A searchable rulebook is one click away.

## The AI

- **Solo games of the base game (Initiation or Normal):** a neural network for each of the seven monks (each colour's two powers), trained by self-play and run in the browser. On games it never trained on it wins about **45% on Normal** (from 33% for Red / Dance of the Spires to 61% for Yellow / Bottomless Pockets) and **53% on Initiation**. For comparison, the earlier single shared network won about 30% on Normal and the rules-based AI about 15%. Ghost Stories is hard, and the networks play fair: they see only what a player at the table sees (never the deck order).
- **Everything else** (2–4 players, Nightmare / Hell, White Moon, Black Secret) **and Wu-Feng:** a rules-based AI that searches ahead through the real rules; it still plays those setups better than the networks, which haven't been trained for them yet.

How the networks are built and trained, and every result so far: [`training/README.md`](./training/README.md).

## What is Ghost Stories?

1–4 Taoist monks defend a Chinese village from the ghosts of Wu-Feng. Every turn a ghost arrives on one of the 4 player boards around the 3×3 village; the active Taoist moves, then either asks a villager for help or exorcises a ghost with the Tao dice. Hold out until the incarnation of Wu-Feng hidden near the bottom of the deck appears, exorcise it, and the monks win. It is famously hard.

The Esoteric Order of Gamers rules summary in [`ghost stories rules.pdf`](./ghost%20stories%20rules.pdf) is the canonical reference. Where it is silent (the printed card list, the White Moon family tiles, the Black Secret curse tokens and Mantra cards…), this version uses its own designs; the in-game rulebook lists them under "About this version".

## Roadmap

- [x] Rules engine following the summary: Ghost Stories base game, White Moon, Black Secret (deterministic, seeded dice, step-by-step prompts)
- [x] Last Bastion rules engine, 8 Heroes, 9 Bastion tiles, 50 Monsters & 10 Warlords, home screen & lobby game selector (no expansions)
- [x] AI: a neural network per monk, trained by self-play, plays solo Ghost Stories games (about 45% wins on Normal, 53% on Initiation); a rules-based search AI plays everything else (including Last Bastion and Wu-Feng)
- [x] Game screen and two hand-drawn art sets: Chinese ink painting for Ghost Stories, heraldic storybook fantasy for Last Bastion (fortress tiles, 60 Horde cards, four hero figures, the Grasp of Evil, board effects and its own theme)
- [x] Online multiplayer on Firebase Realtime Database
- [x] Rulebook with search (covering both Ghost Stories and Last Bastion)
- [x] End-of-game stats (Qi over the game, ghosts and hauntings, who exorcised what, dice luck)
- [x] Phone and tablet layouts
- [ ] Stronger AI: a lookahead on top of the networks when they're unsure; networks for 2–4 players, Nightmare / Hell, Last Bastion and the expansions (the rules-based AI still plays those)

## Tech stack

- **TypeScript** + **Vite** + **React 19**, **Zustand**, **Vitest**
- Inline **SVG** art, drawn for this project
- **Firebase Realtime Database** (anonymous auth) for online rooms — shared project, this app's data under `ghost-stories`
- **PyTorch** (off the site, in `training/`) to train the AI networks; the game runs them in TypeScript, so the site stays static

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

Training the AI (a CUDA GPU and the conda env `train` with PyTorch): see [`training/README.md`](./training/README.md). Nothing in the site depends on it; the trained networks ship as files in `src/ai/nn/weights/`.

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the site and publishes it to GitHub Pages.

## Scope

Not included on purpose: user accounts, matchmaking, monetization, anti-cheat, saved games, art from the physical game.

## Credits

- Original game design: Antoine Bauza; publisher: Repos Production (2008)
- Rules summary: Peter Gifford (Universal Head), Esoteric Order of Gamers
- This implementation: a private, friends-only fan project, no affiliation with the publisher
