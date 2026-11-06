// The neural network's vocabulary: token types, their slots and feature
// layouts, relation types between tokens, and the candidate-action layout.
//
// Shared by the encoder (encode.ts, candidates.ts), the TypeScript forward
// pass (model.ts) and — through `schemaJson()` — the PyTorch trainer, so the
// two sides can't drift apart. Changing any layout changes `SCHEMA_HASH`;
// weights trained on another layout refuse to load.

import { allCards } from '@/game/catalogue'
import type {
  AbilityKind,
  ArtifactId,
  CatacombTokenKind,
  Corner,
  CurseEffectId,
  DemonId,
  Difficulty,
  FamilyId,
  IncarnationId,
  LossReason,
  MantraEffectId,
  PowerId,
  PromptKind,
  TileKind,
} from '@/game/types'
import type { ActionType, Response } from '@/game/actions'

// ---------------------------------------------------------------------------
// Vocabularies. Records keyed by a union type make the compiler check that
// every member has an index; the slot counts leave room to grow.
// ---------------------------------------------------------------------------

function indexOf<K extends string>(r: Record<K, number>): (k: K) => number {
  return (k) => r[k]
}

export const TILE_KIND: Record<TileKind, number> = {
  circleOfPrayer: 0, buddhistTemple: 1, cemetery: 2, taoistAltar: 3, herbalistShop: 4, sorcerersHut: 5,
  nightWatchman: 6, pavilion: 7, teaHouse: 8, kungFuSchool: 9, calligrapher: 10,
}
export const N_TILE_KIND = 12

export const POWER: Record<PowerId, number> = {
  danceOfTheSpires: 0, danceOfTheTwinWinds: 1, heavenlyGust: 2, secondWind: 3,
  godsFavorite: 4, strengthOfMountain: 5, bottomlessPockets: 6, enfeeblementMantra: 7,
}
export const N_POWER = 10

export const ABILITY: Record<AbilityKind, number> = {
  addGhost: 0, hauntTile: 1, loseQi: 2, haunterDirect: 3,
  haunter: 4, tormentor: 5, devourer: 6, powerBlocker: 7, taoBlocker: 8, dieCaptor: 9, diceImmune: 10,
  curse: 11, loseTao: 12, rewardQiOrYinYang: 13, rewardTao1: 14, rewardTao2: 15, rewardCrystal: 16, incarnationReward: 17,
}
export const N_ABILITY = 20
export const CENTER_ABILITIES: AbilityKind[] = ['haunter', 'tormentor', 'devourer', 'powerBlocker', 'taoBlocker', 'dieCaptor', 'diceImmune']

export const INCARNATION: Record<IncarnationId, number> = {
  howlingNightmare: 0, uncatchable: 1, deathArmy: 2, forgottenOnes: 3, bonecracker: 4,
  darkMistress: 5, creepingHorror: 6, vampireLord: 7, hopeKiller: 8, nameless: 9,
}
export const N_INCARNATION = 16

export const PROMPT_KIND: Record<PromptKind, number> = {
  placeGhost: 0, curseReroll: 1, qiPayer: 2, discardTao: 3, gainTao: 4, qiOrYinYang: 5, incarnationReward: 6,
  bonecrackerPayer: 7, exorcism: 8, herbalist: 9, devour: 10, suLing: 11, suLingCrystal: 12, inherit: 13,
  barrier: 14, restoreTile: 15, wuFengGhost: 16, wuFengIncarnation: 17, wuFengDemon: 18, wuFengShadow: 19,
  wuFengSkeleton: 20, wuFengFreeCurse: 21, wuFengCurseTarget: 22, shadowAttack: 23, mantraQi: 24, mantraTarget: 25,
}
export const N_PROMPT_KIND = 32

