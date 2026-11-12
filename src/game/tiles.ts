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
  isSolo,
  livingTaoists,
  POWER_NAME,
  TILE_NAME,
} from './rules'
import type { Color, DieFace, GameState, GhostRef, TaoColor, TileIdx } from './types'
import { wmCarry, wmHerbalistWhite, wmReviveVillager } from './whiteMoon'
import { bsCalligrapher, bsLevelChange, bsMoveUnderground } from './blackSecret'

export function doTileAction(s: GameState, c: Color, tile: TileIdx, p: HelpParams): void {
  const t = s.taoists[c]
  switch (p.kind) {
    case 'circleOfPrayer': {
      const circle = s.village[tile]!
      if (s.taoSupply[p.color] <= 0) throw new Error(`No ${p.color} Tao token is left in the supply.`)
      if (circle.circleToken) s.taoSupply[circle.circleToken] += 1
      s.taoSupply[p.color] -= 1
      circle.circleToken = p.color
      ev(s, 'circle', `A ${p.color} Tao token is placed on the Circle of Prayer: every ${p.color} ghost has 1 less resistance.`, { color: c, tile })
      return
    }

    case 'buddhistTemple':
      if (s.templeBuddhas <= 0) throw new Error('There is no Buddha left on the Temple.')
      s.templeBuddhas -= 1
      t.buddhas += 1
      if (s.yang && s.active === c) s.yang.newBuddhas += 1
      ev(s, 'buddha', `${COLOR_NAME[c]} takes a Buddha figure (it can be placed from a later turn).`, { color: c })
      return

    case 'cemetery': {
      if (isSolo(s)) throw new Error('In a solo game no aid can be requested from the Cemetery.')
      if ('villager' in p) {
        if (!s.whiteMoon) throw new Error('Villagers are a White Moon component.')
        wmReviveVillager(s, tile, p.villager)
      } else {
        const dead = s.taoists[p.revive]
        if (s.boards[p.revive].neutral || dead.alive) throw new Error('Choose a dead Taoist to bring back.')
        dead.alive = true
        dead.qi = 2
        dead.tile = tile
        dead.underground = false
        s.boards[p.revive].possessed = false
        ev(s, 'revive', `${COLOR_NAME[p.revive]} returns to life on the Cemetery with 2 Qi.`, { color: p.revive, tile })
      }
      // "...then roll the curse die. The Haunting face haunts the Cemetery tile."
      now(s, { k: 'curse', ctx: { roller: c, board: c, haunt: { kind: 'tile', tile }, why: 'the Cemetery' } })
      return
    }

    case 'taoistAltar': {
      const target = s.village[p.tile]
      if (!target?.haunted) throw new Error('Choose a haunted tile to restore.')
      unhaunt(s, p.tile, 'Taoist Altar')
      now(s, { k: 'arrival', why: 'Taoist Altar' })
      return
    }

    case 'herbalistShop': {
      const dice = rollDice(s, 2)
      ev(s, 'roll', `${COLOR_NAME[c]} rolls 2 Tao dice at the Herbalist's Shop.`, { color: c, dice })
      openHerbalist(s, c, dice, hasPower(s, c, 'godsFavorite'))
      return
    }

    case 'sorcerersHut': {
      const g = ghostAt(s, p.ghost)
      if (!g) throw new Error('There is no ghost there.')
      const card = cardOnBoard(g.card, p.ghost.board)
      if (card.incarnation) throw new Error("Incarnations of Wu-Feng aren't affected by the Sorcerer's Hut.")
      if (isSkeleton(g.card)) throw new Error("Skeletons aren't ghost cards: the Sorcerer can't touch them.")
      removeGhost(s, p.ghost)
      ev(s, 'discard', `The Sorcerer banishes ${card.name} (no curse, no reward).`, { color: c, ref: p.ghost })
      loseQi(s, c, "Sorcerer's Hut")
      return
    }

    case 'nightWatchman': {
      const b = s.boards[p.board]
      let n = 0
      for (const g of b.spaces) {
        if (g && g.figure === 'stone') {
          g.figure = 'card'
          n++
        }
      }
      ev(s, 'watchman', `The Night Watchman drives ${n} haunting figure${n === 1 ? '' : 's'} on ${boardName(s, p.board)}'s board back onto the cards.`, {
        color: c,
      })
      return
    }

    case 'pavilion':
      return pavilion(s, c, p)

    case 'teaHouse':
      if (takeTao(s, c, p.color) > 0) ev(s, 'tao', `${COLOR_NAME[c]} takes a ${p.color} Tao token at the Tea House.`, { color: c })
      else if (Object.values(s.taoSupply).some((n) => n > 0)) throw new Error(`No ${p.color} Tao token is left in the supply: choose another colour.`)
      else ev(s, 'note', 'The Tao supply is empty: no token at the Tea House.')
      gainQi(s, c, 1, 'Tea House')
      now(s, { k: 'arrival', why: 'Tea House' })
      return

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
  if (ghostAt(s, p.to)) throw new Error('The ghost must go to a free space.')
  const solo = isSolo(s)
  const movable = solo ? [c] : livingTaoists(s).filter((x) => x.color !== c && x.tile != null).map((x) => x.color)
  // Validate the Taoist move before changing anything.
  if (p.taoist == null) {
    if (movable.length > 0 && !solo) throw new Error('The Pavilion also moves another Taoist one space.')
  } else {
    if (!movable.includes(p.taoist)) throw new Error(solo ? 'Solo: the Pavilion moves your own Taoist.' : 'Move another living Taoist.')
    const o = s.taoists[p.taoist]
    if (p.taoistTo == null) throw new Error('Choose where that Taoist goes.')
    if (!o.underground && !isAdjacent(o.tile!, p.taoistTo)) throw new Error('A normal move is to an adjacent tile.')
  }
  moveGhost(s, p.ghost, p.to)
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
    ev(s, 'move', `The heavenly wind carries ${COLOR_NAME[p.taoist]} to the ${TILE_NAME[s.village[p.taoistTo]!.kind]}.`, { color: p.taoist })
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
