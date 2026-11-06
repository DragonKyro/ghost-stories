// White Moon expansion (rules summary pages 5–6): villagers and their
// families, fleeing, Devourers, Su-Ling, moon crystals, receptacles and the
// Mystic Barrier, the Portal and the Kung-Fu School.
//
// The summary doesn't print each family's tile, so the per-family death
// curses and rewards below are our own — following its hints: a Sheng's death
// haunts a tile, a Xiang's death kills another villager, and the one-member
// families give artifacts (Chang's is the Moon Dust).

import type { Response } from './actions'
import { cardOnBoard, isSkeleton } from './catalogue'
import { colOf, cornerOfSpace, isAdjacent, lineOf, refKey, rowOf } from './geometry'
import { openRoll } from './exorcism'
import { ask, ev, gainQi, hauntTile, loseQi, now, removeGhost, rollDice, unhaunt } from './ops'
import { nextInt, shuffle } from './rng'
import { ALL_SPACES, COLOR_NAME, decider, ghostAt, hauntedCount, livingTaoists, TILE_NAME } from './rules'
import {
  CENTER_TILE,
  COLORS,
  CORNER_TILE,
  type ArtifactId,
  type Color,
  type Corner,
  type Effect,
  type FamilyId,
  type GameState,
  type GhostRef,
  type TileIdx,
  type Villager,
} from './types'

// ---------------------------------------------------------------------------
// Families
// ---------------------------------------------------------------------------

export type DeathCurse = 'loseQi' | 'discardTao' | 'hauntTile' | 'killNext'
export type FamilyReward =
  | 'allGainQi'
  | 'tao2'
  | 'yinYangOrQi'
  | 'restoreTile'
  | 'qi'
  | 'buddha'
  | 'powerToken'
  | { artifact: ArtifactId }

export interface Family {
  id: FamilyId
  name: string
  size: 1 | 2 | 3
  death: DeathCurse
  reward: FamilyReward
}

export const FAMILIES: Record<FamilyId, Family> = {
  hua: { id: 'hua', name: 'Hua', size: 3, death: 'loseQi', reward: 'allGainQi' },
  zhou: { id: 'zhou', name: 'Zhou', size: 3, death: 'discardTao', reward: 'tao2' },
  li: { id: 'li', name: 'Li', size: 3, death: 'loseQi', reward: 'yinYangOrQi' },
  sun: { id: 'sun', name: 'Sun', size: 3, death: 'discardTao', reward: 'restoreTile' },
  miao: { id: 'miao', name: 'Miao', size: 2, death: 'discardTao', reward: 'qi' },
  xiang: { id: 'xiang', name: 'Xiang', size: 2, death: 'killNext', reward: 'buddha' },
  sheng: { id: 'sheng', name: 'Sheng', size: 2, death: 'hauntTile', reward: 'restoreTile' },
  wu: { id: 'wu', name: 'Wu', size: 2, death: 'loseQi', reward: 'powerToken' },
  chang: { id: 'chang', name: 'Chang', size: 1, death: 'loseQi', reward: { artifact: 'moonDust' } },
  teng: { id: 'teng', name: 'Teng', size: 1, death: 'discardTao', reward: { artifact: 'jadeTalisman' } },
  long: { id: 'long', name: 'Long', size: 1, death: 'loseQi', reward: { artifact: 'dragonPearl' } },
  weng: { id: 'weng', name: 'Weng', size: 1, death: 'discardTao', reward: { artifact: 'phoenixFeather' } },
}

export const DEATH_TEXT: Record<DeathCurse, string> = {
  loseQi: 'the active player (or neutral board) loses 1 Qi',
  discardTao: 'the active player discards 1 Tao token',
  hauntTile: 'the tile where they died is haunted',
  killNext: 'the next villager on their tile dies too',
}

export function rewardText(r: FamilyReward): string {
  if (typeof r === 'object') return `the ${ARTIFACT_NAME[r.artifact]} artifact`
  return {
    allGainQi: 'every living Taoist gains 1 Qi',
    tao2: 'take 2 Tao tokens of your choice',
    yinYangOrQi: 'regain your Yin-Yang (or gain 1 Qi)',
    restoreTile: 'restore a haunted tile',
    qi: 'gain 1 Qi',
    buddha: 'take a Buddha from the Temple',
    powerToken: 'gain a power token',
  }[r]
}