export const RESPONSE_KIND: Record<Response['kind'], number> = {
  placeGhost: 0, curseReroll: 1, qiPayer: 2, discardTao: 3, gainTao: 4, qiOrYinYang: 5, incarnationReward: 6,
  bonecrackerPayer: 7, reroll: 8, commit: 9, herbalistTake: 10, devour: 11, suLing: 12, suLingCrystal: 13,
  inherit: 14, barrier: 15, restoreTile: 16, wuFengGhost: 17, wuFengIncarnation: 18, wuFengDemon: 19,
  wuFengShadow: 20, wuFengSkeleton: 21, wuFengFreeCurse: 22, wuFengCurseTarget: 23, shadowAttack: 24,
  mantraQi: 25, mantraTarget: 26,
}
export const N_RESPONSE_KIND = 32

export const ACTION_TYPE: Record<ActionType, number> = {
  move: 0, climb: 1, power: 2, powerToken: 3, help: 4, exorcise: 5, saveVillager: 6, placeBuddha: 7,
  placeCrystal: 8, yinYang: 9, artifact: 10, endTurn: 11, respond: 12,
}
export const N_ACTION_TYPE = 16

/** Engine effect kinds (the pending queue). Unknown kinds fall in the last slot. */
export const EFFECT_KINDS = [
  'arrival', 'barrierNext', 'barrierStart', 'beginTurn', 'bonecracker', 'catacombToken', 'curse', 'curseEffect',
  'curseFace', 'demonPhase', 'devourer', 'endTurn', 'enterYang', 'familySaved', 'freeCurse', 'gainTao', 'haunter',
  'incarnationReward', 'inherit', 'leftStone', 'loseQi', 'loseTao', 'mantraQi', 'mantraResolve', 'nextTurn',
  'overrun', 'qiOrYinYang', 'shadowPhase', 'skeleton', 'suLingPlacement', 'tormentor', 'villagerDeath',
  'wuFengTurnStart', 'yinSteps',
] as const
export const N_EFFECT = 40

export const DIFFICULTY: Record<Difficulty, number> = { initiation: 0, normal: 1, nightmare: 2, hell: 3 }
export const LOSS: Record<LossReason, number> = { allDead: 0, thirdHaunting: 1, deckExhausted: 2, villagers: 3 }
/** Outcome classes for the auxiliary head: win, then the loss reasons. */
export const N_OUTCOME = 5

export const FAMILY: Record<FamilyId, number> = {
  hua: 0, zhou: 1, li: 2, sun: 3, miao: 4, xiang: 5, sheng: 6, wu: 7, chang: 8, teng: 9, long: 10, weng: 11,
}
export const FAMILY_IDS = Object.keys(FAMILY) as FamilyId[]
export const N_FAMILY = 12
export const ARTIFACT: Record<ArtifactId, number> = { moonDust: 0, jadeTalisman: 1, dragonPearl: 2, phoenixFeather: 3 }
export const N_ARTIFACT = 4
export const DEMON: Record<DemonId, number> = { imp: 0, fiend: 1, archfiend: 2 }
export const DEMON_IDS = Object.keys(DEMON) as DemonId[]
export const CATACOMB_TOKEN: Record<CatacombTokenKind, number> = {
  dirt: 0, buddha: 1, bloodOfTheJust: 2, cursedTablet: 3, bones: 4, bloodOfSuLing: 5, urn: 6,
}
export const N_CATACOMB_TOKEN = 8
export const CURSE_EFFECT: Record<CurseEffectId, number> = {
  loseQi: 0, loseTao2: 1, loseYinYang: 2, advanceHaunters: 3, clearCircle: 4, allLoseTao: 5, blockPowers: 6,
  removeLadder: 7, hauntTile: 8, allLoseQi: 9, addTwoGhosts: 10, drawIncarnation: 11, summonIncarnation: 12,
  skeleton: 13, shadowAct: 14,
}
export const N_CURSE_EFFECT = 16
export const MANTRA_EFFECT: Record<MantraEffectId, number> = {
  allGainQi: 0, gainTaoEach: 1, yinYangReturn: 2, unhaunt: 3, restoreLadders: 4, banishDemon: 5, discardGhosts: 6,
}
export const N_MANTRA_EFFECT = 8
export const CORNER: Record<Corner, number> = { nw: 0, ne: 1, sw: 2, se: 3 }

