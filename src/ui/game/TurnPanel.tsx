// The active Taoist's Yang phase, step by step, with only the actions the
// rules allow right now (disabled ones say why).

import type { Action, HelpParams } from '@/game/actions'
import { climbProblem, DEMONS, demonsOn } from '@/game/blackSecret'
import { getCard, isSkeleton } from '@/game/catalogue'
import { adjacentTiles, facedSpaces } from '@/game/geometry'
import {
  borrowablePowers,
  boardName,
  COLOR_NAME,
  exorcismBlocker,
  ghostAt,
  ghostsInPlay,
  hasPower,
  isSolo,
  livingTaoists,
  POWER_NAME,
  POWER_TEXT,
  shadowOnTile,
  TILE_NAME,
} from '@/game/rules'
import { beforeMove, canMove, step2Problem } from '@/game/yang'
import { ARTIFACT_NAME, ARTIFACT_TEXT, familyName } from '@/game/whiteMoon'
import { CENTER_TILE, CORNER_TILE, TAO_COLORS, type Color, type Corner, type GameState, type TaoColor } from '@/game/types'
import { useGameStore } from '@/store/gameStore'
import { useUiStore, type HelpDraft } from '@/store/uiStore'
import { PowerIcon, TaoToken } from '@/ui/art'
import { TILE_HELP } from './text'
import { fireHelp, startHelp } from './interaction'
import { useState, type ReactElement } from 'react'

const send = (a: Action) => {
  const ok = useGameStore.getState().dispatch(a)
  if (ok) useUiStore.getState().select(null)
  return ok
}