export const ARTIFACT_NAME: Record<ArtifactId, string> = {
  moonDust: 'Moon Dust',
  jadeTalisman: 'Jade Talisman',
  dragonPearl: 'Dragon Pearl',
  phoenixFeather: 'Phoenix Feather',
}

export const ARTIFACT_TEXT: Record<ArtifactId, string> = {
  moonDust: 'Once: take 2 moon crystals from the reserve.',
  jadeTalisman: 'Once: restore a haunted tile.',
  dragonPearl: 'Once: gain 2 Qi.',
  phoenixFeather: 'Once: discard a ghost (not an incarnation) with no Qi cost.',
}

export const familyName = (v: Villager): string => FAMILIES[v.family].name

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

export function wmSetup(s: GameState): void {
  const opts = s.config.whiteMoon!
  let rng = s.rng
  // The Portal: centre, or a peripheral tile for a harder game.
  const candidates = opts.portal === 'center' ? [CENTER_TILE] : opts.portal === 'edge' ? [1, 3, 5, 7] : [0, 2, 6, 8]
  let pi: number
  ;[rng, pi] = nextInt(rng, candidates.length)
  const portal = candidates[pi]!
  s.village[portal]!.portal = true
  // 8 stacks of 3 villagers on the 8 other tiles.
  const all: Villager[] = []
  for (const f of Object.values(FAMILIES)) for (let m = 0; m < f.size; m++) all.push({ family: f.id, member: m })
  let shuffled: Villager[]
  ;[rng, shuffled] = shuffle(rng, all)
  let k = 0
  for (const t of s.village) if (!t.portal) t.villagers = shuffled.slice(k, (k += 3))

  s.whiteMoon = {
    saved: [],
    dead: [],
    crystalReserve: 12,
    receptacles: { nw: false, ne: false, sw: false, se: false },
    suLing: null,
    suLingEvent: false,
    barrierPending: false,
    barrier: null,
  }

  // 1–3 players: 3 / 2 / 1 villagers start saved, from the top of the stacks
  // (1–2 players: different stacks and families).
  const players = COLORS.filter((c) => !s.boards[c].neutral)
  const preSave = 4 - players.length
  if (preSave > 0) {
    let stacks: number[]
    ;[rng, stacks] = shuffle(rng, s.village.filter((t) => t.villagers.length > 0).map((t) => t.idx))
    const used = new Set<FamilyId>()
    for (const idx of stacks) {
      if (s.whiteMoon.saved.length >= preSave) break
      const tile = s.village[idx]!
      const top = tile.villagers[tile.villagers.length - 1]!
      if (players.length <= 2 && used.has(top.family)) continue
      tile.villagers.pop()
      s.whiteMoon.saved.push(top)
      used.add(top.family)
      const fam = FAMILIES[top.family]
      if (fam.size === 1 && typeof fam.reward === 'object') {
        s.taoists[players[0]!].artifacts.push(fam.reward.artifact)
      }
    }
    s.events.push({ kind: 'setup', text: `Villagers already safe in the Shelter: ${s.whiteMoon.saved.map(familyName).join(', ')}.` })
  }
  s.rng = rng
}

// ---------------------------------------------------------------------------
// Villager deaths
// ---------------------------------------------------------------------------

/** Kill villagers from the top of a tile's stack (all of them by default). */
export function killVillagers(s: GameState, tile: TileIdx, n: number, why: string): void {
  const t = s.village[tile]!
  const wm = s.whiteMoon!
  const effects: Effect[] = []
  for (let i = 0; i < n && t.villagers.length > 0; i++) {
    const v = t.villagers.pop()!
    wm.dead.push(v)
    wm.suLingEvent = true
    ev(s, 'villagerDeath', `${familyName(v)} villager killed on the ${TILE_NAME[t.kind]} (${why}). ${wm.dead.length}/12 dead.`, { tile })
    effects.push({ k: 'villagerDeath', villager: v, board: s.active, tile })
  }
  now(s, ...effects)
}

