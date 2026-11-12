import { describe, expect, it } from 'vitest'
import { chooseAction } from '@/ai'
import { createGame, waitingFor } from '@/game/engine'
import { COLORS, type Color, type SeatKind } from '@/game/types'
import { useGameStore } from '@/store/gameStore'
import { useLogStore } from '@/store/logStore'
import { computeStats } from './stats'

const all = (k: SeatKind): Record<Color, SeatKind> => ({ red: k, blue: k, green: k, yellow: k })

function playThroughStore(seed: number, steps = 4000) {
  const store = useGameStore.getState()
  store.setGameState(createGame({ difficulty: 'initiation', seats: all('ai'), seed }), 1_000)
  for (let i = 0; i < steps; i++) {
    const s = useGameStore.getState().game!
    if (s.phase === 'gameOver') break
    const a = chooseAction(s, waitingFor(s)!)
    if (!a || !useGameStore.getState().applyLocal(a)) break
  }
  return useGameStore.getState().game!
}

describe('end-of-game stats', () => {
  it('agree with the final game state', () => {
    const game = playThroughStore(5)
    const { entries, timeline } = useLogStore.getState()
    const st = computeStats(game, entries, timeline, 1_000)
    expect(game.phase).toBe('gameOver')
    // One timeline point per turn seen, in order, ending at the final state.
    expect(timeline.length).toBeGreaterThan(5)
    expect(timeline.map((p) => p.turn)).toEqual([...timeline.map((p) => p.turn)].sort((a, b) => a - b))
    const last = timeline[timeline.length - 1]!
    expect(last.turn).toBe(game.turn)
    for (const c of COLORS) expect(last.qi[c]).toBe(game.taoists[c].alive ? game.taoists[c].qi : 0)
    // Ghosts exorcised: every exorcised card went to the discard pile.
    expect(st.exorcised).toBeLessThanOrEqual(game.discard.length)
    expect(st.perTaoist.reduce((n, t) => n + t.exorcised, 0)).toBe(st.exorcised)
    // Each exorcism attempt either failed or succeeded.
    for (const t of st.perTaoist) expect(t.failures).toBeLessThanOrEqual(t.attempts)
    // Fair-die expectations add up to the rolls.
    expect(st.taoDice.reduce((n, f) => n + f.expected, 0)).toBeCloseTo(st.taoDiceTotal)
    expect(st.curse.reduce((n, f) => n + f.expected, 0)).toBeCloseTo(st.curseTotal)
    expect(st.curse.find((f) => f.face === 'blank')!.expected).toBeCloseTo(st.curseTotal / 3)
    // Qi: the starting Qi minus losses plus gains is what's left (dead Taoists hold 0).
    for (const t of st.perTaoist) {
      const now = game.taoists[t.color].alive ? game.taoists[t.color].qi : 0
      expect(4 - t.qiLost + t.qiGained).toBe(now)
    }
  })

  it('the timeline rolls back with the log (undo / network rollback)', () => {
    playThroughStore(7, 30)
    const snap = useGameStore.getState().takeSnapshot()!
    const before = useLogStore.getState().timeline.length
    for (let i = 0; i < 40; i++) {
      const s = useGameStore.getState().game!
      if (s.phase === 'gameOver') break
      useGameStore.getState().applyLocal(chooseAction(s, waitingFor(s)!)!)
    }
    expect(useLogStore.getState().timeline.length).toBeGreaterThanOrEqual(before)
    useGameStore.getState().restoreSnapshot(snap)
    expect(useLogStore.getState().timeline.length).toBe(before)
  })
})