export function TurnPanel({ game }: { game: GameState }) {
  const sel = useUiStore((u) => u.selecting)
  const select = useUiStore((u) => u.select)
  const carry = useUiStore((u) => u.carry)
  const setCarry = useUiStore((u) => u.setCarry)
  const canUndo = useGameStore((g) => g.canUndo())
  const undo = useGameStore((g) => g.undo)
  const [reclaim, setReclaim] = useState(true)
  const c = game.active
  const t = game.taoists[c]
  const y = game.yang!
  const tile = game.village[t.tile!]!
  const before = beforeMove(game)
  const helpProblem = step2Problem(game, 'help')
  const exoProblem = step2Problem(game, 'exorcise')
  const step = y.step3 ? 3 : y.moved ? 2 : 1
  const faced = t.underground ? [] : facedSpaces(t.tile!)
  const exorcisable = faced.filter((r) => ghostAt(game, r) && !exorcismBlocker(game, r))
  const blocked = faced.map((r) => exorcismBlocker(game, r)).find((x) => x && !x.startsWith('There is no'))
  const readyBuddhas = t.buddhas - y.newBuddhas
  const buddhaSpots = faced.filter((r) => !ghostAt(game, r) && !game.boards[r.board].buddhas[r.space])

  if (sel?.kind === 'help') return <HelpDraftPanel game={game} draft={sel.draft} />

  const helpBlocked =
    t.underground
      ? 'No villager can help in the catacombs.'
      : tile.haunted
        ? 'This tile is haunted: its villager is gone.'
        : shadowOnTile(game, tile.idx)
          ? 'The Shadow of Wu-Feng blocks this tile.'
          : helpProblem ?? helpParamsProblem(game, c, tile.kind)

  return (
    <div className="gs-card">
      <h3>{COLOR_NAME[c]} — Yang phase</h3>
      <div className="gs-steps">
        <span className={step === 1 ? 'now' : 'done'}>1 · Move</span>
        <span className={step === 2 ? 'now' : step > 2 ? 'done' : ''}>2 · Help or exorcise</span>
        <span className={step === 3 ? 'now' : ''}>3 · Buddha</span>
      </div>
      <div className="gs-actions">
        {before && <BeforeMove game={game} c={c} />}
        {borrowablePowers(game, c).length > 0 && (
          <>
            <h4>Power tokens ({t.powerTokens})</h4>
            <div className="gs-btnrow">
              {borrowablePowers(game, c).map((b) => (
                <button key={b} className="gs-btn small" title={POWER_TEXT[game.boards[b].power]} onClick={() => send({ type: 'powerToken', by: c, board: b })}>
                  <PowerIcon power={game.boards[b].power} size={18} /> {POWER_NAME[game.boards[b].power]}
                </button>
              ))}
            </div>
          </>
        )}

        {before && (
          <>
            <h4>1 · Move (optional)</h4>
            <div className="gs-btnrow">
              <button className={`gs-btn ${sel?.kind === 'move' ? 'on' : ''}`} onClick={() => select(sel?.kind === 'move' ? null : { kind: 'move' })}>
                {hasPower(game, c, 'danceOfTheSpires') ? 'Fly anywhere (Dance of the Spires)' : 'Move to an adjacent tile'}
              </button>
              {game.whiteMoon && !t.underground && tile.villagers.length > 0 && (
                <label className="gs-mini" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input type="checkbox" checked={carry} onChange={(e) => setCarry(e.target.checked)} /> escort the {familyName(tile.villagers.at(-1)!)} villager
                </label>
              )}
            </div>
          </>
        )}
        {canMove(game) && !before && (
          <>
            <h4>Dance of the Peaks — second move</h4>
            <button className={`gs-btn ${sel?.kind === 'move' ? 'on' : ''}`} onClick={() => select(sel?.kind === 'move' ? null : { kind: 'move' })}>
              Move again
            </button>
          </>
        )}
        {game.blackSecret && !climbProblem(game, c) && (
          <button className="gs-btn" onClick={() => send({ type: 'climb', by: c })}>
            {t.underground ? 'Climb back up to the village' : 'Climb down the ladder into the catacombs'}
          </button>
        )}
        {game.whiteMoon && before && !t.underground && hasPower(game, c, 'danceOfTheSpires') && <BackAndForth game={game} c={c} />}

        <h4>2 · Request help or attempt an exorcism</h4>
        {!t.underground && (
          <button
            className="gs-btn"
            disabled={!!helpBlocked}
            title={helpBlocked ?? TILE_HELP[tile.kind]}
            onClick={() => startHelp(game, c, tile.idx, false)}
          >
            Ask the villager: {TILE_NAME[tile.kind]}
          </button>
        )}
        {helpBlocked && !t.underground && <div className="gs-why">{helpBlocked}</div>}
        {!helpBlocked && !t.underground && <div className="gs-why">{TILE_HELP[tile.kind]}</div>}
        {!t.underground && (
          <button
            className={`gs-btn ${sel?.kind === 'exorcise' ? 'on' : ''}`}
            disabled={!!exoProblem || exorcisable.length === 0}
            onClick={() => (exorcisable.length === 1 ? send({ type: 'exorcise', by: c, targets: exorcisable }) : select({ kind: 'exorcise', picked: [] }))}
          >
            Exorcise {exorcisable.length === 1 ? cardName(game, exorcisable[0]!) : exorcisable.length === 2 ? '(pick 1 or 2 ghosts)' : ''}
          </button>
        )}
        {sel?.kind === 'exorcise' && sel.picked.length > 0 && (
          <button className="gs-btn primary" onClick={() => send({ type: 'exorcise', by: c, targets: sel.picked })}>
            Roll {game.yang ? '' : ''}for {sel.picked.map((r) => cardName(game, r)).join(' + ')}
          </button>
        )}
        {!t.underground && !exoProblem && exorcisable.length === 0 && (
          <div className="gs-why">{blocked ?? (faced.length === 0 ? 'The centre tile faces no ghost space.' : 'No ghost on the spaces you face.')}</div>
        )}
        {t.underground && <DemonFight game={game} c={c} problem={exoProblem} />}
        {game.whiteMoon && tile.portal && !t.underground && (
          <button
            className="gs-btn"
            disabled={!!step2Problem(game, 'save') || tile.villagers.length === 0}
            onClick={() => send({ type: 'saveVillager', by: c })}
          >
            Save a villager {tile.villagers.length ? `(${familyName(tile.villagers.at(-1)!)})` : '(none on the Portal tile)'}
          </button>
        )}

        <h4>3 · Place a Buddha (optional)</h4>
        <button
          className={`gs-btn ${sel?.kind === 'buddha' ? 'on' : ''}`}
          disabled={readyBuddhas <= 0 || buddhaSpots.length === 0}
          onClick={() => (buddhaSpots.length === 1 ? send({ type: 'placeBuddha', by: c, spaces: buddhaSpots }) : select({ kind: 'buddha', picked: [] }))}
          title="A Buddha destroys the next ghost that arrives or is moved onto its space."
        >
          Place a Buddha ({readyBuddhas} ready{t.buddhas > readyBuddhas ? `, ${t.buddhas - readyBuddhas} taken this turn` : ''})
        </button>
        {game.whiteMoon && <CrystalPlacement game={game} c={c} />}

        <h4>Any time</h4>
        <div className="gs-btnrow">
          <button className={`gs-btn small ${sel?.kind === 'yinYangTile' ? 'on' : ''}`} disabled={!t.yinYang} onClick={() => select({ kind: 'yinYangTile' })}>
            Yin-Yang: help from any tile
          </button>
          <button
            className={`gs-btn small ${sel?.kind === 'yinYangFlip' ? 'on' : ''}`}
            disabled={!t.yinYang || !game.village.some((v) => v.haunted)}
            onClick={() => select({ kind: 'yinYangFlip' })}
          >
            Yin-Yang: restore a haunted tile
          </button>
        </div>
        {t.artifacts.length > 0 && <Artifacts game={game} c={c} />}
        {sel && (
          <button className="gs-btn small" onClick={() => select(null)}>
            Cancel selection
          </button>
        )}

        <div className="gs-btnrow gs-sticky-end" style={{ marginTop: 6 }}>
          <button
            className="gs-btn primary"
            style={{ flex: 1 }}
            onClick={() => send({ type: 'endTurn', by: c, reclaim: reclaim && t.tile === CENTER_TILE && !t.underground ? game.centerPowerTokens : 0 })}
          >
            End turn
          </button>
          {canUndo && (
            <button className="gs-btn" onClick={undo} title="Take back the last move (only moves without dice)">
              Undo
            </button>
          )}
        </div>
        {t.tile === CENTER_TILE && !t.underground && game.centerPowerTokens > 0 && (
          <label className="gs-mini" style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <input type="checkbox" checked={reclaim} onChange={(e) => setReclaim(e.target.checked)} /> reclaim the {game.centerPowerTokens} power token
            {game.centerPowerTokens > 1 ? 's' : ''} on the central tile
          </label>
        )}
      </div>
    </div>
  )
}

