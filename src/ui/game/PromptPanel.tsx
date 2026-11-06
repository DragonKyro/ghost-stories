// The question the game is waiting on, and its answer form.

import { useState } from 'react'
import type { Response } from '@/game/actions'
import {
  CATACOMB_SIDES,
  CURSE_EFFECT_TEXT,
  DEMONS,
  MANTRA_TEXT,
  openSlots,
  summonableDemons,
  throwableCurses,
} from '@/game/blackSecret'
import { getCard } from '@/game/catalogue'
import { CURSE_TEXT } from '@/game/ops'
import { COLOR_NAME, heldColors, livingTaoists, seatName, TILE_NAME } from '@/game/rules'
import { ARTIFACT_NAME, barrierTargets, familyName } from '@/game/whiteMoon'
import { COLORS, TAO_COLORS, type Color, type GameState, type Prompt, type TaoColor } from '@/game/types'
import { useGameStore } from '@/store/gameStore'
import { CurseDie, CurseTokenArt, GhostCardArt, TaoDie, TaoToken } from '@/ui/art'
import { ExorcismPanel } from './ExorcismPanel'
import { useCanAct } from './seats'

export function PromptPanel({ game, prompt }: { game: GameState; prompt: Prompt }) {
  const canAct = useCanAct()
  const mine = canAct(prompt.owner)
  if (prompt.kind === 'exorcism') return <ExorcismPanel game={game} roll={prompt.roll} owner={prompt.owner} mine={mine} />
  return (
    <div className="gs-card">
      <h3>{titleOf(game, prompt)}</h3>
      {mine ? <Answer game={game} p={prompt} /> : <p className="gs-mini">Waiting for {seatName(prompt.owner)}…</p>}
    </div>
  )
}

function titleOf(game: GameState, p: Prompt): string {
  const who = seatName(p.owner)
  switch (p.kind) {
    case 'placeGhost':
      return `${who}: place ${getCard(p.card).name}`
    case 'curseReroll':
      return `${who}: the Gods' Favorite`
    case 'qiPayer':
      return `${who}: who takes the Qi loss?`
    case 'discardTao':
      return `${COLOR_NAME[p.taoist]}: discard ${p.count} Tao`
    case 'gainTao':
      return `${COLOR_NAME[p.taoist]}: take ${p.count} Tao`
    case 'qiOrYinYang':
      return `${COLOR_NAME[p.taoist]}: your reward`
    case 'incarnationReward':
      return 'The incarnation’s reward'
    case 'bonecrackerPayer':
      return 'Bonecracker'
    case 'herbalist':
      return `${COLOR_NAME[p.taoist]}: Herbalist's Shop`
    case 'devour':
      return 'A Devourer feeds'
    case 'suLing':
      return 'Su-Ling'
    case 'suLingCrystal':
      return 'Su-Ling and the receptacle'
    case 'inherit':
      return `Inheritance: the ${ARTIFACT_NAME[p.artifact]}`
    case 'restoreTile':
      return 'Restore a tile'
    case 'barrier':
      return `Mystic Barrier — the ${p.board} board`
    case 'wuFengGhost':
      return `Wu-Feng draws ${getCard(p.card).name}`
    case 'wuFengIncarnation':
      return 'Wu-Feng summons an incarnation'
    case 'wuFengDemon':
      return `Wu-Feng: the ${DEMONS[p.demon].name} acts`
    case 'wuFengShadow':
      return 'Wu-Feng: the Shadow acts'
    case 'wuFengSkeleton':
      return 'Wu-Feng raises a skeleton'
    case 'wuFengFreeCurse':
      return 'Wu-Feng: the Cursed Tablet'
    case 'wuFengCurseTarget':
      return `Wu-Feng: ${p.effect === 'hauntTile' ? 'haunt a tile' : 'remove a ladder'}`
    case 'shadowAttack':
      return 'The Shadow strikes'
    case 'mantraQi':
      return p.mode === 'qi' ? 'A Qi for the Bloody Mantras' : 'Blood of Su-Ling'
    case 'mantraTarget':
      return 'A Bloody Mantra awakens'
    case 'exorcism':
      return 'Exorcism'
  }
  void game
}

