// Village tile actions — the 9 "request help" handlers.
//
// Each handler validates the action context, applies the effect, and returns
// the next state. Tile-level state (e.g., the Tao token on the Circle of
// Prayer) lives on the tile itself.

import type {
  CurseFace,
  GameState,
  GhostRef,
  TaoColor,
  TaoDieFace,
  TaoistColor,
  TaoistId,
  TaoistState,
  VillageTile,
  VillageTileId,
} from '../types'
import type { ArrivingGhost, HelpParams } from '../actions'
import { activeTaoist, getTile, isCornerTile, taoistById } from '../helpers'
import { hauntFirstTileInFront, loseQi, placeGhost, unhauntTile } from './hauntingAndQi'
import { resolveArrival } from './yin'
import { getGhostCard } from '../ghostCatalogue'

// Some tiles need a curse die roll (Cemetery) or dice (Herbalist) — those
// arrive in the `requestHelp` action payload alongside the params.
export type HelpExtras = {
  diceRoll?: TaoDieFace[]
  curseRoll?: CurseFace
  arrival?: ArrivingGhost
}

export function applyRequestHelp(
  state: GameState,
  taoistId: TaoistId,
  params: HelpParams,
  extras: HelpExtras,
): GameState {
  const t = taoistById(state, taoistId)
  if (!t.alive) throw new Error('requestHelp: taoist is dead')
  if (!t.tile) throw new Error('requestHelp: taoist has no tile')
  const tile = getTile(state, t.tile)
  if (tile.haunted) throw new Error('requestHelp: tile is haunted')
  if (tile.kind !== params.kind) {
    throw new Error(`requestHelp: action ${params.kind} but tile is ${tile.kind}`)
  }
  return applyTileAction(state, t, tile, params, extras)
}

/** Run a tile action without the "must stand on it" check (Yin-Yang power). */
export function applyTileActionRemote(
  state: GameState,
  taoistId: TaoistId,
  tileId: VillageTileId,
  params: HelpParams,
  extras: HelpExtras,
): GameState {
  const t = taoistById(state, taoistId)
  const tile = getTile(state, tileId)
  if (tile.haunted) throw new Error('tile is haunted')
  if (tile.kind !== params.kind) throw new Error('mismatched tile kind')
  return applyTileAction(state, t, tile, params, extras)
}

function applyTileAction(
  state: GameState,
  t: TaoistState,
  tile: VillageTile,
  params: HelpParams,
  extras: HelpExtras,
): GameState {
  switch (params.kind) {
    case 'circleOfPrayer':
      return doCircleOfPrayer(state, tile, params.placeColor)
    case 'buddhistTemple':
      return doBuddhistTemple(state, t)
    case 'cemetery':
      return doCemetery(state, params.reviveTaoist, extras)
    case 'taoistAltar':
      return doTaoistAltar(state, params.flipTile, extras)
    case 'herbalistShop':
      return doHerbalistShop(state, t, extras)
    case 'sorcerersHut':
      return doSorcerersHut(state, t, params.targetGhost)
    case 'nightWatchmanBeat':
      return doNightWatchman(state, params.targetBoard)
    case 'pavilionOfHeavenlyWind':
      return doPavilion(state, t, params)
    case 'teaHouse':
      return doTeaHouse(state, t, extras)
  }
}

// ---- Circle of Prayer -------------------------------------------------
function doCircleOfPrayer(state: GameState, tile: VillageTile, color: TaoColor): GameState {
  if (state.taoSupply[color] <= 0) throw new Error('no tao tokens of that color in supply')
  // If a token was already there, return it to supply first.
  const prev = tile.circleToken
  const supply = { ...state.taoSupply }
  if (prev) supply[prev] += 1
  supply[color] -= 1
  const next = state.village.map((v) => (v.id === tile.id ? { ...v, circleToken: color } : v))
  return { ...state, village: next, taoSupply: supply }
}

// ---- Buddhist Temple --------------------------------------------------
function doBuddhistTemple(state: GameState, t: TaoistState): GameState {
  if (state.buddhaSupply <= 0) throw new Error('no Buddhas in supply')
  return {
    ...state,
    taoists: { ...state.taoists, [t.color]: { ...t, buddhasInHand: t.buddhasInHand + 1 } },
    buddhaSupply: state.buddhaSupply - 1,
  }
}

