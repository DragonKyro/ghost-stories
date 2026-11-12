// Board interaction: which tiles / ghost spaces / catacomb spaces are
// clickable right now, and what a click does. Driven by the open prompt (when
// this device may answer it) or by the player's current selection during
// their Yang phase.

import { useMemo } from 'react'
import type { Action, HelpParams } from '@/game/actions'
import { isSkeleton } from '@/game/catalogue'
import { placementOptions } from '@/game/flow'
import { adjacentTiles, facedSpaces, isAdjacent, isCorner, refKey } from '@/game/geometry'
import {
  cardAt,
  exorcismBlocker,
  ghostAt,
  ghostsInPlay,
  hasPower,
  isSolo,
  livingTaoists,
  shadowOnTile,
} from '@/game/rules'
import { canMove, step2Problem } from '@/game/yang'
import type { Color, GameState, GhostRef, Seat, TileIdx } from '@/game/types'
import { useGameStore } from '@/store/gameStore'
import { useUiStore, type HelpDraft, type Selecting } from '@/store/uiStore'
import { useCanAct } from './seats'

export interface Interaction {
  /** Targets are only suggestions (nothing selected yet): draw them quietly. */
  soft?: boolean
  tiles: Set<number>
  spaces: Set<string>
  catacombs: Set<number>
  picked: Set<string>
  hint: string | null
  onTile: (t: TileIdx) => void
  onSpace: (r: GhostRef) => void
  onCatacomb: (t: TileIdx) => void
}

const NONE: Interaction = {
  tiles: new Set(),
  spaces: new Set(),
  catacombs: new Set(),
  picked: new Set(),
  hint: null,
  onTile: () => {},
  onSpace: () => {},
  onCatacomb: () => {},
}

function send(a: Action): boolean {
  const ok = useGameStore.getState().dispatch(a)
  if (ok) useUiStore.getState().select(null)
  return ok
}

export function useInteraction(game: GameState): Interaction {
  const selecting = useUiStore((u) => u.selecting)
  const carry = useUiStore((u) => u.carry)
  const climb = useUiStore((u) => u.climb)
  const canAct = useCanAct()
  return useMemo(() => compute(game, selecting, canAct, carry, climb), [game, selecting, canAct, carry, climb])
}