function Answer({ game, p }: { game: GameState; p: Prompt }) {
  const dispatch = useGameStore((g) => g.dispatch)
  const r = (resp: Response) => dispatch({ type: 'respond', by: p.owner, r: resp })
  switch (p.kind) {
    case 'placeGhost': {
      const card = getCard(p.card)
      return (
        <div style={{ display: 'flex', gap: 10 }}>
          <GhostCardArt card={card} width={96} />
          <div className="gs-actions" style={{ flex: 1 }}>
            <p>
              {card.color === 'black' ? 'Black ghosts go on the active player’s board.' : `${card.color[0]!.toUpperCase() + card.color.slice(1)} ghosts go on the ${card.color} board.`}{' '}
              {p.options.every((o) => o.board === p.options[0]!.board) ? 'Click a highlighted space.' : 'That board is full: choose any free space.'}
            </p>
            {card.text && <p className="gs-mini">{card.text}</p>}
          </div>
        </div>
      )
    }
    case 'curseReroll':
      return (
        <div className="gs-actions">
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <CurseDie face={p.face} size={44} />
            <p>{CURSE_TEXT[p.face]}. Reroll it once? You must keep the second result.</p>
          </div>
          <div className="gs-btnrow">
            <button className="gs-btn" onClick={() => r({ kind: 'curseReroll', reroll: false })}>
              Keep it
            </button>
            <button className="gs-btn primary" onClick={() => r({ kind: 'curseReroll', reroll: true })}>
              Reroll
            </button>
          </div>
        </div>
      )
    case 'qiPayer':
      return (
        <div className="gs-actions">
          <p>The possessed {p.board} board loses Qi ({p.why}): a Taoist of your choice takes it.</p>
          <div className="gs-btnrow">
            {p.options.map((c) => (
              <button key={c} className="gs-btn" onClick={() => r({ kind: 'qiPayer', taoist: c })}>
                {COLOR_NAME[c]} ({game.taoists[c].qi} Qi)
              </button>
            ))}
          </div>
        </div>
      )
    case 'discardTao':
      return <TaoPicker game={game} count={p.count} why={p.why} from={heldColors(game.taoists[p.taoist])} have={(c) => game.taoists[p.taoist].tao[c]} verb="Discard" onDone={(colors) => r({ kind: 'discardTao', colors })} />
    case 'gainTao':
      return <TaoPicker game={game} count={p.count} why={p.why} from={TAO_COLORS.filter((c) => game.taoSupply[c] > 0)} have={(c) => game.taoSupply[c]} verb="Take" onDone={(colors) => r({ kind: 'gainTao', colors })} />
    case 'qiOrYinYang':
      return (
        <div className="gs-btnrow">
          <button className="gs-btn" onClick={() => r({ kind: 'qiOrYinYang', choice: 'qi' })}>
            Gain 1 Qi
          </button>
          <button className="gs-btn" onClick={() => r({ kind: 'qiOrYinYang', choice: 'yinYang' })}>
            Regain the Yin-Yang
          </button>
        </div>
      )
    case 'incarnationReward':
      return <IncarnationReward game={game} onDone={(qi, yinYang) => r({ kind: 'incarnationReward', qi, yinYang })} />
    case 'bonecrackerPayer':
      return (
        <div className="gs-actions">
          <p>Bonecracker's host board is neutral: choose who discards a Tao token.</p>
          <div className="gs-btnrow">
            {p.options.map((c) => (
              <button key={c} className="gs-btn" onClick={() => r({ kind: 'bonecrackerPayer', taoist: c })}>
                {COLOR_NAME[c]}
              </button>
            ))}
          </div>
        </div>
      )
    case 'herbalist':
      return <Herbalist game={game} p={p} onAnswer={r} />
    case 'devour':
      return <p>Click the tile whose top villager is devoured.</p>
    case 'suLing':
      return (
        <div className="gs-actions">
          <p>A negative event happened this turn: you may place Su-Ling on a haunting icon (not in front of an incarnation). She cancels the centre stone of the ghost there.</p>
          <button className="gs-btn" onClick={() => r({ kind: 'suLing', ref: null })}>
            Leave her where she is
          </button>
        </div>
      )
    case 'suLingCrystal':
      return (
        <div className="gs-btnrow">
          <button className="gs-btn primary" onClick={() => r({ kind: 'suLingCrystal', take: true })}>
            Fill the {p.corner.toUpperCase()} receptacle
          </button>
          <button className="gs-btn" onClick={() => r({ kind: 'suLingCrystal', take: false })}>
            No
          </button>
        </div>
      )
    case 'inherit':
      return (
        <div className="gs-btnrow">
          {p.options.map((c) => (
            <button key={c} className="gs-btn" onClick={() => r({ kind: 'inherit', taoist: c })}>
              {COLOR_NAME[c]}
            </button>
          ))}
        </div>
      )
    case 'restoreTile':
      return <p>Click a haunted tile.</p>
    case 'barrier': {
      const b = game.whiteMoon!.barrier!
      const can = barrierTargets(game, p.board).length > 0
      const onPortal = game.village.some((t) => t.portal && t.villagers.length > 0)
      const visible = game.village.filter((t) => t.villagers.length > 0)
      return (
        <div className="gs-actions">
          <p>{b.crystals} crystal{b.crystals === 1 ? '' : 's'} left in the barrier. Ghosts exorcised now give no curses or rewards; incarnations can't be touched.</p>
          <div className="gs-btnrow">
            {onPortal || visible.length === 0 ? (
              <button className="gs-btn" disabled={b.crystals <= 0 || visible.length === 0} onClick={() => r({ kind: 'barrier', choice: 'save' })}>
                Spend a crystal: save the villager on the Portal
              </button>
            ) : (
              visible.map((t) => (
                <button key={t.idx} className="gs-btn small" disabled={b.crystals <= 0} onClick={() => r({ kind: 'barrier', choice: 'save', tile: t.idx })}>
                  Save the {familyName(t.villagers.at(-1)!)} villager ({TILE_NAME[t.kind]})
                </button>
              ))
            )}
            <button className="gs-btn primary" disabled={!can} onClick={() => r({ kind: 'barrier', choice: 'roll' })}>
              Roll 4 dice at this board's ghosts
            </button>
            <button className="gs-btn" onClick={() => r({ kind: 'barrier', choice: 'pass' })}>
              Pass
            </button>
          </div>
        </div>
      )
    }
    case 'wuFengGhost':
      return <WuFengGhost game={game} card={p.card} onAnswer={r} />
    case 'wuFengIncarnation':
      return <WuFengIncarnation game={game} onAnswer={r} />
    case 'wuFengDemon':
      return (
        <div className="gs-actions">
          <p>Move the {DEMONS[p.demon].name} to an adjacent catacomb space (click one), or search its space (not while a Taoist stands there).</p>
          <div className="gs-btnrow">
            <button className="gs-btn primary" onClick={() => r({ kind: 'wuFengDemon', choice: { kind: 'search' } })}>
              Search
            </button>
            <button className="gs-btn" onClick={() => r({ kind: 'wuFengDemon', choice: { kind: 'pass' } })}>
              Pass
            </button>
          </div>
        </div>
      )
    case 'wuFengShadow':
      return (
        <div className="gs-actions">
          <p>Click any village tile or catacomb space to move the Shadow there, or:</p>
          <div className="gs-btnrow">
            <button className="gs-btn" onClick={() => r({ kind: 'wuFengShadow', choice: { kind: 'attackTaoists' } })}>
              Attack the Taoists here (3 dice, black = −1 Qi)
            </button>
            <button className="gs-btn" onClick={() => r({ kind: 'wuFengShadow', choice: { kind: 'attackTile' } })}>
              Attack this tile (curse die)
            </button>
            <button className="gs-btn" onClick={() => r({ kind: 'wuFengShadow', choice: { kind: 'pass' } })}>
              Pass
            </button>
          </div>
        </div>
      )
    case 'shadowAttack':
      return <ShadowAttack game={game} hits={p.hits} options={p.options} onDone={(taoists) => r({ kind: 'shadowAttack', taoists })} />
    case 'wuFengSkeleton':
      return <p>Click a free ghost space (on a Buddha the skeleton is destroyed).</p>
    case 'wuFengFreeCurse':
      return (
        <div className="gs-actions">
          <CurseList game={game} color="any" onPick={(token, slot) => r({ kind: 'wuFengFreeCurse', token, slot })} />
          <button className="gs-btn small" onClick={() => r({ kind: 'wuFengFreeCurse', token: null, slot: 0 })}>
            Throw nothing
          </button>
        </div>
      )
    case 'wuFengCurseTarget':
      return <p>Click a highlighted tile.</p>
    case 'mantraQi': {
      const bs = game.blackSecret!
      return (
        <div className="gs-actions">
          <p>{p.mode === 'qi' ? 'The lost Qi goes on a Bloody Mantra of your choice; a full Mantra awakens.' : 'Choose a Bloody Mantra to awaken now.'}</p>
          {p.options.map((i) => {
            const m = bs.mantras[i]!
            return (
              <button key={m.id} className="gs-btn small" onClick={() => r({ kind: 'mantraQi', mantra: i })} style={{ justifyContent: 'flex-start', textAlign: 'left' }}>
                L{m.level} · {m.qi}/{m.level} Qi — {MANTRA_TEXT[m.effect]}
              </button>
            )
          })}
        </div>
      )
    }
    case 'mantraTarget':
      if (p.mantra === 'unhaunt') return <p>Click a haunted tile to restore.</p>
      return (
        <div className="gs-btnrow">
          {p.options.map((i) => (
            <button key={i} className="gs-btn" onClick={() => r({ kind: 'mantraTarget', target: i })}>
              {p.mantra === 'yinYangReturn' ? COLOR_NAME[COLORS[i]!] : DEMONS[game.blackSecret!.demons[i]!.id].name}
            </button>
          ))}
        </div>
      )
    case 'exorcism':
      return null
  }
}

