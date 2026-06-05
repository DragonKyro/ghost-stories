// Request-help dialog. Some tiles run instantly; others need params.
//
// Each tile kind is its own component to keep hooks at the top level
// (Rules of Hooks: no conditional useState in a switch).

import { useState } from 'react'
import { useGameStore } from '@/store/gameStore'
import { rollCurseDie } from '@/game/yinPayload'
import { rollTaoDie } from '@/game/dice'
import type {
  GameState, GhostRef, TaoColor, TaoDieFace,
  TaoistColor, TaoistId, VillageTile, VillageTileId,
} from '@/game/types'
import type { HelpParams } from '@/game/actions'

type Props = {
  game: GameState
  taoistId: TaoistId
  tile: VillageTile
  onClose: () => void
}

const TAO_HEX: Record<TaoColor, string> = {
  red: '#c1392b', green: '#2f8f5d', blue: '#2c69b8', yellow: '#d4a857', black: '#1a1410',
}

export function RequestHelpDialog(props: Props) {
  switch (props.tile.kind) {
    case 'buddhistTemple': return <BuddhistTempleForm {...props} />
    case 'circleOfPrayer': return <CircleOfPrayerForm {...props} />
    case 'cemetery': return <CemeteryForm {...props} />
    case 'taoistAltar': return <TaoistAltarForm {...props} />
    case 'herbalistShop': return <HerbalistForm {...props} />
    case 'sorcerersHut': return <SorcerersForm {...props} />
    case 'nightWatchmanBeat': return <NightWatchmanForm {...props} />
    case 'teaHouse': return <TeaHouseForm {...props} />
    case 'pavilionOfHeavenlyWind': return <PavilionForm {...props} />
    case 'kungFuSchool': return <KungFuSchoolPlaceholder {...props} />
    case 'calligrapher': return <CalligrapherForm {...props} />
  }
}

function KungFuSchoolPlaceholder({ onClose }: Props) {
  return (
    <Modal title="Kung-Fu School" onClose={onClose}>
      <p style={{ fontSize: 12 }}>
        Use this tile via the Action Bar's exorcism flow with the "ownBoard" or "blackGhosts"
        scope. (Full UI form pending.)
      </p>
      <Footer><button onClick={onClose}>Close</button></Footer>
    </Modal>
  )
}

