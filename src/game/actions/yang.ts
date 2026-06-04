// Yang phase handlers — the active Taoist's actions.
//
// The Yang phase has 3 steps in fixed order:
//   1. Move (optional)
//   2. Request help OR exorcise (exactly one — Blue's Heavenly Gust unlocks
//      both in any order; Second Wind doubles either)
//   3. Place Buddha (optional)
// Yin-Yang power may be spent before/after any step (one-shot per game).
//
// We don't enforce strict per-step sequencing at the engine level — instead,
// each action validates its own legality given the current state. This makes
// the engine UI-agnostic. The UI surfaces the canonical order via prompts.

import type {
  CurseFace,
  GameState,
  GhostRef,
  TaoColor,
  TaoDieFace,
  TaoistColor,
  TaoistId,
  VillageTileId,
} from '../types'
import type {
  HelpParams,
  PowerParams,
  YangAction,
  YinYangEffect,
} from '../actions'
import { getGhostCard } from '../ghostCatalogue'
import {
  activeTaoist,
  adjacentTiles,
  capturedDiceCount,
  deductSpentTao,
  ghostInstanceAt,
  ghostSpaceFacingTile,
  getTile,
  isCornerTile,
  isPowerBlocked,
  isTaoSpendingBlocked,
  reachableGhostSpaces,
  taoistById,
  validateExorcism,
} from '../helpers'
import { applyRequestHelp, applyTileActionRemote } from './villageTiles'
import { advanceTurn } from './yin'
import { loseQi, unhauntTile } from './hauntingAndQi'
import { checkLossConditions, checkWin } from './winLose'

export function applyYangAction(state: GameState, action: YangAction): GameState {
  if (state.phase !== 'yang') throw new Error(`yang action in phase=${state.phase}`)

  switch (action.type) {
    case 'moveTaoist':
      return moveTaoist(state, action.taoistId, action.toTile)

    case 'requestHelp':
      return applyRequestHelp(state, action.taoistId, action.params, {
        diceRoll: action.diceRoll,
        curseRoll: action.curseRoll,
        arrival: action.arrival,
      })

    case 'exorcise':
      return doExorcise(state, action)

    case 'placeBuddha':
      return placeBuddhas(state, action.taoistId, action.spaces)

    case 'useYinYang':
      return useYinYang(state, action.taoistId, action.effect)

    case 'usePower':
      return useTaoistPower(state, action.taoistId, action.params)

    case 'spendPowerToken':
      return spendPowerToken(state, action.taoistId, action.neutralBoard, action.params)

    case 'endYangPhase':
      return endYangPhase(state)
  }
}

// ---------- Movement ---------------------------------------------------

function moveTaoist(state: GameState, taoistId: TaoistId, toTile: VillageTileId): GameState {
  const t = taoistById(state, taoistId)
  if (!t.alive) throw new Error('move: dead')
  if (t.color !== activeTaoist(state).color) throw new Error('move: not active turn')
  if (!t.tile) throw new Error('move: no current tile')
  const neighbours = adjacentTiles(state, t.tile)
  if (!neighbours.some((n) => n.id === toTile)) throw new Error('move: target not adjacent')
  return {
    ...state,
    taoists: { ...state.taoists, [t.color]: { ...t, tile: toTile } },
  }
}

// ---------- Exorcism ---------------------------------------------------

