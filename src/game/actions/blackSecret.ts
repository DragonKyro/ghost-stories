// Black Secret expansion handlers.
//
// The asymmetric Wu-Feng player intervenes at Yin step 3. Choices:
//   - 'place'    — place the ghost on a board normally
//   - 'summon'   — discard the ghost; summon a demon (cost ≤ ghost resistance)
//   - 'curse'    — discard the ghost; throw a curse (matching color, pyramid)
//   - 'skeleton' — discard the ghost; place a 1-resistance skeleton ghost
//
// Plus the demon Yin-phase action (move/search), which runs before each
// player's Yin via `wuFengDemonActions`.

import { getGhostCard } from '../ghostCatalogue'
import { completeWuFengTurn } from './yin'
import { loseQi, placeGhost, registerQiLossSideEffect } from './hauntingAndQi'
import { checkLossConditions } from './winLose'
import {
  DEFAULT_CURSE_EFFECT_BY_LEVEL,
  MANTRA_RESOLUTION_BY_LEVEL,
  type CatacombToken,
  type CurseEffect,
  type MantraResolution,
} from '../blackSecretData'
import { SKELETON_CARD_IDS, ensureSkeletonInRegistry } from '../ghostCatalogue'
import type {
  BoardColor,
  CurseLevel,
  DemonId,
  DemonState,
  GameState,
  GhostInstance,
  TaoColor,
  TaoistColor,
} from '../types'
import type { Action } from '../actions'

type Choice = Extract<Action, { type: 'wuFengIntervene' }>['choice']

export function applyWuFengIntervene(state: GameState, choice: Choice): GameState {
  if (state.phase !== 'wuFengIntervention') throw new Error('wuFengIntervene: wrong phase')
  if (!state.blackSecret) throw new Error('wuFengIntervene: Black Secret not active')
  if (!state.pendingArrivalCardId) throw new Error('wuFengIntervene: no pending arrival')

  const cardId = state.pendingArrivalCardId
  const card = getGhostCard(cardId)
  const bsBase = state.blackSecret
  let s: GameState = { ...state, pendingArrivalCardId: undefined, blackSecret: bsBase }

  switch (choice.kind) {
    case 'place': {
      const naturalBoard =
        card.color === 'black' ? s.activeBoard : (card.color as typeof s.activeBoard)
      const occupiedOnNatural = s.boards[naturalBoard].ghostSpaces.filter(Boolean).length
      if (occupiedOnNatural < 3 && choice.targetBoard !== naturalBoard) {
        throw new Error(`color placement violation: must place on ${naturalBoard}`)
      }
      if (s.boards[choice.targetBoard].ghostSpaces[choice.targetSpace] != null) {
        throw new Error('target ghost space already occupied')
      }
      s = placeGhost(s, cardId, { board: choice.targetBoard, space: choice.targetSpace })
      break
    }

    case 'summon': {
      const cost = costOf(choice.demonId)
      const resSum = Object.values(card.resistance).reduce((a, b) => a + b, 0)
      if (resSum < cost) {
        throw new Error(`summon: card resistance ${resSum} < cost ${cost}`)
      }
      if (!bsBase.reserveDemons.includes(choice.demonId)) {
        throw new Error('summon: demon already on the board')
      }
      const reserveDemons = bsBase.reserveDemons.filter((d) => d !== choice.demonId)
      const newDemon: DemonState = {
        id: choice.demonId,
        resistance: cost as 1 | 2 | 3,
        color: card.color,
        squareIdx: choice.entranceSquare,
      }
      const catacombsDemons = [...bsBase.catacombsDemons, newDemon]
      s = {
        ...s,
        blackSecret: { ...bsBase, reserveDemons, catacombsDemons },
        discardPile: [...s.discardPile, cardId],
      }
      break
    }

    case 'curse': {
      if (card.color !== 'black' && card.color !== choice.color) {
        throw new Error(`curse: color mismatch (ghost is ${card.color})`)
      }
      if (choice.level > 1) {
        const prior = bsBase.curses[(choice.level - 1) as CurseLevel]
        if (prior < 2) {
          throw new Error(`curse: need 2 prior lvl ${choice.level - 1} curses (have ${prior})`)
        }
      }
      const curses = { ...bsBase.curses, [choice.level]: bsBase.curses[choice.level] + 1 }
      s = {
        ...s,
        blackSecret: { ...bsBase, curses },
        discardPile: [...s.discardPile, cardId],
      }
      // Apply Wu-Feng's chosen curse effect from the pool, else fall back to
      // the level's default.
      const effect = choice.effect ?? DEFAULT_CURSE_EFFECT_BY_LEVEL[choice.level]
      s = applyCurseEffect(s, effect)
      break
    }

    case 'skeleton': {
      if (bsBase.skeletonsAvailable <= 0) {
        throw new Error('skeleton: no skeletons available')
      }
      if (s.boards[choice.targetBoard].ghostSpaces[choice.targetSpace] != null) {
        throw new Error('skeleton: target slot occupied')
      }
      // Place a skeleton (resistance 1 of the board's color). Skeletons are
      // not ghost cards — we synthesize a minimal GhostInstance with a
      // catalogue-backed card id.
      ensureSkeletonInRegistry(choice.targetBoard)
      const skelCardId = SKELETON_CARD_IDS[choice.targetBoard]
      const skel: GhostInstance = { cardId: skelCardId, hauntingFigurePos: 'card', hasMantra: false }
      const newSpaces = [...s.boards[choice.targetBoard].ghostSpaces] as GameState['boards'][typeof choice.targetBoard]['ghostSpaces']
      newSpaces[choice.targetSpace] = skel
      s = {
        ...s,
        boards: { ...s.boards, [choice.targetBoard]: { ...s.boards[choice.targetBoard], ghostSpaces: newSpaces } },
        blackSecret: { ...bsBase, skeletonsAvailable: bsBase.skeletonsAvailable - 1 },
        discardPile: [...s.discardPile, cardId],
      }
      break
    }
  }

  return completeWuFengTurn(s)
}