function CalligrapherForm({ game, taoistId, onClose }: Props) {
  const dispatch = useGameStore((s) => s.dispatch)
  const mantras = game.blackSecret?.bloodyMantras ?? []
  const [swapIdx, setSwapIdx] = useState<number | null>(null)
  const [placeIdx, setPlaceIdx] = useState<number | null>(null)
  if (mantras.length === 0) {
    return (
      <Modal title="Calligrapher" onClose={onClose}>
        <p>No Bloody Mantras in play.</p>
        <Footer><button onClick={onClose}>Close</button></Footer>
      </Modal>
    )
  }
  const submit = () => {
    dispatch({
      type: 'requestHelp',
      taoistId,
      params: {
        kind: 'calligrapher',
        swapMantra: swapIdx != null ? { mantraIdx: swapIdx } : undefined,
        placeQi: placeIdx != null ? { mantraIdx: placeIdx } : undefined,
      },
    })
    onClose()
  }
  return (
    <Modal title="Calligrapher" onClose={onClose}>
      <p style={{ fontSize: 12 }}>
        Optionally: swap a Bloody Mantra (replace it with a fresh one of the same level),
        and/or place 1 Qi on a Mantra. Pick one or both, or neither.
      </p>
      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-muted)' }}>Swap which mantra?</div>
        <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
          <button onClick={() => setSwapIdx(null)} style={{ border: swapIdx === null ? '2px solid var(--accent)' : '1px solid var(--rule)', fontSize: 11 }}>(none)</button>
          {mantras.map((m, i) => (
            <button key={i} onClick={() => setSwapIdx(i)} style={{ border: swapIdx === i ? '2px solid var(--accent)' : '1px solid var(--rule)', fontSize: 11 }}>
              lvl {m.level} ({m.qiOnCard}/{m.level})
            </button>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-muted)' }}>Place 1 Qi on which mantra?</div>
        <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
          <button onClick={() => setPlaceIdx(null)} style={{ border: placeIdx === null ? '2px solid var(--accent)' : '1px solid var(--rule)', fontSize: 11 }}>(none)</button>
          {mantras.map((m, i) => (
            <button key={i} onClick={() => setPlaceIdx(i)} style={{ border: placeIdx === i ? '2px solid var(--accent)' : '1px solid var(--rule)', fontSize: 11 }}>
              lvl {m.level} ({m.qiOnCard}/{m.level})
            </button>
          ))}
        </div>
      </div>
      <Footer>
        <button onClick={onClose}>Cancel</button>
        <button onClick={submit} style={primary}>Apply</button>
      </Footer>
    </Modal>
  )
}

function useDispatchAndClose(taoistId: TaoistId, onClose: () => void) {
  const dispatch = useGameStore((s) => s.dispatch)
  return (params: HelpParams, extras: { diceRoll?: TaoDieFace[]; curseRoll?: ReturnType<typeof rollCurseDie> } = {}) => {
    dispatch({ type: 'requestHelp', taoistId, params, diceRoll: extras.diceRoll, curseRoll: extras.curseRoll })
    onClose()
  }
}

function BuddhistTempleForm({ taoistId, onClose }: Props) {
  const send = useDispatchAndClose(taoistId, onClose)
  return (
    <Modal title="Buddhist Temple" onClose={onClose}>
      <p style={{ fontSize: 12 }}>Take a Buddha figurine. You may place it during a future Yang phase.</p>
      <Footer>
        <button onClick={onClose}>Cancel</button>
        <button onClick={() => send({ kind: 'buddhistTemple' })} style={primary}>Take Buddha</button>
      </Footer>
    </Modal>
  )
}

function CircleOfPrayerForm({ game, taoistId, onClose }: Props) {
  const send = useDispatchAndClose(taoistId, onClose)
  const [color, setColor] = useState<TaoColor>('red')
  return (
    <Modal title="Circle of Prayer" onClose={onClose}>
      <p style={{ fontSize: 12 }}>Place a Tao token on the Circle. All ghosts of that color get -1 resistance.</p>
      <div style={{ display: 'flex', gap: 6 }}>
        {(['red', 'green', 'blue', 'yellow', 'black'] as TaoColor[]).map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            disabled={game.taoSupply[c] <= 0}
            style={{
              background: TAO_HEX[c],
              color: c === 'yellow' ? '#1a1410' : '#f4e9d6',
              border: color === c ? '2px solid var(--accent)' : '1px solid #f4e9d6',
              padding: '4px 12px',
              opacity: game.taoSupply[c] <= 0 ? 0.3 : 1,
            }}
          >
            {c}
          </button>
        ))}
      </div>
      <Footer>
        <button onClick={onClose}>Cancel</button>
        <button onClick={() => send({ kind: 'circleOfPrayer', placeColor: color })} style={primary}>Place</button>
      </Footer>
    </Modal>
  )
}

function CemeteryForm({ game, taoistId, onClose }: Props) {
  const send = useDispatchAndClose(taoistId, onClose)
  const dead = (['red', 'blue', 'green', 'yellow'] as TaoistColor[]).filter(
    (c) => !game.taoists[c].alive && !game.taoists[c].isNeutral,
  )
  const [target, setTarget] = useState<TaoistColor | null>(dead[0] ?? null)
  if (dead.length === 0) {
    return (
      <Modal title="Cemetery" onClose={onClose}>
        <p>No dead Taoists to revive.</p>
        <Footer><button onClick={onClose}>Close</button></Footer>
      </Modal>
    )
  }
  return (
    <Modal title="Cemetery" onClose={onClose}>
      <p style={{ fontSize: 12 }}>Revive a dead Taoist (2 Qi), then roll the curse die.</p>
      <div style={{ display: 'flex', gap: 6 }}>
        {dead.map((c) => (
          <button key={c} onClick={() => setTarget(c)} style={{ border: target === c ? '2px solid var(--accent)' : '1px solid var(--rule)' }}>
            {c}
          </button>
        ))}
      </div>
      <Footer>
        <button onClick={onClose}>Cancel</button>
        <button
          disabled={!target}
          onClick={() => target && send({ kind: 'cemetery', reviveTaoist: target }, { curseRoll: rollCurseDie() })}
          style={primary}
        >
          Revive (roll curse die)
        </button>
      </Footer>
    </Modal>
  )
}

