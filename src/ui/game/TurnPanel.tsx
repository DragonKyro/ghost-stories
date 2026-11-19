// The active Taoist's Yang phase, step by step, with only the actions the
// rules allow right now (disabled ones say why).

import type { Action, HelpParams } from '@/game/actions'
import { climbProblem, DEMONS, demonsOn } from '@/game/blackSecret'
import { getCard, isSkeleton } from '@/game/catalogue'
import { adjacentTiles } from '@/game/geometry'
import {
  borrowablePowers,
  boardName,
  COLOR_NAME,
  combatSpacesFor,
  exorcismBlocker,
  ghostAt,
  ghostsInPlay,
  hasPower,
  isBastion,
  isSolo,
  livingTaoists,
  powerName,
  powerText,
  shadowOnTile,
  tileName,
} from '@/game/rules'
import { beforeMove, canMove, step2Problem } from '@/game/yang'
import { ARTIFACT_NAME, ARTIFACT_TEXT, familyName } from '@/game/whiteMoon'
import { CENTER_TILE, CORNER_TILE, TAO_COLORS, type Color, type Corner, type GameState, type TaoColor } from '@/game/types'
import { useGameStore } from '@/store/gameStore'
import { useUiStore, type HelpDraft } from '@/store/uiStore'
import { PowerIcon, StandardToken, TaoToken } from '@/ui/art'
import { tileHelp } from './text'
import { say } from '@/game/vocab'
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
  const bastion = isBastion(game)
  const t = game.taoists[c]
  const y = game.yang!
  const tile = game.village[t.tile!]!
  const before = beforeMove(game)
  const helpProblem = step2Problem(game, 'help')
  const exoProblem = step2Problem(game, 'exorcise')
  const step = y.step3 ? 3 : y.moved ? 2 : 1
  const faced = t.underground ? [] : combatSpacesFor(game, c, t.tile!)
  const exorcisable = faced.filter((r) => ghostAt(game, r) && !exorcismBlocker(game, r))
  const blocked = faced.map((r) => exorcismBlocker(game, r)).find((x) => x && !x.startsWith('There is no'))
  const readyBuddhas = t.buddhas - y.newBuddhas
  const buddhaSpaces = bastion ? (['0', '1', '2'] as const).map((_, sp) => ({ board: c, space: sp as 0 | 1 | 2 })) : faced
  const buddhaSpots = t.underground ? [] : buddhaSpaces.filter((r) => !ghostAt(game, r) && !game.boards[r.board].buddhas[r.space])

  if (sel?.kind === 'help') return <HelpDraftPanel game={game} draft={sel.draft} />

  const helpBlocked =
    t.underground
      ? 'No villager can help in the catacombs.'
      : tile.haunted
        ? bastion
          ? 'This Bastion tile is in the Grasp of Evil: its action is blocked (Call to Arms can still use it).'
          : 'This tile is haunted: its villager is gone.'
        : shadowOnTile(game, tile.idx)
          ? 'The Shadow of Wu-Feng blocks this tile.'
          : helpProblem ?? helpParamsProblem(game, c, tile.kind)

  const exoWhy =
    !t.underground && !exoProblem && exorcisable.length === 0
      ? blocked ?? (faced.length === 0 ? 'The centre tile faces no space.' : `No ${bastion ? 'Monster' : 'ghost'} on the spaces you can reach.`)
      : null
  const stepClass = (n: 1 | 2 | 3) => (step === n ? 'now' : step > n ? 'done' : '')

  return (
    <div className="gs-card gs-turn">
      <h3 className="gs-turn-title">
        {COLOR_NAME[c]} — {bastion ? 'Hero phase' : 'Yang phase'}
      </h3>
      <div className="gs-cols gs-turn-cols">
        <section className={`gs-col ${stepClass(1)}`}>
          <h4>{bastion ? 'Move & Hero power' : '1 · Move'}</h4>
          {(before || bastion) && <BeforeMove game={game} c={c} />}
          {borrowablePowers(game, c).length > 0 && (
            <>
              <div className="gs-mini">Power tokens ({t.powerTokens}):</div>
              <div className="gs-btnrow">
                {borrowablePowers(game, c).map((b) => (
                  <button key={b} className="gs-btn small" title={powerText(game, game.boards[b].power)} onClick={() => send({ type: 'powerToken', by: c, board: b })}>
                    <PowerIcon power={game.boards[b].power} size={18} /> {powerName(game, game.boards[b].power)}
                  </button>
                ))}
              </div>
            </>
          )}
          {canMove(game) && (
            <>
              {t.immobilized ? (
                <button className="gs-btn" onClick={() => send({ type: 'move', by: c, to: t.tile! })}>
                  Stand back up (replaces your movement)
                </button>
              ) : (
                <button className={`gs-btn ${sel?.kind === 'move' ? 'on' : ''}`} onClick={() => select(sel?.kind === 'move' ? null : { kind: 'move' })}>
                  {!bastion && hasPower(game, c, 'danceOfTheSpires')
                    ? 'Fly anywhere (Dance of the Spires)'
                    : y.moves > 0
                      ? 'Move again (Dance of the Peaks)'
                      : 'Move to an adjacent tile'}
                </button>
              )}
              {game.whiteMoon && !t.underground && tile.villagers.length > 0 && (
                <label className="gs-mini gs-check">
                  <input type="checkbox" checked={carry} onChange={(e) => setCarry(e.target.checked)} /> escort the {familyName(tile.villagers.at(-1)!)} villager
                </label>
              )}
            </>
          )}
          {game.blackSecret && !climbProblem(game, c) && (
            <button className="gs-btn" onClick={() => send({ type: 'climb', by: c })}>
              {t.underground ? 'Climb back up to the village' : 'Climb down into the catacombs'}
            </button>
          )}
          {game.whiteMoon && before && !t.underground && hasPower(game, c, 'danceOfTheSpires') && <BackAndForth game={game} c={c} />}
          {!before && !canMove(game) && <div className="gs-why">Done.</div>}
        </section>

        <section className={`gs-col ${stepClass(2)}`}>
          <h4>{bastion ? 'Act (Tile or Combat)' : '2 · Help or exorcise'}</h4>
          {!t.underground && (
            <button
              className="gs-btn"
              disabled={!!helpBlocked}
              title={helpBlocked ?? tileHelp(game, tile.kind)}
              onClick={() => startHelp(game, c, tile.idx, false)}
            >
              {bastion ? `Activate: ${tileName(game, tile.kind)}` : `Ask the villager: ${tileName(game, tile.kind)}`}
            </button>
          )}
          {!t.underground && (
            <div className="gs-why" title={helpBlocked ?? tileHelp(game, tile.kind)}>
              {helpBlocked ?? tileHelp(game, tile.kind)}
            </div>
          )}
          {!t.underground && (
            <button
              className={`gs-btn ${sel?.kind === 'exorcise' ? 'on' : ''}`}
              disabled={!!exoProblem || exorcisable.length === 0}
              title={exoWhy ?? exoProblem ?? undefined}
              onClick={() => (exorcisable.length === 1 ? send({ type: 'exorcise', by: c, targets: exorcisable }) : select({ kind: 'exorcise', picked: [] }))}
            >
              {bastion ? 'Combat' : 'Exorcise'}{' '}
              {exorcisable.length === 1 ? cardName(game, exorcisable[0]!) : exorcisable.length >= 2 ? `(pick 1 or 2 ${bastion ? 'targets' : 'ghosts'})` : ''}
            </button>
          )}
          {sel?.kind === 'exorcise' && sel.picked.length > 0 && (
            <button className="gs-btn primary" onClick={() => send({ type: 'exorcise', by: c, targets: sel.picked })}>
              Roll for {sel.picked.map((r) => cardName(game, r)).join(' + ')}
            </button>
          )}
          {exoWhy && (
            <div className="gs-why" title={exoWhy}>
              {exoWhy}
            </div>
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
        </section>

        <section className={`gs-col ${stepClass(3)}`}>
          <h4>{bastion ? 'Trap & Call to Arms' : '3 · Buddha'}</h4>
          <button
            className={`gs-btn ${sel?.kind === 'buddha' ? 'on' : ''}`}
            disabled={readyBuddhas <= 0 || buddhaSpots.length === 0}
            onClick={() => (buddhaSpots.length === 1 ? send({ type: 'placeBuddha', by: c, spaces: buddhaSpots }) : select({ kind: 'buddha', picked: [] }))}
            title={bastion ? 'The Trap eliminates the next Monster placed on its space.' : 'A Buddha destroys the next ghost that arrives or is moved onto its space.'}
          >
            {bastion ? `Place the Trap (${readyBuddhas} ready)` : `Place a Buddha (${readyBuddhas} ready${t.buddhas > readyBuddhas ? `, ${t.buddhas - readyBuddhas} taken this turn` : ''})`}
          </button>
          {game.whiteMoon && <CrystalPlacement game={game} c={c} />}
          <h4 className="gs-col-sub">Any time</h4>
          <div className="gs-btnrow">
            <button
              className={`gs-btn small ${sel?.kind === 'yinYangTile' ? 'on' : ''}`}
              disabled={!t.yinYang}
              title={bastion ? 'Spend your Call to Arms: activate any Bastion tile (even in the Grasp of Evil)' : 'Spend your Yin-Yang: ask the villager of any tile for help'}
              onClick={() => select({ kind: 'yinYangTile' })}
            >
              {bastion ? 'Call to Arms: any tile' : 'Yin-Yang: help anywhere'}
            </button>
            {!bastion && (
              <button
                className={`gs-btn small ${sel?.kind === 'yinYangFlip' ? 'on' : ''}`}
                disabled={!t.yinYang || !game.village.some((v) => v.haunted)}
                title="Spend your Yin-Yang: restore a haunted tile"
                onClick={() => select({ kind: 'yinYangFlip' })}
              >
                Yin-Yang: restore a tile
              </button>
            )}
          </div>
          {t.artifacts.length > 0 && <Artifacts game={game} c={c} />}
        </section>

        <section className="gs-col gs-col-end gs-sticky-end">
          <div className="gs-btnrow">
            <button
              className="gs-btn primary gs-endturn"
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
          {sel && (
            <button className="gs-btn small" onClick={() => select(null)}>
              Cancel selection
            </button>
          )}
          {t.tile === CENTER_TILE && !t.underground && game.centerPowerTokens > 0 && (
            <label className="gs-mini gs-check">
              <input type="checkbox" checked={reclaim} onChange={(e) => setReclaim(e.target.checked)} /> reclaim the {game.centerPowerTokens} power token
              {game.centerPowerTokens > 1 ? 's' : ''} on the central tile
            </label>
          )}
        </section>
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
  const bastion = isBastion(game)
  switch (kind) {
    case 'buddhistTemple':
      return game.templeBuddhas > 0 ? null : bastion ? 'The Trap figure is already placed on a Horde board.' : 'No Buddha is left on the Temple.'
    case 'cemetery':
      if (bastion) {
        const anyDead = (['red', 'blue', 'green', 'yellow'] as Color[]).some((x) => !game.boards[x].neutral && !game.taoists[x].alive && !game.taoists[x].deadForever)
        const anySupply = Object.values(game.taoSupply).some((n) => n > 0)
        return anyDead || anySupply ? null : 'No Hero is taken out and no Equipment token is left in the reserve.'
      }
      if (isSolo(game)) return 'Solo: no aid can be requested from the Cemetery.'
      return (['red', 'blue', 'green', 'yellow'] as Color[]).some((x) => !game.boards[x].neutral && !game.taoists[x].alive) || (game.whiteMoon?.dead.length ?? 0) > 0
        ? null
        : 'Nobody is dead.'
    case 'taoistAltar':
      if (bastion) return ghostsInPlay(game).some((g) => !g.card.incarnation) ? null : 'There is no Monster for the Trebuchet to net.'
      return game.village.some((v) => v.haunted) ? null : 'No tile is haunted.'
    case 'sorcerersHut':
      return ghostsInPlay(game).some((g) => !g.card.incarnation && !isSkeleton(g.ghost.card))
        ? null
        : `There is no ${bastion ? 'Monster' : 'ghost'} the ${tileName(game, 'sorcerersHut')} can eliminate.`
    case 'pavilion':
      return ghostsInPlay(game).some((g) => !isSkeleton(g.ghost.card)) ? null : `There is no ${bastion ? 'Horde card' : 'ghost'} to move.`
    default:
      void c
      return null
  }
}

function BeforeMove({ game, c }: { game: GameState; c: Color }) {
  const y = game.yang!
  const bastion = isBastion(game)
  const select = useUiStore((u) => u.select)
  const sel = useUiStore((u) => u.selecting)
  const opts: ReactElement[] = []
  if (hasPower(game, c, 'bottomlessPockets') && !y.usedPowers.includes('bottomlessPockets')) {
    opts.push(
      <div key="bp">
        <div className="gs-mini">{powerName(game, 'bottomlessPockets')} — take a token:</div>
        <ColorChips game={game} onPick={(color) => send({ type: 'power', by: c, use: { power: 'bottomlessPockets', color } })} />
      </div>,
    )
  }
  if (hasPower(game, c, 'enfeeblementMantra') && !y.usedPowers.includes('enfeeblementMantra')) {
    const canPlace = game.mantra === 'ready' || (bastion && game.mantra === 'placed')
    opts.push(
      <button
        key="em"
        className={`gs-btn small ${sel?.kind === 'mantra' ? 'on' : ''}`}
        disabled={!canPlace || ghostsInPlay(game).length === 0}
        title={powerText(game, 'enfeeblementMantra')}
        onClick={() => select({ kind: 'mantra' })}
      >
        {powerName(game, 'enfeeblementMantra')}{' '}
        {canPlace ? (bastion && game.mantra === 'placed' ? '(move Enchantment)' : '') : say(game, `(${game.mantra === 'placed' ? 'on a ghost' : game.mantra === 'cooldown' ? 'back next turn' : 'gone'})`)}
      </button>,
    )
  }
  if (hasPower(game, c, 'danceOfTheTwinWinds') && !y.usedPowers.includes('danceOfTheTwinWinds')) {
    const targets = bastion ? livingTaoists(game) : livingTaoists(game).filter((t) => t.color !== c)
    opts.push(
      <div key="tw">
        <div className="gs-mini">
          {powerName(game, 'danceOfTheTwinWinds')} — move {bastion ? 'a Hero' : 'another Taoist'} 1 space:
        </div>
        {game.blackSecret && <ClimbToggle />}
        <div className="gs-btnrow">
          {targets.map((o) => (
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
  if (bastion && hasPower(game, c, 'secondWind') && !y.moved && !y.usedPowers.includes('secondWind')) {
    const anyGrasp = game.village.some((v) => v.haunted) || ghostsInPlay(game).some((g) => !!g.ghost.figure)
    opts.push(
      <button
        key="tg"
        className={`gs-btn small ${sel?.kind === 'teagaan' ? 'on' : ''}`}
        disabled={!anyGrasp}
        title={powerText(game, 'secondWind')}
        onClick={() => select(sel?.kind === 'teagaan' ? null : { kind: 'teagaan' })}
      >
        Teagaan: forego Move to remove Grasp of Evil
      </button>,
    )
  }
  if (opts.length === 0) return null
  return <>{opts}</>
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

/** One chip per colour, from the token supply; `unlimited`: a set of its own (Last Bastion's Standard tokens). */
export function ColorChips({
  game,
  onPick,
  allowed,
  unlimited = false,
}: {
  game: GameState
  onPick: (c: TaoColor) => void
  allowed?: (c: TaoColor) => boolean
  unlimited?: boolean
}) {
  return (
    <div className="gs-chips">
      {TAO_COLORS.map((col) => (
        <button key={col} className="gs-chip" disabled={(!unlimited && game.taoSupply[col] <= 0) || (allowed ? !allowed(col) : false)} onClick={() => onPick(col)}>
          {unlimited ? <StandardToken color={col} size={16} /> : <TaoToken color={col} size={16} />} {col}
          {!unlimited && <span className="gs-mini">({game.taoSupply[col]})</span>}
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
            {familyName(game.village[x]!.villagers.at(-1)!)} from the {tileName(game, game.village[x]!.kind)}
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
  const bastion = isBastion(game)
  const fire = (params: HelpParams) => fireHelp(c, draft, params)
  const set = (patch: Partial<HelpDraft>) => select({ kind: 'help', draft: { ...draft, ...patch } })
  const title = `${draft.viaYinYang ? `${bastion ? 'Call to Arms' : 'Yin-Yang'} → ` : ''}${tileName(game, draft.kind)}`
  let body: ReactElement
  switch (draft.kind) {
    case 'circleOfPrayer':
      body = (
        <>
          <p>{tileHelp(game, 'circleOfPrayer')}</p>
          <ColorChips game={game} unlimited={bastion} onPick={(color) => fire({ kind: 'circleOfPrayer', color })} />
        </>
      )
      break
    case 'teaHouse':
      if (bastion) {
        const hero = draft.taoist ? game.taoists[draft.taoist] : null
        body = hero ? (
          <>
            <p>
              {COLOR_NAME[hero.color]} gains 1 Life token and may move 1 space: click an adjacent tile on the board, or
            </p>
            <div className="gs-btnrow">
              {hero.immobilized && (
                <button className="gs-btn" onClick={() => fire({ kind: 'teaHouse', taoist: hero.color, to: hero.tile })}>
                  Stand back up (their move)
                </button>
              )}
              <button className="gs-btn" onClick={() => fire({ kind: 'teaHouse', taoist: hero.color })}>
                No movement
              </button>
              <button className="gs-btn small" onClick={() => set({ taoist: null })}>
                Another Hero
              </button>
            </div>
          </>
        ) : (
          <>
            <p>Grant a Hero of your choice 1 Life token and 1 optional movement:</p>
            <div className="gs-btnrow">
              {livingTaoists(game).map((h) => (
                <button key={h.color} className="gs-btn" onClick={() => set({ taoist: h.color })}>
                  {COLOR_NAME[h.color]} ({h.qi} Life)
                </button>
              ))}
            </div>
          </>
        )
      } else {
        body = (
          <>
            <p>Take a Tao token of your choice and gain 1 Qi. Then a ghost comes into play.</p>
            <ColorChips game={game} onPick={(color) => fire({ kind: 'teaHouse', color })} />
          </>
        )
      }
      break
    case 'cemetery': {
      const dead = (['red', 'blue', 'green', 'yellow'] as Color[]).filter(
        (x) => !game.boards[x].neutral && !game.taoists[x].alive && !game.taoists[x].deadForever,
      )
      body = (
        <>
          {dead.length > 0 && (
            <>
              <p>
                {bastion
                  ? 'Heal a taken-out Hero (returns wounded on the Dispensary with 3 Life and a Call to Arms):'
                  : 'Bring the dead back with 2 Qi on the Cemetery, then roll the curse die (a haunt face haunts the Cemetery).'}
              </p>
              <div className="gs-btnrow">
                {dead.map((d) => (
                  <button key={d} className="gs-btn" onClick={() => fire({ kind: 'cemetery', revive: d })}>
                    {bastion ? 'Heal' : 'Revive'} {COLOR_NAME[d]}
                  </button>
                ))}
              </div>
            </>
          )}
          {bastion && (
            <>
              <p>Or give 1 available Equipment token from the reserve to a Hero:</p>
              <div className="gs-btnrow">
                {livingTaoists(game).map((h) => (
                  <button key={h.color} className={`gs-btn small ${(draft.taoist ?? c) === h.color ? 'on' : ''}`} onClick={() => set({ taoist: h.color })}>
                    {COLOR_NAME[h.color]}
                  </button>
                ))}
              </div>
              <ColorChips game={game} onPick={(color) => fire({ kind: 'cemetery', color, to: draft.taoist ?? c })} />
            </>
          )}
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
      if (bastion) {
        body = (
          <>
            <p>Move a Horde card to any free space, or click another Horde card to swap their positions.</p>
            <p className="gs-mini">{!draft.ghost ? '1. Click the Horde card to move.' : '2. Click any space (free to move, occupied to swap).'}</p>
          </>
        )
        break
      }
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
      if (bastion) {
        const picks = draft.picks ?? { tiles: [], ghosts: [] }
        const n = picks.tiles.length + picks.ghosts.length
        const names = [
          ...picks.tiles.map((i) => tileName(game, game.village[i]!.kind)),
          ...picks.ghosts.map((r) => cardName(game, r)),
        ]
        body = (
          <>
            <p>{tileHelp(game, 'nightWatchman')}</p>
            <p className="gs-mini">{n === 0 ? 'Click the figures on the board.' : `Picked: ${names.join(', ')}.`}</p>
            <button className="gs-btn primary" disabled={n === 0} onClick={() => fire({ kind: 'nightWatchman', tiles: picks.tiles, ghosts: picks.ghosts })}>
              Remove {n === 2 ? 'both figures' : n === 1 ? 'the figure' : 'figures'}
            </button>
          </>
        )
        break
      }
      body = (
        <>
          <p>{tileHelp(game, 'nightWatchman')}</p>
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
      body = <p>{tileHelp(game, draft.kind)} Choose on the board.</p>
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
