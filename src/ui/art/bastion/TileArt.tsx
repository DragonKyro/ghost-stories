// Bastion tiles: a square vignette of each place in the fortress, framed in
// masonry with iron corners, with a parchment strip summarising its action.
// `haunted` = in the Grasp of Evil: the same place drained toward violet and
// black, briars creeping in from the edges, the action chained (a Call to
// Arms can still reach it).
import { BASTION_TILE_NAME } from '@/game/rules'
import type { TileKind } from '@/game/types'
import { ArtSvg } from '../ArtSvg'
import { TileArt, type TileArtProps } from '../TileArt'
import { Backdrop, Frame, GraspOverlay, Strip, type SceneDef } from './tiles/kit'
import { SCENES_1 } from './tiles/scenes1'
import { SCENES_2 } from './tiles/scenes2'
import { SCENES_3 } from './tiles/scenes3'
import { StripIcons } from './tiles/strips'

const SCENES: Partial<Record<TileKind, SceneDef>> = { ...SCENES_1, ...SCENES_2, ...SCENES_3 }

export function BastionTileArt({ kind, haunted, size = 200, title, ...rest }: TileArtProps) {
  const def = SCENES[kind]
  // The White Moon / Black Secret tiles never come up in Last Bastion.
  if (!def) return <TileArt kind={kind} haunted={haunted} size={size} title={title} {...rest} />
  const { Scene } = def
  return (
    <ArtSvg width={size} height={size} viewBox="0 0 240 240" title={title ?? `${BASTION_TILE_NAME[kind]}${haunted ? ' (Grasp of Evil)' : ''}`} {...rest}>
      {/* Nested viewport: clips the scene to the tile. */}
      <svg width={240} height={240} viewBox="0 0 240 240" overflow="hidden">
        <g filter={haunted ? 'url(#lb-tile-grasp)' : undefined}>
          <Backdrop def={def} />
          <Scene grasp={haunted} />
        </g>
        {haunted && <GraspOverlay />}
        <Strip grasp={haunted}>
          <StripIcons kind={kind} />
        </Strip>
        <Frame grasp={haunted} />
      </svg>
    </ArtSvg>
  )
}
