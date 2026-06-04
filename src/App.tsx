import { useGameStore } from '@/store/gameStore'
import { MainMenu } from './ui/MainMenu'
import { NewGame } from './ui/NewGame'
import { GameView } from './ui/game/GameView'

export function App() {
  const uiMode = useGameStore((s) => s.uiMode)
  switch (uiMode) {
    case 'mainMenu':
      return <MainMenu />
    case 'newGame':
      return <NewGame />
    case 'inGame':
    case 'gameOver':
      return <GameView />
  }
}
