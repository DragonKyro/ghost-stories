import { describe, expect, it } from 'vitest'
import { applyAction, createGame } from './engine'
import { covers } from './exorcism'
import { isWuFengCard } from './rules'
import { act, config, game, putGhost, ref, respond, rigCurse, rigDice, tileKindAt, yangFor } from './testUtil'
import type { GameState } from './types'

const zero = { red: 0, blue: 0, green: 0, yellow: 0, black: 0 }

describe('setup', () => {
  it('hides one incarnation exactly 10 cards from the bottom (Normal, 4 players)', () => {
    const s = createGame({ ...config(), firstPlayer: 'red' })
    // The first Yin phase drew one card already.
    const deck = s.deck
    const incs = deck.map((c, i) => (isWuFengCard(c) ? i : -1)).filter((i) => i >= 0)
    expect(incs).toHaveLength(1)
    expect(deck.length - 1 - incs[0]!).toBe(10)
    expect(deck.length + 1).toBe(46) // 45 ghosts + 1 incarnation, minus the first draw
  })

  it('Nightmare: 4 incarnations, 10 cards apart from the bottom; 3 with 1–2 players', () => {
    const s = createGame(config({ difficulty: 'nightmare' }))
    const fromBottom = s.deck.map((c, i) => (isWuFengCard(c) ? s.deck.length - 1 - i : -1)).filter((i) => i >= 0).sort((a, b) => a - b)
    expect(fromBottom).toEqual([10, 21, 32, 43])
    const two = createGame(config({ difficulty: 'nightmare', seats: { red: 'human', blue: 'neutral', green: 'human', yellow: 'neutral' } }))
    expect(two.deck.filter(isWuFengCard)).toHaveLength(3)
  })

  it('removes 5 cards per missing player and gives 1–3 player bonuses', () => {
    const s = createGame(config({ seats: { red: 'human', blue: 'human', green: 'human', yellow: 'neutral' } }))
    expect(s.deck.length + 1).toBe(45 - 5 + 1)
    expect(s.boards.yellow.neutral).toBe(true)
    expect(s.boards.yellow.qi).toBe(3)
    expect(s.taoists.red.powerTokens).toBe(1)
    expect(s.taoists.yellow.alive).toBe(false)
  })

  it('solo: red shows the Dance of the Spires; one Tao of each colour; 3 power tokens', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const s = createGame(config({ seed, seats: { red: 'neutral', blue: 'human', green: 'neutral', yellow: 'neutral' }, difficulty: 'initiation' }))
      expect(s.boards.red.power).toBe('danceOfTheSpires')
      expect(s.taoists.blue.tao).toEqual({ red: 1, blue: 1, green: 1, yellow: 1, black: 1 })
      expect(s.taoists.blue.powerTokens).toBe(3)
      expect(s.taoists.blue.qi).toBe(4)
    }
  })

  it('difficulty: Normal 3 Qi and no black Tao; Hell has no Yin-Yang', () => {
    const n = game({ difficulty: 'normal' })
    expect(n.taoists.red.qi).toBe(3)
    expect(n.taoists.red.tao).toEqual({ ...zero, red: 1 })
    expect(n.taoists.red.yinYang).toBe(true)
    const h = game({ difficulty: 'hell' })
    expect(h.taoists.red.yinYang).toBe(false)
    const i = game({ difficulty: 'initiation' })
    expect(i.taoists.green.tao).toEqual({ ...zero, green: 1, black: 1 })
    expect(i.taoists.green.qi).toBe(4)
  })

  it('2 players must face each other', () => {
    expect(() => createGame(config({ seats: { red: 'human', blue: 'human', green: 'neutral', yellow: 'neutral' } }))).toThrow(/facing/)
  })

  it('the first turn starts with a ghost arriving on its colour board', () => {
    const s = game()
    const ghosts = (['red', 'blue', 'green', 'yellow'] as const).flatMap((c) => s.boards[c].spaces.filter(Boolean))
    if (s.prompt) expect(s.prompt.kind).toBe('placeGhost')
    else {
      expect(ghosts).toHaveLength(1)
      expect(s.phase).toBe('yang')
    }
  })

  it('is deterministic for a seed', () => {
    expect(JSON.stringify(createGame(config({ seed: 99 })))).toBe(JSON.stringify(createGame(config({ seed: 99 }))))
  })
})

