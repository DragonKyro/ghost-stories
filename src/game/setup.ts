// createGame: the rules summary's Setup, with the 1–3 player and difficulty
// adjustments. Everything random comes from the seed.

import { baseGhostIds, blackSecretGhostIds, incarnationIds, whiteMoonGhostIds } from './catalogue'
import { OPPOSITE } from './geometry'
import { nextInt, seedRng, shuffle } from './rng'
import { COLOR_NAME, POWER_NAME, TILE_NAME } from './rules'
import {
  BASE_TILES,
  CENTER_TILE,
  COLORS,
  POWERS_BY_COLOR,
  type Color,
  type GameConfig,
  type GameState,
  type PlayerBoard,
  type PowerId,
  type TaoColor,
  type Taoist,
  type TileKind,
  type VillageTile,
} from './types'
import { wmSetup } from './whiteMoon'
import { bsSetup } from './blackSecret'
import { run } from './flow'

/** Tao tokens in the box, per colour. */
export const TAO_PER_COLOR = 10

export function setupProblem(config: GameConfig): string | null {
  const players = COLORS.filter((c) => config.seats[c] !== 'neutral')
  if (players.length === 0) return 'At least one board needs a player.'
  if (players.length === 2 && OPPOSITE[players[0]!] !== players[1]) {
    return 'In a 2 player game, the players must sit facing each other (red & green, or blue & yellow).'
  }
  return null
}