/** White Moon haunting: villagers on the tile are all killed instead, and the tile stays active. */
export function wmHauntAbsorbed(s: GameState, tile: TileIdx, why: string): boolean {
  const t = s.village[tile]!
  if (t.villagers.length === 0) return false
  killVillagers(s, tile, t.villagers.length, why)
  return true
}

function applyDeathCurse(s: GameState, v: Villager, tile: TileIdx): void {
  const fam = FAMILIES[v.family]
  const a = s.active
  ev(s, 'note', `${fam.name} death curse: ${DEATH_TEXT[fam.death]}.`)
  switch (fam.death) {
    case 'loseQi':
      return loseQi(s, a, `${fam.name} villager's death`)
    case 'discardTao':
      if (s.taoists[a].alive) now(s, { k: 'loseTao', taoist: a, count: 1, why: `${fam.name} villager's death` })
      return
    case 'hauntTile':
      // The tile where they died (any villagers still on it die instead).
      hauntTile(s, tile, `${fam.name} villager's death`)
      return
    case 'killNext':
      if (s.village[tile]!.villagers.length > 0) killVillagers(s, tile, 1, `${fam.name} villager's death`)
      return
  }
}

// ---------------------------------------------------------------------------
// Haunters flee villagers; Devourers eat them
// ---------------------------------------------------------------------------

/**
 * A haunting figure moving from the card to the board makes the top villager
 * of the first stack in front of the ghost flee one tile further along the
 * line. Off the village, onto a haunted tile, or onto a full tile: it dies.
 */
export function wmFlee(s: GameState, ref: GhostRef): void {
  const line = lineOf(ref)
  const i = line.findIndex((t) => s.village[t]!.villagers.length > 0)
  if (i < 0) return
  const from = s.village[line[i]!]!
  const dest = line[i + 1]
  if (dest === undefined || s.village[dest]!.haunted || s.village[dest]!.villagers.length >= 3) {
    killVillagers(s, from.idx, 1, 'unable to flee')
    return
  }
  const v = from.villagers.pop()!
  s.village[dest]!.villagers.push(v)
  ev(s, 'flee', `The ${familyName(v)} villager flees from the ${TILE_NAME[from.kind]} to the ${TILE_NAME[s.village[dest]!.kind]}.`, { tile: dest })
}

export function wmDevour(s: GameState, ref: GhostRef): void {
  const name = cardOnBoard(ghostAt(s, ref)!.card, ref.board).name
  const front = lineOf(ref).find((t) => s.village[t]!.villagers.length > 0)
  if (front !== undefined) return devourAt(s, front, name)
  const options = s.village.filter((t) => t.villagers.length > 0).map((t) => t.idx)
  if (options.length === 0) {
    ev(s, 'note', `${name} finds no villager left to devour.`)
    return loseQi(s, s.active, `${name} (Devourer)`)
  }
  if (options.length === 1) return devourAt(s, options[0]!, name)
  ask(s, { kind: 'devour', owner: decider(s), options })
}

function devourAt(s: GameState, tile: TileIdx, name: string): void {
  killVillagers(s, tile, 1, `devoured by ${name}`)
}

// ---------------------------------------------------------------------------
// Villagers moving with Taoists, and saving them
// ---------------------------------------------------------------------------

const dist = (a: TileIdx, b: TileIdx) => Math.max(Math.abs(colOf(a) - colOf(b)), Math.abs(rowOf(a) - rowOf(b)))

/**
 * A Taoist moving from `from` to `to` brings the top villager of `pickup`
 * along. Normally pickup = from. With the Dance of the Spires a villager can
 * travel 2 tiles, or be fetched from a neighbouring tile (back and forth).
 * Villagers never stand on or pass through a haunted tile, nor crowd a tile
 * past 3.
 */