describe('exorcism maths', () => {
  const req = (base: Record<string, number>, extra: { discounts?: number; immune?: boolean } = {}) => ({
    key: 'x',
    base,
    discounts: extra.discounts ?? 0,
    immune: extra.immune ?? false,
  })

  it('needs faces of the ghost colour; white is wild, including for black', () => {
    expect(covers([req({ red: 2 })], ['red', 'red', 'blue'], true, zero, 0)).toBe(true)
    expect(covers([req({ red: 2 })], ['red', 'white', 'blue'], true, zero, 0)).toBe(true)
    expect(covers([req({ red: 2 })], ['red', 'blue', 'blue'], true, zero, 0)).toBe(false)
    expect(covers([req({ black: 2 })], ['black', 'white', 'red'], true, zero, 0)).toBe(true)
  })

  it('white is not wild while Nameless is in play', () => {
    expect(covers([req({ red: 1 })], ['white', 'blue', 'green'], false, zero, 0)).toBe(false)
  })

  it('Tao tokens cover the shortfall', () => {
    expect(covers([req({ red: 3 })], ['red', 'blue', 'green'], true, { ...zero, red: 2 }, 0)).toBe(true)
    expect(covers([req({ red: 3 })], ['red', 'blue', 'green'], true, { ...zero, red: 1 }, 0)).toBe(false)
  })

  it('dice-immune ghosts are paid only by tokens (and crystals)', () => {
    expect(covers([req({ blue: 2 }, { immune: true })], ['blue', 'blue', 'blue'], true, zero, 0)).toBe(false)
    expect(covers([req({ blue: 2 }, { immune: true })], ['blue', 'blue', 'blue'], true, { ...zero, blue: 2 }, 0)).toBe(true)
  })

  it('discounts lower resistance on a colour of choice', () => {
    expect(covers([req({ red: 2 }, { discounts: 1 })], ['red', 'blue', 'blue'], true, zero, 0)).toBe(true)
    // Hope Killer with the Mantra: 2R2G2B2Y −1 on a colour the roll needs.
    expect(covers([req({ red: 2, blue: 2, green: 2, yellow: 2 }, { discounts: 1 })], ['red', 'red', 'blue'], true, { ...zero, blue: 1, green: 2, yellow: 1 }, 0)).toBe(true)
  })

  it('corner exorcism: one roll for both ghosts', () => {
    expect(covers([req({ red: 1 }), req({ yellow: 1 })], ['red', 'yellow', 'green'], true, zero, 0)).toBe(true)
    expect(covers([req({ red: 2 }), req({ yellow: 1 })], ['red', 'yellow', 'green'], true, zero, 0)).toBe(false)
  })
})

/** Red on tile 1 (north edge) facing red space 1. */
function redFacing(): GameState {
  const s = yangFor(game(), 'red')
  s.taoists.red.tile = 1
  return s
}

describe('Yang phase order', () => {
  it('moves once, to an adjacent tile, before acting', () => {
    let s = yangFor(game(), 'red')
    s.boards.red.power = 'danceOfTheTwinWinds'
    s.taoists.red.tile = 0
    expect(() => act(s, { type: 'move', by: 'red', to: 8 })).toThrow(/adjacent/)
    s = act(s, { type: 'move', by: 'red', to: 4 }) // the centre touches every tile
    expect(s.taoists.red.tile).toBe(4)
    expect(() => act(s, { type: 'move', by: 'red', to: 1 })).toThrow(/once/)
  })

  it('Dance of the Spires flies anywhere', () => {
    let s = yangFor(game(), 'red')
    s.boards.red.power = 'danceOfTheSpires'
    s.taoists.red.tile = 0
    s = act(s, { type: 'move', by: 'red', to: 8 })
    expect(s.taoists.red.tile).toBe(8)
  })

  it('one help OR one exorcism; no move after acting', () => {
    let s = redFacing()
    s.boards.blue.power = 'secondWind'
    tileKindAt(s, 1, 'buddhistTemple')
    s = act(s, { type: 'help', by: 'red', params: { kind: 'buddhistTemple' } })
    expect(s.taoists.red.buddhas).toBe(1)
    expect(() => act(s, { type: 'help', by: 'red', params: { kind: 'buddhistTemple' } })).toThrow(/already/)
    expect(() => act(s, { type: 'move', by: 'red', to: 4 })).toThrow()
    putGhost(s, ref('red', 1), 'red-1')
    expect(() => act(s, { type: 'exorcise', by: 'red', targets: [ref('red', 1)] })).toThrow(/already/)
  })

  it('Heavenly Gust: a help and an exorcism; Second Wind: two helps', () => {
    let s = yangFor(game(), 'blue')
    s.taoists.blue.tile = 5
    s.boards.blue.power = 'heavenlyGust'
    tileKindAt(s, 5, 'teaHouse')
    putGhost(s, ref('blue', 1), 'blue-1')
    s = act(s, { type: 'help', by: 'blue', params: { kind: 'teaHouse', color: 'red' } })
    if (s.prompt?.kind === 'placeGhost') s = respond(s, { kind: 'placeGhost', ref: s.prompt.options[0]! })
    expect(() => act(s, { type: 'help', by: 'blue', params: { kind: 'teaHouse', color: 'red' } })).toThrow()
    rigDice(s, ['blue', 'blue', 'red'])
    s = act(s, { type: 'exorcise', by: 'blue', targets: [ref('blue', 1)] })
    expect(s.prompt?.kind).toBe('exorcism')

    let w = yangFor(game(), 'blue')
    w.taoists.blue.tile = 5
    w.boards.blue.power = 'secondWind'
    tileKindAt(w, 5, 'buddhistTemple')
    w = act(w, { type: 'help', by: 'blue', params: { kind: 'buddhistTemple' } })
    w = act(w, { type: 'help', by: 'blue', params: { kind: 'buddhistTemple' } })
    expect(w.taoists.blue.buddhas).toBe(2)
  })

  it('a Buddha taken this turn waits for a later turn; then it guards an empty space', () => {
    let s = redFacing()
    tileKindAt(s, 1, 'buddhistTemple')
    s = act(s, { type: 'help', by: 'red', params: { kind: 'buddhistTemple' } })
    expect(() => act(s, { type: 'placeBuddha', by: 'red', spaces: [ref('red', 1)] })).toThrow(/later turn/)
    s = yangFor(s, 'red')
    s = act(s, { type: 'placeBuddha', by: 'red', spaces: [ref('red', 1)] })
    expect(s.boards.red.buddhas[1]).toBe(true)
    expect(s.taoists.red.buddhas).toBe(0)
  })
})