function TaoPicker({
  game,
  count,
  why,
  from,
  have,
  verb,
  onDone,
}: {
  game: GameState
  count: number
  why: string
  from: TaoColor[]
  have: (c: TaoColor) => number
  verb: string
  onDone: (colors: TaoColor[]) => void
}) {
  const [picked, setPicked] = useState<TaoColor[]>([])
  const add = (c: TaoColor) => {
    if (picked.filter((x) => x === c).length >= have(c) || picked.length >= count) return
    const next = [...picked, c]
    if (next.length === count) onDone(next)
    else setPicked(next)
  }
  void game
  return (
    <div className="gs-actions">
      <p>
        {verb} {count - picked.length} more ({why}).
      </p>
      <div className="gs-chips">
        {from.map((c) => (
          <button key={c} className="gs-chip" onClick={() => add(c)}>
            <TaoToken color={c} size={16} /> {c}
          </button>
        ))}
      </div>
      {picked.length > 0 && (
        <button className="gs-btn small" onClick={() => setPicked([])}>
          Start over ({picked.join(', ')})
        </button>
      )}
    </div>
  )
}

function IncarnationReward({ game, onDone }: { game: GameState; onDone: (qi: Color, yy: Color | null) => void }) {
  const living = livingTaoists(game)
  const [qi, setQi] = useState<Color>(living[0]!.color)
  const yyOptions = living.filter((t) => !t.yinYang)
  const [yy, setYy] = useState<Color | null>(yyOptions[0]?.color ?? null)
  return (
    <div className="gs-actions">
      <p>The incarnation returns 1 Qi and 1 Yin-Yang to the group: the players decide who gets them.</p>
      <div className="gs-btnrow">
        <span className="gs-mini">Qi:</span>
        {living.map((t) => (
          <button key={t.color} className={`gs-btn small ${qi === t.color ? 'on' : ''}`} onClick={() => setQi(t.color)}>
            {COLOR_NAME[t.color]} ({t.qi})
          </button>
        ))}
      </div>
      <div className="gs-btnrow">
        <span className="gs-mini">Yin-Yang:</span>
        {yyOptions.map((t) => (
          <button key={t.color} className={`gs-btn small ${yy === t.color ? 'on' : ''}`} onClick={() => setYy(t.color)}>
            {COLOR_NAME[t.color]}
          </button>
        ))}
        {yyOptions.length === 0 && <span className="gs-mini">everyone has one</span>}
      </div>
      <button className="gs-btn primary" onClick={() => onDone(qi, yy)}>
        Give the rewards
      </button>
    </div>
  )
}

