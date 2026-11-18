// The Yang phase: the active Taoist's actions, in the rulebook's order.
//
//   1. Move (optional) — adjacent tile, diagonals allowed (anywhere with the
//      Dance of the Spires). "Before your move" powers come first.
//   2. Request help from the villager on your tile OR attempt an exorcism
//      (Heavenly Gust: one of each; Second Wind: two of the same).
//   3. Place a Buddha (optional), obtained on an earlier turn.
// The Yin-Yang power can be used before or after any step.

import type { Action, PowerUse } from './actions'
import { cardOnBoard, isSkeleton } from './catalogue'
import { openRoll } from './exorcism'
import { facedSpaces, isAdjacent, isCorner, refKey, sameRef, tilePlace } from './geometry'
import { ev, now, rollDice, takeTao, unhaunt } from './ops'
import {
  bloodBrotherPower,
  boardPowerActive,
  borrowablePowers,
  boardName,
  COLOR_NAME,
  combatSpacesFor,
  exorcismBlocker,
  exorcismDice,
  ghostAt,
  hasPower,
  isBastion,
  powerName,
  POWER_NAME,
  shadowOnTile,
  tileName,
  TILE_NAME,
} from './rules'
import { doTileAction } from './tiles'
import type { Color, GameState, GhostRef } from './types'
import { CENTER_TILE } from './types'
import { wmCarry, wmPlaceCrystal, wmSaveVillager, wmUseArtifact } from './whiteMoon'
import { bsClimb, bsExorciseDemons, bsLevelChange, bsMoveUnderground } from './blackSecret'

type YangAction = Exclude<Action, { type: 'respond' }>

export function applyYang(s: GameState, a: YangAction): void {
  if (s.phase !== 'yang' || !s.yang) throw new Error("It isn't a Taoist's Yang phase.")
  if (s.prompt) throw new Error('Answer the open question first.')
  if (a.by !== s.active) throw new Error(`It is ${COLOR_NAME[s.active]}'s turn.`)
  const t = s.taoists[a.by]
  if (!t.alive || t.tile == null) throw new Error('A dead Taoist cannot act.')
  switch (a.type) {
    case 'move':
      return move(s, a.by, a.to, a.carry?.from ?? null)
    case 'climb':
      if (!s.blackSecret) throw new Error('There are no catacombs without Black Secret.')
      return bsClimb(s, a.by)
    case 'power':
      return usePower(s, a.by, a.use)
    case 'powerToken':
      return powerToken(s, a.by, a.board)
    case 'help': {
      const problem = step2Problem(s, 'help')
      if (problem) throw new Error(problem)
      if (t.underground) throw new Error('No villager can help you in the catacombs (the Yin-Yang still works).')
      const tile = s.village[t.tile!]!
      if (tile.haunted) throw new Error(`${tileName(s, tile.kind)} is ${isBastion(s) ? 'in the Grasp of Evil' : 'haunted'}: its action is blocked.`)
      if (tile.kind !== a.params.kind) throw new Error(`You are standing on the ${tileName(s, tile.kind)}.`)
      if (shadowOnTile(s, tile.idx)) throw new Error('The Shadow of Wu-Feng blocks this tile.')
      if (!isBastion(s)) s.yang.moved = true
      s.yang.helps += 1
      ev(s, 'help', `${COLOR_NAME[a.by]} ${isBastion(s) ? `activates the ${tileName(s, tile.kind)}` : `asks the villager of the ${TILE_NAME[tile.kind]} for help`}.`, {
        color: a.by,
        tile: tile.idx,
      })
      return doTileAction(s, a.by, tile.idx, a.params)
    }
    case 'exorcise':
      return exorcise(s, a.by, a.targets, a.demons ?? [])
    case 'saveVillager': {
      const problem = step2Problem(s, 'save')
      if (problem) throw new Error(problem)
      if (!s.whiteMoon) throw new Error('Saving villagers is a White Moon action.')
      wmSaveVillager(s, a.by)
      s.yang.moved = true
      s.yang.saves += 1
      return
    }
    case 'placeBuddha':
      return placeBuddhas(s, a.by, a.spaces)
    case 'placeCrystal':
      if (!s.whiteMoon) throw new Error('Moon crystals are a White Moon component.')
      enterStep3(s)
      return wmPlaceCrystal(s, a.by, a.corner)
    case 'yinYang':
      return yinYang(s, a.by, a.use)
    case 'artifact':
      if (!s.whiteMoon) throw new Error('Artifacts are a White Moon component.')
      return wmUseArtifact(s, a.by, a.artifact, a.tile, a.ghost)
    case 'endTurn':
      return endTurn(s, a.by, a.reclaim ?? 0)
  }
}