function TaoistAltarForm({ game, taoistId, onClose }: Props) {
  const send = useDispatchAndClose(taoistId, onClose)
  const haunted = game.village.filter((v) => v.haunted)
  const [pick, setPick] = useState<VillageTileId | null>(haunted[0]?.id ?? null)
  if (haunted.length === 0) {
    return (
      <Modal title="Taoist Altar" onClose={onClose}>
        <p>No haunted tiles.</p>
        <Footer><button onClick={onClose}>Close</button></Footer>
      </Modal>
    )
  }
  return (
    <Modal title="Taoist Altar" onClose={onClose}>
      <p style={{ fontSize: 12 }}>Unhaunt a village tile. (Subsequent ghost-arrival sub-step skipped in this minimal flow.)</p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {haunted.map((h) => (
          <button key={h.id} onClick={() => setPick(h.id)} style={{ border: pick === h.id ? '2px solid var(--accent)' : '1px solid var(--rule)' }}>
            {h.kind}
          </button>
        ))}
      </div>
      <Footer>
        <button onClick={onClose}>Cancel</button>
        <button disabled={!pick} onClick={() => pick && send({ kind: 'taoistAltar', flipTile: pick })} style={primary}>
          Unhaunt
        </button>
      </Footer>
    </Modal>
  )
}

function HerbalistForm({ taoistId, onClose }: Props) {
  const send = useDispatchAndClose(taoistId, onClose)
  return (
    <Modal title="Herbalist's Shop" onClose={onClose}>
      <p style={{ fontSize: 12 }}>Roll 2 Tao dice; take Tao tokens of those colors. White faces default to your color.</p>
      <Footer>
        <button onClick={onClose}>Cancel</button>
        <button onClick={() => send({ kind: 'herbalistShop' }, { diceRoll: [rollTaoDie(), rollTaoDie()] })} style={primary}>
          Roll dice
        </button>
      </Footer>
    </Modal>
  )
}

function SorcerersForm({ game, taoistId, onClose }: Props) {
  const send = useDispatchAndClose(taoistId, onClose)
  const ghosts: GhostRef[] = []
  for (const c of ['red', 'blue', 'green', 'yellow'] as TaoistColor[]) {
    game.boards[c].ghostSpaces.forEach((g, i) => {
      if (g) ghosts.push({ board: c, space: i as 0 | 1 | 2 })
    })
  }
  const [pick, setPick] = useState<GhostRef | null>(ghosts[0] ?? null)
  if (ghosts.length === 0) {
    return (
      <Modal title="Sorcerer's Hut" onClose={onClose}>
        <p>No ghosts in play.</p>
        <Footer><button onClick={onClose}>Close</button></Footer>
      </Modal>
    )
  }
  return (
    <Modal title="Sorcerer's Hut" onClose={onClose}>
      <p style={{ fontSize: 12 }}>Discard any ghost (no curse, no reward). Cost: 1 Qi.</p>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {ghosts.map((r, i) => (
          <button
            key={i}
            onClick={() => setPick(r)}
            style={{ border: pick === r ? '2px solid var(--accent)' : '1px solid var(--rule)', fontSize: 11 }}
          >
            {r.board}/{r.space}
          </button>
        ))}
      </div>
      <Footer>
        <button onClick={onClose}>Cancel</button>
        <button disabled={!pick} onClick={() => pick && send({ kind: 'sorcerersHut', targetGhost: pick })} style={primary}>
          Discard ghost
        </button>
      </Footer>
    </Modal>
  )
}