export function createGame(config: GameConfig): GameState {
  const problem = setupProblem(config)
  if (problem) throw new Error(problem)
  let rng = seedRng(config.seed)
  const players = COLORS.filter((c) => config.seats[c] !== 'neutral')
  const solo = players.length === 1
  const missing = 4 - players.length

  // --- Village: 9 tiles at random, all face up. ---
  let pool: TileKind[] = [...BASE_TILES]
  if (config.whiteMoon) {
    if (config.whiteMoon.randomTiles) pool.push('kungFuSchool')
    else pool = pool.map((k) => (k === 'nightWatchman' ? 'kungFuSchool' : k))
  }
  if (config.blackSecret) pool.push('calligrapher')
  let kinds: TileKind[]
  ;[rng, kinds] = shuffle(rng, pool)
  kinds = kinds.slice(0, 9)
  const village: VillageTile[] = kinds.map((kind, idx) => ({
    idx,
    kind,
    haunted: false,
    circleToken: null,
    villagers: [],
    portal: false,
    ladder: !!config.blackSecret,
  }))

  // --- Boards: random side each (solo: red shows the Dance of the Spires). ---
  const boards = {} as Record<Color, PlayerBoard>
  for (const c of COLORS) {
    let power: PowerId
    const forced = config.powers?.[c]
    if (solo && c === 'red') power = 'danceOfTheSpires'
    else if (forced && POWERS_BY_COLOR[c].includes(forced)) power = forced
    else {
      let side: number
      ;[rng, side] = nextInt(rng, 2)
      power = POWERS_BY_COLOR[c][side]!
    }
    const neutral = config.seats[c] === 'neutral'
    boards[c] = {
      color: c,
      power,
      spaces: [null, null, null],
      buddhas: [false, false, false],
      neutral,
      qi: neutral ? 3 : 0,
      possessed: false,
    }
  }

  // --- Taoists. ---
  const difficulty = config.difficulty
  const startQi = difficulty === 'initiation' ? 4 : 3
  const taoSupply: Record<TaoColor, number> = { red: TAO_PER_COLOR, blue: TAO_PER_COLOR, green: TAO_PER_COLOR, yellow: TAO_PER_COLOR, black: TAO_PER_COLOR }
  const taoists = {} as Record<Color, Taoist>
  for (const c of COLORS) {
    const kind = config.seats[c]
    const player = kind !== 'neutral'
    const tao: Record<TaoColor, number> = { red: 0, blue: 0, green: 0, yellow: 0, black: 0 }
    if (player) {
      // A Tao token in their colour (solo: one of each colour), plus black on Initiation.
      if (solo) for (const x of COLORS) tao[x] = 1
      else tao[c] = 1
      if (difficulty === 'initiation') tao.black = 1
      for (const x of Object.keys(tao) as TaoColor[]) taoSupply[x] -= tao[x]
    }
    taoists[c] = {
      color: c,
      kind,
      alive: player,
      qi: player ? startQi : 0,
      tao,
      yinYang: player && difficulty !== 'hell',
      buddhas: 0,
      // 1–3 players: one power token each; solo: three.
      powerTokens: !player ? 0 : solo ? 3 : missing > 0 ? 1 : 0,
      tile: player ? CENTER_TILE : null,
      underground: false,
      crystals: 0,
      artifacts: [],
    }
  }

  // --- Ghost deck. ---
  const incCount = difficulty === 'initiation' || difficulty === 'normal' ? 1 : players.length <= 2 ? 3 : 4
  let ghosts: string[]
  if (config.blackSecret) {
    // Black Secret keeps a fixed number of cards by Taoist count.
    const keep = [35, 40, 45, 50][players.length - 1]!
    ;[rng, ghosts] = shuffle(rng, [...baseGhostIds(), ...blackSecretGhostIds(), ...(config.whiteMoon ? whiteMoonGhostIds() : [])])
    ghosts = ghosts.slice(0, keep)
  } else {
    ;[rng, ghosts] = shuffle(rng, [...baseGhostIds(), ...(config.whiteMoon ? whiteMoonGhostIds() : [])])
    // White Moon: remove 10 at random; then 5 per missing player, unseen.
    const remove = (config.whiteMoon ? 10 : 0) + 5 * missing
    ghosts = ghosts.slice(0, ghosts.length - remove)
  }
  let incarnations: string[]
  ;[rng, incarnations] = shuffle(rng, incarnationIds())
  const wuFengCards = config.blackSecret
    ? Array.from({ length: incCount }, (_, i) => `summon-${i + 1}`)
    : incarnations.slice(0, incCount)
  // From the bottom: 10 cards, an incarnation (repeated), then the rest on top.
  const bottomUp: string[] = []
  const fromBottom = ghosts.slice().reverse()
  for (const w of wuFengCards) {
    bottomUp.push(...fromBottom.splice(0, 10), w)
  }
  bottomUp.push(...fromBottom)
  const deck = bottomUp.reverse()

  // --- First player. ---
  let first = config.firstPlayer && players.includes(config.firstPlayer) ? config.firstPlayer : null
  if (!first) {
    let i: number
    ;[rng, i] = nextInt(rng, players.length)
    first = players[i]!
  }

  const s: GameState = {
    config,
    rng,
    phase: 'yin',
    turn: 1,
    active: first,
    village,
    boards,
    taoists,
    deck,
    discard: [],
    templeBuddhas: 2,
    taoSupply,
    centerPowerTokens: 0,
    mantra: 'ready',
    nextUid: 1,
    queue: [],
    prompt: null,
    yang: null,
    outcome: null,
    events: [],
    whiteMoon: null,
    blackSecret: null,
  }
  if (config.whiteMoon) wmSetup(s)
  if (config.blackSecret) bsSetup(s, incarnations)

  s.events.push({
    kind: 'setup',
    text:
      `New game — ${difficulty[0]!.toUpperCase()}${difficulty.slice(1)}, ${players.length} player${players.length > 1 ? 's' : ''}. ` +
      `${wuFengCards.length} incarnation${wuFengCards.length > 1 ? 's' : ''} of Wu-Feng hide in a ${deck.length}-card deck.`,
  })
  s.events.push({
    kind: 'setup',
    text: `Powers: ${COLORS.map((c) => `${COLOR_NAME[c]} — ${POWER_NAME[boards[c].power]}${boards[c].neutral ? ' (neutral)' : ''}`).join('; ')}.`,
  })
  s.events.push({ kind: 'setup', text: `Village: ${village.map((t) => TILE_NAME[t.kind]).join(', ')}.` })

  s.queue.push({ k: 'beginTurn' })
  run(s)
  return s
}