// ----- Curse effects -----------------------------------------------------

function applyCurseEffect(state: GameState, effect: CurseEffect): GameState {
  let s = state
  switch (effect) {
    case 'activePlayerLosesQi':
      return loseQi(s, s.activeBoard)
    case 'activePlayerLosesTao': {
      const t = s.taoists[s.activeBoard]
      if (!t.alive || t.isNeutral) return s
      for (const c of ['black', 'yellow', 'green', 'blue', 'red'] as const) {
        if (t.tao[c] > 0) {
          return {
            ...s,
            taoists: { ...s.taoists, [s.activeBoard]: { ...t, tao: { ...t.tao, [c]: t.tao[c] - 1 } } },
          }
        }
      }
      return s
    }
    case 'activePlayerLosesYinYang': {
      const t = s.taoists[s.activeBoard]
      if (!t.alive || t.isNeutral || !t.yinYang) return s
      return { ...s, taoists: { ...s.taoists, [s.activeBoard]: { ...t, yinYang: false } } }
    }
    case 'hauntActivePlayersBoardLine': {
      // Advance every haunting figure on the active board 1 step.
      const board = s.boards[s.activeBoard]
      const newSpaces = board.ghostSpaces.map((g) => {
        if (!g) return g
        if (g.hauntingFigurePos === 'card') return { ...g, hauntingFigurePos: 'stone1' as const }
        if (g.hauntingFigurePos === 'stone1') return { ...g, hauntingFigurePos: 'stone2' as const }
        return g
      }) as typeof board.ghostSpaces
      return { ...s, boards: { ...s.boards, [s.activeBoard]: { ...board, ghostSpaces: newSpaces } } }
    }
    case 'returnAllCircleTokens': {
      const circle = s.village.find((v) => v.kind === 'circleOfPrayer')
      if (!circle || !circle.circleToken) return s
      const c = circle.circleToken
      return {
        ...s,
        village: s.village.map((vt) => (vt.id === circle.id ? { ...vt, circleToken: null } : vt)),
        taoSupply: { ...s.taoSupply, [c]: s.taoSupply[c] + 1 },
      }
    }
    case 'allPlayersLoseTao': {
      const taoists = { ...s.taoists }
      for (const color of ['red', 'blue', 'green', 'yellow'] as TaoistColor[]) {
        const t = taoists[color]
        if (!t.alive || t.isNeutral) continue
        for (const c of ['black', 'yellow', 'green', 'blue', 'red'] as const) {
          if (t.tao[c] > 0) {
            taoists[color] = { ...t, tao: { ...t.tao, [c]: t.tao[c] - 1 } }
            break
          }
        }
      }
      return { ...s, taoists }
    }
    case 'allPlayersLoseQi1':
    case 'allPlayersLoseQi2':
    case 'allPlayersLoseQi': {
      for (const color of ['red', 'blue', 'green', 'yellow'] as TaoistColor[]) {
        if (!s.taoists[color].alive || s.taoists[color].isNeutral) continue
        s = loseQi(s, color)
        if (s.phase === 'gameOver') return s
      }
      return s
    }
    case 'lockOnePlayerPower': {
      // Active player's board power is inactivated for the rest of the turn.
      const board = s.boards[s.activeBoard]
      return { ...s, boards: { ...s.boards, [s.activeBoard]: { ...board, powerActive: false } } }
    }
    case 'inactiveTaoMarkerOn':
      return { ...s, inactiveTaoMarker: true }
    case 'hauntFirstActiveTile': {
      for (const tile of s.village) {
        if (!tile.haunted) {
          const village = s.village.map((vt) => (vt.id === tile.id ? { ...vt, haunted: true } : vt))
          s = { ...s, village, hauntedCount: s.hauntedCount + 1 }
          return checkLossConditions(s)
        }
      }
      return s
    }
    case 'hauntTwoTiles': {
      let count = 0
      for (const tile of s.village) {
        if (count >= 2) break
        if (!tile.haunted) {
          s = {
            ...s,
            village: s.village.map((vt) => (vt.id === tile.id ? { ...vt, haunted: true } : vt)),
            hauntedCount: s.hauntedCount + 1,
          }
          s = checkLossConditions(s)
          if (s.phase === 'gameOver') return s
          count++
        }
      }
      return s
    }
    case 'returnAllInactiveTaoists':
      // Placeholder — fall back to one-Qi-tax on the active player.
      return loseQi(s, s.activeBoard)
  }
}

