import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cleanDisplayName,
  freshTabMode,
  generateRoomCode,
  getOrCreateUuid,
  getSavedDisplayName,
  regenerateUuid,
  saveDisplayName,
} from './identity'
import { normalizeRoomCode } from './roomLink'

// Newer Node ships a global localStorage that shadows jsdom's and doesn't
// work without a file: give each test its own.
function memoryStorage(): Storage {
  const items = new Map<string, string>()
  return {
    get length() {
      return items.size
    },
    clear: () => items.clear(),
    getItem: (k) => items.get(k) ?? null,
    key: (i) => [...items.keys()][i] ?? null,
    removeItem: (k) => void items.delete(k),
    setItem: (k, v) => void items.set(k, String(v)),
  }
}

beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage())
  vi.stubGlobal('sessionStorage', memoryStorage())
})
afterEach(() => {
  vi.unstubAllGlobals()
  window.history.replaceState(null, '', '/')
})

describe('identity', () => {
  it('makes a UUID once and keeps it in localStorage', () => {
    const a = getOrCreateUuid()
    expect(a.length).toBeGreaterThanOrEqual(32)
    expect(getOrCreateUuid()).toBe(a)
    expect(localStorage.getItem('ghoststories.uuid')).toBe(a)
    const b = regenerateUuid()
    expect(b).not.toBe(a)
    expect(getOrCreateUuid()).toBe(b)
  })

  it('?fresh keeps the identity per tab (sessionStorage)', () => {
    const shared = getOrCreateUuid()
    window.history.replaceState(null, '', '/?fresh')
    expect(freshTabMode()).toBe(true)
    const tab = getOrCreateUuid()
    expect(tab).not.toBe(shared)
    expect(sessionStorage.getItem('ghoststories.uuid')).toBe(tab)
    expect(localStorage.getItem('ghoststories.uuid')).toBe(shared)
  })

  it('saves a cleaned display name; none saved reads as empty', () => {
    expect(getSavedDisplayName()).toBe('')
    saveDisplayName('  Alice  ')
    expect(getSavedDisplayName()).toBe('Alice')
    saveDisplayName('   ')
    expect(getSavedDisplayName()).toBe('Alice')
    saveDisplayName('x'.repeat(50))
    expect(getSavedDisplayName()).toHaveLength(24)
    expect(cleanDisplayName(' Bo   Peep ')).toBe('Bo Peep')
  })

  it('room codes are 4 characters without look-alikes', () => {
    for (let i = 0; i < 50; i++) {
      const c = generateRoomCode()
      expect(c).toMatch(/^[A-HJ-NP-Z2-9]{4}$/)
    }
    expect(normalizeRoomCode(' ab-c d ')).toBe('ABCD')
  })
})
