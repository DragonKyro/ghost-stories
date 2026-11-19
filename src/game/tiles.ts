// Village tile actions ("request help from a villager"), from the rules
// summary's Village Tiles reference. Also run through the Yin-Yang power.

import type { HelpParams, Response } from './actions'
import { cardOnBoard, isSkeleton } from './catalogue'
import { isAdjacent, sameRef } from './geometry'
import { openRoll } from './exorcism'
import { ask, ev, gainQi, loseQi, moveGhost, now, removeGhost, rollDice, takeTao, unhaunt } from './ops'
import {
  boardName,
  COLOR_NAME,
  exorcismDice,
  ghostAt,
  ghostsInPlay,
  hasPower,
  isBastion,
  isSolo,
  livingTaoists,
  POWER_NAME,
  tileName,
} from './rules'
import type { Color, DieFace, GameState, GhostRef, TaoColor, TileIdx, TileKind } from './types'
import { COLORS, TAO_COLORS } from './types'
import { wmCarry, wmHerbalistWhite, wmReviveVillager } from './whiteMoon'
import { bsCalligrapher, bsLevelChange, bsMoveUnderground } from './blackSecret'

/**
 * Last Bastion: these tiles keep a figure in their icon zone (the Standard,
 * the Trap, the Net). While the tile is in the Grasp of Evil the figure waits
 * in the reserve, so even a Call to Arms finds nothing to use there.
 */
const ICON_FIGURE: Partial<Record<TileKind, string>> = { circleOfPrayer: 'Standard', buddhistTemple: 'Trap', taoistAltar: 'Net' }

/** Why a Bastion tile in the Grasp of Evil can't be activated even by a Call to Arms (null = it can). */
export function graspedFigureProblem(s: GameState, tile: TileIdx): string | null {
  const v = s.village[tile]!
  const figure = ICON_FIGURE[v.kind]
  if (!isBastion(s) || !v.haunted || !figure) return null
  // The Trap / Net already out on the board stays in play ("only placed in the reserve at the end of its use").
  if (v.kind === 'buddhistTemple' && s.templeBuddhas <= 0) return null
  return `The ${figure} figure is in the reserve while the ${tileName(s, v.kind)} is in the Grasp of Evil.`
}

