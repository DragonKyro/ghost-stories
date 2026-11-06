// Village tiles: a square ink-painted vignette of each location with its
// villager (active side), or the same place at night, abandoned and haunted
// (haunted side). Active tiles carry a parchment strip summarising the action.
import type { TileKind } from '@/game/types'
import { ArtSvg, type ArtBaseProps } from './ArtSvg'
import { DayGround, Frame, NightGround, NightStrip, SealStamp, Strip, TornCorner } from './tiles/kit'
import { SCENES_1 } from './tiles/scenes1'
import { SCENES_2 } from './tiles/scenes2'
import { SCENES_3 } from './tiles/scenes3'
import { StripIcons } from './tiles/strips'
import type { SceneDef } from './tiles/types'

export interface TileArtProps extends ArtBaseProps {
  kind: TileKind
  haunted: boolean
  size?: number
}

const SCENES: Record<TileKind, SceneDef> = { ...SCENES_1, ...SCENES_2, ...SCENES_3 }

const TILE_LABEL: Record<TileKind, string> = {
  circleOfPrayer: 'Circle of Prayer',
  buddhistTemple: 'Buddhist Temple',
  cemetery: 'Cemetery',
  taoistAltar: 'Taoist Altar',
  herbalistShop: "Herbalist's Shop",
  sorcerersHut: "Sorcerer's Hut",
  nightWatchman: "Night Watchman's Beat",
  pavilion: 'Pavilion of the Heavenly Wind',
  teaHouse: 'Tea House',
  kungFuSchool: 'Kung-Fu School',
  calligrapher: 'Calligrapher',
}

export function TileArt({ kind, haunted, size = 200, title, ...rest }: TileArtProps) {
  const def = SCENES[kind]
  const { Scene } = def
  return (
    <ArtSvg width={size} height={size} viewBox="0 0 240 240" title={title ?? `${TILE_LABEL[kind]}${haunted ? ' (haunted)' : ''}`} {...rest}>
      {/* Nested viewport: clips washes and mist to the tile. */}
      <svg width={240} height={240} viewBox="0 0 240 240" overflow="hidden">
        {haunted ? <NightGround moon={def.moon} /> : <DayGround washes={def.washes} />}
        <Scene night={haunted} />
        {!haunted && <SealStamp x={def.seal[0]} y={def.seal[1]} />}
        {haunted ? (
          <NightStrip />
        ) : (
          <Strip>
            <StripIcons kind={kind} />
          </Strip>
        )}
        <Frame night={haunted} />
        {haunted && <TornCorner />}
      </svg>
    </ArtSvg>
  )
}
