// Answers to prompts. Each handler checks the answer against the open prompt,
// closes it, and applies the choice (effects then resume in engine.run).

import type { Response } from './actions'
import { getCard } from './catalogue'
import { commitExorcism, rerollDice } from './exorcism'
import { refKey } from './geometry'
import { CURSE_TEXT, ev, gainQi, loseQi, now, placeCard, returnTao, rollCurse, takeTao } from './ops'
import { COLOR_NAME, seatName } from './rules'
import { respondHerbalist } from './tiles'
import type { Color, GameState, Seat, TaoColor } from './types'
import { TAO_COLORS } from './types'
import { wmRespond } from './whiteMoon'
import { bsRespond } from './blackSecret'

export function applyResponse(s: GameState, by: Seat, r: Response): void {
  const p = s.prompt
  if (!p) throw new Error('Nothing is waiting for an answer.')
  if (p.owner !== by) throw new Error(`${seatName(p.owner)} must answer this.`)

  switch (p.kind) {
    case 'placeGhost': {
      if (r.kind !== 'placeGhost') break
      if (!p.options.some((o) => refKey(o) === refKey(r.ref))) {
        throw new Error('That space breaks the placement rules (own colour board first; black on the active board).')
      }
      s.prompt = null
      placeCard(s, p.card, r.ref)
      return
    }

    case 'curseReroll': {
      if (r.kind !== 'curseReroll') break
      s.prompt = null
      if (r.reroll) {
        const head = s.queue[0]
        if (!head || head.k !== 'curseFace') throw new Error('engine: curse reroll without a pending face')
        const face = rollCurse(s)
        head.face = face
        ev(s, 'curse', `The Gods' Favorite: ${seatName(by)} rerolls the curse die: ${CURSE_TEXT[face]}.`, { curse: face, color: by as Color })
      }
      return
    }

    case 'qiPayer': {
      if (r.kind !== 'qiPayer') break
      if (!p.options.includes(r.taoist)) throw new Error('That Taoist cannot take the Qi loss.')
      s.prompt = null
      ev(s, 'note', `${COLOR_NAME[r.taoist]} takes the Qi loss for the ${p.board} board.`)
      loseQi(s, r.taoist, p.why)
      return
    }

    case 'discardTao': {
      if (r.kind !== 'discardTao') break
      const t = s.taoists[p.taoist]
      checkCount(r.colors, p.count)
      const need = tally(r.colors)
      for (const c of TAO_COLORS) if (need[c] > t.tao[c]) throw new Error(`You don't have ${need[c]} ${c} Tao.`)
      s.prompt = null
      for (const c of r.colors) returnTao(s, p.taoist, c)
      ev(s, 'tao', `${COLOR_NAME[p.taoist]} discards ${r.colors.join(', ')} (${p.why}).`, { color: p.taoist })
      return
    }

    case 'gainTao': {
      if (r.kind !== 'gainTao') break
      checkCount(r.colors, p.count)
      const need = tally(r.colors)
      for (const c of TAO_COLORS) if (need[c] > s.taoSupply[c]) throw new Error(`The supply has only ${s.taoSupply[c]} ${c} Tao.`)
      s.prompt = null
      for (const c of r.colors) takeTao(s, p.taoist, c)
      ev(s, 'tao', `${COLOR_NAME[p.taoist]} takes ${r.colors.join(', ')} Tao (${p.why}).`, { color: p.taoist })
      return
    }

    case 'qiOrYinYang': {
      if (r.kind !== 'qiOrYinYang') break
      const t = s.taoists[p.taoist]
      s.prompt = null
      if (r.choice === 'yinYang') {
        if (t.yinYang) throw new Error('You already have your Yin-Yang.')
        t.yinYang = true
        ev(s, 'yinYang', `${COLOR_NAME[p.taoist]} regains their Yin-Yang.`, { color: p.taoist })
      } else gainQi(s, p.taoist, 1, 'reward')
      return
    }

    case 'incarnationReward': {
      if (r.kind !== 'incarnationReward') break
      const living = (c: Color | null) => c == null || s.taoists[c].alive
      if (!living(r.qi) || !living(r.yinYang)) throw new Error('Rewards go to living Taoists.')
      const yyEligible = (Object.keys(s.taoists) as Color[]).filter((c) => s.taoists[c].alive && !s.taoists[c].yinYang)
      if (r.qi == null) throw new Error('Choose who receives the Qi.')
      if (r.yinYang != null && s.taoists[r.yinYang].yinYang) throw new Error('That Taoist already has a Yin-Yang.')
      if (r.yinYang == null && yyEligible.length > 0) throw new Error('Choose who receives the Yin-Yang.')
      s.prompt = null
      gainQi(s, r.qi, 1, 'incarnation reward')
      if (r.yinYang) {
        s.taoists[r.yinYang].yinYang = true
        ev(s, 'yinYang', `${COLOR_NAME[r.yinYang]} receives a Yin-Yang token.`, { color: r.yinYang })
      }
      return
    }

    case 'bonecrackerPayer': {
      if (r.kind !== 'bonecrackerPayer') break
      if (!p.options.includes(r.taoist)) throw new Error('That Taoist has no Tao token to discard.')
      s.prompt = null
      now(s, { k: 'loseTao', taoist: r.taoist, count: 1, why: 'Bonecracker' })
      return
    }

    case 'exorcism': {
      if (r.kind === 'reroll') {
        if (!p.roll.canReroll) throw new Error("The Gods' Favorite reroll has been used (or isn't available).")
        if (r.dice.length === 0) throw new Error('Choose dice to reroll.')
        const dice = rerollDice(s, p.roll.dice, r.dice)
        p.roll.dice = dice
        p.roll.canReroll = false
        ev(s, 'roll', `The Gods' Favorite: ${COLOR_NAME[p.roll.actor]} rerolls ${r.dice.length} ${r.dice.length === 1 ? 'die' : 'dice'}.`, {
          color: p.roll.actor,
          dice,
        })
        return
      }
      if (r.kind !== 'commit') break
      const roll = p.roll
      s.prompt = null
      commitExorcism(s, roll, r) // an illegal commit throws, and the whole action is discarded
      if (roll.mode === 'barrier') now(s, { k: 'barrierNext' })
      return
    }

    case 'herbalist':
      return respondHerbalist(s, r)

    default:
      if (s.whiteMoon && wmRespond(s, r)) return
      if (s.blackSecret && bsRespond(s, r)) return
  }
  throw new Error(`That answer doesn't fit the question (${p.kind}).`)
}

function tally(colors: TaoColor[]): Record<TaoColor, number> {
  const v: Record<TaoColor, number> = { red: 0, blue: 0, green: 0, yellow: 0, black: 0 }
  for (const c of colors) {
    if (!(c in v)) throw new Error(`Not a Tao colour: ${c}`)
    v[c]++
  }
  return v
}

function checkCount(colors: TaoColor[], n: number): void {
  if (colors.length !== n) throw new Error(`Choose exactly ${n} token${n === 1 ? '' : 's'}.`)
}

export const _unused = getCard