export function doTileAction(s: GameState, c: Color, tile: TileIdx, p: HelpParams): void {
  const t = s.taoists[c]
  const bastion = isBastion(s)
  const grasped = graspedFigureProblem(s, tile)
  if (grasped) throw new Error(grasped)
  switch (p.kind) {
    case 'circleOfPrayer': {
      const circle = s.village[tile]!
      if (bastion) {
        // Last Bastion's 5 Standard tokens are their own set (not Equipment).
        circle.circleToken = p.color
      } else {
        if (s.taoSupply[p.color] <= 0) throw new Error(`No ${p.color} token is left in the supply.`)
        if (circle.circleToken) s.taoSupply[circle.circleToken] += 1
        s.taoSupply[p.color] -= 1
        circle.circleToken = p.color
      }
      ev(s, 'circle', `A ${p.color} token is placed on the ${tileName(s, 'circleOfPrayer')}: every ${p.color} ${bastion ? 'Monster and Warlord' : 'ghost'} has 1 less resistance.`, {
        color: c,
        tile,
      })
      return
    }

    case 'buddhistTemple':
      if (s.templeBuddhas <= 0) throw new Error(bastion ? 'The Trap is already on a Horde board.' : 'There is no Buddha left on the Temple.')
      // Last Bastion: the Dwarven Quarry places the Trap at once, on a free space of your Horde board.
      if (bastion && !p.space) throw new Error('Choose a free space of your Horde board for the Trap.')
      if (bastion && p.space) {
        if (p.space.board !== c) throw new Error('The Trap can only be placed on your own Horde board.')
        if (ghostAt(s, p.space) || s.boards[c].buddhas[p.space.space]) throw new Error('Place the Trap on a free space of your Horde board.')
        s.templeBuddhas -= 1
        s.boards[c].buddhas[p.space.space] = true
        ev(s, 'buddha', `${COLOR_NAME[c]} places the Trap on ${boardName(s, c)} space ${p.space.space + 1}.`, { color: c, ref: p.space })
        return
      }
      s.templeBuddhas -= 1
      t.buddhas += 1
      if (!bastion && s.yang && s.active === c) s.yang.newBuddhas += 1
      ev(s, 'buddha', bastion ? `${COLOR_NAME[c]} takes the Trap figure from the Dwarven Quarry.` : `${COLOR_NAME[c]} takes a Buddha figure (it can be placed from a later turn).`, {
        color: c,
      })
      return

    case 'cemetery': {
      if ('color' in p && p.color) {
        if (!bastion) throw new Error('The Cemetery only revives dead Taoists or villagers.')
        const recipient = p.to ?? c
        if (!s.taoists[recipient].alive) throw new Error('Choose a living Hero to receive the Equipment token.')
        if (takeTao(s, recipient, p.color) <= 0) throw new Error(`No ${p.color} Equipment token is left in the reserve.`)
        ev(s, 'tao', `Dispensary: ${COLOR_NAME[recipient]} receives a ${p.color} Equipment token from the reserve.`, { color: recipient, tile })
        return
      }
      if (isSolo(s) && !bastion) throw new Error('In a solo game no aid can be requested from the Cemetery.')
      if ('villager' in p) {
        if (!s.whiteMoon) throw new Error('Villagers are a White Moon component.')
        wmReviveVillager(s, tile, p.villager)
      } else if ('revive' in p) {
        const dead = s.taoists[p.revive]
        if (s.boards[p.revive].neutral || dead.alive) throw new Error(`Choose a ${bastion ? 'taken-out Hero' : 'dead Taoist'} to bring back.`)
        if (bastion && dead.deadForever) throw new Error(`${COLOR_NAME[p.revive]} lost all Life tokens a second time and is dead for good.`)
        dead.alive = true
        dead.qi = bastion ? 3 : 2
        if (bastion) {
          dead.wounded = true
          dead.yinYang = true
        }
        dead.tile = tile
        dead.underground = false
        s.boards[p.revive].possessed = false
        ev(
          s,
          'revive',
          bastion
            ? `${COLOR_NAME[p.revive]} returns to play wounded on the Dispensary with 3 Life tokens and a Call to Arms (Hero power lost).`
            : `${COLOR_NAME[p.revive]} returns to life on the Cemetery with 2 Qi.`,
          { color: p.revive, tile },
        )
      }
      if (!bastion) {
        // "...then roll the curse die. The Haunting face haunts the Cemetery tile."
        now(s, { k: 'curse', ctx: { roller: c, board: c, haunt: { kind: 'tile', tile }, why: 'the Cemetery' } })
      }
      return
    }

    case 'taoistAltar': {
      if (bastion && p.ghost) {
        const g = ghostAt(s, p.ghost)
        if (!g) throw new Error('There is no Monster there.')
        const card = cardOnBoard(g.card, p.ghost.board)
        if (card.incarnation) throw new Error('The Trebuchet cannot target a Warlord.')
        for (const b of COLORS) for (const sp of s.boards[b].spaces) if (sp) sp.net = false
        g.net = true
        ev(s, 'help', `Trebuchet: the Net figure is placed on ${card.name}, cancelling its abilities.`, { color: c, ref: p.ghost })
        return
      }
      if (bastion) throw new Error('Choose a Monster card for the Net.')
      if (p.tile == null) throw new Error('Choose a haunted tile to restore.')
      const target = s.village[p.tile]
      if (!target?.haunted) throw new Error('Choose a haunted tile to restore.')
      unhaunt(s, p.tile, tileName(s, 'taoistAltar'))
      if (!bastion) now(s, { k: 'arrival', why: 'Taoist Altar' })
      return
    }

    case 'herbalistShop': {
      const dice = rollDice(s, 2)
      ev(s, 'roll', `${COLOR_NAME[c]} rolls 2 Tao dice at the ${tileName(s, 'herbalistShop')}.`, { color: c, dice })
      openHerbalist(s, c, dice, hasPower(s, c, 'godsFavorite'))
      return
    }

    case 'sorcerersHut': {
      const g = ghostAt(s, p.ghost)
      if (!g) throw new Error('There is no ghost there.')
      const card = cardOnBoard(g.card, p.ghost.board)
      if (card.incarnation) throw new Error(`${bastion ? 'Warlords' : 'Incarnations of Wu-Feng'} aren't affected by the ${tileName(s, 'sorcerersHut')}.`)
      if (isSkeleton(g.card)) throw new Error("Skeletons aren't ghost cards: the Sorcerer can't touch them.")
      removeGhost(s, p.ghost)
      ev(s, 'discard', `${tileName(s, 'sorcerersHut')} eliminates ${card.name} (no exit effect).`, { color: c, ref: p.ghost })
      loseQi(s, c, tileName(s, 'sorcerersHut'))
      return
    }

    case 'nightWatchman': {
      if (bastion) {
        let left = 2
        for (const tIdx of p.tiles ?? []) {
          if (left <= 0) break
          if (s.village[tIdx]?.haunted) {
            unhaunt(s, tIdx, 'Divine Fountain')
            left--
          }
        }
        for (const ref of p.ghosts ?? []) {
          if (left <= 0) break
          const g = ghostAt(s, ref)
          if (g && g.figure === 'stone') {
            g.figure = 'card'
            left--
          }
        }
        if (p.board) {
          for (const g of s.boards[p.board].spaces) {
            if (left <= 0) break
            if (g && g.figure === 'stone') {
              g.figure = 'card'
              left--
            }
          }
          for (const v of s.village) {
            if (left <= 0) break
            if (v.haunted) {
              unhaunt(s, v.idx, 'Divine Fountain')
              left--
            }
          }
        }
        ev(s, 'watchman', `Divine Fountain: ${COLOR_NAME[c]} removes ${2 - left} Grasp of Evil figure${2 - left === 1 ? '' : 's'}.`, { color: c })
        return
      }
      const b = s.boards[p.board!]
      let n = 0
      for (const g of b.spaces) {
        if (g && g.figure === 'stone') {
          g.figure = 'card'
          n++
        }
      }
      ev(s, 'watchman', `The Night Watchman drives ${n} haunting figure${n === 1 ? '' : 's'} on ${boardName(s, p.board!)}'s board back onto the cards.`, {
        color: c,
      })
      return
    }

    case 'pavilion':
      return pavilion(s, c, p)

    case 'teaHouse': {
      if (bastion) {
        const hero = p.taoist ?? c
        if (!s.taoists[hero].alive) throw new Error('Choose a living Hero.')
        gainQi(s, hero, 1, 'Tavern')
        if (p.to != null) {
          const h = s.taoists[hero]
          if (h.immobilized) {
            h.immobilized = false
            ev(s, 'move', `Tavern: ${COLOR_NAME[hero]} stands back up.`, { color: hero })
          } else if (p.to !== h.tile) {
            if (!isAdjacent(h.tile!, p.to)) throw new Error('Tavern moves the Hero to an adjacent tile.')
            h.tile = p.to
            ev(s, 'move', `Tavern: ${COLOR_NAME[hero]} moves to the ${tileName(s, s.village[p.to]!.kind)}.`, { color: hero, tile: p.to })
          }
        }
        return
      }
      const color = p.color ?? TAO_COLORS.find((x) => s.taoSupply[x] > 0) ?? 'red'
      if (takeTao(s, c, color) > 0) ev(s, 'tao', `${COLOR_NAME[c]} takes a ${color} Tao token at the Tea House.`, { color: c })
      else if (Object.values(s.taoSupply).some((n) => n > 0)) throw new Error(`No ${color} Tao token is left in the supply: choose another colour.`)
      else ev(s, 'note', 'The Tao supply is empty: no token at the Tea House.')
      gainQi(s, c, 1, 'Tea House')
      now(s, { k: 'arrival', why: 'Tea House' })
      return
    }

    case 'kungFuSchool':
      return kungFu(s, c, p.scope)

    case 'calligrapher':
      if (!s.blackSecret) throw new Error('The Calligrapher is a Black Secret tile.')
      return bsCalligrapher(s, c, p.swap, p.placeQi)
  }
}

