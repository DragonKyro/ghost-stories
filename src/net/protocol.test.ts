import { describe, expect, it } from 'vitest'
import { applyAction, createGame } from '@/game/engine'
import { buildYinPayload } from '@/game/yinPayload'
import type { ActionMsg, StartMsg, SnapMsg } from './protocol'
import type { GameConfig } from '@/game/types'

const baseConfig: GameConfig = {
  difficulty: 'initiation',
  seats: { red: 'human', blue: 'human', green: 'human', yellow: 'human' },
  rngSeed: 0xC0FFEE,
}

describe('wire-format determinism', () => {
  it('two peers reduce identically when they apply the same action sequence', () => {
    // Host creates the game and broadcasts via a `start` envelope.
    const host = createGame(baseConfig)
    const startMsg: StartMsg = { gameState: host, seatUuids: {} }

    // Guest receives `startMsg` and adopts it.
    let guest = startMsg.gameState

    // Host generates a Yin payload, applies it locally, broadcasts the
    // action. Guest applies the same payload from the action envelope.
    const { payload } = buildYinPayload(host)
    const action: ActionMsg['action'] = { type: 'startTurn', payload }
    const hostAfter = applyAction(host, action)
    const guestAfter = applyAction(guest, action)
    guest = guestAfter

    expect(hostAfter).toEqual(guestAfter)
    expect(host).not.toEqual(hostAfter) // sanity: state actually changed
  })

  it('SnapMsg shape can be JSON-cloned (no circular refs)', () => {
    const host = createGame(baseConfig)
    const snap: SnapMsg = {
      gameState: host,
      seatUuids: { red: 'uuid-1' },
      chat: [{ uuid: 'uuid-1', name: 'A', text: 'hi', at: 1 }],
    }
    const cloned = JSON.parse(JSON.stringify(snap)) as SnapMsg
    expect(cloned.gameState.ghostDeck.length).toBe(host.ghostDeck.length)
    expect(cloned.chat).toHaveLength(1)
  })
})