// ---------------------------------------------------------------------------
// Step bookkeeping
// ---------------------------------------------------------------------------

/** Why a step-2 action of this kind isn't allowed now (null = allowed). */
export function step2Problem(s: GameState, kind: 'help' | 'exorcise' | 'save'): string | null {
  const y = s.yang
  if (!y) return "It isn't a Yang phase."
  if (y.step3) return 'You have moved on to placing Buddhas: no more help or exorcisms this turn.'
  const c = s.active
  const ex = y.exorcisms + y.demonExorcisms
  const help = y.helps
  const save = y.saves
  if (ex + help + save === 0) return null
  const isEx = kind === 'exorcise'
  if (hasPower(s, c, 'heavenlyGust')) {
    if (isEx && ex === 0) return null
    if (!isEx && help + save === 0) return null
  }
  if (!isBastion(s) && hasPower(s, c, 'secondWind')) {
    if (isEx && help + save === 0 && ex < 2) return null
    if (kind === 'help' && ex === 0 && save === 0 && help < 2) return null
    if (kind === 'save' && ex === 0 && help === 0 && save < 2) return null
  }
  return 'You have already taken your action (help or exorcism) this turn.'
}

/** "Before your move": no move yet and nothing from steps 2–3. */
export function beforeMove(s: GameState): boolean {
  const y = s.yang
  if (!y) return false
  if (isBastion(s)) return !y.moved && !y.step3
  return !y.moved && !y.step3 && y.helps + y.exorcisms + y.saves + y.demonExorcisms === 0
}

function enterStep3(s: GameState): void {
  s.yang!.moved = true
  s.yang!.step3 = true
}

// ---------------------------------------------------------------------------
// Step 1: move
// ---------------------------------------------------------------------------

/** Can the active Taoist (still) move this turn? */
export function canMove(s: GameState): boolean {
  const y = s.yang
  if (!y) return false
  if (isBastion(s)) return !y.moved && !y.step3
  if (beforeMove(s)) return true
  // Black Secret: the Dance of the Peaks "allows you to move twice and change levels after each movement".
  return !!s.blackSecret && hasPower(s, s.active, 'danceOfTheSpires') && y.moves === 1 && y.helps + y.exorcisms + y.saves + y.demonExorcisms === 0 && !y.step3
}

function move(s: GameState, c: Color, to: number, carryFrom: number | null): void {
  const y = s.yang!
  const fly = !isBastion(s) && hasPower(s, c, 'danceOfTheSpires')
  if (!canMove(s)) throw new Error('You can only move once during your turn.')
  const t = s.taoists[c]
  if (isBastion(s) && t.immobilized) {
    t.immobilized = false
    y.moved = true
    y.moves += 1
    ev(s, 'move', `${COLOR_NAME[c]} stands back up on the ${tileName(s, s.village[t.tile!]!.kind)} (replacing their movement).`, { color: c, tile: t.tile! })
    return
  }
  if (t.underground) {
    bsMoveUnderground(s, c, to)
    y.moves += 1
    return
  }
  if (to < 0 || to > 8) throw new Error('No such tile.')
  const from = t.tile!
  // White Moon: with the Dance of the Spires you can go back and forth to fetch a villager.
  const backAndForth = to === from && fly && carryFrom != null && carryFrom !== from
  if (to === from && !backAndForth) throw new Error('You are already there.')
  if (!fly && !isAdjacent(from, to)) throw new Error('Move to an adjacent tile (diagonals allowed).')
  if (carryFrom != null) {
    if (!s.whiteMoon) throw new Error('Villagers only move in White Moon.')
    wmCarry(s, c, from, to, carryFrom, fly)
  }
  t.tile = to
  y.moved = true
  y.moves += 1
  const how = backAndForth ? ' and back' : fly && !isAdjacent(from, to) ? ' (Dance of the Spires)' : ''
  ev(s, 'move', `${COLOR_NAME[c]} ${backAndForth ? 'flies out' : 'moves to the ' + tileName(s, s.village[to]!.kind)}${how}.`, { color: c, tile: to })
}

