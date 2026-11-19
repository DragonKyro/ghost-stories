import { describe, expect, it } from 'vitest'
import { bastionText, say } from './vocab'

describe('bastionText', () => {
  it.each([
    ['Red loses 1 Qi (red Horde board full) — 2 left.', 'Red loses 1 Life (red Horde board full) — 2 left.'],
    ["Red's Yang phase.", "Red's Hero phase."],
    ['Blue rolls 3 Tao dice.', 'Blue rolls 3 Combat dice.'],
    ["Red takes green Tao (Infernal Herald's reward).", "Red takes green Equipment (Infernal Herald's reward)."],
    ['A ghost comes into play: Ice Revenant.', 'A Horde card comes into play: Ice Revenant.'],
    ['The exorcism fails. Nothing happens.', 'The combat fails. Nothing happens.'],
    ['An incarnation of Wu-Feng! Resistance 8.', 'A Warlord! Resistance 8.'],
    ['Beware an incarnation.', 'Beware a Warlord.'],
    ['Green rolls the curse die (Doom Herald): haunt a tile.', 'Green rolls the Corruption die (Doom Herald): a Bastion tile falls into the Grasp of Evil.'],
    ['Every tile in front of Red space 2 is already haunted.', 'Every tile in front of Red space 2 is already in the Grasp of Evil.'],
    ['Market is restored — Divine Fountain.', 'Market is freed from the Grasp of Evil — Divine Fountain.'],
    ["The possessed blue board's Qi loss falls on Red.", "The neutral blue board's Life loss falls on Red."],
    ['The heavenly wind carries Red to the Tavern.', "The Strategist's Tower sends Red to the Tavern."],
    ['Strength of a Mountain: Red does not roll the curse die.', 'Kazgin: Red does not roll the Corruption die.'],
    ['Green regains their Yin-Yang.', 'Green regains their Call to Arms.'],
    ['All 12 ghost spaces are occupied.', 'All 12 Horde spaces are occupied.'],
    ['A Buddha returns to the Temple.', 'A Trap returns to the Dwarven Quarry.'],
  ])('%s', (gs, lb) => {
    expect(bastionText(gs)).toBe(lb)
  })

  it('keeps the words the stats screen reads (spends, reroll)', () => {
    expect(bastionText('Red spends their Yin-Yang: help anywhere.')).toContain('spends')
    expect(bastionText("The Gods' Favorite: Red rerolls.")).toContain('reroll')
  })

  it('leaves Ghost Stories text alone', () => {
    expect(say('ghostStories', 'Red loses 1 Qi.')).toBe('Red loses 1 Qi.')
    expect(say('bastion', 'Red loses 1 Qi.')).toBe('Red loses 1 Life.')
  })
})