function cardName(game: GameState, r: { board: Color; space: 0 | 1 | 2 }): string {
  const g = ghostAt(game, r)
  return g ? getCard(g.card).name : ''
}

/** Why the tile's action can't be used at all right now (beyond step order). */
function helpParamsProblem(game: GameState, c: Color, kind: string): string | null {
  switch (kind) {
    case 'buddhistTemple':
      return game.templeBuddhas > 0 ? null : 'No Buddha is left on the Temple.'
    case 'cemetery':
      if (isSolo(game)) return 'Solo: no aid can be requested from the Cemetery.'
      return (['red', 'blue', 'green', 'yellow'] as Color[]).some((x) => !game.boards[x].neutral && !game.taoists[x].alive) || (game.whiteMoon?.dead.length ?? 0) > 0
        ? null
        : 'Nobody is dead.'
    case 'taoistAltar':
      return game.village.some((v) => v.haunted) ? null : 'No tile is haunted.'
    case 'sorcerersHut':
      return ghostsInPlay(game).some((g) => !g.card.incarnation && !isSkeleton(g.ghost.card)) ? null : 'There is no ghost the Sorcerer can banish.'
    case 'pavilion':
      return ghostsInPlay(game).some((g) => !isSkeleton(g.ghost.card)) ? null : 'There is no ghost to move.'
    default:
      void c
      return null
  }
}