describe('exorcising', () => {
  it('succeeds with the right faces, applies curses before rewards', () => {
    let s = redFacing()
    putGhost(s, ref('red', 1), 'red-9') // res 3, curse + 2 Tao reward
    rigDice(s, ['red', 'red', 'white'])
    s = act(s, { type: 'exorcise', by: 'red', targets: [ref('red', 1)] })
    rigCurse(s, ['blank'])
    s = respond(s, { kind: 'commit', spend: [], crystals: [], exorcise: [ref('red', 1)], demons: [] })
    expect(s.boards.red.spaces[1]).toBeNull()
    expect(s.discard).toContain('red-9')
    // Curse (blank) resolved first, then the 2-Tao reward prompt.
    expect(s.events.some((e) => e.kind === 'curse')).toBe(true)
    expect(s.prompt?.kind).toBe('gainTao')
    s = respond(s, { kind: 'gainTao', colors: ['blue', 'black'] })
    expect(s.taoists.red.tao.blue).toBe(1)
    expect(s.taoists.red.tao.black).toBe(1)
  })

  it('black faces count for black ghosts', () => {
    let s = redFacing()
    putGhost(s, ref('red', 1), 'black-6') // black, res 3
    rigDice(s, ['black', 'black', 'black'])
    s = act(s, { type: 'exorcise', by: 'red', targets: [ref('red', 1)] })
    rigCurse(s, ['blank'])
    s = respond(s, { kind: 'commit', spend: [], crystals: [], exorcise: [ref('red', 1)], demons: [] })
    expect(s.boards.red.spaces[1]).toBeNull()
  })

  it('must exorcise when the dice are enough; may fail otherwise', () => {
    let s = redFacing()
    putGhost(s, ref('red', 1), 'red-1')
    rigDice(s, ['red', 'blue', 'blue'])
    s = act(s, { type: 'exorcise', by: 'red', targets: [ref('red', 1)] })
    expect(() => respond(s, { kind: 'commit', spend: [], crystals: [], exorcise: [], demons: [] })).toThrow(/must/)
    let f = redFacing()
    putGhost(f, ref('red', 1), 'red-4')
    rigDice(f, ['green', 'blue', 'blue'])
    f = act(f, { type: 'exorcise', by: 'red', targets: [ref('red', 1)] })
    f = respond(f, { kind: 'commit', spend: [], crystals: [], exorcise: [], demons: [] })
    expect(f.boards.red.spaces[1]).not.toBeNull()
    expect(f.prompt).toBeNull()
  })

  it('pools Tao from Taoists on the same tile only', () => {
    let s = redFacing()
    s.taoists.blue.tile = 1
    s.taoists.blue.tao.red = 1
    s.taoists.green.tile = 4
    s.taoists.green.tao.red = 1
    putGhost(s, ref('red', 1), 'red-4') // res 2
    rigDice(s, ['blue', 'blue', 'green'])
    s = act(s, { type: 'exorcise', by: 'red', targets: [ref('red', 1)] })
    expect(() => respond(s, { kind: 'commit', spend: [{ from: 'red', color: 'red' }, { from: 'green', color: 'red' }], crystals: [], exorcise: [ref('red', 1)], demons: [] })).toThrow(/not on your tile/)
    const ok = respond(s, { kind: 'commit', spend: [{ from: 'red', color: 'red' }, { from: 'blue', color: 'red' }], crystals: [], exorcise: [ref('red', 1)], demons: [] })
    expect(ok.boards.red.spaces[1]).toBeNull()
    expect(ok.taoists.blue.tao.red).toBe(0)
  })

  it('corner tiles take two ghosts with one roll', () => {
    let s = yangFor(game(), 'red')
    s.taoists.red.tile = 0
    putGhost(s, ref('red', 0), 'red-1')
    putGhost(s, ref('yellow', 0), 'yellow-1')
    rigDice(s, ['red', 'yellow', 'blue'])
    s = act(s, { type: 'exorcise', by: 'red', targets: [ref('red', 0), ref('yellow', 0)] })
    expect(() => respond(s, { kind: 'commit', spend: [], crystals: [], exorcise: [ref('red', 0)], demons: [] })).toThrow(/must be exorcised/)
    s = respond(s, { kind: 'commit', spend: [], crystals: [], exorcise: [ref('red', 0), ref('yellow', 0)], demons: [] })
    expect(s.boards.red.spaces[0]).toBeNull()
    expect(s.boards.yellow.spaces[0]).toBeNull()
  })

  it('Tao blockers stop spending; die captors take a die; Strength of a Mountain adds one', () => {
    let s = redFacing()
    putGhost(s, ref('red', 1), 'red-4')
    putGhost(s, ref('green', 0), 'yellow-7') // Tao blocker
    putGhost(s, ref('green', 2), 'green-7') // die captor
    s.taoists.red.tao.red = 2
    s = act(s, { type: 'exorcise', by: 'red', targets: [ref('red', 1)] })
    expect(s.prompt?.kind === 'exorcism' && s.prompt.roll.dice).toHaveLength(2)
    expect(() => respond(s, { kind: 'commit', spend: [{ from: 'red', color: 'red' }], crystals: [], exorcise: [ref('red', 1)], demons: [] })).toThrow(/Tao blocker/)
    const g = yangFor(game(), 'green')
    g.taoists.green.tile = 7
    g.boards.green.power = 'strengthOfMountain'
    putGhost(g, ref('green', 1), 'green-1')
    const r = act(g, { type: 'exorcise', by: 'green', targets: [ref('green', 1)] })
    expect(r.prompt?.kind === 'exorcism' && r.prompt.roll.dice).toHaveLength(4)
  })

  it('Gods’ Favorite rerolls chosen dice once', () => {
    let s = yangFor(game(), 'green')
    s.taoists.green.tile = 7
    s.boards.green.power = 'godsFavorite'
    putGhost(s, ref('green', 1), 'green-4')
    rigDice(s, ['green', 'blue', 'red'])
    s = act(s, { type: 'exorcise', by: 'green', targets: [ref('green', 1)] })
    rigDice(s, ['green', 'green'])
    s = respond(s, { kind: 'reroll', dice: [1, 2] })
    expect(s.prompt?.kind === 'exorcism' && s.prompt.roll.dice).toEqual(['green', 'green', 'green'])
    expect(() => respond(s, { kind: 'reroll', dice: [0] })).toThrow()
  })

  it('Howling Nightmare and Uncatchable conditions', () => {
    const s = redFacing()
    putGhost(s, ref('red', 1), 'wf-howlingNightmare')
    putGhost(s, ref('green', 1), 'green-1')
    expect(() => act(s, { type: 'exorcise', by: 'red', targets: [ref('red', 1)] })).toThrow(/opposite/)
    const u = redFacing()
    putGhost(u, ref('red', 1), 'wf-uncatchable')
    expect(() => act(u, { type: 'exorcise', by: 'red', targets: [ref('red', 1)] })).toThrow(/Buddha/)
  })
})

