// Black Secret expansion tests.

import { describe, expect, it } from 'vitest'
import { applyAction, createGame } from './engine'
import { buildYinPayload } from './yinPayload'
import { getGhostCard } from './ghostCatalogue'
import type { Action } from './actions'
import type { GameConfig, GameState, TaoistColor } from './types'

const cfg: GameConfig = {
  difficulty: 'initiation',
  seats: { red: 'human', blue: 'human', green: 'human', yellow: 'human' },
  rngSeed: 7,
  expansions: ['blackSecret'],
  wuFengPlayer: { tag: 'Test Wu-Feng' },
}

function fresh(extra: Partial<GameConfig> = {}): GameState {
  return createGame({ ...cfg, ...extra })
}

describe('Black Secret setup', () => {
  it('initialises BlackSecret state with 3 demons in reserve, 3 skeletons, 6 mantras', () => {
    const s = fresh()
    expect(s.blackSecret).toBeDefined()
    expect(s.blackSecret!.reserveDemons).toEqual(['cost2', 'cost3', 'cost4'])
    expect(s.blackSecret!.catacombsDemons).toHaveLength(0)
    expect(s.blackSecret!.skeletonsAvailable).toBe(3)
    expect(s.blackSecret!.bloodyMantras).toHaveLength(6)
    expect(s.blackSecret!.curses).toEqual({ 1: 0, 2: 0, 3: 0, 4: 0 })
  })

  it('swaps Night Watchman for Calligrapher', () => {
    const s = fresh()
    const kinds = new Set(s.village.map((v) => v.kind))
    expect(kinds.has('calligrapher')).toBe(true)
    expect(kinds.has('nightWatchmanBeat')).toBe(false)
  })

  it('records the Wu-Feng tag', () => {
    const s = fresh()
    expect(s.blackSecret!.wuFengTag).toBe('Test Wu-Feng')
  })
})

describe('Black Secret: Yin step 3 → wuFengIntervention', () => {
  it('enters wuFengIntervention instead of auto-placing on a non-incarnation draw', () => {
    let s = fresh()
    const { payload } = buildYinPayload(s)
    // Skip if first card happens to be an incarnation (unlikely with seed=7).
    const topCard = getGhostCard(s.ghostDeck[0])
    if (topCard.isIncarnation) return
    s = applyAction(s, { type: 'startTurn', payload })
    expect(s.phase).toBe('wuFengIntervention')
    expect(s.pendingArrivalCardId).toBe(topCard.id)
  })

  it('place choice places the ghost normally and returns to Yang', () => {
    let s = fresh()
    const { payload } = buildYinPayload(s)
    if (getGhostCard(s.ghostDeck[0]).isIncarnation) return
    s = applyAction(s, { type: 'startTurn', payload })
    expect(s.phase).toBe('wuFengIntervention')
    const card = getGhostCard(s.pendingArrivalCardId!)
    const targetBoard: TaoistColor = card.color === 'black' ? s.activeBoard : (card.color as TaoistColor)
    s = applyAction(s, {
      type: 'wuFengIntervene',
      choice: { kind: 'place', targetBoard, targetSpace: 0 },
    } as Action)
    expect(s.phase).toBe('yang')
    expect(s.boards[targetBoard].ghostSpaces[0]?.cardId).toBe(card.id)
  })

  it('summon choice consumes the demon and adds it to the catacombs', () => {
    let s = fresh()
    const { payload } = buildYinPayload(s)
    if (getGhostCard(s.ghostDeck[0]).isIncarnation) return
    s = applyAction(s, { type: 'startTurn', payload })
    // Find a demon whose cost is ≤ ghost resistance sum.
    const card = getGhostCard(s.pendingArrivalCardId!)
    const resSum = Object.values(card.resistance).reduce((a, b) => a + b, 0)
    if (resSum < 2) return // no summon possible
    const demonId = resSum >= 4 ? 'cost4' : resSum >= 3 ? 'cost3' : 'cost2'
    const before = s.blackSecret!.reserveDemons.length
    s = applyAction(s, {
      type: 'wuFengIntervene',
      choice: { kind: 'summon', demonId, entranceSquare: 0 },
    } as Action)
    expect(s.blackSecret!.reserveDemons.length).toBe(before - 1)
    expect(s.blackSecret!.catacombsDemons).toHaveLength(1)
    expect(s.blackSecret!.catacombsDemons[0].id).toBe(demonId)
    expect(s.phase).toBe('yang')
  })

  it('curse choice throws a level-1 curse and applies the simplified Qi tax', () => {
    let s = fresh()
    const { payload } = buildYinPayload(s)
    if (getGhostCard(s.ghostDeck[0]).isIncarnation) return
    s = applyAction(s, { type: 'startTurn', payload })
    const card = getGhostCard(s.pendingArrivalCardId!)
    const curseColor = card.color === 'black' ? 'red' : card.color
    const activeColor = s.turnOrder[s.turnIndex]
    const qiBefore = s.taoists[activeColor].qi
    s = applyAction(s, {
      type: 'wuFengIntervene',
      choice: { kind: 'curse', level: 1, color: curseColor },
    } as Action)
    expect(s.blackSecret!.curses[1]).toBe(1)
    expect(s.taoists[activeColor].qi).toBe(qiBefore - 1) // lvl 1 → 1 Qi loss
    expect(s.phase).toBe('yang')
  })

  it('refuses curse of level 2 before two level-1 curses exist', () => {
    let s = fresh()
    const { payload } = buildYinPayload(s)
    if (getGhostCard(s.ghostDeck[0]).isIncarnation) return
    s = applyAction(s, { type: 'startTurn', payload })
    const card = getGhostCard(s.pendingArrivalCardId!)
    const curseColor = card.color === 'black' ? 'red' : card.color
    expect(() =>
      applyAction(s, {
        type: 'wuFengIntervene',
        choice: { kind: 'curse', level: 2, color: curseColor },
      } as Action),
    ).toThrow(/lvl 1/)
  })

  it('refuses curse of mismatched color on a non-black ghost', () => {
    let s = fresh()
    const { payload } = buildYinPayload(s)
    if (getGhostCard(s.ghostDeck[0]).isIncarnation) return
    s = applyAction(s, { type: 'startTurn', payload })
    const card = getGhostCard(s.pendingArrivalCardId!)
    if (card.color === 'black') return
    const wrongColor = card.color === 'red' ? 'blue' : 'red'
    expect(() =>
      applyAction(s, {
        type: 'wuFengIntervene',
        choice: { kind: 'curse', level: 1, color: wrongColor },
      } as Action),
    ).toThrow(/color/)
  })
})

describe('Black Secret + White Moon: tile pool', () => {
  it('does not include Night Watchman when either expansion is on', () => {
    const wmOnly = createGame({ ...cfg, expansions: ['whiteMoon'] })
    const bsOnly = createGame({ ...cfg, expansions: ['blackSecret'] })
    const both = createGame({ ...cfg, expansions: ['whiteMoon', 'blackSecret'] })
    for (const s of [wmOnly, bsOnly, both]) {
      const kinds = s.village.map((v) => v.kind)
      expect(kinds).not.toContain('nightWatchmanBeat')
    }
  })
})