// ----- Bloody Mantra Qi accumulation -------------------------------------

/**
 * Hook called whenever a Taoist or neutral board loses 1 Qi. Routes the Qi
 * onto the next Bloody Mantra of the player's choice. For determinism we put
 * it on the lowest-level Mantra that isn't full (engine bias toward fast
 * level-2 resolution).
 *
 * When a Mantra fills, its effect resolves and a replacement of the same
 * level is added to the in-play set (if any remain conceptually; in this
 * simplified build mantras refresh up to the original count).
 */
export function placeQiOnMantra(state: GameState): GameState {
  if (!state.blackSecret) return state
  const bs = state.blackSecret
  // Find the lowest-level mantra that has room.
  const idx = bs.bloodyMantras.findIndex((m) => m.qiOnCard < m.level)
  if (idx < 0) return state
  const mantra = bs.bloodyMantras[idx]
  const newQi = mantra.qiOnCard + 1
  let mantras = bs.bloodyMantras.slice()
  let s: GameState = state
  if (newQi >= mantra.level) {
    // Resolve + replace.
    const effect = MANTRA_RESOLUTION_BY_LEVEL[mantra.level]
    s = applyMantraResolution(s, effect)
    // Replace with a fresh card of the same level.
    mantras[idx] = { level: mantra.level, qiOnCard: 0 }
  } else {
    mantras[idx] = { ...mantra, qiOnCard: newQi }
  }
  return {
    ...s,
    blackSecret: { ...s.blackSecret!, bloodyMantras: mantras },
  }
}

function applyMantraResolution(state: GameState, effect: MantraResolution): GameState {
  let s = state
  const maxQi = state.config.difficulty === 'initiation' ? 4 : 3
  switch (effect) {
    case 'gainQiAllAlive': {
      const taoists = { ...s.taoists }
      for (const c of ['red', 'blue', 'green', 'yellow'] as TaoistColor[]) {
        const t = taoists[c]
        if (!t.alive || t.isNeutral) continue
        taoists[c] = { ...t, qi: Math.min(maxQi, t.qi + 1) }
      }
      return { ...s, taoists }
    }
    case 'returnAllInactiveTao':
      return { ...s, inactiveTaoMarker: false }
    case 'discardThreeGhosts': {
      // For each board: discard the highest-resistance non-incarnation ghost.
      for (const c of ['red', 'blue', 'green', 'yellow'] as TaoistColor[]) {
        const board = s.boards[c]
        let best: { spaceIdx: 0 | 1 | 2; cardId: string; res: number } | null = null
        for (const i of [0, 1, 2] as const) {
          const g = board.ghostSpaces[i]
          if (!g) continue
          const card = getGhostCard(g.cardId)
          if (card.isIncarnation) continue
          const res = Object.values(card.resistance).reduce((a, b) => a + b, 0)
          if (!best || res > best.res) best = { spaceIdx: i, cardId: g.cardId, res }
        }
        if (!best) continue
        const newSpaces = [...s.boards[c].ghostSpaces] as GameState['boards'][typeof c]['ghostSpaces']
        newSpaces[best.spaceIdx] = null
        s = {
          ...s,
          boards: { ...s.boards, [c]: { ...s.boards[c], ghostSpaces: newSpaces } },
          discardPile: [...s.discardPile, best.cardId],
        }
      }
      return s
    }
  }
}