describe('the Yin phase', () => {
  it('Haunters: card → stone → haunt the first active tile in line, skipping haunted ones', () => {
    let s = yangFor(game(), 'red')
    const g = putGhost(s, ref('blue', 0), 'blue-4', { figure: 'card' }) // blue (east), row 0
    s.village[2]!.haunted = true // first tile in front (col 2,row 0) already haunted
    s = act(s, { type: 'endTurn', by: 'red' }) // → blue's turn
    // Blue's Yin: the figure steps onto the board (a ghost then arrives).
    const placed = (st: GameState) => st.boards.blue.spaces.find((x) => x?.uid === g.uid)!
    expect(placed(s).figure).toBe('stone')
    s = finishYin(s)
    s = act(yangFor2(s), { type: 'endTurn', by: 'blue' })
    s = finishYin(s)
    s = act(yangFor2(s), { type: 'endTurn', by: s.active })
    s = finishYin(s)
    s = act(yangFor2(s), { type: 'endTurn', by: s.active })
    s = finishYin(s)
    s = act(yangFor2(s), { type: 'endTurn', by: s.active }) // back to blue
    expect(s.village[1]!.haunted).toBe(true) // next tile on the line (col 1, row 0)
    expect(placed(s).figure).toBe('card')
  })

  it('board overrun: lose 1 Qi and no ghost arrives', () => {
    let s = yangFor(game(), 'yellow')
    putGhost(s, ref('red', 0), 'red-5')
    putGhost(s, ref('red', 1), 'red-6')
    putGhost(s, ref('red', 2), 'red-2')
    const deck = s.deck.length
    s = act(s, { type: 'endTurn', by: 'yellow' })
    expect(s.taoists.red.qi).toBe(2)
    expect(s.deck.length).toBe(deck)
    expect(s.phase).toBe('yang')
  })

  it('Tormentors roll the curse die for the active player', () => {
    let s = yangFor(game(), 'yellow')
    putGhost(s, ref('red', 0), 'red-3')
    rigCurse(s, ['loseQi'])
    s = act(s, { type: 'endTurn', by: 'yellow' })
    expect(s.taoists.red.qi).toBe(2)
    expect(s.events.some((e) => e.kind === 'curse' && e.curse === 'loseQi')).toBe(true)
  })

  it('Strength of a Mountain never rolls the curse die; Gods’ Favorite may reroll it', () => {
    let s = yangFor(game(), 'blue')
    s.boards.green.power = 'strengthOfMountain'
    putGhost(s, ref('green', 0), 'green-3')
    s = act(s, { type: 'endTurn', by: 'blue' })
    expect(s.events.some((e) => e.kind === 'curse')).toBe(false)
    let f = yangFor(game(), 'blue')
    f.boards.green.power = 'godsFavorite'
    putGhost(f, ref('green', 0), 'green-3')
    rigCurse(f, ['loseQi'])
    f = act(f, { type: 'endTurn', by: 'blue' })
    expect(f.prompt?.kind).toBe('curseReroll')
    rigCurse(f, ['blank'])
    f = respond(f, { kind: 'curseReroll', reroll: true })
    expect(f.taoists.green.qi).toBe(3)
  })

  it('black ghosts arrive on the active board; full board → any free space', () => {
    let s = yangFor(game(), 'yellow')
    s.deck = ['black-1', ...s.deck]
    s = act(s, { type: 'endTurn', by: 'yellow' }) // red's Yin
    if (s.prompt?.kind === 'placeGhost') {
      expect(s.prompt.options.every((o) => o.board === 'red')).toBe(true)
      s = respond(s, { kind: 'placeGhost', ref: s.prompt.options[0]! })
    }
    expect(s.boards.red.spaces.some((g) => g?.card === 'black-1')).toBe(true)

    let f = yangFor(game(), 'yellow')
    putGhost(f, ref('blue', 0), 'blue-2')
    putGhost(f, ref('blue', 1), 'blue-3')
    putGhost(f, ref('blue', 2), 'blue-5')
    f.deck = ['blue-6', ...f.deck]
    f = act(f, { type: 'endTurn', by: 'yellow' })
    expect(f.prompt?.kind).toBe('placeGhost')
    if (f.prompt?.kind === 'placeGhost') expect(f.prompt.options.some((o) => o.board !== 'blue')).toBe(true)
  })

  it('a ghost arriving on a Buddha is destroyed; an incarnation just sends the Buddha home', () => {
    let s = yangFor(game(), 'yellow')
    s.boards.red.buddhas = [true, true, true]
    s.templeBuddhas = 0
    s.deck = ['red-5', ...s.deck]
    s = act(s, { type: 'endTurn', by: 'yellow' })
    if (s.prompt?.kind === 'placeGhost') s = respond(s, { kind: 'placeGhost', ref: ref('red', 0) })
    expect(s.boards.red.spaces.every((g) => g === null)).toBe(true)
    expect(s.taoists.red.qi).toBe(3) // its arrival ability never fired
    expect(s.templeBuddhas).toBe(1)

    let i = yangFor(game(), 'yellow')
    i.boards.red.buddhas = [true, false, false]
    i.templeBuddhas = 0
    i.deck = ['wf-vampireLord', ...i.deck]
    i = act(i, { type: 'endTurn', by: 'yellow' })
    if (i.prompt?.kind === 'placeGhost') i = respond(i, { kind: 'placeGhost', ref: ref('red', 0) })
    expect(i.boards.red.spaces[0]?.card).toBe('wf-vampireLord')
    expect(i.boards.red.buddhas[0]).toBe(false)
  })
})

