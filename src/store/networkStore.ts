// Trystero connection state. Phase 4 fills this in.

import { create } from 'zustand'

type Role = 'solo' | 'host' | 'guest' | 'spectator'

type NetworkStore = {
  role: Role
  roomCode: string | null
  peers: string[]
  chat: Array<{ uuid: string; text: string; at: number }>
}

export const useNetworkStore = create<NetworkStore>(() => ({
  role: 'solo',
  roomCode: null,
  peers: [],
  chat: [],
}))