function BeforeMove({ game, c }: { game: GameState; c: Color }) {
  const y = game.yang!
  const select = useUiStore((u) => u.select)
  const sel = useUiStore((u) => u.selecting)
  const opts: ReactElement[] = []
  if (hasPower(game, c, 'bottomlessPockets') && !y.usedPowers.includes('bottomlessPockets')) {
    opts.push(
      <div key="bp">
        <div className="gs-mini">Bottomless Pockets — take a Tao token:</div>
        <ColorChips game={game} onPick={(color) => send({ type: 'power', by: c, use: { power: 'bottomlessPockets', color } })} />
      </div>,
    )
  }
  if (hasPower(game, c, 'enfeeblementMantra') && !y.usedPowers.includes('enfeeblementMantra')) {
    opts.push(
      <button
        key="em"
        className={`gs-btn small ${sel?.kind === 'mantra' ? 'on' : ''}`}
        disabled={game.mantra !== 'ready' || ghostsInPlay(game).length === 0}
        title={game.mantra === 'placed' ? 'The Mantra is on a ghost until it leaves play.' : game.mantra === 'removed' ? 'Removed from the game.' : POWER_TEXT.enfeeblementMantra}
        onClick={() => select({ kind: 'mantra' })}
      >
        Enfeeblement Mantra {game.mantra === 'ready' ? '' : `(${game.mantra === 'placed' ? 'on a ghost' : game.mantra === 'cooldown' ? 'back next turn' : 'gone'})`}
      </button>,
    )
  }
  if (hasPower(game, c, 'danceOfTheTwinWinds') && !y.usedPowers.includes('danceOfTheTwinWinds')) {
    const others = livingTaoists(game).filter((t) => t.color !== c)
    opts.push(
      <div key="tw">
        <div className="gs-mini">Dance of the Twin Winds — move another Taoist 1 space:</div>
        {game.blackSecret && <ClimbToggle />}
        <div className="gs-btnrow">
          {others.map((o) => (
            <button
              key={o.color}
              className={`gs-btn small ${sel?.kind === 'twinWinds' && sel.taoist === o.color ? 'on' : ''}`}
              onClick={() => select({ kind: 'twinWinds', taoist: o.color })}
            >
              {COLOR_NAME[o.color]}
            </button>
          ))}
        </div>
      </div>,
    )
  }
  if (opts.length === 0) return null
  return (
    <>
      <h4>Before your move</h4>
      {opts}
    </>
  )
}

function ClimbToggle() {
  const climb = useUiStore((u) => u.climb)
  const setClimb = useUiStore((u) => u.setClimb)
  return (
    <label className="gs-mini" style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      <input type="checkbox" checked={climb} onChange={(e) => setClimb(e.target.checked)} /> then they take the ladder there
    </label>
  )
}

export function ColorChips({ game, onPick, allowed }: { game: GameState; onPick: (c: TaoColor) => void; allowed?: (c: TaoColor) => boolean }) {
  return (
    <div className="gs-chips">
      {TAO_COLORS.map((col) => (
        <button key={col} className="gs-chip" disabled={game.taoSupply[col] <= 0 || (allowed ? !allowed(col) : false)} onClick={() => onPick(col)}>
          <TaoToken color={col} size={16} /> {col} <span className="gs-mini">({game.taoSupply[col]})</span>
        </button>
      ))}
    </div>
  )
}

function CrystalPlacement({ game, c }: { game: GameState; c: Color }) {
  const t = game.taoists[c]
  const wm = game.whiteMoon!
  const ready = t.crystals - (game.yang?.newCrystals ?? 0)
  const corner = (Object.keys(CORNER_TILE) as Corner[]).find((k) => CORNER_TILE[k] === t.tile)
  if (!corner || t.underground || t.crystals === 0) return null
  return (
    <button className="gs-btn" disabled={ready <= 0 || wm.receptacles[corner]} onClick={() => send({ type: 'placeCrystal', by: c, corner })}>
      Place a moon crystal in the {corner.toUpperCase()} receptacle {wm.receptacles[corner] ? '(full)' : ready <= 0 ? '(gained this turn)' : ''}
    </button>
  )
}

function Artifacts({ game, c }: { game: GameState; c: Color }) {
  const t = game.taoists[c]
  const select = useUiStore((u) => u.select)
  return (
    <div className="gs-btnrow">
      {t.artifacts.map((a) => (
        <button
          key={a}
          className="gs-btn small"
          title={ARTIFACT_TEXT[a]}
          onClick={() => (a === 'jadeTalisman' || a === 'phoenixFeather' ? select({ kind: 'artifact', artifact: a }) : send({ type: 'artifact', by: c, artifact: a }))}
        >
          ✦ {ARTIFACT_NAME[a]}
        </button>
      ))}
    </div>
  )
}

/** White Moon + Dance of the Spires: fly to a neighbouring tile, pick up its villager, fly back. */
function BackAndForth({ game, c }: { game: GameState; c: Color }) {
  const here = game.taoists[c].tile!
  const tile = game.village[here]!
  if (tile.haunted || tile.villagers.length >= 3) return null
  const near = adjacentTiles(here).filter((x) => game.village[x]!.villagers.length > 0)
  if (near.length === 0) return null
  return (
    <div>
      <div className="gs-mini">Dance of the Spires — fetch a villager and come back:</div>
      <div className="gs-btnrow">
        {near.map((x) => (
          <button key={x} className="gs-btn small" onClick={() => send({ type: 'move', by: c, to: here, carry: { from: x } })}>
            {familyName(game.village[x]!.villagers.at(-1)!)} from the {TILE_NAME[game.village[x]!.kind]}
          </button>
        ))}
      </div>
    </div>
  )
}

