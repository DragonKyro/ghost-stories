// Persistent player identity. The UUID lives in localStorage and is reused
// forever for this browser profile, so a player gets their seats back after a
// reload or a dropped connection.
//
// For local testing with two browser windows that share localStorage (two
// tabs of one incognito session), append `?fresh` to the URL: the UUID and
// display name (and, in firebaseRoom.ts, the anonymous sign-in) then live in
// sessionStorage, so each tab is its own device.

const UUID_KEY = 'ghoststories.uuid'
const NAME_KEY = 'ghoststories.name'

/** Longest display name kept (the database rules allow 40). */
export const MAX_NAME_LENGTH = 24

export function freshTabMode(): boolean {
  try {
    if (typeof window === 'undefined') return false
    return new URLSearchParams(window.location.search).has('fresh')
  } catch {
    return false
  }
}

let memory: Map<string, string> | null = null

/** sessionStorage with ?fresh, else localStorage; an in-memory map where neither works. */
function store(): Pick<Storage, 'getItem' | 'setItem'> {
  try {
    const s = freshTabMode() ? sessionStorage : localStorage
    if (s && typeof s.getItem === 'function' && typeof s.setItem === 'function') return s
  } catch {
    // SecurityError in some embeds: fall through.
  }
  const m = (memory ??= new Map())
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) }
}

function read(key: string): string | null {
  try {
    return store().getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string): void {
  try {
    store().setItem(key, value)
  } catch {
    /* quota / privacy mode: ignore */
  }
}

function randomUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  // Decent uniqueness without Web Crypto. Good enough for friends' rooms.
  const rand = () =>
    Math.floor(Math.random() * 0xffffffff)
      .toString(16)
      .padStart(8, '0')
  return `${rand()}-${rand()}-${rand()}-${rand()}`
}

/** This device's persistent UUID, made on first use. It owns the device's seats. */
export function getOrCreateUuid(): string {
  const existing = read(UUID_KEY)
  if (existing) return existing
  const next = randomUuid()
  write(UUID_KEY, next)
  return next
}

/** A new UUID for this device (recovering from a collision). */
export function regenerateUuid(): string {
  const next = randomUuid()
  write(UUID_KEY, next)
  return next
}

/** Trimmed, at most MAX_NAME_LENGTH characters. */
export function cleanDisplayName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').slice(0, MAX_NAME_LENGTH).trim()
}

/** The name last used online, or '' when there is none. */
export function getSavedDisplayName(): string {
  return read(NAME_KEY) ?? ''
}

export function saveDisplayName(name: string): void {
  const clean = cleanDisplayName(name)
  if (clean) write(NAME_KEY, clean)
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no I/O/0/1

/** A short, friendly room code: 4 characters, no look-alikes. */
export function generateRoomCode(): string {
  let code = ''
  for (let i = 0; i < 4; i++) code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  return code
}
