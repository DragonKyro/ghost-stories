// New game on this device (solo / hot-seat, with AI seats if wanted).

import { useState } from 'react'
import { setupProblem } from '@/game/engine'
import { COLOR_NAME, POWER_NAME, POWER_TEXT } from '@/game/rules'
import { COLORS, POWERS_BY_COLOR, type Color, type Difficulty, type GameConfig, type PowerId, type SeatKind } from '@/game/types'
import { useGameStore } from '@/store/gameStore'
import { PowerIcon, TaoistFigure } from '@/ui/art'
import { colorVars } from './game/Board'
import './menu.css'

const DIFFICULTY: Array<{ id: Difficulty; name: string; text: string }> = [
  { id: 'initiation', name: 'Initiation', text: '4 Qi each, a black Tao token too, one incarnation.' },
  { id: 'normal', name: 'Normal', text: '3 Qi, only your own Tao token, one incarnation.' },
  { id: 'nightmare', name: 'Nightmare', text: 'Normal, with 4 incarnations (3 with 1–2 players), every 10 cards.' },
  { id: 'hell', name: 'Hell', text: 'Nightmare, and nobody starts with a Yin-Yang.' },
]

const SEAT_LABEL: Record<SeatKind, string> = { human: 'Player', ai: 'AI', neutral: 'No one' }