export function wmCarry(s: GameState, c: Color, from: TileIdx, to: TileIdx, pickup: TileIdx, fly: boolean): void {
  const src = s.village[pickup]!
  const dest = s.village[to]!
  if (src.villagers.length === 0) throw new Error('There is no villager there to bring along.')
  if (dest.haunted) throw new Error('Villagers can never go onto a haunted tile.')
  if (dest.villagers.length >= 3 && pickup !== to) throw new Error('There can never be more than 3 villagers on a tile.')
  if (pickup === from) {
    const d = dist(from, to)
    if (d === 1) {
      // fine
    } else if (fly && d === 2) {
      const viaOk = [0, 1, 2, 3, 4, 5, 6, 7, 8].some(
        (m) => isAdjacent(from, m) && isAdjacent(m, to) && !s.village[m]!.haunted && s.village[m]!.villagers.length < 3,
      )
      if (!viaOk) throw new Error('The villager would have to pass through a haunted tile.')
    } else throw new Error('A villager moves with you one tile (two with the Dance of the Spires).')
  } else {
    if (!fly) throw new Error('The villager must start on your tile.')
    if (!isAdjacent(from, pickup) || !isAdjacent(pickup, to)) {
      throw new Error('With the Dance of the Spires you can fetch a villager from a tile next to both your start and your destination.')
    }
  }
  const v = src.villagers.pop()!
  dest.villagers.push(v)
  ev(s, 'villager', `${COLOR_NAME[c]} escorts a ${familyName(v)} villager to the ${TILE_NAME[dest.kind]}.`, { color: c, tile: to })
}

export function wmSaveVillager(s: GameState, c: Color): void {
  const t = s.taoists[c]
  if (t.underground) throw new Error('Villagers are saved from the Portal, in the village.')
  const tile = s.village[t.tile!]!
  if (!tile.portal) throw new Error('Villagers are saved on the tile with the Portal.')
  if (tile.villagers.length === 0) throw new Error('No villager is waiting on the Portal tile.')
  saveTop(s, tile.idx, c)
}

function saveTop(s: GameState, tile: TileIdx, c: Color): void {
  const wm = s.whiteMoon!
  const v = s.village[tile]!.villagers.pop()!
  wm.saved.push(v)
  ev(s, 'save', `A ${familyName(v)} villager is saved: safe in the Shelter.`, { color: c, tile })
  const fam = FAMILIES[v.family]
  if (wm.saved.filter((x) => x.family === v.family).length === fam.size) {
    now(s, { k: 'familySaved', family: v.family, taoist: c })
  }
}

function familySaved(s: GameState, family: FamilyId, c: Color): void {
  const fam = FAMILIES[family]
  ev(s, 'family', `The whole ${fam.name} family is safe! Reward: ${rewardText(fam.reward)}.`, { color: c })
  const t = s.taoists[c]
  const r = fam.reward
  if (typeof r === 'object') {
    if (t.alive) t.artifacts.push(r.artifact)
    else if (livingTaoists(s)[0]) livingTaoists(s)[0]!.artifacts.push(r.artifact)
    return
  }
  switch (r) {
    case 'allGainQi':
      for (const x of livingTaoists(s)) gainQi(s, x.color, 1, `${fam.name} family`)
      return
    case 'tao2':
      return now(s, { k: 'gainTao', taoist: c, count: 2, why: `${fam.name} family` })
    case 'yinYangOrQi':
      return now(s, { k: 'qiOrYinYang', taoist: c })
    case 'restoreTile':
      return askRestore(s)
    case 'qi':
      return gainQi(s, c, 1, `${fam.name} family`)
    case 'buddha':
      if (s.templeBuddhas > 0 && t.alive) {
        s.templeBuddhas -= 1
        t.buddhas += 1
        if (s.yang && s.active === c) s.yang.newBuddhas += 1
        ev(s, 'buddha', `${COLOR_NAME[c]} takes a Buddha from the Temple.`, { color: c })
      }
      return
    case 'powerToken':
      if (t.alive) {
        t.powerTokens += 1
        ev(s, 'power', `${COLOR_NAME[c]} gains a power token.`, { color: c })
      }
      return
  }
}

function askRestore(s: GameState): void {
  const options = s.village.filter((t) => t.haunted).map((t) => t.idx)
  if (options.length === 0) return ev(s, 'note', 'No tile is haunted: nothing to restore.')
  if (options.length === 1) return unhaunt(s, options[0]!, 'family reward')
  ask(s, { kind: 'restoreTile', owner: decider(s), options })
}

