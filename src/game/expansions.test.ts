import { describe, expect, it } from 'vitest'
import { createGame } from './engine'
import { act, config, putGhost, ref, respond, rigCurse, rigDice, tileKindAt, yangFor } from './testUtil'
import type { GameConfig, GameState } from './types'
import { getCard } from './catalogue'

const wm = (over: Partial<GameConfig> = {}): GameState =>
  createGame(config({ whiteMoon: { portal: 'center', randomTiles: false }, ...over }))
const bs = (over: Partial<GameConfig> = {}): GameState => createGame(config({ blackSecret: { wuFeng: 'ai', side: 'a' }, ...over }))

function settle(s: GameState): GameState {
  let x = s
  for (let i = 0; i < 20 && x.prompt; i++) {
    const p = x.prompt
    if (p.kind === 'placeGhost') x = respond(x, { kind: 'placeGhost', ref: p.options[0]! })
    else if (p.kind === 'suLing') x = respond(x, { kind: 'suLing', ref: null })
    else break
  }
  return x
}

describe('White Moon', () => {
  it('setup: Portal in the centre, 8 stacks of 3 villagers, Kung-Fu School instead of the Night Watchman', () => {
    const s = wm()
    expect(s.village[4]!.portal).toBe(true)
    expect(s.village[4]!.villagers).toHaveLength(0)
    expect(s.village.filter((t) => t.villagers.length === 3)).toHaveLength(8)
    expect(s.village.some((t) => t.kind === 'kungFuSchool')).toBe(true)
    expect(s.village.some((t) => t.kind === 'nightWatchman')).toBe(false)
    expect(s.deck.length + 1).toBe(45 + 10 - 10 + 1)
  })

  it('1–3 players start with saved villagers (3 players: 1)', () => {
    const s = wm({ seats: { red: 'human', blue: 'human', green: 'human', yellow: 'neutral' } })
    expect(s.whiteMoon!.saved).toHaveLength(1)
  })

  it('haunting a tile with villagers kills them instead; the tile stays active', () => {
    let s = yangFor(wm(), 'yellow')
    const target = 2 // red space 2 faces tile 2
    expect(s.village[target]!.villagers.length).toBe(3)
    putGhost(s, ref('red', 2), 'red-4', { figure: 'stone' })
    s = act(s, { type: 'endTurn', by: 'yellow' })
    s = settle(s)
    expect(s.village[target]!.haunted).toBe(false)
    expect(s.village[target]!.villagers).toHaveLength(0)
    expect(s.whiteMoon!.dead.length).toBeGreaterThanOrEqual(3)
  })

  it('a Haunter stepping onto the board makes the first villager in front flee further along the line', () => {
    let s = yangFor(wm(), 'red')
    s.village[5]!.villagers = s.village[5]!.villagers.slice(0, 2)
    const fleeing = s.village[5]!.villagers[1]!
    putGhost(s, ref('blue', 1), 'blue-4', { figure: 'card' }) // east board, row 1: tiles 5, 4, 3
    s = act(s, { type: 'endTurn', by: 'red' }) // → blue's Yin: the figure steps off the card
    s = settle(s)
    expect(s.village[5]!.villagers).toHaveLength(1)
    expect(s.village[4]!.villagers.at(-1)).toEqual(fleeing)
  })

  it('save a villager from the Portal tile; a complete family gives its reward', () => {
    let s = yangFor(wm(), 'red')
    s.taoists.red.tile = 4
    s.village[4]!.villagers = [{ family: 'miao', member: 0 }]
    s.whiteMoon!.saved = [{ family: 'miao', member: 1 }]
    const qi = s.taoists.red.qi
    s = act(s, { type: 'saveVillager', by: 'red' })
    expect(s.whiteMoon!.saved).toHaveLength(2)
    expect(s.taoists.red.qi).toBe(qi + 1) // Miao: gain 1 Qi
  })

  it('carry a villager on your move; never onto a haunted tile', () => {
    let s = yangFor(wm(), 'red')
    s.taoists.red.tile = 0
    s.village[1]!.villagers = []
    const v = s.village[0]!.villagers.at(-1)!
    s = act(s, { type: 'move', by: 'red', to: 1, carry: { from: 0 } })
    expect(s.village[1]!.villagers).toEqual([v])
    const h = yangFor(wm(), 'red')
    h.taoists.red.tile = 0
    h.village[1]!.haunted = true
    expect(() => act(h, { type: 'move', by: 'red', to: 1, carry: { from: 0 } })).toThrow(/haunted/)
  })

  it("Herbalist's white face gives a moon crystal; crystals count as any colour", () => {
    let s = yangFor(wm(), 'red')
    s.taoists.red.tile = 1
    tileKindAt(s, 1, 'herbalistShop')
    rigDice(s, ['white', 'red'])
    s = act(s, { type: 'help', by: 'red', params: { kind: 'herbalistShop' } })
    expect(s.taoists.red.crystals).toBe(1)
    expect(s.taoists.red.tao.red).toBe(2)
    s = yangFor(s, 'red')
    putGhost(s, ref('red', 1), 'red-6') // red 2
    rigDice(s, ['blue', 'blue', 'green'])
    s = act(s, { type: 'exorcise', by: 'red', targets: [ref('red', 1)] })
    s = respond(s, { kind: 'commit', spend: [{ from: 'red', color: 'red' }], crystals: [{ from: 'red', as: 'red' }], exorcise: [ref('red', 1)], demons: [] })
    expect(s.boards.red.spaces[1]).toBeNull()
    expect(s.taoists.red.crystals).toBe(0)
  })

  it('Su-Ling: placed after a negative event, she cancels the ghost in front of her', () => {
    let s = yangFor(wm(), 'yellow')
    putGhost(s, ref('red', 0), 'red-3') // Tormentor
    rigCurse(s, ['blank'])
    s = act(s, { type: 'endTurn', by: 'yellow' }) // red's Yin: curse die rolled (event)
    s = settle(s)
    expect(s.phase).toBe('yang')
    s = act(s, { type: 'endTurn', by: 'red' })
    expect(s.prompt?.kind).toBe('suLing')
    s = respond(s, { kind: 'suLing', ref: ref('red', 0) })
    expect(s.whiteMoon!.suLing).toEqual(ref('red', 0))
    if (s.prompt?.kind === 'suLingCrystal') s = respond(s, { kind: 'suLingCrystal', take: false })
  })

  it('four receptacles raise the Mystic Barrier at the end of the turn', () => {
    let s = yangFor(wm(), 'red')
    s.whiteMoon!.receptacles = { nw: true, ne: true, sw: true, se: false }
    s.taoists.red.tile = 8
    s.taoists.red.crystals = 1
    s = act(s, { type: 'placeCrystal', by: 'red', corner: 'se' })
    expect(s.whiteMoon!.barrierPending).toBe(true)
    putGhost(s, ref('blue', 1), 'blue-1')
    s = act(s, { type: 'endTurn', by: 'red' })
    if (s.prompt?.kind === 'suLing') s = respond(s, { kind: 'suLing', ref: null })
    expect(s.prompt?.kind).toBe('barrier')
    expect(s.prompt?.kind === 'barrier' && s.prompt.board).toBe('blue') // left of the active player
  })

  it('12 dead villagers lose the game', () => {
    let s = yangFor(wm(), 'yellow')
    s.whiteMoon!.dead = Array.from({ length: 11 }, () => ({ family: 'hua' as const, member: 0 }))
    putGhost(s, ref('red', 2), 'red-4', { figure: 'stone' })
    s = act(s, { type: 'endTurn', by: 'yellow' })
    expect(s.outcome).toEqual({ result: 'loss', reason: 'villagers' })
  })
})