// ---------------------------------------------------------------------------
// Powers used before the move (or during the Hero phase in Last Bastion), and power tokens
// ---------------------------------------------------------------------------

function usePower(s: GameState, c: Color, use: PowerUse): void {
  const y = s.yang!
  const bastion = isBastion(s)
  if (!bastion && !beforeMove(s)) throw new Error(`${powerName(s, use.power)} is used before your move.`)
  if (!hasPower(s, c, use.power)) throw new Error(`You can't use ${powerName(s, use.power)} now.`)
  if (y.usedPowers.includes(use.power)) throw new Error(`${powerName(s, use.power)} has already been used this turn.`)
  switch (use.power) {
    case 'danceOfTheTwinWinds': {
      if (!bastion && use.taoist === c) throw new Error('Twin Winds moves another Taoist.')
      const o = s.taoists[use.taoist]
      if (!o.alive || o.tile == null) throw new Error('That character cannot be moved.')
      if (bastion && o.immobilized) {
        o.immobilized = false
        ev(s, 'power', `${powerName(s, 'danceOfTheTwinWinds')}: ${COLOR_NAME[use.taoist]} stands back up.`, { color: c })
        break
      }
      if (o.underground) {
        bsMoveUnderground(s, use.taoist, use.to, true)
        if (use.climb) bsLevelChange(s, use.taoist)
      } else {
        if (!isAdjacent(o.tile, use.to)) throw new Error(`${powerName(s, 'danceOfTheTwinWinds')} moves a character 1 space.`)
        if (use.carry) {
          if (!s.whiteMoon) throw new Error('Villagers only move in White Moon.')
          wmCarry(s, use.taoist, o.tile, use.to, o.tile, false)
        }
        o.tile = use.to
        if (use.climb) bsLevelChange(s, use.taoist)
      }
      ev(s, 'power', `${powerName(s, 'danceOfTheTwinWinds')}: ${COLOR_NAME[c]} moves ${COLOR_NAME[use.taoist]} to the ${tileName(s, s.village[use.to]!.kind)}.`, { color: c })
      break
    }
    case 'bottomlessPockets':
      if (takeTao(s, c, use.color) === 0) throw new Error(`No ${use.color} token is left in the supply.`)
      ev(s, 'power', `${powerName(s, 'bottomlessPockets')}: ${COLOR_NAME[c]} takes a ${use.color} ${bastion ? 'Equipment' : 'Tao'} token.`, { color: c })
      break
    case 'enfeeblementMantra': {
      // Black Secret blood brother OR Last Bastion (Mylfaar) can move the placed Mantra / Enchantment.
      const viaBrother = !(s.boards[c].power === 'enfeeblementMantra' && boardPowerActive(s, c)) && bloodBrotherPower(s, c) === 'enfeeblementMantra'
      const moving = s.mantra === 'placed' && (viaBrother || bastion)
      if (s.mantra !== 'ready' && !moving) {
        throw new Error(
          s.mantra === 'placed'
            ? 'The Mantra is on a ghost: it comes back when that ghost leaves play.'
            : s.mantra === 'cooldown'
              ? 'The Mantra came back this turn: it can be used again next turn.'
              : 'The Mantra token has been removed from the game.',
        )
      }
      let name: string
      if (use.demon) {
        const d = s.blackSecret?.demons.find((x) => x.id === use.demon)
        if (!d || d.space === null) throw new Error('That demon is not in the catacombs.')
        if (moving) clearMantra(s)
        d.mantra = true
        name = `the ${use.demon}`
      } else {
        const g = use.ghost ? ghostAt(s, use.ghost) : null
        if (!use.ghost || !g) throw new Error('There is no target there.')
        if (isSkeleton(g.card)) throw new Error('Skeletons are not ghosts: the Mantra goes on a ghost card.')
        if (moving) clearMantra(s)
        g.mantra = true
        name = cardOnBoard(g.card, use.ghost.board).name
      }
      s.mantra = 'placed'
      ev(s, 'power', `${bastion ? "Mylfaar's Enchantment" : 'Enfeeblement Mantra'} ${moving ? 'moved to' : 'on'} ${name}: its resistance drops by 1.`, {
        color: c,
        ref: use.ghost,
      })
      break
    }
    case 'secondWind': {
      if (!bastion) throw new Error('Second Wind is passive in Ghost Stories.')
      if (y.moved) throw new Error('Teagaan must forego his movement to remove a Grasp of Evil figure.')
      if (use.tile != null) {
        const target = s.village[use.tile]
        if (!target?.haunted) throw new Error('That Bastion tile does not have a Grasp of Evil figure.')
        unhaunt(s, use.tile, 'Teagaan')
      } else if (use.ghost) {
        const g = ghostAt(s, use.ghost)
        if (!g || !g.figure) throw new Error('That Horde card does not have a Grasp of Evil figure on it.')
        g.figure = 'card'
        ev(s, 'power', `Teagaan removes the Grasp of Evil figure from ${cardOnBoard(g.card, use.ghost.board).name}.`, { color: c, ref: use.ghost })
      } else {
        throw new Error('Choose a Bastion tile or Horde card with a Grasp of Evil figure.')
      }
      y.moved = true
      break
    }
  }
  y.usedPowers.push(use.power)
}