function compute(s: GameState, sel: Selecting | null, canAct: (seat: Seat) => boolean, carry: boolean, climb: boolean): Interaction {
  const p = s.prompt
  if (s.phase === 'gameOver') return NONE

  // --- Prompts answered on the board. ---
  if (p) {
    if (!canAct(p.owner)) return NONE
    const respond = (r: Extract<Action, { type: 'respond' }>['r']) => send({ type: 'respond', by: p.owner, r })
    switch (p.kind) {
      case 'placeGhost':
        return spacesOnly(p.options, 'Choose a free space for the arriving ghost.', (ref) => respond({ kind: 'placeGhost', ref }))
      case 'suLing':
        return spacesOnly(p.options, 'Choose where Su-Ling stands (or skip in the panel).', (ref) => respond({ kind: 'suLing', ref }))
      case 'wuFengSkeleton':
        return spacesOnly(p.options, 'Wu-Feng: choose a free space for the skeleton.', (ref) => respond({ kind: 'wuFengSkeleton', ref }))
      case 'wuFengGhost': {
        const opts = placementOptions(s, p.card)
        return spacesOnly(opts, 'Wu-Feng: click a space to place the ghost, or use it in the panel.', (ref) =>
          respond({ kind: 'wuFengGhost', choice: { kind: 'place', ref } }),
        )
      }
      case 'devour':
        return tilesOnly(p.options, 'A Devourer: choose which visible villager is killed.', (tile) => respond({ kind: 'devour', tile }))
      case 'restoreTile':
        return tilesOnly(p.options, 'Choose a haunted tile to restore.', (tile) => respond({ kind: 'restoreTile', tile }))
      case 'wuFengCurseTarget':
        return tilesOnly(p.options, p.effect === 'hauntTile' ? 'Wu-Feng: choose a tile to haunt.' : 'Wu-Feng: choose a ladder to remove.', (tile) =>
          respond({ kind: 'wuFengCurseTarget', tile }),
        )
      case 'mantraTarget':
        if (p.mantra === 'unhaunt') return tilesOnly(p.options, 'Choose a haunted tile to restore.', (tile) => respond({ kind: 'mantraTarget', target: tile }))
        return NONE
      case 'wuFengDemon': {
        const d = s.blackSecret!.demons.find((x) => x.id === p.demon)!
        const opts = adjacentTiles(d.space!)
        return { ...NONE, catacombs: new Set(opts), hint: 'Wu-Feng: move the demon (click a catacomb space) or search.', onCatacomb: (to) => respond({ kind: 'wuFengDemon', choice: { kind: 'move', to } }) }
      }
      case 'wuFengShadow':
        return {
          ...NONE,
          tiles: new Set([0, 1, 2, 3, 4, 5, 6, 7, 8]),
          catacombs: new Set([0, 1, 2, 3, 4, 5, 6, 7, 8]),
          hint: 'Wu-Feng: the Shadow may move anywhere (click), or act from the panel.',
          onTile: (tile) => respond({ kind: 'wuFengShadow', choice: { kind: 'move', where: 'village', tile } }),
          onCatacomb: (tile) => respond({ kind: 'wuFengShadow', choice: { kind: 'move', where: 'catacombs', tile } }),
        }
      default:
        return NONE
    }
  }

  // --- The active Taoist's Yang phase. ---
  if (s.phase !== 'yang' || !s.yang || !canAct(s.active)) return NONE
  const c = s.active
  const t = s.taoists[c]
  if (t.tile == null) return NONE
  const here = t.tile

  const moveTargets = (): number[] => {
    if (!canMove(s)) return []
    const fly = hasPower(s, c, 'danceOfTheSpires')
    return [0, 1, 2, 3, 4, 5, 6, 7, 8].filter((x) => x !== here && (fly || isAdjacent(here, x)))
  }
  const exoTargets = (): GhostRef[] =>
    t.underground || step2Problem(s, 'exorcise') ? [] : facedSpaces(here).filter((r) => ghostAt(s, r) && !exorcismBlocker(s, r))

  const doMove = (to: number) => {
    const a: Action = carry && !t.underground ? { type: 'move', by: c, to, carry: { from: here } } : { type: 'move', by: c, to }
    if (send(a)) useUiStore.getState().setCarry(false)
  }
  const startExorcise = (ref: GhostRef) => {
    const targets = exoTargets()
    if (isCorner(here) && targets.length === 2) {
      useUiStore.getState().select({ kind: 'exorcise', picked: [ref] })
      return
    }
    send({ type: 'exorcise', by: c, targets: [ref] })
  }

  switch (sel?.kind) {
    case 'move': {
      if (t.underground) {
        const fly = hasPower(s, c, 'danceOfTheSpires')
        const cats = [0, 1, 2, 3, 4, 5, 6, 7, 8].filter((x) => x !== here && (fly || isAdjacent(here, x)))
        return { ...NONE, catacombs: new Set(cats), hint: 'Move through the catacombs.', onCatacomb: (to) => send({ type: 'move', by: c, to }) }
      }
      return tilesOnly(moveTargets(), carry ? 'Move — the top villager here comes with you.' : 'Move to a highlighted tile.', doMove)
    }
    case 'exorcise': {
      const targets = exoTargets()
      const picked = new Set(sel.picked.map(refKey))
      return {
        ...NONE,
        spaces: new Set(targets.map(refKey)),
        picked,
        hint: isCorner(here) ? 'Corner tile: pick one or both ghosts, then roll in the panel.' : 'Pick the ghost to exorcise.',
        onSpace: (ref) => {
          const k = refKey(ref)
          const next = picked.has(k) ? sel.picked.filter((x) => refKey(x) !== k) : [...sel.picked, ref].slice(-2)
          useUiStore.getState().select({ kind: 'exorcise', picked: next })
        },
      }
    }
    case 'buddha': {
      const opts = t.underground ? [] : facedSpaces(here).filter((r) => !ghostAt(s, r) && !s.boards[r.board].buddhas[r.space])
      return spacesOnly(opts, 'Place a Buddha on an empty space you face.', (ref) => send({ type: 'placeBuddha', by: c, spaces: [ref] }))
    }
    case 'mantra': {
      const opts = ghostsInPlay(s).filter((g) => !isSkeleton(g.ghost.card)).map((g) => g.ref)
      const demonSpaces = (s.blackSecret?.demons ?? []).filter((d) => d.space !== null).map((d) => d.space!)
      return {
        ...spacesOnly(opts, 'Place the Enfeeblement Mantra on any ghost (or on a demon in the catacombs panel).', (ghost) =>
          send({ type: 'power', by: c, use: { power: 'enfeeblementMantra', ghost } }),
        ),
        catacombs: new Set(demonSpaces),
        onCatacomb: (space) => {
          const d = s.blackSecret!.demons.find((x) => x.space === space)
          if (d) send({ type: 'power', by: c, use: { power: 'enfeeblementMantra', demon: d.id } })
        },
      }
    }
    case 'twinWinds': {
      if (!sel.taoist) return { ...NONE, hint: 'Choose which Taoist the Twin Winds carry (in the panel).' }
      const o = s.taoists[sel.taoist]
      if (o.tile == null) return NONE
      const opts = adjacentTiles(o.tile)
      const fire = (to: number) =>
        send({ type: 'power', by: c, use: { power: 'danceOfTheTwinWinds', taoist: sel.taoist!, to, carry: carry || undefined, climb: climb || undefined } })
      if (o.underground) return { ...NONE, catacombs: new Set(opts), hint: 'Move them 1 space in the catacombs.', onCatacomb: fire }
      return tilesOnly(opts, 'Move them 1 space.', fire)
    }
    case 'yinYangFlip':
      return tilesOnly(s.village.filter((x) => x.haunted).map((x) => x.idx), 'Yin-Yang: click a haunted tile to restore it.', (tile) =>
        send({ type: 'yinYang', by: c, use: { kind: 'flip', tile } }),
      )
    case 'yinYangTile':
      return tilesOnly(
        s.village.filter((x) => !x.haunted && !shadowOnTile(s, x.idx)).map((x) => x.idx),
        'Yin-Yang: click any active tile to ask its villager for help.',
        (tile) => startHelp(s, c, tile, true),
      )
    case 'artifact':
      if (sel.artifact === 'jadeTalisman') {
        return tilesOnly(s.village.filter((x) => x.haunted).map((x) => x.idx), 'Jade Talisman: click a haunted tile.', (tile) =>
          send({ type: 'artifact', by: c, artifact: 'jadeTalisman', tile }),
        )
      }
      return spacesOnly(
        ghostsInPlay(s).filter((g) => !g.card.incarnation && !isSkeleton(g.ghost.card)).map((g) => g.ref),
        'Phoenix Feather: click a ghost to discard.',
        (ghost) => send({ type: 'artifact', by: c, artifact: 'phoenixFeather', ghost }),
      )
    case 'help':
      return helpInteraction(s, c, sel.draft)
    default: {
      // No selection: click a reachable tile to move, a faced ghost to exorcise.
      const tiles = t.underground ? [] : moveTargets()
      const ghosts = exoTargets()
      return {
        ...NONE,
        soft: true,
        tiles: new Set(tiles),
        spaces: new Set(ghosts.map(refKey)),
        hint: tiles.length ? 'Click a tile to move there, or a ghost you face to exorcise it.' : ghosts.length ? 'Click a ghost you face to exorcise it.' : null,
        onTile: (to) => tiles.includes(to) && doMove(to),
        onSpace: (ref) => ghosts.some((g) => refKey(g) === refKey(ref)) && startExorcise(ref),
      }
    }
  }
}