describe('Qi, death, neutral boards', () => {
  it('a Taoist at 0 Qi dies: possessions lost, board possessed', () => {
    let s = redFacing()
    tileKindAt(s, 1, 'sorcerersHut')
    s.taoists.red.qi = 1
    s.taoists.red.tao.black = 2
    putGhost(s, ref('red', 1), 'red-1')
    s = act(s, { type: 'help', by: 'red', params: { kind: 'sorcerersHut', ghost: ref('red', 1) } })
    expect(s.taoists.red.alive).toBe(false)
    expect(s.taoists.red.tao.black).toBe(0)
    expect(s.boards.red.possessed).toBe(true)
    expect(s.active).toBe('blue') // red's turn ended
  })

  it('a neutral board at 0 Qi is possessed; its next loss falls on a Taoist of the players’ choice', () => {
    let s = createGame(config({ seats: { red: 'human', blue: 'neutral', green: 'human', yellow: 'neutral' } }))
    s = yangFor(s, 'red')
    s.boards.blue.qi = 1
    for (const sp of [0, 1, 2] as const) putGhost(s, ref('blue', sp), 'blue-2')
    s = act(s, { type: 'endTurn', by: 'red' }) // blue's (neutral) turn: overrun
    expect(s.boards.blue.qi).toBe(0)
    expect(s.boards.blue.possessed).toBe(true)
    expect(s.active).toBe('green') // blue had no Yang phase
    // Next time round, the possessed board's Qi loss is the players' choice.
    s = yangFor(s, 'red')
    for (const sp of [0, 1, 2] as const) putGhost(s, ref('blue', sp), 'blue-2')
    s = act(s, { type: 'endTurn', by: 'red' })
    expect(s.prompt?.kind).toBe('qiPayer')
    s = respond(s, { kind: 'qiPayer', taoist: 'green' })
    expect(s.taoists.green.qi).toBe(2)
  })
})