/** Ghost cards by catalogue order, then the special tokens. */
const SPECIAL_CARDS = ['skeleton', 'bones', 'summon'] as const
export const N_CARD = 112
let cardIndex: Map<string, number> | null = null
export function cardSlot(id: string): number {
  if (!cardIndex) {
    cardIndex = new Map()
    allCards().forEach((c, i) => cardIndex!.set(c.id, i))
    const base = cardIndex.size
    SPECIAL_CARDS.forEach((c, i) => cardIndex!.set(c, base + i))
    if (cardIndex.size > N_CARD) throw new Error('nn schema: more ghost cards than card slots')
  }
  if (id.startsWith('summon-')) return cardIndex.get('summon')!
  const i = cardIndex.get(id)
  if (i === undefined) throw new Error(`nn schema: unknown card ${id}`)
  return i
}

export const tileKindIdx = indexOf(TILE_KIND)
export const powerIdx = indexOf(POWER)

// ---------------------------------------------------------------------------
// Feature layouts
// ---------------------------------------------------------------------------

export interface Field {
  off: number
  n: number
}

export class Layout {
  readonly fields: Record<string, Field> = {}
  size = 0
  add(name: string, n = 1): this {
    if (this.fields[name]) throw new Error(`nn schema: duplicate field ${name}`)
    this.fields[name] = { off: this.size, n }
    this.size += n
    return this
  }
  field(name: string): Field {
    const f = this.fields[name]
    if (!f) throw new Error(`nn schema: no field ${name}`)
    return f
  }
}

/** The ghost on a space (or an arriving card): identity, colour, resistance, abilities. */
function addGhost(L: Layout, p: string): Layout {
  return L.add(`${p}present`)
    .add(`${p}card`, N_CARD)
    .add(`${p}color`, 5) // relative colours 0–3, black 4
    .add(`${p}res`, 5) // resistance by relative colour (÷4)
    .add(`${p}resTotal`)
    .add(`${p}ability`, N_ABILITY) // count over the three stones
    .add(`${p}group`, N_ABILITY) // the same, group icon only
    .add(`${p}incarnation`, N_INCARNATION)
    .add(`${p}isIncarnation`)
    .add(`${p}skeleton`)
    .add(`${p}summon`)
    .add(`${p}expansion`, 2)
}

export const GLOBAL = new Layout()
  .add('bias')
  .add('turn')
  .add('phase', 3)
  .add('activeRel', 4)
  .add('decider', 4)
  .add('difficulty', 4)
  .add('players', 4)
  .add('expansions', 2)
  .add('deck')
  .add('deckGhosts')
  .add('wuFengInDeck')
  .add('nextWuFeng')
  .add('nextWuFengInv')
  .add('hasNextWuFeng')
  .add('incarnationsInPlay')
  .add('discard')
  .add('haunted')
  .add('hauntedN', 4)
  .add('templeBuddhas')
  .add('taoSupply', 5)
  .add('centerPowerTokens')
  .add('mantra', 4)
  .add('taoBlocked')
  .add('whiteNotWild')
  .add('capturedDice')
  .add('powersSuppressed')
  .add('ghostsInPlay')
  .add('freeSpaces')
  // The ghosts not seen yet (the deck holds some of them, in an unknown order).
  .add('poolSize')
  .add('poolInDeck')
  .add('poolColor', 5)
  .add('poolAbility', N_ABILITY)
  .add('poolGroup')
  .add('poolRes', 4)
  .add('poolIncarnation', N_INCARNATION)
  // Yang phase bookkeeping.
  .add('yang')
  .add('yMoved')
  .add('yHelps')
  .add('yExorcisms')
  .add('ySaves')
  .add('yDemonExorcisms')
  .add('yStep3')
  .add('yNewBuddhas')
  .add('yNewCrystals')
  .add('yClimbed')
  .add('yMoves')
  .add('yClimbs')
  .add('queue', N_EFFECT)
  .add('queueLen')
  .add('outcome', 6)
  // White Moon.
  .add('wmCrystalReserve')
  .add('wmReceptacles', 4)
  .add('wmSuLingPlaced')
  .add('wmSuLingEvent')
  .add('wmBarrierPending')
  .add('wmBarrier')
  .add('wmBarrierCrystals')
  .add('wmBarrierOrder', 4)
  .add('wmSaved')
  .add('wmDead')
  .add('wmHidden')
  // Black Secret.
  .add('bsIncarnationPool')
  .add('bsIncarnationHand')
  .add('bsIncarnationPoolIds', N_INCARNATION)
  .add('bsUrns')
  .add('bsSkeletonsLeft')
  .add('bsCurseHand')
  .add('bsCurseHandLevel', 4)
  .add('bsCurseReserveLevel', 4)
  .add('bsMantraDeck')
  .add('bsMantraDeckEffect', N_MANTRA_EFFECT)
  .add('bsPendingSummons')
  .add('bsShadow', 3)
  .add('bsCatacombTokens', N_CATACOMB_TOKEN)