/** Start a tile action: send it now if it needs no parameters, else open a draft. */
export function startHelp(s: GameState, c: Color, tile: TileIdx, viaYinYang: boolean): void {
  const kind = s.village[tile]!.kind
  const fire = (params: HelpParams) =>
    viaYinYang ? send({ type: 'yinYang', by: c, use: { kind: 'help', tile, params } }) : send({ type: 'help', by: c, params })
  if (kind === 'buddhistTemple' || kind === 'herbalistShop') {
    fire({ kind })
    return
  }
  useUiStore.getState().select({ kind: 'help', draft: { kind, tile, viaYinYang } })
}

export function fireHelp(c: Color, d: HelpDraft, params: HelpParams): boolean {
  return d.viaYinYang
    ? send({ type: 'yinYang', by: c, use: { kind: 'help', tile: d.tile, params } })
    : send({ type: 'help', by: c, params })
}

function helpInteraction(s: GameState, c: Color, d: HelpDraft): Interaction {
  const set = (patch: Partial<HelpDraft>) => useUiStore.getState().select({ kind: 'help', draft: { ...d, ...patch } })
  switch (d.kind) {
    case 'sorcerersHut':
      return spacesOnly(
        ghostsInPlay(s).filter((g) => !g.card.incarnation && !isSkeleton(g.ghost.card)).map((g) => g.ref),
        "Sorcerer's Hut: click the ghost to banish (you lose 1 Qi).",
        (ghost) => fireHelp(c, d, { kind: 'sorcerersHut', ghost }),
      )
    case 'nightWatchman': {
      const all = ghostsInPlay(s).map((g) => g.ref)
      const boards = [...new Set(all.map((r) => r.board))]
      const refs = boards.flatMap((b) => ([0, 1, 2] as const).map((space) => ({ board: b, space })))
      return spacesOnly(refs, 'Night Watchman: click any space of the board whose haunting figures go back.', (r) =>
        fireHelp(c, d, { kind: 'nightWatchman', board: r.board }),
      )
    }
    case 'taoistAltar':
      return tilesOnly(s.village.filter((x) => x.haunted).map((x) => x.idx), 'Taoist Altar: click the haunted tile to restore (then a ghost arrives).', (tile) =>
        fireHelp(c, d, { kind: 'taoistAltar', tile }),
      )
    case 'pavilion': {
      if (!d.ghost) {
        return spacesOnly(
          ghostsInPlay(s).filter((g) => !isSkeleton(g.ghost.card)).map((g) => g.ref),
          'Pavilion: click the ghost the wind will move.',
          (ghost) => set({ ghost }),
        )
      }
      if (!d.to) {
        const free = (['red', 'blue', 'green', 'yellow'] as Color[]).flatMap((b) =>
          ([0, 1, 2] as const).filter((sp) => !s.boards[b].spaces[sp]).map((space) => ({ board: b, space })),
        )
        return { ...spacesOnly(free, 'Pavilion: click a free space (a Buddha there destroys it).', (to) => set({ to })), picked: new Set([refKey(d.ghost)]) }
      }
      const movers = isSolo(s) ? [c] : livingTaoists(s).filter((x) => x.color !== c && x.tile != null).map((x) => x.color)
      if (movers.length === 0) return { ...NONE, hint: 'Nobody else can be moved: confirm in the panel.' }
      if (!d.taoist) return { ...NONE, hint: 'Pavilion: now choose the Taoist the wind carries (panel).' }
      const o = s.taoists[d.taoist]
      const opts = adjacentTiles(o.tile!)
      const fire = (to: number) =>
        fireHelp(c, d, { kind: 'pavilion', ghost: d.ghost!, to: d.to!, taoist: d.taoist!, taoistTo: to, carry: d.carry || undefined, climb: d.climb || undefined })
      if (o.underground) return { ...NONE, catacombs: new Set(opts), hint: 'Pavilion: move them 1 space.', onCatacomb: fire }
      return tilesOnly(opts, `Pavilion: move them 1 space.`, fire)
    }
    default:
      return NONE
  }
}

function spacesOnly(refs: GhostRef[], hint: string, on: (r: GhostRef) => unknown): Interaction {
  const keys = new Set(refs.map(refKey))
  return { ...NONE, spaces: keys, hint, onSpace: (r) => keys.has(refKey(r)) && on(r) }
}

function tilesOnly(tiles: number[], hint: string, on: (t: number) => unknown): Interaction {
  const set = new Set(tiles)
  return { ...NONE, tiles: set, hint, onTile: (t) => set.has(t) && on(t) }
}

export { cardAt }
