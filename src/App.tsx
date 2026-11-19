import { useEffect } from 'react'
import { useGameStore } from '@/store/gameStore'
import { resumeFromUrl, useNetworkStore } from '@/store/networkStore'
import { ArtDefs, ArtVariant } from '@/ui/art'
import type { GameVariant } from '@/game/types'
import { MainMenu } from './ui/MainMenu'
import { NewGame } from './ui/NewGame'
import { OnlineScreen } from './ui/online/OnlineScreen'
import { GameScreen } from './ui/game/GameScreen'
import { Rulebook } from './rulebook'
import { startDemoFromUrl } from './ui/demo'
import './ui/bastion.css'

/** The game on screen: the one being played, else the room's (online lobby), else the one picked on the menu. */
function useVariant(): GameVariant {
  const playing = useGameStore((s) => (s.uiMode === 'inGame' && s.game ? (s.game.config.variant ?? 'ghostStories') : null))
  const room = useNetworkStore((n) => (n.connection === 'lobby' ? (n.lobby.variant ?? 'ghostStories') : null))
  const picked = useGameStore((s) => s.selectedVariant)
  return playing ?? room ?? picked
}

export function App() {
  const uiMode = useGameStore((s) => s.uiMode)
  const variant = useVariant()
  useEffect(() => {
    if (!startDemoFromUrl()) resumeFromUrl()
  }, [])
  // The CSS theme (index.css): html[data-variant='bastion'] restyles every screen.
  useEffect(() => {
    document.documentElement.dataset.variant = variant
    document.title = variant === 'bastion' ? 'Last Bastion' : 'Ghost Stories'
  }, [variant])
  return (
    <ArtVariant variant={variant}>
      <ArtDefs />
      <Screen mode={uiMode} />
    </ArtVariant>
  )
}

function Screen({ mode }: { mode: ReturnType<typeof useGameStore.getState>['uiMode'] }) {
  switch (mode) {
    case 'mainMenu':
      return <MainMenu />
    case 'newGame':
      return <NewGame />
    case 'online':
      return <OnlineScreen />
    case 'rulebook':
      return <Rulebook />
    case 'inGame':
      return <GameScreen />
  }
}