function NightWatchmanForm({ taoistId, onClose }: Props) {
  const send = useDispatchAndClose(taoistId, onClose)
  const [board, setBoard] = useState<TaoistColor>('red')
  return (
    <Modal title="Night Watchman's Beat" onClose={onClose}>
      <p style={{ fontSize: 12 }}>Move all Haunting figures on one board back 1 stone.</p>
      <div style={{ display: 'flex', gap: 6 }}>
        {(['red', 'blue', 'green', 'yellow'] as TaoistColor[]).map((c) => (
          <button key={c} onClick={() => setBoard(c)} style={{ border: board === c ? '2px solid var(--accent)' : '1px solid var(--rule)' }}>
            {c}
          </button>
        ))}
      </div>
      <Footer>
        <button onClick={onClose}>Cancel</button>
        <button onClick={() => send({ kind: 'nightWatchmanBeat', targetBoard: board })} style={primary}>Apply</button>
      </Footer>
    </Modal>
  )
}

function TeaHouseForm({ taoistId, onClose }: Props) {
  const send = useDispatchAndClose(taoistId, onClose)
  return (
    <Modal title="Tea House" onClose={onClose}>
      <p style={{ fontSize: 12 }}>Take a Tao token (defaulting to your color) + 1 Qi. (Ghost-arrival sub-step is auto-handled.)</p>
      <Footer>
        <button onClick={onClose}>Cancel</button>
        <button onClick={() => send({ kind: 'teaHouse' })} style={primary}>Drink tea</button>
      </Footer>
    </Modal>
  )
}

function PavilionForm({ game, taoistId, onClose }: Props) {
  const dispatch = useGameStore((s) => s.dispatch)
  const ghosts: GhostRef[] = []
  for (const c of ['red', 'blue', 'green', 'yellow'] as TaoistColor[]) {
    game.boards[c].ghostSpaces.forEach((g, i) => {
      if (g) ghosts.push({ board: c, space: i as 0 | 1 | 2 })
    })
  }
  const emptySpaces: GhostRef[] = []
  for (const c of ['red', 'blue', 'green', 'yellow'] as TaoistColor[]) {
    game.boards[c].ghostSpaces.forEach((g, i) => {
      if (!g) emptySpaces.push({ board: c, space: i as 0 | 1 | 2 })
    })
  }
  const [from, setFrom] = useState<GhostRef | null>(ghosts[0] ?? null)
  const [to, setTo] = useState<GhostRef | null>(emptySpaces[0] ?? null)

  if (ghosts.length === 0 || emptySpaces.length === 0) {
    return (
      <Modal title="Pavilion of Heavenly Wind" onClose={onClose}>
        <p>No legal ghost move available.</p>
        <Footer><button onClick={onClose}>Close</button></Footer>
      </Modal>
    )
  }
  return (
    <Modal title="Pavilion of Heavenly Wind" onClose={onClose}>
      <p style={{ fontSize: 12 }}>Move a ghost to an empty space, then a normal Taoist move (auto-skipped here).</p>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: 'var(--ink-muted)' }}>From:</span>
        {ghosts.map((r, i) => (
          <button key={i} onClick={() => setFrom(r)} style={{ border: from === r ? '2px solid var(--accent)' : '1px solid var(--rule)', fontSize: 11 }}>
            {r.board}/{r.space}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: 'var(--ink-muted)' }}>To:</span>
        {emptySpaces.map((r, i) => (
          <button key={i} onClick={() => setTo(r)} style={{ border: to === r ? '2px solid var(--accent)' : '1px solid var(--rule)', fontSize: 11 }}>
            {r.board}/{r.space}
          </button>
        ))}
      </div>
      <Footer>
        <button onClick={onClose}>Cancel</button>
        <button
          disabled={!from || !to}
          onClick={() => {
            if (!from || !to) return
            dispatch({
              type: 'requestHelp',
              taoistId,
              params: { kind: 'pavilionOfHeavenlyWind', moveGhost: from, toGhostSpace: to },
            })
            onClose()
          }}
          style={primary}
        >
          Move ghost
        </button>
      </Footer>
    </Modal>
  )
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: 0, marginBottom: 12 }}>{title}</h3>
        {children}
      </div>
    </div>
  )
}

function Footer({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>{children}</div>
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
}
const modalStyle: React.CSSProperties = {
  background: 'var(--bg-elevated)', border: '1px solid var(--rule)',
  borderRadius: 8, padding: 20, minWidth: 360, maxWidth: 540,
}
const primary: React.CSSProperties = { background: 'var(--accent)', color: '#1a1410' }
