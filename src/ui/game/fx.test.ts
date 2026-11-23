import { describe, expect, it } from 'vitest'
import { boardFx } from './fx'

describe('boardFx', () => {
  it('maps the last action’s events to board effects', () => {
    const fx = boardFx([
      { kind: 'exorcised', text: 'Butcher is vanquished!', ref: { board: 'red', space: 1 }, card: 'lb-red-3' },
      { kind: 'discard', text: 'Tomb eliminates Hellhound.', ref: { board: 'blue', space: 0 } },
      { kind: 'haunt', text: 'Market is in the Grasp of Evil.', tile: 4 },
      { kind: 'unhaunt', text: 'Tavern is freed.', tile: 2 },
      { kind: 'qi', text: 'Red loses 1 Life.', color: 'red', n: -1 },
      { kind: 'qi', text: 'Red gains 1 Life.', color: 'red', n: 1 },
      { kind: 'qi', text: 'Green gains 2 Life.', color: 'green', n: 2 },
    ])
    expect(fx.spaces.get('red:1')).toBe('slash')
    expect(fx.spaces.get('blue:0')).toBe('banish')
    expect(fx.tiles.get(4)).toBe('grasp')
    expect(fx.tiles.get(2)).toBe('cleanse')
    expect(fx.plates.get('red')).toBe('hurt')
    expect(fx.plates.get('green')).toBe('heal')
  })

  it('slashes a Monster the Trap destroys, but not the Trap being placed', () => {
    expect(boardFx([{ kind: 'buddha', text: 'Hellhound arrives on a Trap.', ref: { board: 'red', space: 0 }, card: 'lb-red-1' }]).spaces.get('red:0')).toBe('slash')
    expect(boardFx([{ kind: 'buddha', text: 'Red places the Trap.', ref: { board: 'red', space: 0 }, color: 'red' }]).spaces.size).toBe(0)
  })
})