export const PROMPT = addGhost(
  new Layout()
    .add('present')
    .add('kind', N_PROMPT_KIND)
    .add('ownerMe')
    .add('ownerRel', 4)
    .add('ownerWuFeng')
    .add('dice', 6) // face counts, relative colours, black, white (÷4)
    .add('nDice')
    .add('canReroll')
    .add('mode', 4)
    .add('scope', 3)
    .add('nTargets')
    .add('nDemons')
    .add('curseFace', 5)
    .add('count')
    .add('taoistRel', 4)
    .add('boardRel', 4)
    .add('nOptions')
    .add('demon', 3)
    .add('mantraEffect', N_MANTRA_EFFECT)
    .add('mantraMode', 2)
    .add('artifact', N_ARTIFACT)
    .add('corner', 4)
    .add('curseTarget', 2)
    .add('shadowHits'),
  'g.',
)

export const SEAT = new Layout()
  .add('bias')
  .add('rel', 4)
  .add('me')
  .add('active')
  .add('turnsUntil', 4)
  .add('player')
  .add('alive')
  .add('dead')
  .add('possessed')
  .add('neutralQi')
  .add('qi')
  .add('qiN', 7)
  .add('tao', 5)
  .add('taoTotal')
  .add('yinYang')
  .add('buddhas')
  .add('newBuddhas')
  .add('powerTokens')
  .add('crystals')
  .add('artifacts', N_ARTIFACT)
  .add('tile', 10)
  .add('underground')
  .add('power', N_POWER)
  .add('powerActive')
  .add('hasOwnPower')
  .add('powerUsed')
  .add('powerBorrowed')
  .add('borrowable')
  .add('cursedBoard')
  .add('bloodBrother')
  .add('ghosts')
  .add('free')
  .add('boardBuddhas')
  .add('haunters')
  .add('tormentors')
  .add('exorcismDice')

export const TILE = new Layout()
  .add('bias')
  .add('kind', N_TILE_KIND)
  .add('haunted')
  .add('circleToken', 6)
  .add('pos', 9)
  .add('corner')
  .add('edge')
  .add('center')
  .add('taoists', 4)
  .add('nTaoists')
  .add('me')
  .add('dist', 3)
  .add('reachable')
  .add('facedGhosts')
  .add('facedFree')
  .add('hauntNext')
  .add('hauntLater')
  .add('templeBuddhas')
  .add('centerTokens')
  .add('wmVillagers')
  .add('wmTopFamily', N_FAMILY)
  .add('wmTopMember')
  .add('wmPortal')
  .add('wmReceptacle')
  .add('bsLadder')
  .add('bsShadow')