export function NewGame() {
  const setUiMode = useGameStore((s) => s.setUiMode)
  const start = useGameStore((s) => s.startLocalGame)
  const [difficulty, setDifficulty] = useState<Difficulty>('initiation')
  const [seats, setSeats] = useState<Record<Color, SeatKind>>({ red: 'human', blue: 'ai', green: 'human', yellow: 'ai' })
  const [powers, setPowers] = useState<Partial<Record<Color, PowerId>>>({})
  const [first, setFirst] = useState<Color | 'random'>('random')
  const [wm, setWm] = useState<{ on: boolean; portal: 'center' | 'edge' | 'corner'; randomTiles: boolean }>({ on: false, portal: 'center', randomTiles: false })
  const [bs, setBs] = useState<{ on: boolean; wuFeng: 'human' | 'ai'; side: 'a' | 'b' }>({ on: false, wuFeng: 'ai', side: 'a' })

  const players = COLORS.filter((c) => seats[c] !== 'neutral')
  const solo = players.length === 1
  const config: GameConfig = {
    difficulty,
    seats,
    seed: Math.floor(Math.random() * 0x7fffffff),
    powers,
    ...(first !== 'random' && seats[first] !== 'neutral' ? { firstPlayer: first } : {}),
    ...(wm.on ? { whiteMoon: { portal: wm.portal, randomTiles: wm.randomTiles } } : {}),
    ...(bs.on ? { blackSecret: { wuFeng: bs.wuFeng, side: bs.side } } : {}),
  }
  const problem = setupProblem(config)

  return (
    <div className="gs-setup">
      <h1>New game</h1>

      <section>
        <h2>Difficulty</h2>
        <div className="gs-opt">
          {DIFFICULTY.map((d) => (
            <button key={d.id} className={`gs-btn ${difficulty === d.id ? 'on' : ''}`} onClick={() => setDifficulty(d.id)} title={d.text}>
              {d.name}
            </button>
          ))}
        </div>
        <p className="gs-note">{DIFFICULTY.find((d) => d.id === difficulty)!.text}</p>
      </section>

      <section>
        <h2>The four boards</h2>
        <div className="gs-seats">
          {COLORS.map((c) => {
            const forced = solo && c === 'red'
            return (
              <div key={c} className="gs-seat" style={colorVars(c)}>
                <TaoistFigure color={c} size={54} />
                <strong style={{ color: 'var(--pc-light)' }}>{COLOR_NAME[c]}</strong>
                <div className="gs-seg">
                  {(['human', 'ai', 'neutral'] as SeatKind[]).map((k) => (
                    <button key={k} className={`gs-btn small ${seats[c] === k ? 'on' : ''}`} onClick={() => setSeats({ ...seats, [c]: k })}>
                      {SEAT_LABEL[k]}
                    </button>
                  ))}
                </div>
                <div className="gs-seg">
                  <button
                    className={`gs-btn small ${!powers[c] && !forced ? 'on' : ''}`}
                    disabled={forced}
                    onClick={() => {
                      const next = { ...powers }
                      delete next[c]
                      setPowers(next)
                    }}
                  >
                    Random side
                  </button>
                  {POWERS_BY_COLOR[c].map((p) => (
                    <button
                      key={p}
                      className={`gs-btn small ${(forced ? p === 'danceOfTheSpires' : powers[c] === p) ? 'on' : ''}`}
                      disabled={forced}
                      title={POWER_TEXT[p]}
                      onClick={() => setPowers({ ...powers, [c]: p })}
                    >
                      <PowerIcon power={p} size={16} /> {POWER_NAME[p]}
                    </button>
                  ))}
                </div>
                {seats[c] === 'neutral' && <span className="gs-note">Neutral board: 3 Qi, no Yang phase.</span>}
              </div>
            )
          })}
        </div>
        <p className="gs-note">
          {players.length === 4
            ? '4 players.'
            : players.length > 0
              ? `${players.length} player${players.length > 1 ? 's' : ''}: empty boards become neutral boards; 5 ghost cards are removed per missing player; each player gets a power token${solo ? ' (solo: 3, plus a Tao token of each colour; the red board shows the Dance of the Spires; no help from the Cemetery)' : ''}.`
              : ''}
        </p>
        <div className="gs-opt">
          <span className="gs-note">First player:</span>
          <button className={`gs-btn small ${first === 'random' ? 'on' : ''}`} onClick={() => setFirst('random')}>
            Random
          </button>
          {players.map((c) => (
            <button key={c} className={`gs-btn small ${first === c ? 'on' : ''}`} onClick={() => setFirst(c)}>
              {COLOR_NAME[c]}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2>Expansions</h2>
        <div className="gs-opt">
          <label>
            <input type="checkbox" checked={wm.on} onChange={(e) => setWm({ ...wm, on: e.target.checked })} /> <strong>White Moon</strong> — villagers, Su-Ling, moon crystals, the Mystic Barrier
          </label>
        </div>
        {wm.on && (
          <div className="gs-opt" style={{ paddingLeft: 22 }}>
            <span className="gs-note">Portal:</span>
            {(['center', 'edge', 'corner'] as const).map((p) => (
              <button key={p} className={`gs-btn small ${wm.portal === p ? 'on' : ''}`} onClick={() => setWm({ ...wm, portal: p })}>
                {p === 'center' ? 'Centre (standard)' : p === 'edge' ? 'Side tile (harder)' : 'Corner (hardest)'}
              </button>
            ))}
            <label>
              <input type="checkbox" checked={wm.randomTiles} onChange={(e) => setWm({ ...wm, randomTiles: e.target.checked })} /> draw 9 village tiles at random
            </label>
          </div>
        )}
        <div className="gs-opt">
          <label>
            <input type="checkbox" checked={bs.on} onChange={(e) => setBs({ ...bs, on: e.target.checked })} /> <strong>Black Secret</strong> — one more player is Wu-Feng: catacombs, demons, curses
          </label>
        </div>
        {bs.on && (
          <div className="gs-opt" style={{ paddingLeft: 22 }}>
            <span className="gs-note">Wu-Feng:</span>
            <button className={`gs-btn small ${bs.wuFeng === 'ai' ? 'on' : ''}`} onClick={() => setBs({ ...bs, wuFeng: 'ai' })}>
              AI
            </button>
            <button className={`gs-btn small ${bs.wuFeng === 'human' ? 'on' : ''}`} onClick={() => setBs({ ...bs, wuFeng: 'human' })}>
              A player on this device
            </button>
            <span className="gs-note">Catacomb board:</span>
            {(['a', 'b'] as const).map((sd) => (
              <button key={sd} className={`gs-btn small ${bs.side === sd ? 'on' : ''}`} onClick={() => setBs({ ...bs, side: sd })}>
                Side {sd.toUpperCase()}
              </button>
            ))}
          </div>
        )}
      </section>

      {problem && <p className="gs-problem">{problem}</p>}
      <div className="gs-opt">
        <button className="gs-btn" onClick={() => setUiMode('mainMenu')}>
          Back
        </button>
        <button className="gs-btn" onClick={() => setUiMode('rulebook')}>
          Rulebook
        </button>
        <button className="gs-btn primary" disabled={!!problem} onClick={() => start(config)} style={{ minWidth: 160 }}>
          Start the game
        </button>
      </div>
    </div>
  )
}