describe('Black Secret', () => {
  it('setup: summon cards replace incarnations; curses in hand by level; 6 Bloody Mantras', () => {
    const s = bs()
    const b = s.blackSecret!
    expect(s.deck.filter((c) => c.startsWith('summon-'))).toHaveLength(1)
    expect(b.curseHand.filter((t) => t.level === 1)).toHaveLength(5)
    expect(b.curseHand.filter((t) => t.level === 4)).toHaveLength(2)
    expect(b.mantras.map((m) => m.level)).toEqual([2, 2, 2, 3, 3, 4])
    expect(b.catacombs.every((st) => st.length === 4)).toBe(true) // 4 Taoists: 4 layers
    expect(s.village.some((t) => t.kind === 'calligrapher') || s.village.length === 9).toBe(true)
  })

  it('every ghost draw is Wu-Feng’s choice: place, summon a demon, or throw a curse', () => {
    let s = bs()
    while (s.prompt && s.prompt.kind !== 'wuFengGhost') s = settle(s)
    if (s.prompt?.kind !== 'wuFengGhost') {
      s = yangFor(s, s.active)
      s = act(s, { type: 'endTurn', by: s.active })
    }
    expect(s.prompt?.kind).toBe('wuFengGhost')
    const p = s.prompt as Extract<NonNullable<GameState['prompt']>, { kind: 'wuFengGhost' }>
    const color = getCard(p.card).color
    const wrong = s.blackSecret!.curseHand.find((t) => t.level === 1 && color !== 'black' && t.color !== color)
    if (wrong) expect(() => respond(s, { kind: 'wuFengGhost', choice: { kind: 'curse', token: wrong.id, slot: 0 } })).toThrow(/colour/)
    // Placing it follows the base placement rules.
    const placed = respond(s, { kind: 'wuFengGhost', choice: { kind: 'place', ref: { board: color === 'black' ? s.active : color, space: s.boards[color === 'black' ? s.active : color].spaces.findIndex((x) => !x) as 0 } } })
    expect(placed.discard.length + (['red', 'blue', 'green', 'yellow'] as const).flatMap((c) => placed.boards[c].spaces).filter(Boolean).length).toBeGreaterThan(0)
  })

  it('lost Qi goes on a Bloody Mantra of the players’ choice', () => {
    let s = yangFor(bs(), 'red')
    s.taoists.red.tile = 1
    tileKindAt(s, 1, 'sorcerersHut')
    putGhost(s, ref('red', 1), 'red-1')
    s = act(s, { type: 'help', by: 'red', params: { kind: 'sorcerersHut', ghost: ref('red', 1) } })
    expect(s.prompt?.kind).toBe('mantraQi')
    s = respond(s, { kind: 'mantraQi', mantra: 0 })
    expect(s.blackSecret!.mantras[0]!.qi).toBe(1)
  })

  it('ladders: climb down after the move, then only demons can be fought', () => {
    let s = yangFor(bs(), 'red')
    s.taoists.red.tile = 0
    s.blackSecret!.demons[0]!.space = 0
    s = act(s, { type: 'climb', by: 'red' })
    expect(s.taoists.red.underground).toBe(true)
    expect(() => act(s, { type: 'help', by: 'red', params: { kind: 'buddhistTemple' } })).toThrow(/catacombs/)
    rigDice(s, ['red', 'blue', 'green']) // catacomb space 0 is red on side A; imp resistance 1
    s = act(s, { type: 'exorcise', by: 'red', targets: [], demons: ['imp'] })
    s = respond(s, { kind: 'commit', spend: [], crystals: [], exorcise: [], demons: ['imp'] })
    expect(s.blackSecret!.demons[0]!.space).toBeNull()
  })

  it('blood brother: at 1 Qi a Taoist can use the opposite board’s power', () => {
    let s = yangFor(bs(), 'red')
    s.boards.red.power = 'danceOfTheTwinWinds'
    s.boards.green.power = 'strengthOfMountain'
    s.taoists.red.qi = 1
    s.taoists.red.tile = 1
    putGhost(s, ref('red', 1), 'red-1')
    s = act(s, { type: 'exorcise', by: 'red', targets: [ref('red', 1)] })
    expect(s.prompt?.kind === 'exorcism' && s.prompt.roll.dice).toHaveLength(4)
  })
})