export const SPACE = addGhost(
  new Layout()
    .add('bias')
    .add('seat', 4)
    .add('idx', 3)
    .add('mine')
    .add('activeBoard')
    .add('buddha')
    .add('empty')
    .add('faces', 9)
    .add('facesHaunted')
    .add('lineHaunted')
    .add('cornerSpace')
    .add('wmReceptacle')
    .add('wmSuLing')
    .add('reachable')
    .add('figure', 3)
    .add('mantra')
    .add('centerActive', CENTER_ABILITIES.length)
    .add('blocked')
    .add('need', 5)
    .add('needDiscounts')
    .add('hauntTarget', 9),
  'g.',
)

export const FAMILY_T = new Layout()
  .add('bias')
  .add('id', N_FAMILY)
  .add('size', 3)
  .add('saved')
  .add('dead')
  .add('visible')
  .add('hidden')
  .add('complete')
  .add('wiped')

export const CATACOMB = new Layout()
  .add('bias')
  .add('pos', 9)
  .add('color', 5)
  .add('height')
  .add('ladder')
  .add('entrance')
  .add('taoists', 4)
  .add('demons')
  .add('shadow')

export const DEMON_T = new Layout()
  .add('bias')
  .add('id', 3)
  .add('cost')
  .add('resistance')
  .add('onBoard')
  .add('pos', 9)
  .add('color', 5)
  .add('banished')
  .add('mantra')

export const CURSE_T = new Layout()
  .add('bias')
  .add('inHand')
  .add('slot', 4)
  .add('level', 4)
  .add('revealed')
  .add('color', 5)
  .add('effect', N_CURSE_EFFECT)

export const MANTRA_T = new Layout()
  .add('bias')
  .add('level', 3)
  .add('effect', N_MANTRA_EFFECT)
  .add('qi')
  .add('progress')

export type TokenType = 'global' | 'prompt' | 'seat' | 'tile' | 'space' | 'family' | 'catacomb' | 'demon' | 'curse' | 'mantra'

export interface TokenSpec {
  type: TokenType
  slots: number
  layout: Layout
  /** First slot in the whole token sequence. */
  start: number
}

const SPECS: Array<Omit<TokenSpec, 'start'>> = [
  { type: 'global', slots: 1, layout: GLOBAL },
  { type: 'prompt', slots: 1, layout: PROMPT },
  { type: 'seat', slots: 4, layout: SEAT },
  { type: 'tile', slots: 9, layout: TILE },
  { type: 'space', slots: 12, layout: SPACE },
  { type: 'family', slots: N_FAMILY, layout: FAMILY_T },
  { type: 'catacomb', slots: 9, layout: CATACOMB },
  { type: 'demon', slots: 3, layout: DEMON_T },
  { type: 'curse', slots: 24, layout: CURSE_T },
  { type: 'mantra', slots: 6, layout: MANTRA_T },
]

export const TOKENS: TokenSpec[] = (() => {
  let start = 0
  return SPECS.map((s) => {
    const t = { ...s, start }
    start += s.slots
    return t
  })
})()
export const TOKEN: Record<TokenType, TokenSpec> = Object.fromEntries(TOKENS.map((t) => [t.type, t])) as Record<TokenType, TokenSpec>
/** Total token slots. */
export const N_TOKENS = TOKENS.reduce((n, t) => n + t.slots, 0)
/** Pyramid slots first (4 + 3 + 2 + 1), then Wu-Feng's hand. */
export const CURSE_PYRAMID_SLOTS = 10

// ---------------------------------------------------------------------------
// Relations between tokens (a learned attention bias per relation and head)
// ---------------------------------------------------------------------------