/** Cemetery (White Moon): a killed villager comes back on the Cemetery. */
export function wmReviveVillager(s: GameState, tile: TileIdx, index: number): void {
  const wm = s.whiteMoon!
  const v = wm.dead[index]
  if (!v) throw new Error('Choose a villager from the Graveyard.')
  const t = s.village[tile]!
  if (t.villagers.length >= 3) throw new Error('The Cemetery has no room for another villager.')
  wm.dead.splice(index, 1)
  t.villagers.push(v)
  ev(s, 'villager', `A ${familyName(v)} villager returns to the village on the Cemetery.`, { tile })
}

/** Herbalist's Shop white face: a moon crystal instead of a Tao token (lost if none is left). */
export function wmHerbalistWhite(s: GameState, c: Color): boolean {
  const wm = s.whiteMoon!
  if (wm.crystalReserve <= 0) return false
  wm.crystalReserve -= 1
  s.taoists[c].crystals += 1
  if (s.yang && s.active === c) s.yang.newCrystals += 1
  return true
}

// ---------------------------------------------------------------------------
// Receptacles, Su-Ling, the Mystic Barrier
// ---------------------------------------------------------------------------

export function wmPlaceCrystal(s: GameState, c: Color, corner: Corner): void {
  const wm = s.whiteMoon!
  const t = s.taoists[c]
  if (t.underground || t.tile !== CORNER_TILE[corner]) throw new Error('Stand on the corner tile next to that receptacle.')
  if (wm.receptacles[corner]) throw new Error('That receptacle already holds a crystal.')
  if (t.crystals - (s.yang?.newCrystals ?? 0) <= 0) {
    throw new Error(t.crystals > 0 ? 'A crystal gained this turn can only be placed on a later turn.' : 'You have no moon crystal.')
  }
  t.crystals -= 1
  fillReceptacle(s, corner, `${COLOR_NAME[c]} places a moon crystal in the ${corner.toUpperCase()} receptacle.`)
}

function fillReceptacle(s: GameState, corner: Corner, text: string): void {
  const wm = s.whiteMoon!
  wm.receptacles[corner] = true
  ev(s, 'crystal', text)
  if (Object.values(wm.receptacles).every(Boolean)) {
    wm.barrierPending = true
    ev(s, 'barrier', 'All four receptacles glow: the Mystic Barrier rises at the end of this turn!')
  }
}

/** An incarnation arriving in front of Su-Ling sends her back to the reserve. */
export function wmIncarnationArrived(s: GameState, ref: GhostRef): void {
  const wm = s.whiteMoon!
  if (wm.suLing && refKey(wm.suLing) === refKey(ref)) {
    wm.suLing = null
    ev(s, 'suLing', 'An incarnation of Wu-Feng appears in front of Su-Ling: she returns to the reserve.')
  }
}

/** Haunting icons Su-Ling may be placed on: any of the 12, not in front of an incarnation. */
export function suLingOptions(s: GameState): GhostRef[] {
  const cur = s.whiteMoon?.suLing
  return ALL_SPACES.filter((r) => {
    if (cur && refKey(cur) === refKey(r)) return false
    const g = ghostAt(s, r)
    return !(g && !isSkeleton(g.card) && cardOnBoard(g.card, r.board).incarnation)
  })
}

function barrierStart(s: GameState): void {
  const wm = s.whiteMoon!
  if (!wm.barrierPending) return
  wm.barrierPending = false
  wm.receptacles = { nw: false, ne: false, sw: false, se: false }
  // Starting with the board to the left of the active player (the next one clockwise).
  const start = COLORS.indexOf(s.active)
  const order = [1, 2, 3, 4].map((i) => COLORS[(start + i) % 4]!)
  wm.barrier = { order, crystals: 4 }
  ev(s, 'barrier', 'The Mystic Barrier: each board in turn may spend a barrier crystal to save a villager, or roll 4 Tao dice against its ghosts.')
  now(s, { k: 'barrierNext' })
}