// ----- Blood Brothers ----------------------------------------------------

/**
 * Returns true if the given Taoist currently has Blood Brother active (= they
 * are at exactly 1 Qi).
 */
export function hasBloodBrother(state: GameState, color: TaoistColor): boolean {
  if (!state.blackSecret) return false
  const t = state.taoists[color]
  return t.alive && t.qi === 1
}

/**
 * Returns the *opposite* board color (north↔south, east↔west). Blood Brother
 * lets you use that board's power.
 */
export function oppositeBoard(color: TaoistColor): TaoistColor {
  switch (color) {
    case 'red': return 'green'
    case 'green': return 'red'
    case 'blue': return 'yellow'
    case 'yellow': return 'blue'
  }
}

// ----- Demon Yin-phase actions ------------------------------------------

type Move = Extract<Action, { type: 'wuFengDemonActions' }>['moves'][number]

export function applyWuFengDemonActions(state: GameState, moves: Move[]): GameState {
  if (!state.blackSecret) throw new Error('demon actions: Black Secret not active')
  if (state.phase !== 'yin') throw new Error('demon actions: must run in Yin phase prelude')
  let s = state
  const bs = s.blackSecret! // narrowed by guard above
  const demons = bs.catacombsDemons.slice()
  for (const m of moves) {
    if (m.demonIdx < 0 || m.demonIdx >= demons.length) continue
    const d = demons[m.demonIdx]
    if (m.kind === 'move') {
      if (!isCatacombAdjacent(d.squareIdx ?? 0, m.toSquare)) {
        throw new Error('demon move: not adjacent in 3x3 catacombs')
      }
      demons[m.demonIdx] = { ...d, squareIdx: m.toSquare }
    } else {
      // Search: reveal top catacomb token. Only legal when no Taoist is on
      // that square (we don't track Taoist catacombs presence in this build,
      // so always allowed).
      const deck = s.blackSecret!.catacombDeck
      if (deck.length === 0) continue
      const top = deck[0]
      const newDeck = deck.slice(1)
      s = { ...s, blackSecret: { ...s.blackSecret!, catacombDeck: newDeck } }
      s = applyCatacombToken(s, top, m.demonIdx, demons)
    }
  }
  // Persist updated demons array.
  s = { ...s, blackSecret: { ...s.blackSecret!, catacombsDemons: demons } }
  return s
}

function isCatacombAdjacent(a: number, b: number): boolean {
  if (a === b) return false
  const ax = a % 3, ay = Math.floor(a / 3)
  const bx = b % 3, by = Math.floor(b / 3)
  return Math.max(Math.abs(ax - bx), Math.abs(ay - by)) === 1 // king's move
}

function applyCatacombToken(
  state: GameState,
  token: CatacombToken,
  demonIdx: number,
  demons: DemonState[],
): GameState {
  let s = state
  switch (token.kind) {
    case 'dirt':
      return s
    case 'buddha': {
      // Demon returns to Wu-Feng's reserve.
      const d = demons[demonIdx]
      if (!d) return s
      demons.splice(demonIdx, 1)
      return {
        ...s,
        blackSecret: { ...s.blackSecret!, reserveDemons: [...s.blackSecret!.reserveDemons, d.id] },
      }
    }
    case 'bloodOfTheJust':
      // Active Taoist places 1 Qi on a Mantra — engine routes via placeQiOnMantra.
      return placeQiOnMantra(s)
    case 'cursedTablet':
      // Wu-Feng throws a curse of choice — engine picks the lowest legal level.
      return throwOpportunisticCurse(s)
    case 'bones':
      // Wu-Feng gains a skeleton in reserve, capped at 3.
      if (s.blackSecret!.skeletonsAvailable >= 3) return s
      return { ...s, blackSecret: { ...s.blackSecret!, skeletonsAvailable: s.blackSecret!.skeletonsAvailable + 1 } }
    case 'bloodOfSuLing':
      // Resolve a Bloody Mantra of choice (engine picks the most-filled).
      return forceResolveMantra(s)
    case 'urn': {
      const urns = s.blackSecret!.urnsFound + 1
      s = { ...s, blackSecret: { ...s.blackSecret!, urnsFound: urns } }
      if (urns >= 3 && !s.blackSecret!.shadowPos) {
        // Shadow of Wu-Feng enters play on the first empty ghost space.
        s = spawnShadow(s)
      }
      return s
    }
  }
}