function Herbalist({ game, p, onAnswer }: { game: GameState; p: Extract<Prompt, { kind: 'herbalist' }>; onAnswer: (r: Response) => void }) {
  const [marked, setMarked] = useState<number[]>([])
  const whites = game.whiteMoon ? 0 : p.dice.filter((d) => d === 'white').length
  const [white, setWhite] = useState<TaoColor[]>([])
  return (
    <div className="gs-actions">
      <div className="gs-dice">
        {p.dice.map((d, i) => (
          <span key={i} className={`gs-die ${p.canReroll ? 'pick' : ''} ${marked.includes(i) ? 'marked' : ''}`} onClick={() => p.canReroll && setMarked(marked.includes(i) ? marked.filter((x) => x !== i) : [...marked, i])}>
            <TaoDie face={d} size={40} />
          </span>
        ))}
      </div>
      {p.canReroll && (
        <button className="gs-btn small" disabled={marked.length === 0} onClick={() => onAnswer({ kind: 'reroll', dice: marked })}>
          The Gods' Favorite: reroll marked dice
        </button>
      )}
      {whites > 0 && (
        <>
          <p>
            Choose {whites - white.length} colour{whites - white.length === 1 ? '' : 's'} for the white face{whites > 1 ? 's' : ''}:
          </p>
          <div className="gs-chips">
            {TAO_COLORS.map((c) => (
              <button key={c} className="gs-chip" disabled={white.length >= whites || game.taoSupply[c] <= 0} onClick={() => setWhite([...white, c])}>
                <TaoToken color={c} size={16} /> {c}
              </button>
            ))}
          </div>
        </>
      )}
      <button className="gs-btn primary" disabled={white.length !== whites} onClick={() => onAnswer({ kind: 'herbalistTake', white })}>
        Take the tokens{game.whiteMoon && p.dice.includes('white') ? ' (white = a moon crystal)' : ''}
      </button>
    </div>
  )
}

