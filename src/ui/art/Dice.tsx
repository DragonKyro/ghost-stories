// Tao dice and the curse die. `rolling` (or the `gs-rolling` CSS class on any
// art piece) wobbles them; the keyframes live in <ArtDefs />.
import type { CurseFace, DieFace } from '@/game/types'
import { ArtSvg, type ArtBaseProps } from './ArtSvg'
import { CurseFaceG, TaoDieFaceG } from './glyphs'

export interface DieProps extends ArtBaseProps {
  size?: number
  /** Wobble as if mid-roll. */
  rolling?: boolean
}

const DIE_LABEL: Record<DieFace, string> = {
  red: 'red',
  blue: 'blue',
  green: 'green',
  yellow: 'yellow',
  black: 'black (curse)',
  white: 'white (wild)',
}

export function TaoDie({ face, size = 36, dim = false, rolling = false, title, ...rest }: DieProps & { face: DieFace; dim?: boolean }) {
  return (
    <ArtSvg width={size} height={size} viewBox="0 0 100 100" title={title ?? `Tao die: ${DIE_LABEL[face]}`} {...rest}>
      <g className={rolling ? 'gs-rolling' : undefined} opacity={dim ? 0.38 : 1}>
        <TaoDieFaceG face={face} />
      </g>
    </ArtSvg>
  )
}

const CURSE_LABEL: Record<CurseFace, string> = {
  blank: 'no effect',
  haunt: 'haunt a tile',
  ghost: 'a ghost arrives',
  loseTao: 'lose all Tao tokens',
  loseQi: 'lose 1 Qi',
}

export function CurseDie({ face, size = 36, rolling = false, title, ...rest }: DieProps & { face: CurseFace }) {
  return (
    <ArtSvg width={size} height={size} viewBox="0 0 100 100" title={title ?? `Curse die: ${CURSE_LABEL[face]}`} {...rest}>
      <g className={rolling ? 'gs-rolling' : undefined}>
        <CurseFaceG face={face} />
      </g>
    </ArtSvg>
  )
}
