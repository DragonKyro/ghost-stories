// Combat dice and the Corruption die. `rolling` wobbles them (keyframes in <ArtDefs />).
import type { CurseFace, DieFace } from '@/game/types'
import { ArtSvg } from '../ArtSvg'
import type { DieProps } from '../Dice'
import { CombatFaceG, CorruptionFaceG } from './glyphs'

const DIE_LABEL: Record<DieFace, string> = {
  red: 'red',
  blue: 'blue',
  green: 'green',
  yellow: 'yellow',
  black: 'black',
  white: 'white (wild)',
}

export function CombatDie({ face, size = 36, dim = false, rolling = false, title, ...rest }: DieProps & { face: DieFace; dim?: boolean }) {
  return (
    <ArtSvg width={size} height={size} viewBox="0 0 100 100" title={title ?? `Combat die: ${DIE_LABEL[face]}`} {...rest}>
      <g className={rolling ? 'gs-rolling' : undefined} opacity={dim ? 0.38 : 1}>
        <CombatFaceG face={face} />
      </g>
    </ArtSvg>
  )
}

const CORRUPTION_LABEL: Record<CurseFace, string> = {
  blank: 'no effect',
  haunt: 'a Bastion tile falls into the Grasp of Evil',
  ghost: 'a Horde card comes into play',
  loseTao: 'lose all Equipment tokens',
  loseQi: 'lose 1 Life token',
}

export function CorruptionDie({ face, size = 36, rolling = false, title, ...rest }: DieProps & { face: CurseFace }) {
  return (
    <ArtSvg width={size} height={size} viewBox="0 0 100 100" title={title ?? `Corruption die: ${CORRUPTION_LABEL[face]}`} {...rest}>
      <g className={rolling ? 'gs-rolling' : undefined}>
        <CorruptionFaceG face={face} />
      </g>
    </ArtSvg>
  )
}