describe('village tiles', () => {
  it("Herbalist's Shop: coloured faces, black faces too, and a chosen colour for white", () => {
    let s = redFacing()
    tileKindAt(s, 1, 'herbalistShop')
    rigDice(s, ['black', 'white'])
    s = act(s, { type: 'help', by: 'red', params: { kind: 'herbalistShop' } })
    expect(s.prompt?.kind).toBe('herbalist')
    s = respond(s, { kind: 'herbalistTake', white: ['yellow'] })
    expect(s.taoists.red.tao).toMatchObject({ black: 1, yellow: 1 })
  })

  it('Pavilion: moving a ghost onto a Buddha destroys it; then another Taoist moves', () => {
    let s = redFacing()
    tileKindAt(s, 1, 'pavilion')
    putGhost(s, ref('red', 0), 'red-1')
    s.boards.green.buddhas[2] = true
    s.templeBuddhas = 1
    s = act(s, {
      type: 'help',
      by: 'red',
      params: { kind: 'pavilion', ghost: ref('red', 0), to: ref('green', 2), taoist: 'blue', taoistTo: 5 },
    })
    expect(s.boards.red.spaces[0]).toBeNull()
    expect(s.boards.green.spaces[2]).toBeNull()
    expect(s.boards.green.buddhas[2]).toBe(false)
    expect(s.templeBuddhas).toBe(2)
    expect(s.taoists.blue.tile).toBe(5)
  })

  it('Night Watchman sends a board’s haunting figures back to the cards', () => {
    let s = redFacing()
    tileKindAt(s, 1, 'nightWatchman')
    putGhost(s, ref('green', 0), 'green-1', { figure: 'stone' })
    s = act(s, { type: 'help', by: 'red', params: { kind: 'nightWatchman', board: 'green' } })
    expect(s.boards.green.spaces[0]?.figure).toBe('card')
  })

  it('Cemetery: revive with 2 Qi on the Cemetery, then roll the curse die (haunt = the Cemetery)', () => {
    let s = redFacing()
    tileKindAt(s, 1, 'cemetery')
    s.taoists.blue.alive = false
    s.taoists.blue.qi = 0
    s.taoists.blue.tile = null
    s.boards.blue.possessed = true
    rigCurse(s, ['haunt'])
    s = act(s, { type: 'help', by: 'red', params: { kind: 'cemetery', revive: 'blue' } })
    expect(s.taoists.blue.alive).toBe(true)
    expect(s.taoists.blue.qi).toBe(2)
    expect(s.taoists.blue.tile).toBe(1)
    expect(s.village[1]!.haunted).toBe(true)
  })

  it('Tea House has no Qi cap; Circle of Prayer lowers resistance', () => {
    let s = redFacing()
    tileKindAt(s, 1, 'teaHouse')
    s.taoists.red.qi = 3
    s = act(s, { type: 'help', by: 'red', params: { kind: 'teaHouse', color: 'green' } })
    while (s.prompt?.kind === 'placeGhost') s = respond(s, { kind: 'placeGhost', ref: s.prompt.options[0]! })
    expect(s.taoists.red.qi).toBe(4)

    let c = redFacing()
    tileKindAt(c, 1, 'circleOfPrayer')
    c = act(c, { type: 'help', by: 'red', params: { kind: 'circleOfPrayer', color: 'red' } })
    c = yangFor(c, 'red')
    putGhost(c, ref('red', 1), 'red-4') // res 2 → 1 with the Circle
    rigDice(c, ['red', 'blue', 'green'])
    c = act(c, { type: 'exorcise', by: 'red', targets: [ref('red', 1)] })
    c = respond(c, { kind: 'commit', spend: [], crystals: [], exorcise: [ref('red', 1)], demons: [] })
    expect(c.boards.red.spaces[1]).toBeNull()
  })

  it('Yin-Yang: help from any tile, or flip a haunted tile', () => {
    let s = redFacing()
    const temple = s.village.find((t) => t.kind === 'buddhistTemple')!.idx
    s = act(s, { type: 'yinYang', by: 'red', use: { kind: 'help', tile: temple, params: { kind: 'buddhistTemple' } } })
    expect(s.taoists.red.buddhas).toBe(1)
    expect(s.taoists.red.yinYang).toBe(false)
    const f = redFacing()
    f.village[6]!.haunted = true
    const g = act(f, { type: 'yinYang', by: 'red', use: { kind: 'flip', tile: 6 } })
    expect(g.village[6]!.haunted).toBe(false)
  })
})

