# Network layer

The room transport for online play: Firebase Realtime Database (project `github-games-e7c7d`, shared with other web apps: catan, card-collecting, tractor, …), behind an interface so the stores can run against an in-memory server in tests. Everything this app stores lives under `/ghost-stories` (`DB_ROOT` in `firebaseRoom.ts`).

- `transport.ts`: the interface (`RoomTransport` → `RoomConnection` + `RoomEvents`), `ServerUnreachableError`, log-slot keys and the compact log encoding.
- `firebaseRoom.ts`: the Firebase implementation (anonymous sign-in, room layout, transactions, presence, the stale-room sweep). Loaded lazily by `networkStore`, so the SDK only downloads when someone goes online.
- `fakeTransport.ts`: test-only in-memory server with the same semantics, for multi-device store tests.
- `types.ts`: lobby, chat, and room record types. `identity.ts`: persistent UUID (`ghoststories.uuid`), display name (`ghoststories.name`), 4-character room codes. `roomLink.ts`: `?room=CODE` in the URL (reload / invite links).
- Security rules: `database.rules.json` at the repo root, covering only the `ghost-stories` key. The database has one rules set for every app, so deploys go through `scripts/merge-db-rules.mjs` (the predeploy hook in `firebase.json`; `npm run deploy:rules`), which swaps this app's key into the live rules and keeps the other apps' keys.

## Room layout (`ghost-stories/rooms/{CODE}`)

- `meta`: `{ hostUuid, hostUid, createdAt, build, v }`, written once with the room.
- `lobby`: JSON string of `LobbyState`, edited by transaction until `start` exists.
- `start`: JSON string of `StartRecord` (`GameConfig` + seat → UUID + start time + checksum of `createGame(config)`), written once by the host.
- `actions/aNNNNNN`: write-once log slots, each `{"a": action, "n": nonce, "t": ms}`.
- `chat/`: push ids → JSON strings of `ChatMessage`.
- `presence/`: one `{ uid, uuid, name }` per connection, removed by `onDisconnect`.

Alongside, `roomDays/{day}` and `roomIndex/{day}/{CODE}` let each new room's host delete rooms whose UTC day ended over a week ago (only while nobody is connected to them).

## Multiplayer model

- Every device holds the full `GameState`, rebuilt from the room's `start` record (`createGame(config)`, deterministic for the seed in the config) plus its action log, applied in slot order. Moves, not state diffs, go to the server.
- Dice are rolled by the engine from the seeded RNG on the state, so actions carry only intents and choices and every device reduces to the same state.
- Ordering, rollback and replay of this device's own moves live in `src/store/actionSync.ts`; seat ownership (the dispatch guard), roles and the lobby live in `src/store/networkStore.ts` and `src/store/lobby.ts`. This layer only reads and writes the room.

## Rules of this layer

- No imports from `@/ui` or `@/store`.
- May import from `@/game` for types.
- Keep this layer thin — no game rules belong here.