function doExorcise(state: GameState, action: Extract<YangAction, { type: 'exorcise' }>): GameState {
  const t = taoistById(state, action.taoistId)
  if (!t.alive) throw new Error('exorcise: dead')
  if (t.color !== activeTaoist(state).color) throw new Error('exorcise: not active turn')
  if (!t.tile) throw new Error('exorcise: no tile')

  const tile = getTile(state, t.tile)
  // Validate corner-tile dual exorcism.
  if (action.ghosts.length === 2 && !isCornerTile(tile)) {
    throw new Error('exorcise: dual exorcism only allowed on corner tiles')
  }
  if (action.ghosts.length === 0) throw new Error('exorcise: no targets')
  if (action.ghosts.length > 2) throw new Error('exorcise: too many targets')

  // All targets must be reachable from this tile.
  const reachable = new Set(reachableGhostSpaces(state, t.tile).map((r) => `${r.board}/${r.space}`))
  for (const ref of action.ghosts) {
    if (!reachable.has(`${ref.board}/${ref.space}`)) {
      throw new Error('exorcise: target not adjacent to taoist')
    }
  }

  // Tao spending must come from Taoists standing on the same tile.
  for (const s of action.spentTao) {
    const spender = taoistById(state, s.from)
    if (spender.tile !== t.tile) throw new Error('exorcise: spender not on same tile as actor')
    if (spender.tao[s.color] <= 0) throw new Error('exorcise: spender lacks tao')
  }
  if (isTaoSpendingBlocked(state) && action.spentTao.length > 0) {
    throw new Error('exorcise: tao spending is blocked')
  }

  // Apply re-roll positionally if present (green Taoist Gods' Favorite).
  const finalDice: TaoDieFace[] = action.diceRoll.slice()
  if (action.diceReroll) {
    for (let i = 0; i < action.diceReroll.length; i++) {
      if (i < finalDice.length) finalDice[i] = action.diceReroll[i]
    }
  }

  // Dice-count gating: captured Tao dice reduce the number you roll. The
  // engine assumes the payload already reflects this — we sanity-check.
  const captured = capturedDiceCount(state)
  const namelessAlive = anyIncarnationAlive(state, 'nameless')
  const expectedDice = Math.max(0, 3 - captured) + extraDiceFromPowers(state, t.color)
  if (finalDice.length !== expectedDice) {
    throw new Error(`exorcise: wrong dice count: got ${finalDice.length}, expected ${expectedDice}`)
  }

  const verdict = validateExorcism(state, action.ghosts, finalDice, action.spentTao, {
    whiteIsWild: !namelessAlive,
  })
  if (!verdict.ok) {
    // Failure: action is spent but nothing happens.
    return state
  }

  // Success: deduct spent tao (return to supply), discard ghosts, apply right-stone abilities.
  const ts = deductSpentTao(state.taoists, action.spentTao)
  const supply = { ...state.taoSupply }
  for (const s of action.spentTao) supply[s.color] += 1

  let s: GameState = { ...state, taoists: ts, taoSupply: supply }

  let onExorcismCurseIdx = 0
  for (const ref of action.ghosts) {
    const ghost = ghostInstanceAt(s, ref)
    if (!ghost) continue
    const card = getGhostCard(ghost.cardId)
    // Remove ghost from board.
    const board = s.boards[ref.board]
    const newSpaces = [...board.ghostSpaces] as GameState['boards'][typeof ref.board]['ghostSpaces']
    newSpaces[ref.space] = null
    s = {
      ...s,
      boards: { ...s.boards, [ref.board]: { ...board, ghostSpaces: newSpaces } },
      discardPile: [...s.discardPile, ghost.cardId],
    }
    // Apply right-stone abilities (curses BEFORE rewards).
    s = applyOnExorcism(s, t.color, ghost.cardId, action.onExorcismCurseRolls?.[onExorcismCurseIdx])
    if (card.abilities.right.some((a) => a.kind === 'rewardCurseDie')) {
      onExorcismCurseIdx++
    }
  }

  s = checkWin(s)
  if (s.phase === 'gameOver') return s
  s = checkLossConditions(s)
  return s
}