function clearMantra(s: GameState): void {
  for (const b of Object.values(s.boards)) for (const g of b.spaces) if (g) g.mantra = false
  for (const d of s.blackSecret?.demons ?? []) d.mantra = false
}

function powerToken(s: GameState, c: Color, board: Color): void {
  const t = s.taoists[c]
  if (t.powerTokens <= 0) throw new Error('You have no power token.')
  if (!borrowablePowers(s, c).includes(board)) {
    throw new Error("A power token uses a neutral, unpossessed board's active power — once per power per turn.")
  }
  const power = s.boards[board].power
  t.powerTokens -= 1
  s.centerPowerTokens += 1
  s.yang!.borrowed.push(power)
  ev(s, 'power', `${COLOR_NAME[c]} spends a power token: ${POWER_NAME[power]} (${boardName(s, board)}) this turn. The token goes to the central tile.`, {
    color: c,
  })
}

// ---------------------------------------------------------------------------
// Step 2: exorcism
// ---------------------------------------------------------------------------

function exorcise(s: GameState, c: Color, targets: GhostRef[], demons: string[]): void {
  const problem = step2Problem(s, 'exorcise')
  if (problem) throw new Error(problem)
  const t = s.taoists[c]
  const bastion = isBastion(s)
  if (demons.length > 0 || t.underground) {
    if (targets.length > 0) throw new Error('From the catacombs you can only exorcise demons.')
    s.yang!.moved = true
    s.yang!.demonExorcisms += 1
    return bsExorciseDemons(s, c, demons)
  }
  if (targets.length === 0) throw new Error(bastion ? 'Choose a Monster or Warlord to combat.' : 'Choose a ghost to exorcise.')
  if (targets.length > 2) throw new Error('At most two targets at once.')
  const canTwo = isCorner(t.tile!) || (bastion && hasPower(s, c, 'danceOfTheSpires'))
  if (targets.length === 2 && !canTwo) throw new Error('Only a corner tile (or Twindalli) can target two cards with one roll.')
  if (targets.length === 2 && sameRef(targets[0]!, targets[1]!)) throw new Error('Choose two different targets.')
  const faced = new Set(combatSpacesFor(s, c, t.tile!).map(refKey))
  for (const ref of targets) {
    if (!faced.has(refKey(ref))) throw new Error(bastion ? 'You can only combat a Horde card on a space you can reach.' : 'You can only exorcise a ghost on a space facing your tile.')
    const blocker = exorcismBlocker(s, ref)
    if (blocker) throw new Error(blocker)
  }
  if (!bastion) s.yang!.moved = true
  s.yang!.exorcisms += 1
  const dice = rollDice(s, exorcismDice(s, c))
  const names = targets.map((r) => cardOnBoard(ghostAt(s, r)!.card, r.board).name).join(' and ')
  ev(s, 'exorcise', `${COLOR_NAME[c]} ${bastion ? 'enters combat against' : 'attempts to exorcise'} ${names}.`, { color: c })
  openRoll(s, { mode: 'exorcism', actor: c, targets, demons: [], dice, canReroll: hasPower(s, c, 'godsFavorite') })
}

// ---------------------------------------------------------------------------
// Step 3: Buddhas / Trap
// ---------------------------------------------------------------------------