function ShadowAttack({ game, hits, options, onDone }: { game: GameState; hits: number; options: Color[]; onDone: (t: Color[]) => void }) {
  const [list, setList] = useState<Color[]>([])
  return (
    <div className="gs-actions">
      <p>
        {hits} black face{hits > 1 ? 's' : ''}: assign each Qi loss ({hits - list.length} left).
      </p>
      <div className="gs-btnrow">
        {options.map((c) => (
          <button
            key={c}
            className="gs-btn"
            onClick={() => {
              const next = [...list, c]
              if (next.length === hits) onDone(next)
              else setList(next)
            }}
          >
            {COLOR_NAME[c]} ({game.taoists[c].qi})
          </button>
        ))}
      </div>
    </div>
  )
}

function CurseList({ game, color, onPick }: { game: GameState; color: TaoColor | 'any'; onPick: (token: string, slot: number) => void }) {
  const list = throwableCurses(game, color)
  if (list.length === 0) return <p className="gs-mini">No curse can be thrown (colour or pyramid).</p>
  return (
    <div className="gs-actions">
      {list.map((t) => (
        <button key={t.id} className="gs-btn small" style={{ justifyContent: 'flex-start', textAlign: 'left' }} onClick={() => onPick(t.id, openSlots(game, t.level)[0]!)}>
          <CurseTokenArt level={t.level} color={t.color} size={20} /> L{t.level} {t.color}: {CURSE_EFFECT_TEXT[t.effect]}
        </button>
      ))}
    </div>
  )
}

function WuFengGhost({ game, card, onAnswer }: { game: GameState; card: string; onAnswer: (r: Response) => void }) {
  const def = getCard(card)
  const demons = summonableDemons(game, card)
  const entrances = CATACOMB_SIDES[game.config.blackSecret!.side].entrances
  return (
    <div className="gs-actions">
      <div style={{ display: 'flex', gap: 10 }}>
        <GhostCardArt card={def} width={86} />
        <p>Place it in the village (click a highlighted space), discard it to summon a demon of cost ≤ its resistance, or to throw a curse of its colour (black: any).</p>
      </div>
      {demons.length > 0 && (
        <>
          <h4>Summon a demon</h4>
          <div className="gs-btnrow">
            {demons.map((d) =>
              entrances.map((e) => (
                <button key={`${d}-${e}`} className="gs-btn small" onClick={() => onAnswer({ kind: 'wuFengGhost', choice: { kind: 'summon', demon: d, entrance: e } })}>
                  {DEMONS[d].name} → {TILE_NAME[game.village[e]!.kind]} entrance
                </button>
              )),
            )}
          </div>
        </>
      )}
      <h4>Throw a curse</h4>
      <CurseList game={game} color={def.color} onPick={(token, slot) => onAnswer({ kind: 'wuFengGhost', choice: { kind: 'curse', token, slot } })} />
    </div>
  )
}

function WuFengIncarnation({ game, onAnswer }: { game: GameState; onAnswer: (r: Response) => void }) {
  const hand = game.blackSecret!.incarnationHand
  return (
    <div className="gs-actions">
      <p>Choose the incarnation to put into play; it goes where the placement rules say.</p>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {hand.map((id) => {
          const card = getCard(id)
          const board: Color = card.color === 'black' ? game.active : (card.color as Color)
          const free = ([0, 1, 2] as const).find((i) => !game.boards[board].spaces[i])
          const any = COLORS.flatMap((b) => ([0, 1, 2] as const).filter((i) => !game.boards[b].spaces[i]).map((space) => ({ board: b, space })))
          const ref = free !== undefined ? { board, space: free } : any[0]
          return (
            <div key={id} style={{ cursor: 'pointer' }} onClick={() => ref && onAnswer({ kind: 'wuFengIncarnation', card: id, ref })}>
              <GhostCardArt card={card} width={80} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
