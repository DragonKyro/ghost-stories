import { describe, expect, it } from 'vitest'
import { generateRoomCode, getOrCreateUuid, setDisplayName, getDisplayName } from './identity'

describe('identity', () => {
  it('generates UUIDs that look like UUIDs', () => {
    const u = getOrCreateUuid()
    expect(u.length).toBeGreaterThanOrEqual(32)
    expect(u).toMatch(/[0-9a-f-]/i)
  })

  it('returns the same UUID on repeated calls', () => {
    const a = getOrCreateUuid()
    const b = getOrCreateUuid()
    expect(a).toBe(b)
  })

  it('stores and reads back the display name', () => {
    setDisplayName('Alice')
    expect(getDisplayName()).toBe('Alice')
    setDisplayName('  Bob  ')
    expect(getDisplayName()).toBe('Bob')
  })

  it('falls back to Player on empty name', () => {
    setDisplayName('')
    expect(getDisplayName()).toBe('Player')
  })

  it('caps the display name at 24 chars', () => {
    setDisplayName('x'.repeat(50))
    expect(getDisplayName().length).toBe(24)
  })

  it('room codes are uppercase alphanumeric, length 4', () => {
    for (let i = 0; i < 20; i++) {
      const c = generateRoomCode()
      expect(c).toHaveLength(4)
      expect(c).toMatch(/^[A-Z2-9]+$/)
    }
  })
})
