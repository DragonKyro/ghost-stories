// The AI's network: its weights (src/ai/nn/weights/ghost-net-v1.json, ~1.2 MB)
// are a build asset, fetched the first time an AI seat needs them and kept for
// the session. If the download fails the next call tries again.

import { Net, type WeightsFile } from '@/ai/nn/model'
import weightsUrl from '@/ai/nn/weights/ghost-net-v1.json?url'

let loading: Promise<Net> | null = null

export function loadAiNet(): Promise<Net> {
  if (!loading) {
    const p = fetch(weightsUrl).then(async (r) => {
      if (!r.ok) throw new Error(`AI weights: HTTP ${r.status}`)
      return Net.fromJson((await r.json()) as WeightsFile)
    })
    p.catch(() => {
      if (loading === p) loading = null
    })
    loading = p
  }
  return loading
}