function barrierNext(s: GameState): void {
  const wm = s.whiteMoon!
  const b = wm.barrier
  if (!b) return
  const board = b.order.shift()
  if (!board) {
    wm.crystalReserve += b.crystals
    wm.barrier = null
    wm.suLing = null
    ev(s, 'barrier', 'The Mystic Barrier fades. Its remaining crystals and Su-Ling return to the reserve.')
    return
  }
  const owner = s.taoists[board].alive ? board : decider(s)
  ask(s, { kind: 'barrier', owner, board })
}

/** Ghosts on `board` the barrier's 4 dice can target (not incarnations, not skeletons). */
export function barrierTargets(s: GameState, board: Color): GhostRef[] {
  return ([0, 1, 2] as const)
    .map((space) => ({ board, space }))
    .filter((r) => {
      const g = ghostAt(s, r)
      return !!g && !isSkeleton(g.card) && !cardOnBoard(g.card, board).incarnation
    })
}

// ---------------------------------------------------------------------------
// Artifacts
// ---------------------------------------------------------------------------

export function wmUseArtifact(s: GameState, c: Color, artifact: ArtifactId, tile?: TileIdx, ghost?: GhostRef): void {
  const t = s.taoists[c]
  const i = t.artifacts.indexOf(artifact)
  if (i < 0) throw new Error('You do not hold that artifact.')
  const wm = s.whiteMoon!
  switch (artifact) {
    case 'moonDust': {
      const n = Math.min(2, wm.crystalReserve)
      wm.crystalReserve -= n
      t.crystals += n
      if (s.yang && s.active === c) s.yang.newCrystals += n
      ev(s, 'artifact', `Moon Dust: ${COLOR_NAME[c]} takes ${n} moon crystal${n === 1 ? '' : 's'}.`, { color: c })
      break
    }
    case 'jadeTalisman':
      if (tile == null || !s.village[tile]?.haunted) throw new Error('Choose a haunted tile to restore.')
      ev(s, 'artifact', `Jade Talisman: ${COLOR_NAME[c]} restores a tile.`, { color: c })
      unhaunt(s, tile, 'Jade Talisman')
      break
    case 'dragonPearl':
      ev(s, 'artifact', `Dragon Pearl: ${COLOR_NAME[c]} gains 2 Qi.`, { color: c })
      gainQi(s, c, 2, 'Dragon Pearl')
      break
    case 'phoenixFeather': {
      const g = ghost ? ghostAt(s, ghost) : null
      if (!ghost || !g) throw new Error('Choose a ghost to discard.')
      const card = cardOnBoard(g.card, ghost.board)
      if (card.incarnation || isSkeleton(g.card)) throw new Error('The Phoenix Feather discards an ordinary ghost.')
      removeGhost(s, ghost)
      ev(s, 'artifact', `Phoenix Feather: ${card.name} is discarded.`, { color: c, ref: ghost })
      break
    }
  }
  t.artifacts.splice(i, 1)
}

// ---------------------------------------------------------------------------
// Effects and prompts
// ---------------------------------------------------------------------------

export function wmEffect(s: GameState, e: Effect): void {
  const wm = s.whiteMoon
  if (!wm) return
  switch (e.k) {
    case 'villagerDeath':
      return applyDeathCurse(s, e.villager, e.tile)
    case 'familySaved':
      return familySaved(s, e.family, e.taoist)
    case 'suLingPlacement': {
      if (!wm.suLingEvent) return
      wm.suLingEvent = false
      const options = suLingOptions(s)
      if (options.length === 0) return
      ask(s, { kind: 'suLing', owner: decider(s), options })
      return
    }
    case 'barrierStart':
      return barrierStart(s)
    case 'barrierNext':
      return barrierNext(s)
    case 'inherit': {
      const [first, ...rest] = e.artifacts
      if (!first) return
      if (rest.length) now(s, { k: 'inherit', artifacts: rest })
      const options = livingTaoists(s).map((t) => t.color)
      if (options.length === 0) return
      if (options.length === 1) {
        s.taoists[options[0]!].artifacts.push(first)
        ev(s, 'artifact', `${COLOR_NAME[options[0]!]} inherits the ${ARTIFACT_NAME[first]}.`)
        return
      }
      ask(s, { kind: 'inherit', owner: decider(s), artifact: first, options })
      return
    }
    default:
      return
  }
}