// ---- Cemetery: revive a dead Taoist -----------------------------------
function doCemetery(state: GameState, deadColor: TaoistColor, extras: HelpExtras): GameState {
  const dead = state.taoists[deadColor]
  if (dead.alive) throw new Error('cemetery: target is not dead')
  if (extras.curseRoll == null) throw new Error('cemetery: missing curseRoll')

  // Find the Cemetery tile id so we can place the revived figure there.
  const tile = state.village.find((v) => v.kind === 'cemetery')
  if (!tile) throw new Error('no Cemetery on the board')

  // Revive: 2 Qi, figure on Cemetery tile, board un-possessed.
  let s: GameState = {
    ...state,
    taoists: {
      ...state.taoists,
      [deadColor]: {
        ...dead,
        alive: true,
        qi: 2,
        tile: tile.id,
      },
    },
    boards: {
      ...state.boards,
      [deadColor]: { ...state.boards[deadColor], possessed: false, powerActive: true },
    },
  }

  // Roll the curse die immediately.
  if (extras.curseRoll === 'haunt') {
    s = { ...s, village: s.village.map((v) => (v.id === tile.id ? { ...v, haunted: true } : v)), hauntedCount: s.hauntedCount + 1 }
  } else if (extras.curseRoll === 'loseQi') {
    s = loseQi(s, state.activeBoard)
  } else if (extras.curseRoll === 'loseAllTao') {
    const a = state.taoists[state.activeBoard]
    if (!a.isNeutral && a.alive) {
      s = {
        ...s,
        taoists: {
          ...s.taoists,
          [state.activeBoard]: { ...a, tao: { red: 0, green: 0, blue: 0, yellow: 0, black: 0 } },
        },
      }
    }
  } else if (extras.curseRoll === 'spawnGhost' && extras.arrival) {
    s = resolveArrival(s, extras.arrival)
  }
  return s
}

// ---- Taoist Altar -----------------------------------------------------
function doTaoistAltar(state: GameState, tileId: VillageTileId, extras: HelpExtras): GameState {
  let s = unhauntTile(state, tileId)
  if (extras.arrival) s = resolveArrival(s, extras.arrival)
  return s
}

// ---- Herbalist's Shop --------------------------------------------------
function doHerbalistShop(state: GameState, t: TaoistState, extras: HelpExtras): GameState {
  if (!extras.diceRoll || extras.diceRoll.length !== 2) {
    throw new Error('herbalist: requires diceRoll of length 2')
  }
  let s = state
  for (const face of extras.diceRoll) {
    if (face === 'black') continue // no token on black
    // 'wild' is "free choice" — but the engine needs a deterministic resolution.
    // We treat 'wild' here as "the caller must pre-resolve to a color". A
    // dedicated UI dialog converts the wild face into a concrete color before
    // dispatching. If the engine sees 'wild' here, default to the Taoist's own
    // color (rare in practice).
    let color: TaoColor = face === 'wild' ? (t.color as TaoColor) : face
    if (s.taoSupply[color] <= 0) continue
    s = {
      ...s,
      taoSupply: { ...s.taoSupply, [color]: s.taoSupply[color] - 1 },
      taoists: { ...s.taoists, [t.color]: { ...s.taoists[t.color], tao: { ...s.taoists[t.color].tao, [color]: s.taoists[t.color].tao[color] + 1 } } },
    }
  }
  return s
}

// ---- Sorcerer's Hut ---------------------------------------------------
function doSorcerersHut(state: GameState, t: TaoistState, ref: GhostRef): GameState {
  const ghost = state.boards[ref.board].ghostSpaces[ref.space]
  if (!ghost) throw new Error('sorcerer: no ghost there')
  const card = getGhostCard(ghost.cardId)
  if (card.isIncarnation) throw new Error('sorcerer: cannot target an incarnation')

  // Discard without applying right-stone abilities.
  const newSpaces = [...state.boards[ref.board].ghostSpaces] as GameState['boards'][typeof ref.board]['ghostSpaces']
  newSpaces[ref.space] = null
  let s: GameState = {
    ...state,
    boards: { ...state.boards, [ref.board]: { ...state.boards[ref.board], ghostSpaces: newSpaces } },
    discardPile: [...state.discardPile, ghost.cardId],
  }
  // Lose 1 Qi (the tile's cost).
  s = loseQi(s, t.color)
  return s
}

// ---- Night Watchman's Beat --------------------------------------------
function doNightWatchman(state: GameState, board: TaoistColor): GameState {
  const target = state.boards[board]
  const newSpaces = target.ghostSpaces.map((g) => {
    if (!g) return g
    if (g.hauntingFigurePos === 'stone2') return { ...g, hauntingFigurePos: 'stone1' as const }
    if (g.hauntingFigurePos === 'stone1') return { ...g, hauntingFigurePos: 'card' as const }
    return g
  }) as GameState['boards'][TaoistColor]['ghostSpaces']
  return {
    ...state,
    boards: { ...state.boards, [board]: { ...target, ghostSpaces: newSpaces } },
  }
}

