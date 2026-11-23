// Hover details: a ghost card at full size with its abilities spelled out,
// or a village tile's action.

import type React from 'react'
import { cardOnBoard } from '@/game/catalogue'
import { lineOf } from '@/game/geometry'
import { boardName, isBastion, suLingAt, tileName } from '@/game/rules'
import type { Ability, GameState } from '@/game/types'
import { useUiStore } from '@/store/uiStore'
import { AbilityIcon, GhostCardArt, TileArt } from '@/ui/art'
import { ABILITY_TEXT, GROUP_TEXT, tileHelp } from './text'
import { familyName } from '@/game/whiteMoon'
import { say } from '@/game/vocab'

export function Inspector({ game, tile, stacked = false }: { game: GameState; tile: number; stacked?: boolean }) {
  const inspect = useUiStore((u) => u.inspect)
  const setInspect = useUiStore((u) => u.setInspect)
  if (!inspect) return null
  const bastion = isBastion(game)
  // Phones: a card pinned over the board; tap it to close.
  const pos: React.CSSProperties = stacked
    ? { left: 4, right: 4, top: 4, pointerEvents: 'auto', maxWidth: 'none', transform: 'scale(0.92)', transformOrigin: 'top center' }
    : { left: tile * 1.18 + tile * 0.1, top: tile * 1.18 + tile * 0.1 }
  const close = stacked ? () => setInspect(null) : undefined
  if (inspect.kind === 'tile') {
    const t = game.village[inspect.tile]
    if (!t) return null
    return (
      <div className="gs-inspect" style={pos} onClick={close}>
        <TileArt kind={t.kind} haunted={t.haunted} size={130} />
        <div style={{ maxWidth: 240 }}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--accent)' }}>{tileName(game, t.kind)}</div>
          {t.haunted ? (
            <p className="gs-mini">
              {bastion
                ? 'In the Grasp of Evil: this Bastion tile cannot be activated (except with a Call to Arms token). Remove the figure with the Divine Fountain or Teagaan.'
                : 'Haunted: the villager is gone and the tile has no action. The Taoist Altar or a Yin-Yang can restore it.'}
            </p>
          ) : (
            <p style={{ fontSize: 12.5, margin: '4px 0' }}>{tileHelp(game, t.kind)}</p>
          )}
          {t.villagers.length > 0 && <p className="gs-mini">Villagers (top first): {[...t.villagers].reverse().map(familyName).join(', ')}</p>}
        </div>
      </div>
    )
  }
  const g = game.boards[inspect.ref.board].spaces[inspect.ref.space]
  if (!g) return null
  const card = cardOnBoard(g.card, inspect.ref.board)
  const line = lineOf(inspect.ref).map((x) => tileName(game, game.village[x]!.kind))
  const row = (label: string, abs: Ability[]) =>
    abs.map((a, i) => (
      <div key={`${label}-${i}`} className="gs-abil">
        <small>{label}</small>
        <AbilityIcon kind={a.kind} group={a.group} size={22} />
        <span>
          {say(game, ABILITY_TEXT[a.kind])}
          {a.group ? say(game, GROUP_TEXT) : ''}
        </span>
      </div>
    ))
  return (
    <div className="gs-inspect" style={pos} onClick={close}>
      <GhostCardArt card={card} width={stacked ? 110 : 150} />
      <div style={{ maxWidth: 260 }}>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 16, color: 'var(--accent)' }}>{card.name}</div>
        <div className="gs-mini">
          {boardName(game, inspect.ref.board)} board, space {inspect.ref.space + 1} · resistance{' '}
          {Object.entries(card.resistance)
            .map(([c, n]) => `${n} ${c}`)
            .join(' + ')}
        </div>
        {card.text && <p style={{ fontSize: 12.5, margin: '4px 0' }}>{card.text}</p>}
        {row('arrival', card.left)}
        {row('each Yin', card.center)}
        {row('exorcised', card.right)}
        {card.left.length + card.center.length + card.right.length === 0 && <p className="gs-mini">No abilities.</p>}
        {g.figure && <p className="gs-mini">{bastion ? 'Grasp of Evil figure' : 'Haunting figure'}: {g.figure === 'card' ? 'on the card' : 'on the board — it strikes next phase'}.</p>}
        {g.mantra && <p className="gs-mini">{bastion ? "Mylfaar's Enchantment" : 'The Enfeeblement Mantra'} lowers its resistance by 1.</p>}
        {g.net && <p className="gs-mini">Covered by the Trebuchet's Net: its abilities are cancelled.</p>}
        {suLingAt(game, inspect.ref) && <p className="gs-mini">Su-Ling cancels its centre stone.</p>}
        <p className="gs-mini">In front of it: {line.join(' → ')}.</p>
      </div>
    </div>
  )
}