// ---------------------------------------------------------------------------
// Herbalist's Shop
// ---------------------------------------------------------------------------

function openHerbalist(s: GameState, c: Color, dice: DieFace[], canReroll: boolean): void {
  const whiteChoice = !s.whiteMoon && dice.includes('white')
  if (!canReroll && !whiteChoice) return herbalistTake(s, c, dice, [])
  ask(s, { kind: 'herbalist', owner: c, taoist: c, dice, canReroll })
}

export function respondHerbalist(s: GameState, r: Response): void {
  const p = s.prompt
  if (!p || p.kind !== 'herbalist') throw new Error('No Herbalist roll is waiting.')
  if (r.kind === 'reroll') {
    if (!p.canReroll) throw new Error("The Gods' Favorite reroll is already used.")
    const dice = p.dice.slice()
    for (const i of new Set(r.dice)) {
      if (i < 0 || i >= dice.length) throw new Error('No such die.')
      dice[i] = rollDice(s, 1)[0]!
    }
    ev(s, 'roll', `The Gods' Favorite: ${COLOR_NAME[p.taoist]} rerolls.`, { color: p.taoist, dice })
    s.prompt = null
    openHerbalist(s, p.taoist, dice, false)
    return
  }
  if (r.kind !== 'herbalistTake') throw new Error('Take the tokens or reroll.')
  s.prompt = null
  herbalistTake(s, p.taoist, p.dice, r.white)
}

