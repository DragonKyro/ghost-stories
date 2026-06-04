import { useGameStore } from '@/store/gameStore'
import { MainMenu } from './ui/MainMenu'
import { NewGame } from './ui/NewGame'
import { OnlineSetup } from './ui/OnlineSetup'
import { OnlineLobby } from './ui/OnlineLobby'
import { GameView } from './ui/game/GameView'

export function App() {
  const uiMode = useGameStore((s) => s.uiMode)
  switch (uiMode) {
    case 'mainMenu':
      return <MainMenu />
    case 'newGame':
      return <NewGame />
    case 'onlineSetup':
      return <OnlineSetup />
    case 'onlineLobby':
      return <OnlineLobby />
    case 'inGame':
    case 'gameOver':
      return <GameView />
  }
}