function placeBuddhas(s: GameState, c: Color, spaces: GhostRef[]): void {
  const t = s.taoists[c]
  const bastion = isBastion(s)
  if (t.underground) throw new Error('You must face the ghost space from the village.')
  if (spaces.length === 0 || spaces.length > 2) throw new Error('Place one Buddha (two from a corner tile).')
  const ready = t.buddhas - s.yang!.newBuddhas
  if (ready < spaces.length) {
    throw new Error(t.buddhas > 0 ? 'A Buddha taken this turn can only be placed on a later turn.' : 'You have no Buddha figure.')
  }
  const faced = new Set(facedSpaces(t.tile!).map(refKey))
  const keys = new Set<string>()
  for (const ref of spaces) {
    if (!faced.has(refKey(ref)) && !(bastion && ref.board === c)) throw new Error('Place a Buddha on a space your Taoist faces.')
    if (ghostAt(s, ref)) throw new Error('A Buddha goes on an empty ghost space.')
    if (s.boards[ref.board].buddhas[ref.space]) throw new Error('There is already a Buddha there.')
    keys.add(refKey(ref))
  }
  if (keys.size !== spaces.length) throw new Error('Choose two different spaces.')
  if (!bastion) enterStep3(s)
  for (const ref of spaces) {
    s.boards[ref.board].buddhas[ref.space] = true
    t.buddhas -= 1
    ev(s, 'buddha', `${COLOR_NAME[c]} places ${bastion ? 'the Trap' : 'a Buddha'} on ${boardName(s, ref.board)} space ${ref.space + 1}.`, { color: c, ref })
  }
}

// ---------------------------------------------------------------------------
// Yin-Yang / Call to Arms
// ---------------------------------------------------------------------------

function yinYang(s: GameState, c: Color, use: Extract<Action, { type: 'yinYang' }>['use']): void {
  const t = s.taoists[c]
  const bastion = isBastion(s)
  if (!t.yinYang) throw new Error(bastion ? 'You have no Call to Arms token.' : 'You have no Yin-Yang token.')
  const tile = s.village[use.tile]
  if (!tile) throw new Error('No such tile.')
  if (use.kind === 'flip') {
    if (!tile.haunted) throw new Error('That tile is not haunted.')
    t.yinYang = false
    ev(s, 'yinYang', `${COLOR_NAME[c]} spends their ${bastion ? 'Call to Arms' : 'Yin-Yang'} to restore the ${tileName(s, tile.kind)}.`, { color: c, tile: tile.idx })
    unhaunt(s, tile.idx, bastion ? 'Call to Arms' : 'Yin-Yang')
    return
  }
  // In Last Bastion, Call to Arms can activate a Bastion tile even if it is in the Grasp of Evil.
  if (tile.haunted && !bastion) throw new Error(`${TILE_NAME[tile.kind]} is haunted: its villager is gone.`)
  if (tile.kind !== use.params.kind) throw new Error('Those are not that tile’s parameters.')
  if (shadowOnTile(s, tile.idx)) throw new Error('The Shadow of Wu-Feng blocks this tile.')
  t.yinYang = false
  ev(s, 'yinYang', `${COLOR_NAME[c]} spends their ${bastion ? 'Call to Arms' : 'Yin-Yang'}: ${bastion ? `activates the ${tileName(s, tile.kind)}` : `help from the ${TILE_NAME[tile.kind]}`} (${tilePlace(tile.idx)}).`, {
    color: c,
    tile: tile.idx,
  })
  doTileAction(s, c, tile.idx, use.params)
}

// ---------------------------------------------------------------------------
// End of the Yang phase
// ---------------------------------------------------------------------------

function endTurn(s: GameState, c: Color, reclaim: number): void {
  const t = s.taoists[c]
  if (reclaim > 0) {
    if (t.tile !== CENTER_TILE || t.underground) throw new Error('Power tokens are reclaimed by ending your turn on the central tile.')
    const n = Math.min(reclaim, s.centerPowerTokens)
    s.centerPowerTokens -= n
    t.powerTokens += n
    if (n > 0) ev(s, 'power', `${COLOR_NAME[c]} reclaims ${n} power token${n > 1 ? 's' : ''} from the central tile.`, { color: c })
  }
  ev(s, 'endTurn', `${COLOR_NAME[c]} ends their turn.`, { color: c })
  now(s, { k: 'endTurn' })
}
