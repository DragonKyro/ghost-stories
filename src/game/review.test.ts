// Regression tests for the rules audit: each case quotes the rules summary.

import { describe, expect, it } from 'vitest'
import { createGame } from './engine'
import { act, config, putGhost, ref, respond, rigCurse, rigDice, tileKindAt, yangFor } from './testUtil'
import type { GameState } from './types'

const commit = (s: GameState, exorcise: ReturnType<typeof ref>[], spend: Array<{ from: 'red'; color: 'yellow' | 'red' }> = []) =>
  respond(s, { kind: 'commit', spend, crystals: [], exorcise, demons: [] })

describe('rules audit fixes', () => {
  it('Death Army: "the active player rolls the curse die each turn" — on every board’s turn', () => {
    let s = yangFor(createGame(config()), 'yellow')
    putGhost(s, ref('blue', 0), 'wf-deathArmy') // on blue's board
    rigCurse(s, ['loseQi'])
    s = act(s, { type: 'endTurn', by: 'yellow' }) // red's turn
    expect(s.events.filter((e) => e.kind === 'curse')).toHaveLength(1)
    expect(s.taoists.red.qi).toBe(2)
  })

  it('"The group … applies to all players and boards": possessed boards pass their loss on', () => {
    let s = yangFor(createGame(config()), 'yellow')
    s.taoists.green.alive = false
    s.taoists.green.qi = 0
    s.taoists.green.tile = null
    s.boards.green.possessed = true
    s.deck = ['black-3', ...s.deck] // group: lose 1 Qi on arrival
    s = act(s, { type: 'endTurn', by: 'yellow' })
    while (s.prompt?.kind === 'placeGhost') s = respond(s, { kind: 'placeGhost', ref: s.prompt.options[0]! })
    // red, blue, yellow lose 1 each; the possessed green board's loss goes to a Taoist of choice.
    expect(s.prompt?.kind).toBe('qiPayer')
    s = respond(s, { kind: 'qiPayer', taoist: 'blue' })
    expect([s.taoists.red.qi, s.taoists.blue.qi, s.taoists.yellow.qi]).toEqual([2, 1, 2])
  })

  it('"If the dice are sufficient to exorcise a ghost, you must exorcise it" — also in a corner double exorcism', () => {
    let s = yangFor(createGame(config()), 'red')
    s.taoists.red.tile = 0 // corner: red space 0 and yellow space 0
    s.taoists.red.tao.yellow = 1
    putGhost(s, ref('red', 0), 'red-1') // 1 red
    putGhost(s, ref('yellow', 0), 'yellow-1') // 1 yellow
    rigDice(s, ['red', 'blue', 'blue'])
    s = act(s, { type: 'exorcise', by: 'red', targets: [ref('red', 0), ref('yellow', 0)] })
    expect(() => commit(s, [ref('yellow', 0)], [{ from: 'red', color: 'yellow' }])).toThrow(/must be exorcised/)
    const ok = commit(s, [ref('red', 0), ref('yellow', 0)], [{ from: 'red', color: 'yellow' }])
    expect(ok.boards.red.spaces[0]).toBeNull()
    expect(ok.boards.yellow.spaces[0]).toBeNull()
  })

  it('Circle of Prayer counts each colour a multicolour incarnation needs', () => {
    let s = yangFor(createGame(config()), 'red')
    s.taoists.red.tile = 1
    s.village.find((t) => t.kind === 'circleOfPrayer')!.circleToken = 'red'
    putGhost(s, ref('red', 1), 'wf-hopeKiller') // 2R 2B 2G 2Y → 1R with the red token
    s.taoists.red.tao = { red: 0, blue: 2, green: 2, yellow: 2, black: 0 }
    rigDice(s, ['red', 'white', 'black'])
    s = act(s, { type: 'exorcise', by: 'red', targets: [ref('red', 1)] })
    rigCurse(s, ['blank'])
    s = respond(s, {
      kind: 'commit',
      spend: [
        { from: 'red', color: 'blue' },
        { from: 'red', color: 'blue' },
        { from: 'red', color: 'green' },
        { from: 'red', color: 'green' },
        { from: 'red', color: 'yellow' },
      ],
      crystals: [],
      exorcise: [ref('red', 1)],
      demons: [],
    })
    expect(s.boards.red.spaces[1]).toBeNull()
  })

  it('Tea House with an empty supply still gives the Qi and brings a ghost', () => {
    let s = yangFor(createGame(config()), 'red')
    s.taoists.red.tile = 1
    tileKindAt(s, 1, 'teaHouse')
    s.taoSupply = { red: 0, blue: 0, green: 0, yellow: 0, black: 0 }
    const deck = s.deck.length
    s = act(s, { type: 'help', by: 'red', params: { kind: 'teaHouse', color: 'red' } })
    expect(s.taoists.red.qi).toBe(4)
    expect(s.deck.length).toBe(deck - 1)
  })

  it('White Moon: the Dance of the Spires can "go back and forth to bring a villager to the starting tile"', () => {
    let s = yangFor(createGame(config({ whiteMoon: { portal: 'center', randomTiles: false } })), 'red')
    s.boards.red.power = 'danceOfTheSpires'
    s.taoists.red.tile = 4 // the Portal, no villagers
    const v = s.village[1]!.villagers.at(-1)!
    s = act(s, { type: 'move', by: 'red', to: 4, carry: { from: 1 } })
    expect(s.village[4]!.villagers).toEqual([v])
    expect(s.taoists.red.tile).toBe(4)
  })

  it('White Moon: the barrier saves a visible villager of the players’ choice when the Portal is empty', () => {
    let s = yangFor(createGame(config({ whiteMoon: { portal: 'center', randomTiles: false } })), 'red')
    s.whiteMoon!.barrier = { order: ['green', 'yellow', 'red'], crystals: 4 }
    s.prompt = { kind: 'barrier', owner: 'blue', board: 'blue' }
    const v = s.village[8]!.villagers.at(-1)!
    s = respond(s, { kind: 'barrier', choice: 'save', tile: 8 })
    expect(s.whiteMoon!.saved.at(-1)).toEqual(v)
  })

  it('Black Secret: the Dance of the Peaks moves twice and changes levels after each move', () => {
    let s = yangFor(createGame(config({ blackSecret: { wuFeng: 'ai', side: 'a' } })), 'red')
    s.boards.red.power = 'danceOfTheSpires'
    s.taoists.red.tile = 4
    s = act(s, { type: 'move', by: 'red', to: 0 })
    s = act(s, { type: 'climb', by: 'red' })
    expect(s.taoists.red.underground).toBe(true)
    s = act(s, { type: 'move', by: 'red', to: 8 })
    s = act(s, { type: 'climb', by: 'red' })
    expect(s.taoists.red.underground).toBe(false)
    expect(s.taoists.red.tile).toBe(8)
    expect(() => act(s, { type: 'move', by: 'red', to: 7 })).toThrow()
  })

  it('Black Secret: a Taoist moved by the Twin Winds may then change levels', () => {
    let s = yangFor(createGame(config({ blackSecret: { wuFeng: 'ai', side: 'a' } })), 'red')
    s.boards.red.power = 'danceOfTheTwinWinds'
    s.taoists.blue.tile = 4
    s = act(s, { type: 'power', by: 'red', use: { power: 'danceOfTheTwinWinds', taoist: 'blue', to: 5, climb: true } })
    expect(s.taoists.blue.tile).toBe(5)
    expect(s.taoists.blue.underground).toBe(true)
  })

  it('Black Secret: the Mantra can go on a demon, lowering its resistance', () => {
    let s = yangFor(createGame(config({ blackSecret: { wuFeng: 'ai', side: 'a' } })), 'yellow')
    s.boards.yellow.power = 'enfeeblementMantra'
    const fiend = s.blackSecret!.demons.find((d) => d.id === 'fiend')!
    fiend.space = 3 // yellow catacomb space on side A; resistance 2 → 1
    s.taoists.yellow.tile = 3
    s = act(s, { type: 'power', by: 'yellow', use: { power: 'enfeeblementMantra', demon: 'fiend' } })
    s = act(s, { type: 'climb', by: 'yellow' })
    rigDice(s, ['yellow', 'red', 'red'])
    s = act(s, { type: 'exorcise', by: 'yellow', targets: [], demons: ['fiend'] })
    s = respond(s, { kind: 'commit', spend: [], crystals: [], exorcise: [], demons: ['fiend'] })
    expect(s.blackSecret!.demons.find((d) => d.id === 'fiend')!.space).toBeNull()
    expect(s.mantra).toBe('cooldown')
  })

  it('Black Secret: an incarnation with no room stays owed — it can never be spent as a ghost card', () => {
    let s = createGame(config({ blackSecret: { wuFeng: 'ai', side: 'a' } }))
    s = yangFor(s, 'red')
    for (const c of ['red', 'blue', 'green', 'yellow'] as const) for (const sp of [0, 1, 2] as const) putGhost(s, ref(c, sp), `${c}-1`)
    s.blackSecret!.incarnationHand = ['wf-vampireLord']
    s.prompt = { kind: 'wuFengIncarnation', owner: 'wufeng' }
    s = respond(s, { kind: 'wuFengIncarnation', card: 'wf-vampireLord', ref: ref('red', 0) })
    expect(s.blackSecret!.incarnationHand).toEqual(['wf-vampireLord'])
    expect(s.blackSecret!.pendingSummons).toBe(1)
    expect(s.deck.includes('wf-vampireLord')).toBe(false)
  })
})
