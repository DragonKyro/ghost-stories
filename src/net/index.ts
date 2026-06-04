// Trystero/torrent wrapper. Phase 4.
//
// Sets up a Trystero room with typed channels, exposes a tiny `Connection`
// object that the network store can hold.

import { joinRoom, selfId } from 'trystero/torrent'
import type { Room } from 'trystero'
import {
  CHANNELS,
  type ActionMsg,
  type ChatMsg,
  type HelloMsg,
  type LobbyMsg,
  type ReqSnapMsg,
  type SnapMsg,
  type StartMsg,
} from './protocol'

export const APP_ID = 'ghost-stories-v1'

export type ConnectionHandlers = {
  onHello: (m: HelloMsg, peerId: string) => void
  onLobby: (m: LobbyMsg, peerId: string) => void
  onStart: (m: StartMsg, peerId: string) => void
  onAction: (m: ActionMsg, peerId: string) => void
  onSnap: (m: SnapMsg, peerId: string) => void
  onReqSnap: (m: ReqSnapMsg, peerId: string) => void
  onChat: (m: ChatMsg, peerId: string) => void
  onPeerJoin: (peerId: string) => void
  onPeerLeave: (peerId: string) => void
}

export type Connection = {
  room: Room
  selfPeerId: string
  roomCode: string
  send: {
    hello: (m: HelloMsg, targets?: string | string[]) => void
    lobby: (m: LobbyMsg, targets?: string | string[]) => void
    start: (m: StartMsg, targets?: string | string[]) => void
    action: (m: ActionMsg, targets?: string | string[]) => void
    snap: (m: SnapMsg, targets?: string | string[]) => void
    reqSnap: (m: ReqSnapMsg, targets?: string | string[]) => void
    chat: (m: ChatMsg, targets?: string | string[]) => void
  }
  leave: () => Promise<void>
}

export function connect(roomCode: string, handlers: ConnectionHandlers): Connection {
  const normalizedCode = roomCode.trim().toUpperCase()
  if (normalizedCode.length < 3) throw new Error('room code too short')

  // Trystero rooms are E2E-encrypted when a password is supplied. Use the
  // room code itself as the password — friends are sharing the code anyway,
  // and this means strangers crawling tracker info can't subscribe to traffic.
  const room = joinRoom({ appId: APP_ID, password: normalizedCode }, normalizedCode)

  const [sendHello, recvHello] = room.makeAction<HelloMsg>(CHANNELS.hello)
  const [sendLobby, recvLobby] = room.makeAction<LobbyMsg>(CHANNELS.lobby)
  const [sendStart, recvStart] = room.makeAction<StartMsg>(CHANNELS.start)
  const [sendAction, recvAction] = room.makeAction<ActionMsg>(CHANNELS.action)
  const [sendSnap, recvSnap] = room.makeAction<SnapMsg>(CHANNELS.snap)
  const [sendReqSnap, recvReqSnap] = room.makeAction<ReqSnapMsg>(CHANNELS.reqSnap)
  const [sendChat, recvChat] = room.makeAction<ChatMsg>(CHANNELS.chat)

  recvHello((m, peerId) => handlers.onHello(m, peerId))
  recvLobby((m, peerId) => handlers.onLobby(m, peerId))
  recvStart((m, peerId) => handlers.onStart(m, peerId))
  recvAction((m, peerId) => handlers.onAction(m, peerId))
  recvSnap((m, peerId) => handlers.onSnap(m, peerId))
  recvReqSnap((m, peerId) => handlers.onReqSnap(m, peerId))
  recvChat((m, peerId) => handlers.onChat(m, peerId))

  room.onPeerJoin(handlers.onPeerJoin)
  room.onPeerLeave(handlers.onPeerLeave)

  return {
    room,
    selfPeerId: selfId,
    roomCode: normalizedCode,
    send: {
      hello: (m, t) => void sendHello(m as any, t),
      lobby: (m, t) => void sendLobby(m as any, t),
      start: (m, t) => void sendStart(m as any, t),
      action: (m, t) => void sendAction(m as any, t),
      snap: (m, t) => void sendSnap(m as any, t),
      reqSnap: (m, t) => void sendReqSnap(m as any, t),
      chat: (m, t) => void sendChat(m as any, t),
    },
    leave: () => room.leave(),
  }
}

export { selfId } from 'trystero/torrent'
export * from './protocol'
export * from './identity'
