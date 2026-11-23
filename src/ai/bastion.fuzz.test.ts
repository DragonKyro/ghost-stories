// Last Bastion fuzz: whole games where a share of the moves are random actions
// of every Bastion shape (illegal ones are refused by the engine and replaced
// by the AI's move), with the game's bookkeeping checked after every action.
// FUZZ_GAMES=200 npx vitest run src/ai/bastion.fuzz.test.ts for a long run.
import { describe, expect, it } from 'vitest'
import type { Action, HelpParams } from '@/game/actions'
import { applyAction, createGame, waitingFor } from '@/game/engine'
import { prng } from '@/ui/art/brush'
import { COLORS, TAO_COLORS, type Color, type Difficulty, type GameConfig, type GameState, type GhostRef, type SeatKind, type SpaceIdx, type TileIdx } from '@/game/types'
import { ghostsInPlay } from '@/game/rules'
import { chooseAction, fallbackAction } from './index'

const GAMES = Number(process.env.FUZZ_GAMES ?? 16)
const SPACES: GhostRef[] = COLORS.flatMap((board) => ([0, 1, 2] as SpaceIdx[]).map((space) => ({ board, space })))
const TILES = [0, 1, 2, 3, 4, 5, 6, 7, 8] as TileIdx[]

function seatsFor(players: number): Record<Color, SeatKind> {
  const order: Color[] = players === 2 ? ['red', 'green'] : COLORS.slice(0, players)
  return Object.fromEntries(COLORS.map((c) => [c, order.includes(c) ? 'ai' : 'neutral'])) as Record<Color, SeatKind>
}

/** Every parameter shape a Bastion tile action can take, for the tile kind at `tile`. */
function helpParams(s: GameState, tile: TileIdx): HelpParams[] {
  const kind = s.village[tile]!.kind
  const ghosts = ghostsInPlay(s).map((g) => g.ref)
  switch (kind) {
    case 'circleOfPrayer':
      return TAO_COLORS.map((color) => ({ kind, color }))
    case 'buddhistTemple':
      return [{ kind }, ...COLORS.flatMap((board) => ([0, 1, 2] as SpaceIdx[]).map((space) => ({ kind, space: { board, space } })))]
    case 'cemetery':
      return [...COLORS.map((revive) => ({ kind, revive })), ...TAO_COLORS.flatMap((color) => COLORS.map((to) => ({ kind, color, to })))]
    case 'taoistAltar':
      return [...ghosts.map((ghost) => ({ kind, ghost })), ...TILES.map((t) => ({ kind, tile: t }))]
    case 'herbalistShop':
      return [{ kind }]
    case 'sorcerersHut':
      return ghosts.map((ghost) => ({ kind, ghost }))
    case 'nightWatchman': {
      const grasped = s.village.filter((v) => v.haunted).map((v) => v.idx)
      const figures = ghostsInPlay(s).filter((g) => g.ghost.figure).map((g) => g.ref)
      return [{ kind, tiles: grasped.slice(0, 2), ghosts: [] }, { kind, tiles: [], ghosts: figures.slice(0, 2) }, { kind, tiles: grasped.slice(0, 1), ghosts: figures.slice(0, 1) }, ...COLORS.map((board) => ({ kind, board }))]
    }
    case 'pavilion':
      return ghosts.flatMap((ghost) => SPACES.map((to) => ({ kind, ghost, to, taoist: null, taoistTo: null })))
    case 'teaHouse':
      return COLORS.flatMap((taoist) => [{ kind, taoist }, ...TILES.map((to) => ({ kind, taoist, to }))])
    default:
      return []
  }
}

/** A random action of any Bastion shape for the active hero (often illegal). */
function randomAction(s: GameState, c: Color, rnd: () => number): Action {
  const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)]!
  const here = s.taoists[c].tile ?? 4
  const roll = rnd()
  if (roll < 0.18) return { type: 'move', by: c, to: pick(TILES) }
  if (roll < 0.38) {
    const ps = helpParams(s, here)
    if (ps.length) return { type: 'help', by: c, params: pick(ps) }
  }
  if (roll < 0.48) {
    const tile = pick(TILES)
    const ps = helpParams(s, tile)
    if (ps.length) return { type: 'yinYang', by: c, use: rnd() < 0.15 ? { kind: 'flip', tile } : { kind: 'help', tile, params: pick(ps) } }
  }
  if (roll < 0.66) {
    const a = pick(SPACES)
    return { type: 'exorcise', by: c, targets: rnd() < 0.3 ? [a, pick(SPACES)] : [a] }
  }
  if (roll < 0.8) {
    const r = rnd()
    if (r < 0.25) return { type: 'power', by: c, use: { power: 'danceOfTheTwinWinds', taoist: pick(COLORS), to: pick(TILES) } }
    if (r < 0.5) return { type: 'power', by: c, use: { power: 'bottomlessPockets', color: pick(TAO_COLORS) } }
    if (r < 0.75) return { type: 'power', by: c, use: { power: 'enfeeblementMantra', ghost: pick(SPACES) } }
    return { type: 'power', by: c, use: rnd() < 0.5 ? { power: 'secondWind', tile: pick(TILES) } : { power: 'secondWind', ghost: pick(SPACES) } }
  }
  if (roll < 0.86) return { type: 'placeBuddha', by: c, spaces: [pick(SPACES)] }
  return { type: 'endTurn', by: c }
}