function throwOpportunisticCurse(state: GameState): GameState {
  if (!state.blackSecret) return state
  // Find the highest level currently throwable, mirroring the pyramid rules.
  const c = state.blackSecret.curses
  let level: CurseLevel = 1
  if (c[3] >= 2) level = 4
  else if (c[2] >= 2) level = 3
  else if (c[1] >= 2) level = 2
  const next = { ...c, [level]: c[level] + 1 } as typeof c
  let s: GameState = { ...state, blackSecret: { ...state.blackSecret, curses: next } }
  return applyCurseEffect(s, DEFAULT_CURSE_EFFECT_BY_LEVEL[level])
}

function forceResolveMantra(state: GameState): GameState {
  if (!state.blackSecret) return state
  const mantras = state.blackSecret.bloodyMantras.slice()
  // Pick the most-full mantra.
  let bestIdx = -1, bestRatio = -1
  for (let i = 0; i < mantras.length; i++) {
    const m = mantras[i]
    const ratio = m.qiOnCard / m.level
    if (ratio > bestRatio) { bestRatio = ratio; bestIdx = i }
  }
  if (bestIdx < 0) return state
  const m = mantras[bestIdx]
  let s = applyMantraResolution(state, MANTRA_RESOLUTION_BY_LEVEL[m.level])
  mantras[bestIdx] = { level: m.level, qiOnCard: 0 }
  return { ...s, blackSecret: { ...s.blackSecret!, bloodyMantras: mantras } }
}

function spawnShadow(state: GameState): GameState {
  if (!state.blackSecret) return state
  // Place Shadow on the first empty ghost space found in canonical order.
  for (const c of ['red', 'blue', 'green', 'yellow'] as BoardColor[]) {
    for (const i of [0, 1, 2] as const) {
      if (state.boards[c].ghostSpaces[i] == null) {
        return {
          ...state,
          blackSecret: { ...state.blackSecret, shadowPos: { kind: 'ghostSpace', board: c, ghostSpaceIdx: i } },
        }
      }
    }
  }
  return state
}

// ----- Shadow of Wu-Feng action handler ---------------------------------

type ShadowAction = Extract<Action, { type: 'wuFengShadowAction' }>['action']