export const REL = {
  none: 0,
  self: 1,
  global: 2, // the global / prompt token and any other token
  adjacent: 3, // tile–tile, king's move
  faces: 4, // ghost space – the tile in front of it
  line: 5, // ghost space – the 2nd / 3rd tile of its line
  sameBoard: 6, // ghost space – ghost space on the same board
  board: 7, // ghost space – the seat that owns the board
  onTile: 8, // seat – the tile where its Taoist stands
  opposite: 9, // ghost space – the space at the other end of the line
  prompt: 10, // the prompt – a token it refers to
  sameTile: 11, // seat – seat standing on the same tile
  under: 12, // catacomb space – the village tile above it
  catacombAdjacent: 13,
  demonAt: 14, // demon – its catacomb space
  underground: 15, // seat – the catacomb space where its Taoist stands
  family: 16, // family – a tile where one of its members is on top
  hauntTarget: 17, // ghost space – the tile its haunter will haunt next
  shadow: 18, // global – nothing; kept for the Shadow's tile (tile/catacomb – global)
} as const
export const N_REL = 24

// ---------------------------------------------------------------------------
// Candidate actions: features plus pointers to the tokens they involve
// ---------------------------------------------------------------------------

export const PTR = { tile: 0, tile2: 1, ghost1: 2, ghost2: 3, seat1: 4, seat2: 5, extra: 6, extra2: 7 } as const
export const N_PTR = 8

export const CAND = new Layout()
  .add('bias')
  .add('type', N_ACTION_TYPE)
  .add('resp', N_RESPONSE_KIND)
  .add('help', N_TILE_KIND)
  .add('yinYangFlip')
  .add('yinYangHelp')
  .add('power', N_POWER)
  .add('artifact', N_ARTIFACT)
  .add('moveDist', 3) // stay (back and forth), adjacent, flight
  .add('carry')
  .add('underground')
  .add('color', 5)
  .add('colors', 5)
  .add('nColors')
  .add('spend', 5)
  .add('spendTotal')
  .add('spendOthers')
  .add('crystals')
  .add('nTargets')
  .add('nDemons')
  .add('exorciseNone')
  .add('exorciseAll')
  .add('rerollMask', 4)
  .add('nReroll')
  .add('rerollFaces', 6)
  .add('yes')
  .add('no')
  .add('barrier', 3)
  .add('reclaim')
  .add('scope', 3)
  .add('swap')
  .add('swapEffect', N_MANTRA_EFFECT)
  .add('placeQi')
  .add('revive')
  .add('villager')
  .add('pavilionTaoist')
  .add('climb')
  .add('nBuddhas')
  .add('nullA')
  .add('nullB')
  .add('atCenter')
  .add('heuristic') // the only option offered: the heuristic's answer (prompts the encoder doesn't open up)

// ---------------------------------------------------------------------------
// Schema identity
// ---------------------------------------------------------------------------

export const SCHEMA_VERSION = 1

export interface SchemaJson {
  version: number
  hash: string
  tokens: Array<{ type: TokenType; slots: number; features: number; start: number }>
  nTokens: number
  nRel: number
  candFeatures: number
  nPtr: number
  nOutcome: number
  cardSlots: number
}

function fnv(s: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193) >>> 0
  return h.toString(16).padStart(8, '0')
}

export function schemaJson(): SchemaJson {
  const body = {
    version: SCHEMA_VERSION,
    tokens: TOKENS.map((t) => ({ type: t.type, slots: t.slots, features: t.layout.size, start: t.start })),
    nTokens: N_TOKENS,
    nRel: N_REL,
    candFeatures: CAND.size,
    nPtr: N_PTR,
    nOutcome: N_OUTCOME,
    cardSlots: N_CARD,
  }
  const fields = TOKENS.map((t) => `${t.type}:${Object.entries(t.layout.fields).map(([k, f]) => `${k}/${f.n}`).join(',')}`).join(';')
  const cand = Object.entries(CAND.fields).map(([k, f]) => `${k}/${f.n}`).join(',')
  return { ...body, hash: fnv(`${JSON.stringify(body)}|${fields}|${cand}`) }
}

export const SCHEMA_HASH = schemaJson().hash