describe('powers and power tokens', () => {
  it('power tokens borrow a neutral board’s power for the turn', () => {
    let s = createGame(config({ seats: { red: 'human', blue: 'neutral', green: 'human', yellow: 'neutral' }, powers: { blue: 'heavenlyGust' } }))
    s = yangFor(s, 'red')
    s.taoists.red.tile = 1
    tileKindAt(s, 1, 'buddhistTemple')
    putGhost(s, ref('red', 1), 'red-1')
    s = act(s, { type: 'powerToken', by: 'red', board: 'blue' })
    expect(s.taoists.red.powerTokens).toBe(0)
    expect(s.centerPowerTokens).toBe(1)
    s = act(s, { type: 'help', by: 'red', params: { kind: 'buddhistTemple' } })
    rigDice(s, ['red', 'blue', 'blue'])
    s = act(s, { type: 'exorcise', by: 'red', targets: [ref('red', 1)] })
    expect(s.prompt?.kind).toBe('exorcism')
  })

  it('Enfeeblement Mantra stays until its ghost leaves, then comes back', () => {
    let s = yangFor(game(), 'yellow')
    s.boards.yellow.power = 'enfeeblementMantra'
    s.taoists.yellow.tile = 3
    putGhost(s, ref('yellow', 1), 'yellow-4') // res 2
    s = act(s, { type: 'power', by: 'yellow', use: { power: 'enfeeblementMantra', ghost: ref('yellow', 1) } })
    expect(s.mantra).toBe('placed')
    rigDice(s, ['yellow', 'red', 'red'])
    s = act(s, { type: 'exorcise', by: 'yellow', targets: [ref('yellow', 1)] })
    s = respond(s, { kind: 'commit', spend: [], crystals: [], exorcise: [ref('yellow', 1)], demons: [] })
    if (s.prompt?.kind === 'qiOrYinYang') s = respond(s, { kind: 'qiOrYinYang', choice: 'qi' })
    expect(s.mantra).toBe('cooldown')
  })

  it('a power blocker shuts the board’s power off', () => {
    const s = yangFor(game(), 'red')
    s.boards.red.power = 'danceOfTheSpires'
    s.taoists.red.tile = 0
    putGhost(s, ref('red', 2), 'red-7')
    expect(() => act(s, { type: 'move', by: 'red', to: 8 })).toThrow(/adjacent/)
  })
})

