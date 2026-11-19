// Last Bastion tokens and figures: Life, Call to Arms, Equipment, the Trap,
// Net and Standard figures, the Grasp of Evil and Mylfaar's Enchantment.
import type { TaoColor } from '@/game/types'
import { ArtSvg } from '../ArtSvg'
import type { TokenProps } from '../Tokens'
import { EnchantG, EquipG, GraspG, HornG, LifeG, NetG, StandardG, TrapG } from './glyphs'

const NAME: Record<TaoColor, string> = { red: 'Red', blue: 'Blue', green: 'Green', yellow: 'Yellow', black: 'Black' }

export function LifeToken({ size = 24, title, ...rest }: TokenProps) {
  return (
    <ArtSvg width={size} height={size} viewBox="0 0 100 100" title={title ?? 'Life token'} {...rest}>
      <LifeG />
    </ArtSvg>
  )
}

export function CallToArmsToken({ size = 24, spent = false, title, ...rest }: TokenProps & { spent?: boolean }) {
  return (
    <ArtSvg width={size} height={size} viewBox="0 0 100 100" title={title ?? (spent ? 'Call to Arms (spent)' : 'Call to Arms')} {...rest}>
      <HornG spent={spent} />
    </ArtSvg>
  )
}

export function EquipmentToken({ color, size = 24, title, ...rest }: TokenProps & { color: TaoColor }) {
  return (
    <ArtSvg width={size} height={size} viewBox="0 0 100 100" title={title ?? `${NAME[color]} Equipment token`} {...rest}>
      <EquipG color={color} />
    </ArtSvg>
  )
}

export function TrapFigure({ size = 28, title, ...rest }: TokenProps) {
  return (
    <ArtSvg width={size} height={size} viewBox="0 0 100 100" title={title ?? 'Trap figure'} {...rest}>
      <TrapG />
    </ArtSvg>
  )
}

export function GraspFigure({ size = 24, title, ...rest }: TokenProps) {
  return (
    <ArtSvg width={size} height={size} viewBox="0 0 100 100" title={title ?? 'Grasp of Evil figure'} {...rest}>
      <GraspG />
    </ArtSvg>
  )
}

export function EnchantmentToken({ size = 24, title, ...rest }: TokenProps) {
  return (
    <ArtSvg width={size} height={size} viewBox="0 0 100 100" title={title ?? "Mylfaar's Enchantment"} {...rest}>
      <EnchantG />
    </ArtSvg>
  )
}

export function NetToken({ size = 24, title, ...rest }: TokenProps) {
  return (
    <ArtSvg width={size} height={size} viewBox="0 0 100 100" title={title ?? 'Net figure'} {...rest}>
      <NetG />
    </ArtSvg>
  )
}

/** A Standard token (in the colour the Standard weakens). */
export function StandardToken({ color, size = 24, title, ...rest }: TokenProps & { color: TaoColor }) {
  return (
    <ArtSvg width={size} height={size} viewBox="0 0 100 100" title={title ?? `${NAME[color]} Standard token`} {...rest}>
      <StandardG color={color} />
    </ArtSvg>
  )
}
