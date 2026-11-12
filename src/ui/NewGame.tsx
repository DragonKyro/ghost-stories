// New game on this device (solo / hot-seat, with AI seats if wanted).
//
// One card: difficulty, the list of players (colour / human or AI / board
// side, add and remove), the expansions, and the less-used settings folded
// away under "More options". Boards nobody plays become neutral boards.

import { useEffect, useState } from 'react'
import { setupProblem } from '@/game/engine'
import { OPPOSITE } from '@/game/geometry'
import { COLOR_NAME, POWER_NAME, POWER_TEXT } from '@/game/rules'
import { COLORS, POWERS_BY_COLOR, type Color, type Difficulty, type GameConfig, type PowerId, type SeatKind } from '@/game/types'
import { useGameStore } from '@/store/gameStore'
import { PowerIcon, ShadowFigure, TaoistFigure } from '@/ui/art'
import { colorVars } from './game/Board'
import './menu.css'

const DIFFICULTY: Array<{ id: Difficulty; name: string; text: string }> = [
  { id: 'initiation', name: 'Initiation', text: '4 Qi each, a black Tao token too, one incarnation.' },
  { id: 'normal', name: 'Normal', text: '3 Qi, only your own Tao token, one incarnation.' },
  { id: 'nightmare', name: 'Nightmare', text: 'Normal, with 4 incarnations (3 with 1–2 players), every 10 cards.' },
  { id: 'hell', name: 'Hell', text: 'Nightmare, and nobody starts with a Yin-Yang.' },
]

type PlayerKind = Exclude<SeatKind, 'neutral'>
interface PlayerRow {
  color: Color
  kind: PlayerKind
}

const DEFAULT_PLAYERS: PlayerRow[] = [
  { color: 'red', kind: 'human' },
  { color: 'blue', kind: 'ai' },
  { color: 'green', kind: 'ai' },
  { color: 'yellow', kind: 'ai' },
]

const KIND_OPTIONS: Array<{ id: PlayerKind; label: string }> = [
  { id: 'human', label: 'Human' },
  { id: 'ai', label: 'AI' },
]

/** Solo forces the red board (whoever plays it) to the Dance of the Spires. */
const SOLO_POWER: PowerId = 'danceOfTheSpires'