/** The game's bookkeeping, checked after every action. */
function checkInvariants(s: GameState, deckSize: number): void {
  // Equipment: 10 tokens per colour between the reserve and the heroes.
  for (const col of TAO_COLORS) {
    const held = COLORS.reduce((n, c) => n + s.taoists[c].tao[col], 0)
    expect(s.taoSupply[col] + held, `${col} Equipment`).toBe(10)
  }
  // One Trap figure: on the Quarry, in a hand, or on a Horde space.
  const onBoards = COLORS.reduce((n, c) => n + s.boards[c].buddhas.filter(Boolean).length, 0)
  const inHands = COLORS.reduce((n, c) => n + s.taoists[c].buddhas, 0)
  expect(s.templeBuddhas + onBoards + inHands, 'one Trap').toBe(1)
  // One Net, one Enchantment.
  const g = ghostsInPlay(s)
  expect(g.filter((x) => x.ghost.net).length, 'at most one Net').toBeLessThanOrEqual(1)
  expect(g.filter((x) => x.ghost.mantra).length, 'Enchantment on a card ⇔ placed').toBe(s.mantra === 'placed' ? 1 : 0)
  // Heroes.
  for (const c of COLORS) {
    const t = s.taoists[c]
    const b = s.boards[c]
    if (b.neutral) {
      expect(t.alive, `neutral ${c} has no hero`).toBe(false)
      continue
    }
    if (t.alive) {
      expect(t.tile, `${c} stands somewhere`).not.toBeNull()
      expect(t.qi, `${c} has Life`).toBeGreaterThan(0)
      expect(b.possessed, `${c}'s board is linked`).toBe(false)
    } else {
      expect(t.qi, `${c} taken out with no Life`).toBe(0)
      expect(taoTotal(t.tao), `${c} taken out holds no Equipment`).toBe(0)
      expect(t.yinYang, `${c} taken out holds no Call to Arms`).toBe(false)
    }
    if (t.deadForever) expect(t.wounded, `${c} dead for good was wounded`).toBe(true)
  }
  // Horde cards: deck + discard + in play (+ one being placed) = the deck at the start.
  const placing = s.prompt?.kind === 'placeGhost' ? 1 : 0
  expect(s.deck.length + s.discard.length + g.length + placing, 'Horde cards conserved').toBe(deckSize)
  expect(s.village.filter((v) => v.haunted).length, 'Grasp of Evil on at most 3 tiles').toBeLessThanOrEqual(3)
  if (s.phase !== 'gameOver') expect(waitingFor(s), 'someone can act').not.toBeNull()
}

const taoTotal = (tao: Record<string, number>): number => Object.values(tao).reduce((n, v) => n + v, 0)

describe('Last Bastion fuzz', () => {
  const diffs: Difficulty[] = ['initiation', 'normal', 'nightmare', 'hell']
  for (let i = 0; i < GAMES; i++) {
    const players = (i % 4) + 1
    const difficulty = diffs[Math.floor(i / 4) % 4]!
    it(`game ${i}: ${players}p ${difficulty}`, () => {
      const config: GameConfig = { variant: 'bastion', difficulty, seats: seatsFor(players), seed: 9000 + i }
      let s = createGame(config)
      const deckSize = s.deck.length + ghostsInPlay(s).length + s.discard.length + (s.prompt?.kind === 'placeGhost' ? 1 : 0)
      const rnd = prng(500 + i)
      let random = 0
      let actions = 0
      checkInvariants(s, deckSize)
      while (s.phase !== 'gameOver' && actions < 5000) {
        const seat = waitingFor(s)!
        let next: GameState | null = null
        if (!s.prompt && s.phase === 'yang' && rnd() < 0.35) {
          try {
            next = applyAction(s, randomAction(s, seat as Color, rnd))
            random++
          } catch {
            next = null
          }
        }
        if (!next) {
          const a = chooseAction(s, seat) ?? fallbackAction(s, seat)
          expect(a, `an answer for ${s.prompt?.kind ?? s.phase}`).toBeTruthy()
          next = applyAction(s, a!)
        }
        s = next
        actions++
        checkInvariants(s, deckSize)
      }
      expect(s.phase, 'the game ends').toBe('gameOver')
      void random
    }, 120_000)
  }
})