export function wmRespond(s: GameState, r: Response): boolean {
  const p = s.prompt
  const wm = s.whiteMoon!
  if (!p) return false
  if (p.kind === 'devour' && r.kind === 'devour') {
    if (!p.options.includes(r.tile)) throw new Error('No villager is visible there.')
    s.prompt = null
    devourAt(s, r.tile, 'a Devourer')
    return true
  }
  if (p.kind === 'suLing' && r.kind === 'suLing') {
    s.prompt = null
    if (r.ref == null) return true
    if (!p.options.some((o) => refKey(o) === refKey(r.ref!))) throw new Error('Su-Ling cannot stand there.')
    wm.suLing = r.ref
    ev(s, 'suLing', `Su-Ling takes her place in front of ${COLOR_NAME[r.ref.board]}'s space ${r.ref.space + 1}.`, { ref: r.ref })
    const corner = cornerOfSpace(r.ref)
    if (corner && !wm.receptacles[corner] && wm.crystalReserve > 0) ask(s, { kind: 'suLingCrystal', owner: p.owner, corner })
    return true
  }
  if (p.kind === 'suLingCrystal' && r.kind === 'suLingCrystal') {
    s.prompt = null
    if (r.take && wm.crystalReserve > 0 && !wm.receptacles[p.corner]) {
      wm.crystalReserve -= 1
      fillReceptacle(s, p.corner, `Su-Ling sets a moon crystal from the reserve in the ${p.corner.toUpperCase()} receptacle.`)
    }
    return true
  }
  if (p.kind === 'inherit' && r.kind === 'inherit') {
    if (!p.options.includes(r.taoist)) throw new Error('Artifacts go to a living Taoist.')
    s.prompt = null
    s.taoists[r.taoist].artifacts.push(p.artifact)
    ev(s, 'artifact', `${COLOR_NAME[r.taoist]} inherits the ${ARTIFACT_NAME[p.artifact]}.`)
    return true
  }
  if (p.kind === 'restoreTile' && r.kind === 'restoreTile') {
    if (!p.options.includes(r.tile)) throw new Error('That tile is not haunted.')
    s.prompt = null
    unhaunt(s, r.tile, 'family reward')
    return true
  }
  if (p.kind === 'barrier' && r.kind === 'barrier') {
    const b = wm.barrier
    if (!b) throw new Error('The Mystic Barrier is not up.')
    if (r.choice === 'pass') {
      s.prompt = null
      now(s, { k: 'barrierNext' })
      return true
    }
    if (r.choice === 'save') {
      if (b.crystals <= 0) throw new Error('The barrier has no crystal left.')
      // The top villager on the Portal tile; "if no villager is on that tile, you may save any villager visible on any other tile".
      const portal = s.village.find((t) => t.portal && t.villagers.length > 0)
      const others = s.village.filter((t) => t.villagers.length > 0)
      let tile = portal
      if (!tile) {
        if (others.length === 0) throw new Error('There is no villager to save.')
        tile = r.tile != null ? others.find((t) => t.idx === r.tile) : others.length === 1 ? others[0] : undefined
        if (!tile) throw new Error('Choose which visible villager the barrier saves.')
      }
      s.prompt = null
      b.crystals -= 1
      wm.crystalReserve += 1
      saveTop(s, tile.idx, s.taoists[p.board].alive ? p.board : decider(s))
      now(s, { k: 'barrierNext' })
      return true
    }
    const targets = barrierTargets(s, p.board)
    if (targets.length === 0) throw new Error('No ghost on this board can be fought by the barrier.')
    s.prompt = null
    const dice = rollDice(s, 4)
    const actor = s.taoists[p.board].alive ? p.board : decider(s)
    openRoll(s, { mode: 'barrier', actor, targets, demons: [], dice, canReroll: false, barrierBoard: p.board })
    return true
  }
  return false
}

export const _hauntedCount = hauntedCount