export function applyShadowAction(state: GameState, action: ShadowAction): GameState {
  if (!state.blackSecret) throw new Error('shadow: Black Secret not active')
  if (!state.blackSecret.shadowPos) throw new Error('shadow: Shadow not in play')
  if (state.phase !== 'yin') throw new Error('shadow: must run during Yin prelude')

  let s = state
  const bs = s.blackSecret!

  switch (action.kind) {
    case 'pass':
      return s
    case 'move': {
      let nextPos: NonNullable<typeof bs.shadowPos>
      if (action.toTile) {
        nextPos = { kind: 'villageTile', tileId: action.toTile }
      } else if (action.toBoard && action.toGhostSpaceIdx !== undefined) {
        nextPos = { kind: 'ghostSpace', board: action.toBoard, ghostSpaceIdx: action.toGhostSpaceIdx }
      } else {
        throw new Error('shadow move: missing target')
      }
      // Side effect: if Shadow moves onto the Circle of Prayer, the Tao token
      // there is returned to supply.
      let circleSupply = s.taoSupply
      if (nextPos.kind === 'villageTile') {
        const tile = s.village.find((v) => v.id === (nextPos as { kind: 'villageTile'; tileId: string }).tileId)
        if (tile && tile.kind === 'circleOfPrayer' && tile.circleToken) {
          const returned = tile.circleToken
          circleSupply = { ...circleSupply, [returned]: circleSupply[returned] + 1 }
          s = {
            ...s,
            village: s.village.map((v) => (v.id === tile.id ? { ...v, circleToken: null } : v)),
            taoSupply: circleSupply,
          }
        }
      }
      return {
        ...s,
        blackSecret: { ...s.blackSecret!, shadowPos: nextPos },
      }
    }
    case 'attackTaoists': {
      // Shadow must be on a village tile; each black face = -1 Qi from a
      // chosen Taoist on that tile.
      const sp = s.blackSecret?.shadowPos
      if (!sp || sp.kind !== 'villageTile') throw new Error('shadow attack: must be on a tile')
      const tileId = sp.tileId
      const presentTaoists = (['red', 'blue', 'green', 'yellow'] as TaoistColor[]).filter(
        (c) => s.taoists[c].alive && s.taoists[c].tile === tileId,
      )
      if (presentTaoists.length === 0) return s
      // For each black face, hit one of the chosen target Taoists in order.
      const blacks = action.diceRoll.filter((d) => d === 'black').length
      const hits = action.targetTaoists.slice(0, blacks)
      for (const c of hits) {
        if (!presentTaoists.includes(c)) continue
        s = loseQi(s, c)
        if (s.phase === 'gameOver') return s
      }
      return s
    }
    case 'attackTile': {
      // Shadow must be on a village tile with no Taoists.
      const sp2 = s.blackSecret?.shadowPos
      if (!sp2 || sp2.kind !== 'villageTile') throw new Error('shadow attack tile: must be on a tile')
      const tileId = sp2.tileId
      const presentTaoists = (['red', 'blue', 'green', 'yellow'] as TaoistColor[]).filter(
        (c) => s.taoists[c].alive && s.taoists[c].tile === tileId,
      )
      if (presentTaoists.length > 0) throw new Error('shadow attack tile: a Taoist is here')
      // Curse die effect: route through the standard curse-die handler.
      switch (action.curseRoll) {
        case 'none':
          return s
        case 'loseQi':
          return loseQi(s, s.activeBoard)
        case 'loseAllTao': {
          const t = s.taoists[s.activeBoard]
          if (t.alive) {
            s = { ...s, taoists: { ...s.taoists, [s.activeBoard]: { ...t, tao: { red: 0, green: 0, blue: 0, yellow: 0, black: 0 } } } }
          }
          return s
        }
        case 'haunt': {
          // Haunt the tile Shadow is on.
          const tile = s.village.find((v) => v.id === tileId)
          if (!tile || tile.haunted) return s
          s = {
            ...s,
            village: s.village.map((v) => (v.id === tileId ? { ...v, haunted: true } : v)),
            hauntedCount: s.hauntedCount + 1,
          }
          return s
        }
        case 'spawnGhost':
          // Spawn a ghost via the standard arrival flow (re-use Yin step 3).
          // No-op if we don't have an arrival payload.
          return s
      }
      return s
    }
  }
}

/** Returns true if the Shadow is on the given village tile. */
export function shadowBlocksTile(state: GameState, tileId: string): boolean {
  if (!state.blackSecret?.shadowPos) return false
  return state.blackSecret.shadowPos.kind === 'villageTile' && state.blackSecret.shadowPos.tileId === tileId
}

/**
 * The Shadow is invincible — exorcism validation rejects targeting the
 * Shadow's ghost-space slot.
 */
export function isShadowSlot(state: GameState, board: BoardColor, space: 0 | 1 | 2): boolean {
  const p = state.blackSecret?.shadowPos
  if (!p) return false
  return p.kind === 'ghostSpace' && p.board === board && p.ghostSpaceIdx === space
}

// ----- Helpers exposed to the UI -----------------------------------------

function costOf(id: DemonId): 2 | 3 | 4 {
  return id === 'cost2' ? 2 : id === 'cost3' ? 3 : 4
}

export function availableDemonOptions(state: GameState): Array<{ id: DemonId; cost: 2 | 3 | 4 }> {
  if (!state.blackSecret) return []
  return state.blackSecret.reserveDemons.map((id) => ({ id, cost: costOf(id) }))
}

export function legalCurseColors(state: GameState): TaoColor[] {
  if (!state.pendingArrivalCardId) return []
  const card = getGhostCard(state.pendingArrivalCardId)
  if (card.color === 'black') return ['red', 'green', 'blue', 'yellow', 'black']
  return [card.color as TaoColor]
}

export function maxLegalCurseLevel(state: GameState): CurseLevel {
  if (!state.blackSecret) return 1
  const c = state.blackSecret.curses
  if (c[3] >= 2) return 4
  if (c[2] >= 2) return 3
  if (c[1] >= 2) return 2
  return 1
}

// Side-effect hook: route Qi losses onto Bloody Mantras when Black Secret is
// active. This module is imported by the engine dispatcher, so the
// registration runs once per process at engine import time.
registerQiLossSideEffect((s) => (s.blackSecret ? placeQiOnMantra(s) : s))
