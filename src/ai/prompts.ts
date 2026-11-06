// Heuristic answers to every prompt a Taoist (or the players collectively) can get.

import type { Response } from '@/game/actions'
import { bestCommit } from '@/game/exorcism'
import { facedSpaces, refKey } from '@/game/geometry'
import { isSkeleton, getCard } from '@/game/catalogue'
import { ghostAt, heldColors, livingTaoists, taoCount, cardAt } from '@/game/rules'
import { barrierTargets, suLingOptions } from '@/game/whiteMoon'
import type { Color, DieFace, GameState, GhostRef, Prompt, TaoColor } from '@/game/types'
import { COLORS, TAO_COLORS } from '@/game/types'
import { allThreats, neededColors } from './eval'

export function answerPrompt(s: GameState, p: Prompt): Response {
  switch (p.kind) {
    case 'placeGhost':
      return { kind: 'placeGhost', ref: bestPlacement(s, p.card, p.options) }
    case 'curseReroll':
      return { kind: 'curseReroll', reroll: p.face !== 'blank' && !(p.face === 'loseTao' && taoCount(s.taoists[p.owner as Color]) === 0) }
    case 'qiPayer':
      return { kind: 'qiPayer', taoist: [...p.options].sort((a, b) => s.taoists[b].qi - s.taoists[a].qi)[0]! }
    case 'discardTao': {
      const t = s.taoists[p.taoist]
      const order = neededColors(s).slice().reverse()
      const colors: TaoColor[] = []
      const left = { ...t.tao }
      while (colors.length < p.count) {
        const c = order.find((x) => left[x] > 0) ?? heldColors(t)[0]!
        colors.push(c)
        left[c]--
      }
      return { kind: 'discardTao', colors }
    }
    case 'gainTao': {
      const colors: TaoColor[] = []
      const supply = { ...s.taoSupply }
      const order = neededColors(s)
      while (colors.length < p.count) {
        const c = order.find((x) => supply[x] > 0) ?? TAO_COLORS.find((x) => supply[x] > 0)!
        colors.push(c)
        supply[c]--
      }
      return { kind: 'gainTao', colors }
    }
    case 'qiOrYinYang':
      return { kind: 'qiOrYinYang', choice: s.taoists[p.taoist].qi <= 2 ? 'qi' : 'yinYang' }
    case 'incarnationReward': {
      const living = livingTaoists(s)
      const qi = [...living].sort((a, b) => a.qi - b.qi)[0]!.color
      const yy = living.find((t) => !t.yinYang)?.color ?? null
      return { kind: 'incarnationReward', qi, yinYang: yy }
    }
    case 'bonecrackerPayer':
      return { kind: 'bonecrackerPayer', taoist: [...p.options].sort((a, b) => taoCount(s.taoists[b]) - taoCount(s.taoists[a]))[0]! }
    case 'exorcism': {
      const best = bestCommit(s, p.roll)
      if (best.exorcise.length + best.demons.length === 0 && p.roll.canReroll) {
        const keep = usefulFaces(s, p.roll.targets)
        const dice = p.roll.dice.map((d, i) => (keep(d) ? -1 : i)).filter((i) => i >= 0)
        if (dice.length) return { kind: 'reroll', dice }
      }
      return { kind: 'commit', spend: best.plan.spend, crystals: best.plan.crystals, exorcise: best.exorcise, demons: best.demons as never[] }
    }
    case 'herbalist': {
      if (p.canReroll) {
        const bad = p.dice.map((d, i) => (d === 'black' && neededColors(s)[0] !== 'black' ? i : -1)).filter((i) => i >= 0)
        if (bad.length) return { kind: 'reroll', dice: bad }
      }
      const whites = p.dice.filter((d) => d === 'white').length
      const order = neededColors(s)
      return { kind: 'herbalistTake', white: s.whiteMoon ? [] : Array.from({ length: whites }, (_, i) => order[i % order.length]!) }
    }
    case 'devour': {
      // Kill where it hurts least: a stack whose top villager's family is already broken.
      return { kind: 'devour', tile: p.options[0]! }
    }
    case 'suLing': {
      const opts = suLingOptions(s)
      const best = allThreats(s).find((g) => !g.card.incarnation && opts.some((o) => refKey(o) === refKey(g.ref)) && g.card.center.length > 0)
      return { kind: 'suLing', ref: best ? best.ref : null }
    }
    case 'suLingCrystal':
      return { kind: 'suLingCrystal', take: true }
    case 'inherit': {
      const t = [...p.options].sort((a, b) => s.taoists[b].qi - s.taoists[a].qi)[0]!
      return { kind: 'inherit', taoist: t }
    }
    case 'restoreTile':
      return { kind: 'restoreTile', tile: p.options[0]! }
    case 'barrier': {
      if (barrierTargets(s, p.board).length > 0) return { kind: 'barrier', choice: 'roll' }
      const wm = s.whiteMoon!
      if ((wm.barrier?.crystals ?? 0) > 0 && s.village.some((t) => t.villagers.length > 0)) {
        const portal = s.village.some((t) => t.portal && t.villagers.length > 0)
        const tile = portal ? undefined : [...s.village].sort((x, y) => y.villagers.length - x.villagers.length)[0]!.idx
        return { kind: 'barrier', choice: 'save', tile }
      }
      return { kind: 'barrier', choice: 'pass' }
    }
    case 'mantraQi': {
      const bs = s.blackSecret!
      if (p.mode === 'activate') return { kind: 'mantraQi', mantra: p.options[0]! }
      // Fill the mantra closest to resolving.
      const i = [...p.options].sort((a, b) => bs.mantras[a]!.level - bs.mantras[a]!.qi - (bs.mantras[b]!.level - bs.mantras[b]!.qi))[0]!
      return { kind: 'mantraQi', mantra: i }
    }
    case 'mantraTarget':
      return { kind: 'mantraTarget', target: p.options[0]! }
    default:
      throw new Error(`AI: no Taoist answer for ${p.kind}`)
  }
}

function usefulFaces(s: GameState, targets: GhostRef[]): (d: DieFace) => boolean {
  const colors = new Set<string>()
  for (const r of targets) {
    const c = cardAt(s, r)
    if (c) for (const k of Object.keys(c.resistance)) colors.add(k)
  }
  return (d) => d === 'white' || colors.has(d)
}

/** Put a drawn ghost where it hurts least: on a Buddha, else where a Taoist already faces it. */
export function bestPlacement(s: GameState, card: string, options: GhostRef[]): GhostRef {
  const def = getCard(card)
  const score = (r: GhostRef) => {
    let v = 0
    if (s.boards[r.board].buddhas[r.space] && !def.incarnation && !isSkeleton(card)) v += 10
    const faced = COLORS.some((c) => {
      const t = s.taoists[c]
      return t.alive && !t.underground && t.tile != null && facedSpaces(t.tile).some((x) => refKey(x) === refKey(r))
    })
    if (faced) v += 2
    v -= s.boards[r.board].spaces.filter(Boolean).length
    if (ghostAt(s, r)) v -= 100
    return v
  }
  return [...options].sort((a, b) => score(b) - score(a))[0]!
}
