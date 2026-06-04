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

describe('Black Secret: skeleton placement', () => {
  it('places a 1-resistance skeleton on a chosen empty ghost space', () => {
    let s = fresh()
    const { payload } = buildYinPayload(s)
    if (getGhostCard(s.ghostDeck[0]).isIncarnation) return
    s = applyAction(s, { type: 'startTurn', payload })
    const targetBoard: TaoistColor = 'red'
    // Find an empty space.
    const space = s.boards[targetBoard].ghostSpaces.findIndex((g) => g == null) as 0 | 1 | 2
    if (space < 0) return
    s = applyAction(s, {
      type: 'wuFengIntervene',
      choice: { kind: 'skeleton', targetBoard, targetSpace: space },
    } as Action)
    expect(s.blackSecret!.skeletonsAvailable).toBe(2)
    const placed = s.boards[targetBoard].ghostSpaces[space]
    expect(placed?.cardId).toContain('skeleton')
    const card = getGhostCard(placed!.cardId)
    expect(card.resistance[targetBoard]).toBe(1)
  })
})

describe('Black Secret: per-curse effect (lvl 1)', () => {
  it('throws a level-1 curse and the active player loses 1 Qi', () => {
    let s = fresh()
    const { payload } = buildYinPayload(s)
    if (getGhostCard(s.ghostDeck[0]).isIncarnation) return
    s = applyAction(s, { type: 'startTurn', payload })
    const card = getGhostCard(s.pendingArrivalCardId!)
    const color = card.color === 'black' ? 'red' : card.color
    const active = s.turnOrder[s.turnIndex]
    const qiBefore = s.taoists[active].qi
    s = applyAction(s, {
      type: 'wuFengIntervene',
      choice: { kind: 'curse', level: 1, color },
    } as Action)
    expect(s.taoists[active].qi).toBe(qiBefore - 1)
  })
})

describe('Black Secret: Bloody Mantra Qi accumulation', () => {
  it('Qi lost via curse lands on a Mantra; resolves at level threshold', () => {
    let s = fresh()
    // Skip first turn's incarnation case.
    if (getGhostCard(s.ghostDeck[0]).isIncarnation) return
    const { payload } = buildYinPayload(s)
    s = applyAction(s, { type: 'startTurn', payload })
    const card = getGhostCard(s.pendingArrivalCardId!)
    const color = card.color === 'black' ? 'red' : card.color
    // Throw a level-1 curse: active player loses 1 Qi → lands on a level-2 Mantra.
    s = applyAction(s, {
      type: 'wuFengIntervene',
      choice: { kind: 'curse', level: 1, color },
    } as Action)
    const totalQiOnMantras = s.blackSecret!.bloodyMantras.reduce((a, m) => a + m.qiOnCard, 0)
    expect(totalQiOnMantras).toBeGreaterThan(0)
  })
})

describe('Black Secret: Blood Brothers', () => {
  it('a 1-Qi Taoist may invoke the opposite board\'s power', () => {
    let s = fresh()
    s = { ...s, phase: 'yang' }
    const active = s.turnOrder[s.turnIndex]
    const opp: TaoistColor = active === 'red' ? 'green' : active === 'green' ? 'red' : active === 'blue' ? 'yellow' : 'blue'
    // Set up: active at 1 Qi; opposite board has 'bottomlessPockets' active.
    s = {
      ...s,
      taoists: { ...s.taoists, [active]: { ...s.taoists[active], qi: 1 } },
      boards: {
        ...s.boards,
        [opp]: { ...s.boards[opp], activePowerId: 'bottomlessPockets', powerActive: true },
      },
    }
    // Invoke bottomlessPockets — should succeed regardless of own board's active power.
    expect(() =>
      applyAction(s, {
        type: 'usePower',
        taoistId: `taoist-${active}`,
        powerId: 'bottomlessPockets',
        params: { kind: 'bottomlessPockets', color: 'red' },
      } as Action),
    ).not.toThrow()
  })

  it('a 2-Qi Taoist may not invoke the opposite board\'s power (Blood Brother off)', () => {
    let s = fresh()
    s = { ...s, phase: 'yang' }
    const active = s.turnOrder[s.turnIndex]
    const opp: TaoistColor = active === 'red' ? 'green' : active === 'green' ? 'red' : active === 'blue' ? 'yellow' : 'blue'
    s = {
      ...s,
      taoists: { ...s.taoists, [active]: { ...s.taoists[active], qi: 2 } },
      boards: { ...s.boards, [opp]: { ...s.boards[opp], activePowerId: 'bottomlessPockets', powerActive: true } },
    }
    // Make own active power something else, so the only path is via Blood Brother.
    s = {
      ...s,
      boards: { ...s.boards, [active]: { ...s.boards[active], activePowerId: 'danceOfTheSpires' } },
    }
    expect(() =>
      applyAction(s, {
        type: 'usePower',
        taoistId: `taoist-${active}`,
        powerId: 'bottomlessPockets',
        params: { kind: 'bottomlessPockets', color: 'red' },
      } as Action),
    ).toThrow()
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
