import { useEffect } from 'react'
import { useGameStore } from '@/store/gameStore'
import { resumeFromUrl } from '@/store/networkStore'
import { ArtDefs } from '@/ui/art'
import { MainMenu } from './ui/MainMenu'
import { NewGame } from './ui/NewGame'
import { OnlineScreen } from './ui/online/OnlineScreen'
import { GameScreen } from './ui/game/GameScreen'
import { Rulebook } from './rulebook'
import { startDemoFromUrl } from './ui/demo'

export function App() {
  const uiMode = useGameStore((s) => s.uiMode)
  useEffect(() => {
    if (!startDemoFromUrl()) resumeFromUrl()
  }, [])
  return (
    <>
      <ArtDefs />
      <Screen mode={uiMode} />
    </>
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
