// Heuristic answers to every prompt a Taoist (or the players collectively) can get.

import type { Response } from '@/game/actions'
import { applyAction } from '@/game/engine'
import { bestCommit, cheapestSpend, type SpendPlan } from '@/game/exorcism'
import { facedSpaces, lineOf, oppositeSpace, refKey } from '@/game/geometry'
import { isSkeleton, getCard } from '@/game/catalogue'
import { ghostAt, hauntedCount, heldColors, livingTaoists, taoCount, cardAt, whiteIsWild } from '@/game/rules'
import { barrierTargets, suLingOptions } from '@/game/whiteMoon'
import type { Color, DieFace, ExorcismRoll, GameState, GhostRef, Prompt, TaoColor } from '@/game/types'
import { COLORS, TAO_COLORS } from '@/game/types'
import { allThreats, neededColors } from './eval'
import { W } from './tuning'
import { crowdCost } from './value'
import { removalValue, rightStoneValue } from './policy'

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
    case 'exorcism':
      return answerExorcism(s, p.roll)
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
  const wild = whiteIsWild(s)
  return (d) => (d === 'white' ? wild : colors.has(d))
}

/** Put a drawn ghost where it hurts least: on a Buddha, away from key tiles and crowded boards, in front of a Taoist. */
export function bestPlacement(s: GameState, card: string, options: GhostRef[]): GhostRef {
  const def = getCard(card)
  const skeleton = isSkeleton(card)
  const hauntsOnArrival = def.left.some((a) => a.kind === 'hauntTile')
  const haunter = def.center.some((a) => a.kind === 'haunter')
  const losesQi = def.left.some((a) => a.kind === 'loseQi' && !a.group)
  const score = (r: GhostRef) => {
    if (ghostAt(s, r)) return -1000
    const b = s.boards[r.board]
    const buddha = b.buddhas[r.space]
    let v = 0
    if (buddha) {
      if (!def.incarnation) return 100 // destroyed on arrival, its abilities never apply
      v += def.incarnation === 'uncatchable' ? 30 : -W.buddhaOnBoard
    }
    const n = b.spaces.filter(Boolean).length
    v -= crowdCost(n + 1) - crowdCost(n)
    const front = lineOf(r).find((t) => !s.village[t]!.haunted)
    const frontCost = front === undefined ? 0 : W.tileHaunted[s.village[front]!.kind] ?? 0
    if (hauntsOnArrival) v -= frontCost
    if (haunter) v -= 0.4 * frontCost + (front === undefined ? -3 : 0)
    if (losesQi && !s.taoists[r.board].alive) v -= b.neutral && !b.possessed && b.qi > 1 ? 2 : 6
    else if (losesQi) v -= s.taoists[r.board].qi <= 1 ? 40 : 3 / s.taoists[r.board].qi
    if (def.incarnation === 'howlingNightmare' && ghostAt(s, oppositeSpace(r))) v -= 8
    const faced = COLORS.some((c) => {
      const t = s.taoists[c]
      return t.alive && !t.underground && t.tile != null && facedSpaces(t.tile).some((x) => refKey(x) === refKey(r))
    })
    if (faced) v += skeleton ? 1 : 2.5
    return v
  }
  let best = options[0]!
  let bestV = -Infinity
  for (const r of options) {
    const v = score(r)
    if (v > bestV) {
      bestV = v
      best = r
    }
  }
  return best
}

/**
 * An exorcism roll is on the table: reroll (Gods' Favorite) when it falls
 * short, else commit the most valuable coverable set of targets — or nothing,
 * when the only way through costs more Tao than the ghost is worth.
 */
function answerExorcism(s: GameState, roll: ExorcismRoll): Response {
  const best = bestCommit(s, roll)
  const taken = best.exorcise.length + best.demons.length
  const all = roll.targets.length + roll.demons.length
  // Rerolling dice no target can use never hurts: do it unless the dice already do the whole job.
  const short = taken < all || best.plan.spend.length + best.plan.crystals.length > 0
  if (roll.canReroll && (roll.demons.length === 0 ? short : taken === 0)) {
    const keep = usefulFaces(s, roll.targets)
    const dice = roll.dice.map((d, i) => (keep(d) ? -1 : i)).filter((i) => i >= 0)
    if (dice.length) return { kind: 'reroll', dice }
  }
  let choice = best
  if (roll.mode === 'exorcism' && roll.targets.length === 2 && best.exorcise.length === 1 && best.demons.length === 0) {
    // Only one of the two can go: take the more valuable one, if it is affordable.
    const h = hauntedCount(s)
    const other = roll.targets.find((r) => refKey(r) !== refKey(best.exorcise[0]!))!
    const alt = cheapestSpend(s, roll, [other])
    const worth = (r: GhostRef, plan: SpendPlan) => removalValue(s, r, h) + rightStoneValue(s, roll.actor, r) - (plan.spend.length + plan.crystals.length) * W.tao
    if (alt && worth(other, alt) > worth(best.exorcise[0]!, best.plan)) {
      const tryAlt = { kind: 'commit' as const, spend: alt.spend, crystals: alt.crystals, exorcise: [other], demons: [] }
      if (legalResponse(s, roll.actor, tryAlt)) choice = { exorcise: [other], demons: [], plan: alt }
    }
  }
  const commit: Response = { kind: 'commit', spend: choice.plan.spend, crystals: choice.plan.crystals, exorcise: choice.exorcise, demons: choice.demons as never[] }
  if (roll.mode === 'exorcism' && choice.exorcise.length > 0 && choice.plan.spend.length + choice.plan.crystals.length > 0) {
    const h = hauntedCount(s)
    const gain = choice.exorcise.reduce((n, r) => n + removalValue(s, r, h) + rightStoneValue(s, roll.actor, r), 0)
    const cost = (choice.plan.spend.length + choice.plan.crystals.length) * W.tao * W.spend
    if (gain < cost) {
      const none: Response = { kind: 'commit', spend: [], crystals: [], exorcise: [], demons: [] }
      if (legalResponse(s, roll.actor, none)) return none
    }
  }
  return commit
}

function legalResponse(s: GameState, by: Color, r: Response): boolean {
  try {
    applyAction(s, { type: 'respond', by, r })
    return true
  } catch {
    return false
  }
}