// ---- Pavilion of Heavenly Wind ----------------------------------------
function doPavilion(state: GameState, _t: TaoistState, params: Extract<HelpParams, { kind: 'pavilionOfHeavenlyWind' }>): GameState {
  // 1) Move a ghost to the chosen empty space.
  const from = params.moveGhost
  const to = params.toGhostSpace
  const ghost = state.boards[from.board].ghostSpaces[from.space]
  if (!ghost) throw new Error('pavilion: no ghost to move')
  if (state.boards[to.board].ghostSpaces[to.space] != null) {
    // Buddha space: still allowed by the rules; the ghost is then discarded.
    if (state.boards[to.board].buddhaSpaces[to.space]) {
      // Treat as moving onto a Buddha — discard the ghost, Buddha returns.
      const removed = [...state.boards[from.board].ghostSpaces] as GameState['boards'][typeof from.board]['ghostSpaces']
      removed[from.space] = null
      let s: GameState = {
        ...state,
        boards: { ...state.boards, [from.board]: { ...state.boards[from.board], ghostSpaces: removed } },
        discardPile: [...state.discardPile, ghost.cardId],
      }
      // Free the Buddha space.
      const dest = s.boards[to.board]
      const buddhas = [...dest.buddhaSpaces] as GameState['boards'][typeof to.board]['buddhaSpaces']
      buddhas[to.space] = false
      s = { ...s, boards: { ...s.boards, [to.board]: { ...dest, buddhaSpaces: buddhas } }, buddhaSupply: s.buddhaSupply + 1 }
      // Then attempt the Taoist move (still required by the rule).
      return doPavilionTaoistMove(s, params.alsoMoveTaoist)
    }
    throw new Error('pavilion: destination occupied (non-Buddha)')
  }
  // Move properties with the ghost.
  const removed = [...state.boards[from.board].ghostSpaces] as GameState['boards'][typeof from.board]['ghostSpaces']
  removed[from.space] = null
  const placed = [...state.boards[to.board].ghostSpaces] as GameState['boards'][typeof to.board]['ghostSpaces']
  placed[to.space] = ghost
  let s: GameState = {
    ...state,
    boards: {
      ...state.boards,
      [from.board]: { ...state.boards[from.board], ghostSpaces: removed },
      [to.board]: { ...state.boards[to.board], ghostSpaces: placed },
    },
  }
  // 2) Then a forced normal move of another Taoist.
  s = doPavilionTaoistMove(s, params.alsoMoveTaoist)
  return s
}

function doPavilionTaoistMove(
  state: GameState,
  also: Extract<HelpParams, { kind: 'pavilionOfHeavenlyWind' }>['alsoMoveTaoist'],
): GameState {
  if (!also) return state
  // Solo rule allows moving your own Taoist; otherwise the engine accepts any
  // other living Taoist. UI enforces solo via legality.
  const t = taoistById(state, also.taoistId)
  if (!t.alive) throw new Error('pavilion: target Taoist is dead')
  return {
    ...state,
    taoists: { ...state.taoists, [t.color]: { ...t, tile: also.toTile } },
  }
}

// ---- Tea House --------------------------------------------------------
function doTeaHouse(state: GameState, t: TaoistState, extras: HelpExtras): GameState {
  // Take a Tao token of choice — Tea House params would normally carry the
  // color but the action payload doesn't expose it here. Convention: the UI
  // bundles the chosen color into `extras.diceRoll` as a single-element array.
  const color: TaoColor = (extras.diceRoll && extras.diceRoll[0] !== 'wild' && extras.diceRoll[0] !== 'black')
    ? extras.diceRoll[0] as TaoColor
    : t.color
  let s = state
  if (s.taoSupply[color] > 0) {
    s = {
      ...s,
      taoSupply: { ...s.taoSupply, [color]: s.taoSupply[color] - 1 },
      taoists: { ...s.taoists, [t.color]: { ...s.taoists[t.color], tao: { ...s.taoists[t.color].tao, [color]: s.taoists[t.color].tao[color] + 1 } } },
    }
  }
  // Gain 1 Qi (capped at difficulty's max — initiation 4, others 3).
  const maxQi = state.config.difficulty === 'initiation' ? 4 : 3
  const newQi = Math.min(s.taoists[t.color].qi + 1, maxQi)
  s = { ...s, taoists: { ...s.taoists, [t.color]: { ...s.taoists[t.color], qi: newQi } } }
  // Then bring a ghost into play.
  if (extras.arrival) s = resolveArrival(s, extras.arrival)
  return s
}

// Re-exports used by the dispatcher.
void hauntFirstTileInFront
void placeGhost
void isCornerTile
void activeTaoist