function applyOnExorcism(state: GameState, actor: TaoistColor, cardId: string, curseRoll?: CurseFace): GameState {
  const card = getGhostCard(cardId)
  let s = state
  // Curses first.
  for (const ab of card.abilities.right) {
    if (ab.kind === 'rewardCurseDie') {
      if (curseRoll == null) throw new Error('exorcism: needed curseRoll for rewardCurseDie')
      switch (curseRoll) {
        case 'haunt':
          // Hauntings from a curse-die go on the first tile facing the just-killed ghost — but
          // since the ghost is gone we apply the rule conservatively: haunt the tile in front
          // of the now-empty space.
          // The catalogue stamps board+space via the action's ghost ref; we don't carry it here.
          // For determinism, this fires nothing — UI should not roll curse die on right-stone
          // abilities unless the catalogue specifies their target. Most base ghosts that "roll
          // the curse die on exorcism" are incarnations (Death Army / Hope Killer); we handle
          // those below.
          break
        case 'loseQi':
          s = loseQi(s, actor)
          break
        case 'loseAllTao': {
          const a = state.taoists[actor]
          if (a.alive) {
            s = { ...s, taoists: { ...s.taoists, [actor]: { ...a, tao: { red: 0, green: 0, blue: 0, yellow: 0, black: 0 } } } }
          }
          break
        }
        case 'none':
        case 'spawnGhost':
          // spawnGhost on exorcism is exotic; skipping for the base catalogue.
          break
      }
    }
  }
  // Then rewards.
  for (const ab of card.abilities.right) {
    switch (ab.kind) {
      case 'rewardQiOrYinYang': {
        const t = state.taoists[actor]
        if (!t.alive) break
        const maxQi = state.config.difficulty === 'initiation' ? 4 : 3
        if (t.qi < maxQi) {
          s = { ...s, taoists: { ...s.taoists, [actor]: { ...s.taoists[actor], qi: s.taoists[actor].qi + 1 } } }
        } else {
          s = { ...s, taoists: { ...s.taoists, [actor]: { ...s.taoists[actor], yinYang: true } } }
        }
        break
      }
      case 'rewardTaoOne': {
        // Default to actor's own color when caller doesn't specify; tighten in
        // the action payload later for player choice.
        const color: TaoColor = (state.taoists[actor].color as TaoColor)
        if (s.taoSupply[color] > 0) {
          s = {
            ...s,
            taoSupply: { ...s.taoSupply, [color]: s.taoSupply[color] - 1 },
            taoists: {
              ...s.taoists,
              [actor]: { ...s.taoists[actor], tao: { ...s.taoists[actor].tao, [color]: s.taoists[actor].tao[color] + 1 } },
            },
          }
        }
        break
      }
      case 'rewardTaoTwo': {
        const color: TaoColor = state.taoists[actor].color as TaoColor
        for (let i = 0; i < 2; i++) {
          if (s.taoSupply[color] > 0) {
            s = {
              ...s,
              taoSupply: { ...s.taoSupply, [color]: s.taoSupply[color] - 1 },
              taoists: {
                ...s.taoists,
                [actor]: { ...s.taoists[actor], tao: { ...s.taoists[actor].tao, [color]: s.taoists[actor].tao[color] + 1 } },
              },
            }
          }
        }
        break
      }
      case 'rewardLoseTao': {
        const t = state.taoists[actor]
        for (const c of ['black', 'yellow', 'green', 'blue', 'red'] as TaoColor[]) {
          if (t.tao[c] > 0) {
            s = {
              ...s,
              taoists: { ...s.taoists, [actor]: { ...t, tao: { ...t.tao, [c]: t.tao[c] - 1 } } },
              taoSupply: { ...s.taoSupply, [c]: s.taoSupply[c] + 1 },
            }
            break
          }
        }
        break
      }
      case 'incarnationReturnQiYinYang': {
        // Each incarnation returns 1 Qi and 1 Yin-Yang token to the group.
        // The active player assigns to anyone alive; engine assigns to actor by default.
        const t = s.taoists[actor]
        const maxQi = state.config.difficulty === 'initiation' ? 4 : 3
        if (t.alive && t.qi < maxQi) {
          s = { ...s, taoists: { ...s.taoists, [actor]: { ...t, qi: t.qi + 1, yinYang: true } } }
        } else if (t.alive) {
          s = { ...s, taoists: { ...s.taoists, [actor]: { ...t, yinYang: true } } }
        }
        break
      }
      default:
        break
    }
  }
  return s
}

function anyIncarnationAlive(state: GameState, id: string): boolean {
  return (['red', 'blue', 'green', 'yellow'] as TaoistColor[]).some((c) =>
    state.boards[c].ghostSpaces.some((g) => {
      if (!g) return false
      const card = getGhostCard(g.cardId)
      return card.isIncarnation && card.incarnationId === id
    }),
  )
}

function extraDiceFromPowers(state: GameState, color: TaoistColor): number {
  // Green Taoist "Strength of a Mountain" adds a 4th gray die. We detect by
  // active power id; the power is disabled when the board is possessed/blocked.
  const board = state.boards[color]
  if (board.activePowerId !== 'strengthOfMountain') return 0
  if (isPowerBlocked(state, color)) return 0
  return 1
}

// ---------- Place Buddha -----------------------------------------------

function placeBuddhas(state: GameState, taoistId: TaoistId, spaces: GhostRef[]): GameState {
  const t = taoistById(state, taoistId)
  if (!t.alive) throw new Error('placeBuddha: dead')
  if (t.color !== activeTaoist(state).color) throw new Error('placeBuddha: not active turn')
  if (!t.tile) throw new Error('placeBuddha: no tile')
  const tile = getTile(state, t.tile)
  if (spaces.length === 2 && !isCornerTile(tile)) {
    throw new Error('placeBuddha: dual placement only allowed on corner tiles')
  }
  if (spaces.length === 0 || spaces.length > 2) throw new Error('placeBuddha: 1 or 2 spaces required')
  if (t.buddhasInHand < spaces.length) throw new Error('placeBuddha: not enough Buddhas in hand')

  // Validate adjacency + empty target.
  const reachable = new Set(reachableGhostSpaces(state, t.tile).map((r) => `${r.board}/${r.space}`))
  for (const ref of spaces) {
    if (!reachable.has(`${ref.board}/${ref.space}`)) throw new Error('placeBuddha: not adjacent')
    if (state.boards[ref.board].ghostSpaces[ref.space] != null) {
      throw new Error('placeBuddha: ghost space is occupied')
    }
    if (state.boards[ref.board].buddhaSpaces[ref.space]) {
      throw new Error('placeBuddha: Buddha already present')
    }
  }

  let s: GameState = {
    ...state,
    taoists: { ...state.taoists, [t.color]: { ...t, buddhasInHand: t.buddhasInHand - spaces.length } },
  }
  for (const ref of spaces) {
    const board = s.boards[ref.board]
    const buddhas = [...board.buddhaSpaces] as GameState['boards'][typeof ref.board]['buddhaSpaces']
    buddhas[ref.space] = true
    s = { ...s, boards: { ...s.boards, [ref.board]: { ...board, buddhaSpaces: buddhas } } }
  }
  return s
}

