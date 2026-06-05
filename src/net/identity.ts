// Stable identity for online multiplayer.
//
// Trystero `peerId` is volatile (regenerated per connection). To keep seat
// assignment across disconnects we use a persistent UUID stored in
// localStorage. URL flag `?fresh` switches to sessionStorage so two browser
// windows in the same incognito session don't collide on the same UUID.

const STORAGE_KEY = 'ghoststories.uuid'
const NAME_KEY = 'ghoststories.name'

function isFresh(): boolean {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).has('fresh')
}

function storage(): Storage {
  // Prefer window.localStorage / sessionStorage when available AND functional.
  // Fall back to an in-memory map otherwise (tests, exotic embeds).
  if (typeof window !== 'undefined') {
    try {
      const s = isFresh() ? window.sessionStorage : window.localStorage
      if (s && typeof s.setItem === 'function' && typeof s.getItem === 'function') {
        return s
      }
    } catch {
      // SecurityError in some embed contexts — fall through to memory.
    }
  }
  return memoryStorage()
}

let _memory: Storage | null = null
function memoryStorage(): Storage {
  if (_memory) return _memory
  const map = new Map<string, string>()
  _memory = {
    get length() { return map.size },
    clear() { map.clear() },
    getItem(k: string) { return map.get(k) ?? null },
    setItem(k: string, v: string) { map.set(k, v) },
    removeItem(k: string) { map.delete(k) },
    key(i: number) { return Array.from(map.keys())[i] ?? null },
  } as Storage
  return _memory
}

function randomUuid(): string {
  // Prefer crypto.randomUUID; fall back to RFC 4122 v4 hex.
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  const hex = '0123456789abcdef'
  let out = ''
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) { out += '-'; continue }
    if (i === 14) { out += '4'; continue }
    if (i === 19) { out += hex[8 + Math.floor(Math.random() * 4)]; continue }
    out += hex[Math.floor(Math.random() * 16)]
  }
  return out
}

/** Returns the user's persistent UUID, creating one on first use. */
export function getOrCreateUuid(): string {
  const s = storage()
  const existing = s.getItem(STORAGE_KEY)
  if (existing) return existing
  const uuid = randomUuid()
  s.setItem(STORAGE_KEY, uuid)
  return uuid
}

/** Read the user's chosen display name (defaults to "Player"). */
export function getDisplayName(): string {
  return storage().getItem(NAME_KEY) ?? 'Player'
}

export function setDisplayName(name: string): void {
  const cleaned = name.trim().slice(0, 24) || 'Player'
  storage().setItem(NAME_KEY, cleaned)
}

/** Short 4-character room code, uppercase letters + digits. */
export function generateRoomCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no I/O/0/1
  let out = ''
  for (let i = 0; i < 4; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)]
  return out
}
