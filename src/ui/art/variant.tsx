// Which game's art set is drawn: Ghost Stories (ink painting) or Last Bastion
// (heraldic fantasy). The app sets it once near the root; the themed
// components in themed.tsx read it, so call sites stay the same for both games.
import { createContext, useContext, type ReactNode } from 'react'
import type { GameVariant } from '@/game/types'

const ArtVariantContext = createContext<GameVariant>('ghostStories')

export function ArtVariant({ variant, children }: { variant: GameVariant | undefined; children: ReactNode }) {
  return <ArtVariantContext.Provider value={variant ?? 'ghostStories'}>{children}</ArtVariantContext.Provider>
}

export function useArtVariant(): GameVariant {
  return useContext(ArtVariantContext)
}

export function useBastionArt(): boolean {
  return useContext(ArtVariantContext) === 'bastion'
}