// ---------- Yin-Yang ---------------------------------------------------

function useYinYang(state: GameState, taoistId: TaoistId, effect: YinYangEffect): GameState {
  const t = taoistById(state, taoistId)
  if (!t.alive) throw new Error('yinYang: dead')
  if (!t.yinYang) throw new Error('yinYang: token already spent')

  // Consume the token first.
  let s: GameState = { ...state, taoists: { ...state.taoists, [t.color]: { ...t, yinYang: false } } }

  if (effect.kind === 'flipHauntedTile') {
    s = unhauntTile(s, effect.tile)
    return s
  }
  // requestHelpAnywhere — run the tile's action regardless of position.
  return applyTileActionRemote(s, taoistId, effect.tile, effect.params, {})
}

// ---------- Taoist powers ----------------------------------------------

function useTaoistPower(state: GameState, taoistId: TaoistId, params: PowerParams): GameState {
  const t = taoistById(state, taoistId)
  if (!t.alive) throw new Error('power: dead')
  const board = state.boards[t.color]
  if (isPowerBlocked(state, t.color)) throw new Error('power: blocked')

  // Validate that the power being invoked is the one active on this board.
  // Some powers are passive markers (Heavenly Gust, Second Wind, Strength of a
  // Mountain, Gods' Favorite) — they don't need an explicit invocation.
  switch (params.kind) {
    case 'danceOfTheSpires':
      if (board.activePowerId !== 'danceOfTheSpires') throw new Error('power: not active')
      // Fly to any tile.
      return { ...state, taoists: { ...state.taoists, [t.color]: { ...t, tile: params.toTile } } }
    case 'danceOfTheTwinWinds': {
      if (board.activePowerId !== 'danceOfTheTwinWinds') throw new Error('power: not active')
      const other = taoistById(state, params.otherTaoist)
      if (!other.alive) throw new Error('power: target Taoist dead')
      if (!other.tile) throw new Error('power: target Taoist has no tile')
      // Move 1 space — must be adjacent.
      const adj = adjacentTiles(state, other.tile)
      if (!adj.some((n) => n.id === params.toTile)) throw new Error('power: target tile not adjacent')
      return { ...state, taoists: { ...state.taoists, [other.color]: { ...other, tile: params.toTile } } }
    }
    case 'bottomlessPockets': {
      if (board.activePowerId !== 'bottomlessPockets') throw new Error('power: not active')
      if (state.taoSupply[params.color] <= 0) throw new Error('power: no tao tokens of that color')
      return {
        ...state,
        taoSupply: { ...state.taoSupply, [params.color]: state.taoSupply[params.color] - 1 },
        taoists: { ...state.taoists, [t.color]: { ...t, tao: { ...t.tao, [params.color]: t.tao[params.color] + 1 } } },
      }
    }
    case 'enfeeblementMantra': {
      if (board.activePowerId !== 'enfeeblementMantra') throw new Error('power: not active')
      // Remove any existing mantra from any ghost first, then apply.
      let s: GameState = {
        ...state,
        boards: Object.fromEntries(
          Object.entries(state.boards).map(([k, b]) => [
            k,
            {
              ...b,
              ghostSpaces: b.ghostSpaces.map((g) => (g ? { ...g, hasMantra: false } : g)),
            },
          ]),
        ) as typeof state.boards,
      }
      const dest = s.boards[params.targetGhost.board]
      const newSpaces = [...dest.ghostSpaces] as GameState['boards'][typeof params.targetGhost.board]['ghostSpaces']
      const g = newSpaces[params.targetGhost.space]
      if (!g) throw new Error('power: no ghost there')
      newSpaces[params.targetGhost.space] = { ...g, hasMantra: true }
      s = { ...s, boards: { ...s.boards, [params.targetGhost.board]: { ...dest, ghostSpaces: newSpaces } } }
      return s
    }
    // Marker powers — engine handles their effects elsewhere (extraDiceFromPowers,
    // exorcism reroll, two-actions sequencing).
    case 'heavenlyGust':
    case 'secondWind':
    case 'godsFavorite':
    case 'strengthOfMountain':
      return state
  }
}

