// Trystero wrapper. Phase 4 lands here.
//
// Channels:
//   hello       — peer announces its persistent UUID
//   lobby       — host broadcasts LobbyState on change
//   start       — host broadcasts initial GameState
//   action      — { action, byUuid } envelopes
//   snapshot    — host responds to late joiners with full state
//   chat        — in-memory chat messages
//
// See CLAUDE.md "Multiplayer model".

export const APP_ID = 'ghost-stories-v1'
export const UUID_KEY = 'ghoststories.uuid'

// Phase 4 will expose joinRoom, sendAction, etc.