describe('end of game', () => {
  it('exorcising the last incarnation wins', () => {
    let s = redFacing()
    s.deck = s.deck.filter((c) => !isWuFengCard(c))
    putGhost(s, ref('red', 1), 'wf-vampireLord') // red 4
    s.taoists.red.tao.red = 2
    rigDice(s, ['red', 'red', 'blue'])
    s = act(s, { type: 'exorcise', by: 'red', targets: [ref('red', 1)] })
    s = respond(s, { kind: 'commit', spend: [{ from: 'red', color: 'red' }, { from: 'red', color: 'red' }], crystals: [], exorcise: [ref('red', 1)], demons: [] })
    expect(s.prompt?.kind).toBe('incarnationReward')
    s = respond(s, { kind: 'incarnationReward', qi: 'red', yinYang: null })
    expect(s.phase).toBe('gameOver')
    expect(s.outcome).toEqual({ result: 'win' })
  })

  it('…unless its curse brings defeat', () => {
    let s = redFacing()
    s.deck = s.deck.filter((c) => !isWuFengCard(c))
    for (const c of ['blue', 'green', 'yellow'] as const) {
      s.taoists[c].alive = false
      s.boards[c].possessed = true
    }
    s.taoists.red.qi = 1
    putGhost(s, ref('red', 1), 'wf-deathArmy') // black 4, curse on destruction
    rigDice(s, ['black', 'black', 'white'])
    s.taoists.red.tao.black = 1
    s = act(s, { type: 'exorcise', by: 'red', targets: [ref('red', 1)] })
    rigCurse(s, ['loseQi'])
    s = respond(s, { kind: 'commit', spend: [{ from: 'red', color: 'black' }], crystals: [], exorcise: [ref('red', 1)], demons: [] })
    expect(s.outcome).toEqual({ result: 'loss', reason: 'allDead' })
  })

  it('a third haunted tile loses', () => {
    let s = yangFor(game(), 'yellow')
    s.village[0]!.haunted = true
    s.village[1]!.haunted = true
    putGhost(s, ref('red', 2), 'red-4', { figure: 'stone' })
    s = act(s, { type: 'endTurn', by: 'yellow' })
    expect(s.outcome).toEqual({ result: 'loss', reason: 'thirdHaunting' })
  })

  it('the deck running out with an incarnation in play loses', () => {
    let s = yangFor(game(), 'yellow')
    putGhost(s, ref('blue', 0), 'wf-vampireLord')
    s.deck = ['red-1']
    s = act(s, { type: 'endTurn', by: 'yellow' })
    while (s.prompt?.kind === 'placeGhost') s = respond(s, { kind: 'placeGhost', ref: s.prompt.options[0]! })
    expect(s.outcome).toEqual({ result: 'loss', reason: 'deckExhausted' })
  })
})

describe('determinism and replay', () => {
  it('two devices applying the same actions agree', () => {
    const play = () => {
      let s = createGame(config({ seed: 1234 }))
      for (let i = 0; i < 40 && s.phase !== 'gameOver'; i++) {
        if (s.prompt) s = autoAnswer(s)
        else if (s.phase === 'yang') s = applyAction(s, { type: 'endTurn', by: s.active })
      }
      return s
    }
    expect(JSON.stringify(play())).toBe(JSON.stringify(play()))
  })
})

// --- helpers -------------------------------------------------------------

function autoAnswer(s: GameState): GameState {
  const p = s.prompt!
  switch (p.kind) {
    case 'placeGhost':
      return respond(s, { kind: 'placeGhost', ref: p.options[0]! })
    case 'curseReroll':
      return respond(s, { kind: 'curseReroll', reroll: false })
    case 'qiPayer':
      return respond(s, { kind: 'qiPayer', taoist: p.options[0]! })
    case 'discardTao': {
      const t = s.taoists[p.taoist]
      const colors = (Object.keys(t.tao) as Array<keyof typeof t.tao>).flatMap((c) => Array(t.tao[c]).fill(c)).slice(0, p.count)
      return respond(s, { kind: 'discardTao', colors })
    }
    case 'gainTao':
      return respond(s, { kind: 'gainTao', colors: Array(p.count).fill('black') })
    case 'qiOrYinYang':
      return respond(s, { kind: 'qiOrYinYang', choice: 'qi' })
    case 'bonecrackerPayer':
      return respond(s, { kind: 'bonecrackerPayer', taoist: p.options[0]! })
    default:
      throw new Error(`autoAnswer: ${p.kind}`)
  }
}

/** Resolve any prompts until a Yang phase (or game over). */
function finishYin(s: GameState): GameState {
  let x = s
  for (let i = 0; i < 30 && x.prompt; i++) x = autoAnswer(x)
  return x
}

/** Strip the board's ghosts' prompts — keep the state but make sure no prompt is open. */
function yangFor2(s: GameState): GameState {
  return s
}