function DemonFight({ game, c, problem }: { game: GameState; c: Color; problem: string | null }) {
  const here = demonsOn(game, game.taoists[c].tile!)
  if (here.length === 0) return <div className="gs-why">No demon on your catacomb space.</div>
  return (
    <div className="gs-btnrow">
      {here.map((d) => (
        <button key={d} className="gs-btn" disabled={!!problem} onClick={() => send({ type: 'exorcise', by: c, targets: [], demons: [d] })}>
          Fight the {DEMONS[d].name}
        </button>
      ))}
      {here.length > 1 && (
        <button className="gs-btn" disabled={!!problem} onClick={() => send({ type: 'exorcise', by: c, targets: [], demons: here })}>
          Fight them all
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tile actions that need choices
// ---------------------------------------------------------------------------

function HelpDraftPanel({ game, draft }: { game: GameState; draft: HelpDraft }) {
  const select = useUiStore((u) => u.select)
  const c = game.active
  const fire = (params: HelpParams) => fireHelp(c, draft, params)
  const set = (patch: Partial<HelpDraft>) => select({ kind: 'help', draft: { ...draft, ...patch } })
  const title = `${draft.viaYinYang ? 'Yin-Yang → ' : ''}${TILE_NAME[draft.kind]}`
  let body: ReactElement
  switch (draft.kind) {
    case 'circleOfPrayer':
      body = (
        <>
          <p>Place a Tao token from the supply on the Circle: every ghost of that colour has 1 less resistance.</p>
          <ColorChips game={game} onPick={(color) => fire({ kind: 'circleOfPrayer', color })} />
        </>
      )
      break
    case 'teaHouse':
      body = (
        <>
          <p>Take a Tao token of your choice and gain 1 Qi. Then a ghost comes into play.</p>
          <ColorChips game={game} onPick={(color) => fire({ kind: 'teaHouse', color })} />
        </>
      )
      break
    case 'cemetery': {
      const dead = (['red', 'blue', 'green', 'yellow'] as Color[]).filter((x) => !game.boards[x].neutral && !game.taoists[x].alive)
      body = (
        <>
          <p>Bring the dead back with 2 Qi on the Cemetery, then roll the curse die (a haunt face haunts the Cemetery).</p>
          <div className="gs-btnrow">
            {dead.map((d) => (
              <button key={d} className="gs-btn" onClick={() => fire({ kind: 'cemetery', revive: d })}>
                Revive {COLOR_NAME[d]}
              </button>
            ))}
          </div>
          {game.whiteMoon && game.whiteMoon.dead.length > 0 && (
            <>
              <div className="gs-mini">…or a killed villager (onto the Cemetery):</div>
              <div className="gs-btnrow">
                {game.whiteMoon.dead.map((v, i) => (
                  <button key={i} className="gs-btn small" onClick={() => fire({ kind: 'cemetery', villager: i })}>
                    {familyName(v)}
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )
      break
    }
    case 'kungFuSchool': {
      const count = (col: string) => ghostsInPlay(game).filter((g) => g.card.color === col && !g.card.incarnation && !isSkeleton(g.ghost.card)).length
      const neutrals = (['red', 'blue', 'green', 'yellow'] as Color[]).filter((b) => game.boards[b].neutral && game.yang?.borrowed.includes(game.boards[b].power))
      body = (
        <>
          <p>A solitary exorcism of every ghost of one group. Choose before rolling. Only your own Tao and crystals; no curses or rewards.</p>
          <div className="gs-btnrow">
            <button className="gs-btn" disabled={count(c) === 0} onClick={() => fire({ kind: 'kungFuSchool', scope: 'ownColor' })}>
              All {c} ghosts ({count(c)})
            </button>
            <button className="gs-btn" disabled={count('black') === 0} onClick={() => fire({ kind: 'kungFuSchool', scope: 'black' })}>
              All black ghosts ({count('black')})
            </button>
            {neutrals.map((b) => (
              <button key={b} className="gs-btn" disabled={count(b) === 0} onClick={() => fire({ kind: 'kungFuSchool', scope: { neutralBoard: b } })}>
                All {b} ghosts ({count(b)})
              </button>
            ))}
          </div>
        </>
      )
      break
    }
    case 'calligrapher':
      body = <CalligrapherForm game={game} onFire={fire} />
      break
    case 'pavilion': {
      const movers = isSolo(game) ? [c] : livingTaoists(game).filter((x) => x.color !== c && x.tile != null).map((x) => x.color)
      body = (
        <>
          <p>Move a ghost to any free space (onto a Buddha: it is destroyed), then make a normal move with {isSolo(game) ? 'your own' : 'another'} Taoist.</p>
          <p className="gs-mini">
            {!draft.ghost ? '1. Click the ghost to move.' : !draft.to ? '2. Click a free space.' : !draft.taoist ? '3. Choose the Taoist:' : '4. Click where they go.'}
          </p>
          {draft.ghost && draft.to && !draft.taoist && (
            <div className="gs-btnrow">
              {movers.map((m) => (
                <button key={m} className="gs-btn small" onClick={() => set({ taoist: m })}>
                  {COLOR_NAME[m]}
                </button>
              ))}
              {(movers.length === 0 || isSolo(game)) && (
                <button className="gs-btn small" onClick={() => fire({ kind: 'pavilion', ghost: draft.ghost!, to: draft.to!, taoist: null, taoistTo: null })}>
                  {movers.length === 0 ? 'Nobody to move — confirm' : 'Skip the Taoist move'}
                </button>
              )}
            </div>
          )}
          {draft.taoist && game.whiteMoon && (
            <label className="gs-mini">
              <input type="checkbox" checked={!!draft.carry} onChange={(e) => set({ carry: e.target.checked })} /> they escort a villager
            </label>
          )}
          {draft.taoist && game.blackSecret && (
            <label className="gs-mini">
              <input type="checkbox" checked={!!draft.climb} onChange={(e) => set({ climb: e.target.checked })} /> then they take the ladder there
            </label>
          )}
        </>
      )
      break
    }
    case 'nightWatchman':
      body = (
        <>
          <p>Move every haunting figure on one board back onto the cards.</p>
          <div className="gs-btnrow">
            {(['red', 'blue', 'green', 'yellow'] as Color[]).map((b) => (
              <button key={b} className="gs-btn small" onClick={() => fire({ kind: 'nightWatchman', board: b })}>
                {boardName(game, b)}
              </button>
            ))}
          </div>
        </>
      )
      break
    default:
      body = <p>{TILE_HELP[draft.kind]} Choose on the board.</p>
  }
  return (
    <div className="gs-card">
      <h3>{title}</h3>
      <div className="gs-actions">
        {body}
        <button className="gs-btn small" onClick={() => select(null)}>
          Cancel
        </button>
      </div>
    </div>
  )
}

function CalligrapherForm({ game, onFire }: { game: GameState; onFire: (p: HelpParams) => void }) {
  const bs = game.blackSecret!
  const [swap, setSwap] = useState<{ mantra: number; replacement: string } | null>(null)
  const [placeQi, setPlaceQi] = useState<number | null>(null)
  return (
    <>
      <p>Swap a Bloody Mantra for another of the same level, and/or put a Qi from the reserve on one.</p>
      {bs.mantras.map((m, i) => (
        <div key={m.id} className="gs-btnrow" style={{ alignItems: 'center' }}>
          <span className="gs-mini" style={{ flex: 1 }}>
            L{m.level} {m.qi}/{m.level}
          </span>
          <button className={`gs-btn small ${placeQi === i ? 'on' : ''}`} onClick={() => setPlaceQi(placeQi === i ? null : i)}>
            +1 Qi
          </button>
          <select
            value={swap?.mantra === i ? swap.replacement : ''}
            onChange={(e) => setSwap(e.target.value ? { mantra: i, replacement: e.target.value } : null)}
            style={{ fontSize: 11, maxWidth: 140 }}
          >
            <option value="">swap…</option>
            {bs.mantraDeck
              .filter((d) => d.level === m.level)
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.effect}
                </option>
              ))}
          </select>
        </div>
      ))}
      <button className="gs-btn primary" disabled={!swap && placeQi == null} onClick={() => onFire({ kind: 'calligrapher', swap, placeQi })}>
        Use the Calligrapher
      </button>
    </>
  )
}
