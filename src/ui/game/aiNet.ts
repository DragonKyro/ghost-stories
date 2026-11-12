// The AI's networks. src/ai/nn/weights/ holds the shared network
// (ghost-net-v1.json) and, for monks that have one, a specialist fine-tuned
// for that monk (<seat>-<power>.json, e.g. blue-heavenlyGust.json, from
// training/specialists.py). Each is a build asset (~1.2 MB), fetched the first
// time it's needed and kept for the session; only the playing monk's file is
// downloaded. If a download fails the next call tries again.

import { Net, type WeightsFile } from '@/ai/nn/model'
import type { Color, PowerId } from '@/game/types'

const SHARED = 'ghost-net-v1'
const urls = import.meta.glob('../../ai/nn/weights/*.json', { query: '?url', import: 'default' }) as Record<string, () => Promise<string>>
const byName = new Map(Object.entries(urls).map(([path, load]) => [path.slice(path.lastIndexOf('/') + 1, -'.json'.length), load]))

/** The weights file the AI uses for this monk: its specialist if there is one, else the shared network. */
export function aiNetName(seat?: Color, power?: PowerId): string {
  const special = seat && power ? `${seat}-${power}` : null
  return special && byName.has(special) ? special : SHARED
}

const loading = new Map<string, Promise<Net>>()

export function loadAiNet(seat?: Color, power?: PowerId): Promise<Net> {
  const name = aiNetName(seat, power)
  let p = loading.get(name)
  if (!p) {
    const load = byName.get(name)
    if (!load) return Promise.reject(new Error(`AI weights ${name} are missing`))
    p = load().then(async (url) => {
      const r = await fetch(url)
      if (!r.ok) throw new Error(`AI weights ${name}: HTTP ${r.status}`)
      return Net.fromJson((await r.json()) as WeightsFile)
    })
    const mine = p
    p.catch(() => {
      if (loading.get(name) === mine) loading.delete(name)
    })
    loading.set(name, p)
  }
  return p
}