/** "Take Tao tokens of the corresponding colours (limited by the supply). Each white face: your choice of colour." */
function herbalistTake(s: GameState, c: Color, dice: DieFace[], white: TaoColor[]): void {
  const whites = dice.filter((d) => d === 'white').length
  if (!s.whiteMoon && white.length !== whites) throw new Error(`Choose a colour for each white face (${whites}).`)
  const got: string[] = []
  let w = 0
  for (const face of dice) {
    if (face === 'white') {
      if (s.whiteMoon) {
        if (wmHerbalistWhite(s, c)) got.push('a moon crystal')
        continue
      }
      const color = white[w++]!
      if (takeTao(s, c, color)) got.push(color)
      continue
    }
    if (takeTao(s, c, face)) got.push(face)
  }
  ev(s, 'tao', `${COLOR_NAME[c]} takes ${got.length ? got.join(', ') : 'nothing (the supply is out)'}.`, { color: c })
}

// ---------------------------------------------------------------------------
// Pavilion of the Heavenly Wind
// ---------------------------------------------------------------------------

function pavilion(s: GameState, c: Color, p: Extract<HelpParams, { kind: 'pavilion' }>): void {
  const g = ghostAt(s, p.ghost)
  if (!g) throw new Error('Choose a ghost to move.')
  if (isSkeleton(g.card)) throw new Error("Skeletons aren't ghost cards: the wind can't move them.")
  if (sameRef(p.ghost, p.to)) throw new Error('Move the ghost to another space.')
  const bastion = isBastion(s)
  const destGhost = ghostAt(s, p.to)
  if (destGhost && !bastion) throw new Error('The ghost must go to a free space.')
  if (bastion && destGhost) {
    // Strategist's Tower: swap the positions of 2 Horde cards!
    s.boards[p.ghost.board].spaces[p.ghost.space] = destGhost
    s.boards[p.to.board].spaces[p.to.space] = g
    ev(
      s,
      'moveGhost',
      `Strategist's Tower: ${cardOnBoard(g.card, p.ghost.board).name} and ${cardOnBoard(destGhost.card, p.to.board).name} swap spaces.`,
      { ref: p.to, card: g.card },
    )
    return
  }
  if (bastion && p.taoist != null) throw new Error("The Strategist's Tower moves Horde cards only.")
  const solo = isSolo(s)
  const movable = solo ? [c] : livingTaoists(s).filter((x) => x.color !== c && x.tile != null).map((x) => x.color)
  // Validate the Taoist move before changing anything (Ghost Stories only).
  if (p.taoist == null) {
    if (!bastion && movable.length > 0 && !solo) throw new Error('The Pavilion also moves another Taoist one space.')
  } else {
    if (!movable.includes(p.taoist)) throw new Error(solo ? 'Solo: the Pavilion moves your own Taoist.' : 'Move another living Taoist.')
    const o = s.taoists[p.taoist]
    if (p.taoistTo == null) throw new Error('Choose where that Taoist goes.')
    if (!o.underground && !isAdjacent(o.tile!, p.taoistTo)) throw new Error('A normal move is to an adjacent tile.')
  }
  moveGhost(s, p.ghost, p.to)
  if (bastion && p.ghost2 && p.to2 && !sameRef(p.ghost2, p.to2) && ghostAt(s, p.ghost2) && !ghostAt(s, p.to2)) {
    moveGhost(s, p.ghost2, p.to2)
  }
  if (p.taoist != null && p.taoistTo != null) {
    const o = s.taoists[p.taoist]
    if (o.underground) bsMoveUnderground(s, p.taoist, p.taoistTo, true)
    else {
      if (p.carry) {
        if (!s.whiteMoon) throw new Error('Villagers only move in White Moon.')
        wmCarry(s, p.taoist, o.tile!, p.taoistTo, o.tile!, false)
      }
      o.tile = p.taoistTo
    }
    // Black Secret: "changing levels is possible after a movement due to the Pavilion".
    if (p.climb) bsLevelChange(s, p.taoist)
    ev(s, 'move', `The heavenly wind carries ${COLOR_NAME[p.taoist]} to the ${tileName(s, s.village[p.taoistTo]!.kind)}.`, { color: p.taoist })
  }
}

