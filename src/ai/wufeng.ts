// Heuristic Wu-Feng (Black Secret): spend ghost cards where they hurt most.

import type { Response } from '@/game/actions'
import { getCard } from '@/game/catalogue'
import { facedSpaces, isAdjacent, adjacentTiles, refKey, lineOf } from '@/game/geometry'
import { placementOptions } from '@/game/flow'
import { livingTaoists, ghostAt } from '@/game/rules'
import { CATACOMB_SIDES, openSlots, summonableDemons, throwableCurses } from '@/game/blackSecret'
import type { Color, GameState, GhostRef, Prompt } from '@/game/types'
import { aiRandom } from './eval'
import { COLORS } from '@/game/types'

const LEVEL_PRIORITY = [4, 3, 2, 1]

/** Spaces no Taoist faces, near haunted lines, on fuller boards. */
function nastiestSpace(s: GameState, options: GhostRef[]): GhostRef {
  const score = (r: GhostRef) => {
    let v = s.boards[r.board].spaces.filter(Boolean).length * 1.5
    if (s.boards[r.board].buddhas[r.space]) v -= 20
    const faced = COLORS.some((c) => {
      const t = s.taoists[c]
      return t.alive && !t.underground && t.tile != null && facedSpaces(t.tile).some((x) => refKey(x) === refKey(r))
    })
    if (!faced) v += 2
    v += lineOf(r).filter((t) => s.village[t]!.haunted).length
    return v
  }
  return [...options].sort((a, b) => score(b) - score(a))[0]!
}

export function answerWuFeng(s: GameState, p: Prompt): Response {
  const bs = s.blackSecret!
  switch (p.kind) {
    case 'wuFengGhost': {
      // Mostly put ghosts in the village; spend a card on a demon or a curse now and then.
      const card = getCard(p.card)
      const roll = aiRandom(s.rng ^ (s.turn * 131) ^ s.deck.length)()
      const curses = throwableCurses(s, card.color).sort((a, b) => LEVEL_PRIORITY.indexOf(a.level) - LEVEL_PRIORITY.indexOf(b.level))
      const demons = summonableDemons(s, p.card)
      const out = bs.demons.filter((d) => d.space !== null).length
      const options = placementOptions(s, p.card)
      const curse = (t: (typeof curses)[number]) => ({ kind: 'wuFengGhost' as const, choice: { kind: 'curse' as const, token: t.id, slot: openSlots(s, t.level)[0]! } })
      const top = curses[0]
      if (top && (top.level >= 3 || (top.level === 2 && roll < 0.4) || (top.level === 1 && roll < 0.18) || options.length === 0)) return curse(top)
      if (demons.length && out < 2 && roll > 0.75) {
        const demon = demons.sort((a, b) => bs.demons.find((d) => d.id === b)!.cost - bs.demons.find((d) => d.id === a)!.cost)[0]!
        return { kind: 'wuFengGhost', choice: { kind: 'summon', demon, entrance: CATACOMB_SIDES[s.config.blackSecret!.side].entrances[0] } }
      }
      return { kind: 'wuFengGhost', choice: { kind: 'place', ref: options.length ? nastiestSpace(s, options) : { board: s.active, space: 0 } } }
    }
    case 'wuFengIncarnation': {
      const card = bs.incarnationHand[0]!
      const options = placementOptions(s, card)
      return { kind: 'wuFengIncarnation', card, ref: options.length ? nastiestSpace(s, options) : { board: s.active, space: 0 } }
    }
    case 'wuFengDemon': {
      const d = bs.demons.find((x) => x.id === p.demon)!
      const here = d.space!
      const taoistHere = livingTaoists(s).some((t) => t.underground && t.tile === here)
      if (!taoistHere && bs.catacombs[here]!.length > 0) return { kind: 'wuFengDemon', choice: { kind: 'search' } }
      const next = adjacentTiles(here)
        .filter((x) => !livingTaoists(s).some((t) => t.underground && t.tile === x))
        .sort((a, b) => bs.catacombs[b]!.length - bs.catacombs[a]!.length)[0]
      if (next !== undefined && isAdjacent(here, next)) return { kind: 'wuFengDemon', choice: { kind: 'move', to: next } }
      return { kind: 'wuFengDemon', choice: { kind: 'pass' } }
    }
    case 'wuFengShadow': {
      const sh = bs.shadow!
      const present = livingTaoists(s).filter((t) => t.tile === sh.tile && t.underground === (sh.where === 'catacombs'))
      if (present.length) return { kind: 'wuFengShadow', choice: { kind: 'attackTaoists' } }
      if (sh.where === 'village' && !s.village[sh.tile]!.haunted) return { kind: 'wuFengShadow', choice: { kind: 'attackTile' } }
      const target = livingTaoists(s).sort((a, b) => a.qi - b.qi)[0]
      if (target?.tile != null) return { kind: 'wuFengShadow', choice: { kind: 'move', where: target.underground ? 'catacombs' : 'village', tile: target.tile } }
      return { kind: 'wuFengShadow', choice: { kind: 'pass' } }
    }
    case 'shadowAttack': {
      const weakest = [...p.options].sort((a, b) => s.taoists[a].qi - s.taoists[b].qi)[0]!
      return { kind: 'shadowAttack', taoists: Array.from({ length: p.hits }, () => weakest) }
    }
    case 'wuFengSkeleton':
      return { kind: 'wuFengSkeleton', ref: nastiestSpace(s, p.options) }
    case 'wuFengFreeCurse': {
      const c = throwableCurses(s, 'any').sort((a, b) => b.level - a.level)[0]
      return { kind: 'wuFengFreeCurse', token: c ? c.id : null, slot: c ? openSlots(s, c.level)[0]! : 0 }
    }
    case 'wuFengCurseTarget': {
      // Prefer tiles the Taoists rely on, or where they stand.
      const busy = p.options.find((t) => livingTaoists(s).some((x) => x.tile === t)) ?? p.options[0]!
      return { kind: 'wuFengCurseTarget', tile: busy }
    }
    default:
      throw new Error(`AI: no Wu-Feng answer for ${p.kind}`)
  }
}

export const _ = { ghostAt, Color: null as unknown as Color }