export function NewGame() {
  const setUiMode = useGameStore((s) => s.setUiMode)
  const start = useGameStore((s) => s.startLocalGame)
  const [difficulty, setDifficulty] = useState<Difficulty>('initiation')
  const [players, setPlayers] = useState<PlayerRow[]>(DEFAULT_PLAYERS)
  const [powers, setPowers] = useState<Partial<Record<Color, PowerId>>>({})
  const [first, setFirst] = useState<Color | 'random'>('random')
  const [openPicker, setOpenPicker] = useState<number | null>(null)
  const [wm, setWm] = useState<{ on: boolean; portal: 'center' | 'edge' | 'corner'; randomTiles: boolean }>({ on: false, portal: 'center', randomTiles: false })
  const [bs, setBs] = useState<{ on: boolean; wuFeng: 'human' | 'ai'; side: 'a' | 'b' }>({ on: false, wuFeng: 'ai', side: 'a' })

  // Close the colour popover on a click elsewhere or Escape.
  useEffect(() => {
    if (openPicker === null) return
    const away = (e: PointerEvent) => {
      if (!(e.target instanceof Element) || !e.target.closest('.gs-ng-swatch-wrap')) setOpenPicker(null)
    }
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenPicker(null)
    }
    document.addEventListener('pointerdown', away)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerdown', away)
      document.removeEventListener('keydown', esc)
    }
  }, [openPicker])

  const seats = Object.fromEntries(COLORS.map((c) => [c, players.find((p) => p.color === c)?.kind ?? 'neutral'])) as Record<Color, SeatKind>
  const solo = players.length === 1
  const neutral = COLORS.filter((c) => seats[c] === 'neutral')
  const buildConfig = (seed: number): GameConfig => ({
    difficulty,
    seats,
    seed,
    powers,
    ...(first !== 'random' && seats[first] !== 'neutral' ? { firstPlayer: first } : {}),
    ...(wm.on ? { whiteMoon: { portal: wm.portal, randomTiles: wm.randomTiles } } : {}),
    ...(bs.on ? { blackSecret: { wuFeng: bs.wuFeng, side: bs.side } } : {}),
  })
  const problem = setupProblem(buildConfig(0))
  // Two players not facing each other: offer to move the second one across.
  const facingFix = players.length === 2 && OPPOSITE[players[0]!.color] !== players[1]!.color ? OPPOSITE[players[0]!.color] : null

  const setKind = (i: number, kind: PlayerKind) => setPlayers(players.map((p, j) => (j === i ? { ...p, kind } : p)))
  const setColor = (i: number, color: Color) => {
    const mine = players[i]!.color
    // Taking a colour another player has swaps the two.
    setPlayers(players.map((p, j) => (j === i ? { ...p, color } : p.color === color ? { ...p, color: mine } : p)))
    setOpenPicker(null)
  }
  const addPlayer = () => {
    const free = COLORS.filter((c) => !players.some((p) => p.color === c))
    const across = players.length === 1 ? OPPOSITE[players[0]!.color] : null
    const color = across && free.includes(across) ? across : free[0]
    if (color) setPlayers([...players, { color, kind: 'ai' }])
  }
  const removePlayer = (i: number) => {
    const gone = players[i]!.color
    setPlayers(players.filter((_, j) => j !== i))
    if (first === gone) setFirst('random')
    setOpenPicker(null)
  }
  const setPower = (c: Color, p: PowerId | null) => {
    const next = { ...powers }
    if (p) next[c] = p
    else delete next[c]
    setPowers(next)
  }

  const missing = 4 - players.length
  const countNote = solo
    ? 'Solo: 3 power tokens and a Tao token of each colour; the red board shows the Dance of the Spires; no help from the Cemetery.'
    : missing > 0
      ? `${players.length} players: ${missing * 5} ghost cards are removed and each player gets a power token.`
      : null

  return (
    <div className="gs-ng-wrap">
      <div className="gs-ng-card">
        <div>
          <button className="gs-ng-back" onClick={() => setUiMode('mainMenu')}>
            ← Back
          </button>
        </div>
        <header className="gs-ng-head">
          <h1>New game</h1>
          <p>Solo or hot-seat on this device</p>
        </header>

        <section className="gs-ng-field">
          <span className="gs-ng-label">Difficulty</span>
          <Segmented value={difficulty} options={DIFFICULTY.map((d) => ({ id: d.id, label: d.name, title: d.text }))} onChange={setDifficulty} />
          <p className="gs-ng-note">{DIFFICULTY.find((d) => d.id === difficulty)!.text}</p>
        </section>

        <section className="gs-ng-field">
          <span className="gs-ng-label">Players</span>
          <div className="gs-ng-players">
            {players.map((p, i) => {
              const forced = solo && p.color === 'red'
              const power = forced ? SOLO_POWER : powers[p.color]
              const others = players.filter((_, j) => j !== i).map((o) => o.color)
              return (
                <div key={i} className="gs-ng-player" style={colorVars(p.color)}>
                  <div className="gs-ng-swatch-wrap">
                    <button
                      className="gs-ng-swatch"
                      onClick={() => setOpenPicker(openPicker === i ? null : i)}
                      aria-label={`Player ${i + 1}: ${COLOR_NAME[p.color]} — change colour`}
                      aria-expanded={openPicker === i}
                      title={`${COLOR_NAME[p.color]} — click to change`}
                    >
                      <TaoistFigure color={p.color} size={34} title="" />
                      <span className="gs-ng-caret" aria-hidden>
                        ▾
                      </span>
                    </button>
                    {openPicker === i && <ColorPopover value={p.color} taken={others} onPick={(c) => setColor(i, c)} />}
                  </div>
                  <span className="gs-ng-name">{COLOR_NAME[p.color]}</span>
                  <div className="gs-ng-kind">
                    <Segmented small value={p.kind} options={KIND_OPTIONS} onChange={(k) => setKind(i, k)} />
                  </div>
                  <div className="gs-ng-power">
                    <PowerPicker color={p.color} value={power ?? null} disabled={forced} onChange={(v) => setPower(p.color, v)} />
                  </div>
                  {players.length > 1 ? (
                    <button className="gs-ng-remove" onClick={() => removePlayer(i)} aria-label={`Remove ${COLOR_NAME[p.color]}`} title="Remove this player">
                      ×
                    </button>
                  ) : (
                    <span className="gs-ng-remove-gap" />
                  )}
                  {power && <p className="gs-ng-powertext">{forced ? `Solo: ${POWER_TEXT[power]}` : POWER_TEXT[power]}</p>}
                </div>
              )
            })}
            {bs.on && (
              <div className="gs-ng-player gs-ng-wufeng">
                <div className="gs-ng-swatch-wrap">
                  <div className="gs-ng-swatch" aria-hidden>
                    <ShadowFigure size={30} title="" />
                  </div>
                </div>
                <span className="gs-ng-name">Wu-Feng</span>
                <div className="gs-ng-kind">
                  <Segmented small value={bs.wuFeng} options={KIND_OPTIONS} onChange={(k) => setBs({ ...bs, wuFeng: k })} />
                </div>
                <span className="gs-ng-power gs-ng-mini">plays the ghosts (Black Secret)</span>
                <span className="gs-ng-remove-gap" />
              </div>
            )}
          </div>
          {players.length < 4 && (
            <button className="gs-ng-add" onClick={addPlayer}>
              + Add player
            </button>
          )}
          {(neutral.length > 0 || countNote) && (
            <p className="gs-ng-note">
              {neutral.length > 0 && `Empty boards play as neutral boards (3 Qi, no Yang phase): ${neutral.map((c) => COLOR_NAME[c]).join(', ')}. `}
              {countNote}
            </p>
          )}
        </section>

        <section className="gs-ng-field">
          <span className="gs-ng-label">Expansions</span>
          <div className={`gs-ng-exp ${wm.on ? 'on' : ''}`}>
            <label className="gs-ng-exp-head">
              <input type="checkbox" checked={wm.on} onChange={(e) => setWm({ ...wm, on: e.target.checked })} />
              <span>
                <strong>White Moon</strong>
                <small>Villagers, Su-Ling, moon crystals, the Mystic Barrier</small>
              </span>
            </label>
            {wm.on && (
              <div className="gs-ng-exp-opts">
                <span className="gs-ng-mini">Portal</span>
                <Segmented
                  small
                  value={wm.portal}
                  options={[
                    { id: 'center', label: 'Centre', title: 'Standard' },
                    { id: 'edge', label: 'Side', title: 'Harder' },
                    { id: 'corner', label: 'Corner', title: 'Hardest' },
                  ]}
                  onChange={(portal) => setWm({ ...wm, portal })}
                />
                <label className="gs-ng-check">
                  <input type="checkbox" checked={wm.randomTiles} onChange={(e) => setWm({ ...wm, randomTiles: e.target.checked })} /> Random village tiles
                </label>
              </div>
            )}
          </div>
          <div className={`gs-ng-exp ${bs.on ? 'on' : ''}`}>
            <label className="gs-ng-exp-head">
              <input type="checkbox" checked={bs.on} onChange={(e) => setBs({ ...bs, on: e.target.checked })} />
              <span>
                <strong>Black Secret</strong>
                <small>One more player is Wu-Feng: catacombs, demons, curses</small>
              </span>
            </label>
            {bs.on && (
              <div className="gs-ng-exp-opts">
                <span className="gs-ng-mini">Catacombs</span>
                <Segmented
                  small
                  value={bs.side}
                  options={[
                    { id: 'a', label: 'Side A' },
                    { id: 'b', label: 'Side B' },
                  ]}
                  onChange={(side) => setBs({ ...bs, side })}
                />
              </div>
            )}
          </div>
        </section>

        <details className="gs-ng-more">
          <summary>More options</summary>
          <div className="gs-ng-more-body">
            <label className="gs-ng-row">
              <span>First player</span>
              <select className="gs-ng-select" value={first !== 'random' && seats[first] !== 'neutral' ? first : 'random'} onChange={(e) => setFirst(e.target.value as Color | 'random')}>
                <option value="random">Random</option>
                {players.map((p) => (
                  <option key={p.color} value={p.color}>
                    {COLOR_NAME[p.color]}
                  </option>
                ))}
              </select>
            </label>
            {neutral.map((c) => {
              const forced = solo && c === 'red'
              return (
                <label key={c} className="gs-ng-row" style={colorVars(c)}>
                  <span>
                    <span style={{ color: 'var(--pc-light)' }}>{COLOR_NAME[c]}</span> neutral board
                  </span>
                  <PowerPicker color={c} value={forced ? SOLO_POWER : powers[c] ?? null} disabled={forced} onChange={(v) => setPower(c, v)} />
                </label>
              )
            })}
          </div>
        </details>

        <div className="gs-ng-start">
          {problem && (
            <p className="gs-ng-problem">
              {problem}
              {facingFix && (
                <button className="gs-btn small" onClick={() => setColor(1, facingFix)}>
                  Move {COLOR_NAME[players[1]!.color]} across to {COLOR_NAME[facingFix]}
                </button>
              )}
            </p>
          )}
          <button className="gs-btn primary gs-ng-go" disabled={!!problem} onClick={() => start(buildConfig(Math.floor(Math.random() * 0x7fffffff)))}>
            Start the game
          </button>
        </div>
      </div>
    </div>
  )
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  small = false,
}: {
  value: T
  options: ReadonlyArray<{ id: T; label: string; title?: string }>
  onChange: (v: T) => void
  small?: boolean
}) {
  return (
    <div className={`gs-ng-seg ${small ? 'small' : ''}`} role="radiogroup">
      {options.map((o) => (
        <button key={o.id} role="radio" aria-checked={value === o.id} className={value === o.id ? 'on' : ''} title={o.title} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Which side of a board is up: random, or one of its two powers. */
function PowerPicker({ color, value, disabled, onChange }: { color: Color; value: PowerId | null; disabled: boolean; onChange: (p: PowerId | null) => void }) {
  return (
    <span className="gs-ng-powerpick">
      {value ? <PowerIcon power={value} size={22} /> : <span className="gs-ng-randomicon" aria-hidden>?</span>}
      <select
        className="gs-ng-select"
        value={value ?? ''}
        disabled={disabled}
        title={value ? POWER_TEXT[value] : 'Board side: random'}
        aria-label={`${COLOR_NAME[color]} board side`}
        onChange={(e) => onChange((e.target.value || null) as PowerId | null)}
      >
        <option value="">Random side</option>
        {POWERS_BY_COLOR[color].map((p) => (
          <option key={p} value={p}>
            {POWER_NAME[p]}
          </option>
        ))}
      </select>
    </span>
  )
}

/** The four boards; a colour another player has swaps with them. */
function ColorPopover({ value, taken, onPick }: { value: Color; taken: readonly Color[]; onPick: (c: Color) => void }) {
  return (
    <div className="gs-ng-picker" role="listbox" aria-label="Board colour">
      {COLORS.map((c) => {
        const mine = c === value
        const isTaken = !mine && taken.includes(c)
        return (
          <button
            key={c}
            role="option"
            aria-selected={mine}
            className={`gs-ng-pick ${mine ? 'mine' : ''}`}
            style={colorVars(c)}
            onClick={() => onPick(c)}
            title={isTaken ? `${COLOR_NAME[c]} — taken (will swap)` : COLOR_NAME[c]}
          >
            <TaoistFigure color={c} size={30} title="" />
            <span>{COLOR_NAME[c]}</span>
            {isTaken && <small aria-hidden>⇄</small>}
          </button>
        )
      })}
    </div>
  )
}