function spendPowerToken(
  state: GameState,
  taoistId: TaoistId,
  neutralBoard: TaoistColor,
  params: PowerParams,
): GameState {
  const t = taoistById(state, taoistId)
  if (!t.alive) throw new Error('power token: dead')
  if (t.powerTokens <= 0) throw new Error('power token: none available')
  if (!state.taoists[neutralBoard].isNeutral) throw new Error('power token: target must be neutral')
  if (isPowerBlocked(state, neutralBoard)) throw new Error('power token: neutral board power is blocked')
  // Consume token first, then run the requested power as if from the neutral board.
  const after = { ...state, taoists: { ...state.taoists, [t.color]: { ...t, powerTokens: t.powerTokens - 1 } } }
  // Pretend the active power on the neutral board is what we invoke. We don't
  // mutate the neutral board's `activePowerId` — useTaoistPower validates
  // against it; we bypass by routing through the active Taoist as the actor.
  return applyPowerAsActor(after, t.color, neutralBoard, params)
}

function applyPowerAsActor(
  state: GameState,
  actor: TaoistColor,
  fromBoard: TaoistColor,
  params: PowerParams,
): GameState {
  const t = state.taoists[actor]
  const board = state.boards[fromBoard]
  switch (params.kind) {
    case 'danceOfTheSpires':
      if (board.activePowerId !== 'danceOfTheSpires') throw new Error('power token: power not on that board')
      return { ...state, taoists: { ...state.taoists, [actor]: { ...t, tile: params.toTile } } }
    case 'danceOfTheTwinWinds': {
      if (board.activePowerId !== 'danceOfTheTwinWinds') throw new Error('power token: power not on that board')
      const other = taoistById(state, params.otherTaoist)
      if (!other.alive || !other.tile) throw new Error('power token: target invalid')
      const adj = adjacentTiles(state, other.tile)
      if (!adj.some((n) => n.id === params.toTile)) throw new Error('power token: not adjacent')
      return { ...state, taoists: { ...state.taoists, [other.color]: { ...other, tile: params.toTile } } }
    }
    case 'bottomlessPockets':
      if (board.activePowerId !== 'bottomlessPockets') throw new Error('power token: power not on that board')
      if (state.taoSupply[params.color] <= 0) throw new Error('power token: no tao tokens of that color')
      return {
        ...state,
        taoSupply: { ...state.taoSupply, [params.color]: state.taoSupply[params.color] - 1 },
        taoists: { ...state.taoists, [actor]: { ...t, tao: { ...t.tao, [params.color]: t.tao[params.color] + 1 } } },
      }
    case 'enfeeblementMantra': {
      if (board.activePowerId !== 'enfeeblementMantra') throw new Error('power token: power not on that board')
      const dest = state.boards[params.targetGhost.board]
      const newSpaces = [...dest.ghostSpaces] as GameState['boards'][typeof params.targetGhost.board]['ghostSpaces']
      const g = newSpaces[params.targetGhost.space]
      if (!g) throw new Error('power token: no ghost there')
      newSpaces[params.targetGhost.space] = { ...g, hasMantra: true }
      return { ...state, boards: { ...state.boards, [params.targetGhost.board]: { ...dest, ghostSpaces: newSpaces } } }
    }
    default:
      return state
  }
}

// ---------- End Yang phase --------------------------------------------

function endYangPhase(state: GameState): GameState {
  // Final win/loss check then advance turn.
  let s = checkWin(state)
  if (s.phase === 'gameOver') return s
  s = checkLossConditions(s)
  if (s.phase === 'gameOver') return s
  return advanceTurn(s)
}

// Surface only the legality check for callers that want to gate buttons.
export function canRequestHelp(state: GameState, taoistId: TaoistId, params: HelpParams): boolean {
  try {
    const t = taoistById(state, taoistId)
    if (!t.alive || !t.tile) return false
    const tile = getTile(state, t.tile)
    if (tile.haunted) return false
    return tile.kind === params.kind
  } catch {
    return false
  }
}

// Required by re-imports above.
void ghostSpaceFacingTile
void isCornerTile