// ---------------------------------------------------------------------------
// White Moon: Kung-Fu School
// ---------------------------------------------------------------------------

function kungFu(s: GameState, c: Color, scope: Extract<HelpParams, { kind: 'kungFuSchool' }>['scope']): void {
  if (!s.whiteMoon) throw new Error('The Kung-Fu School is a White Moon tile.')
  let color: string
  if (scope === 'ownColor') color = c
  else if (scope === 'black') color = 'black'
  else {
    const b = s.boards[scope.neutralBoard]
    if (!b.neutral || !s.yang?.borrowed.includes(b.power)) {
      throw new Error(`Spend a power token on the neutral ${scope.neutralBoard} board (${POWER_NAME[b.power]}) first.`)
    }
    color = scope.neutralBoard
  }
  const targets: GhostRef[] = ghostsInPlay(s)
    .filter((g) => g.card.color === color && !g.card.incarnation && !isSkeleton(g.ghost.card))
    .map((g) => g.ref)
  if (targets.length === 0) throw new Error(`There is no ${color} ghost for the Kung-Fu School to fight.`)
  const dice = rollDice(s, exorcismDice(s, c))
  ev(s, 'exorcise', `Kung-Fu School: ${COLOR_NAME[c]} takes on every ${color} ghost (${targets.length}).`, { color: c })
  openRoll(s, { mode: 'kungFu', actor: c, targets, demons: [], dice, canReroll: hasPower(s, c, 'godsFavorite'), scope })
}
