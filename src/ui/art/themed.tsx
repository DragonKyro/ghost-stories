// The pieces the app draws, in the art set of the game being played (see
// variant.tsx). Names follow the engine's vocabulary (Ghost Stories); in a
// Last Bastion game each draws its Bastion counterpart:
//   TileArt → Bastion tile, TaoistFigure → Hero, QiToken → Life,
//   YinYangToken → Call to Arms, TaoToken → Equipment, BuddhaFigure → Trap,
//   HauntingFigure → Grasp of Evil, MantraToken → Enchantment,
//   TaoDie → Combat die, CurseDie → Corruption die, PowerIcon → Hero power.
// Horde cards are recognised by their id, so GhostCardArt needs no context.
import type { GameVariant } from '@/game/types'
import { AbilityIcon as GsAbilityIcon, type AbilityIconProps } from './AbilityIcon'
import type { ArtBaseProps } from './ArtSvg'
import { BastionAbilityIcon } from './bastion/AbilityIcon'
import { CombatDie, CorruptionDie } from './bastion/Dice'
import { HeroFigure } from './bastion/HeroFigure'
import { HordeCardArt } from './bastion/HordeCardArt'
import { BastionLogo } from './bastion/Logo'
import { HeroPowerIcon } from './bastion/PowerIcon'
import { BastionTileArt } from './bastion/TileArt'
import { CallToArmsToken, EnchantmentToken, EquipmentToken, GraspFigure, LifeToken, TrapFigure } from './bastion/Tokens'
import { CurseDie as GsCurseDie, TaoDie as GsTaoDie } from './Dice'
import { GhostCardArt as GsGhostCardArt, type GhostCardArtProps } from './GhostCardArt'
import { Logo as GsLogo } from './Logo'
import { PowerIcon as GsPowerIcon, type PowerIconProps } from './PowerIcon'
import { TaoistFigure as GsTaoistFigure, type TaoistFigureProps } from './TaoistFigure'
import { TileArt as GsTileArt, type TileArtProps } from './TileArt'
import {
  BuddhaFigure as GsBuddhaFigure,
  HauntingFigure as GsHauntingFigure,
  MantraToken as GsMantraToken,
  QiToken as GsQiToken,
  TaoToken as GsTaoToken,
  YinYangToken as GsYinYangToken,
  type TokenProps,
} from './Tokens'
import { useArtVariant, useBastionArt } from './variant'
import type { ComponentProps } from 'react'

export function TileArt(p: TileArtProps) {
  return useBastionArt() ? <BastionTileArt {...p} /> : <GsTileArt {...p} />
}

/** A player's figure; `wounded` only shows in Last Bastion. */
export function TaoistFigure({ wounded, ...p }: TaoistFigureProps & { wounded?: boolean }) {
  return useBastionArt() ? <HeroFigure wounded={wounded} {...p} /> : <GsTaoistFigure {...p} />
}

export function GhostCardArt(p: GhostCardArtProps) {
  return p.card.id.startsWith('lb-') ? <HordeCardArt {...p} /> : <GsGhostCardArt {...p} />
}

export function QiToken(p: TokenProps) {
  return useBastionArt() ? <LifeToken {...p} /> : <GsQiToken {...p} />
}

export function YinYangToken(p: TokenProps & { spent?: boolean }) {
  return useBastionArt() ? <CallToArmsToken {...p} /> : <GsYinYangToken {...p} />
}

export function TaoToken(p: ComponentProps<typeof GsTaoToken>) {
  return useBastionArt() ? <EquipmentToken {...p} /> : <GsTaoToken {...p} />
}

export function BuddhaFigure(p: TokenProps) {
  return useBastionArt() ? <TrapFigure {...p} /> : <GsBuddhaFigure {...p} />
}

export function HauntingFigure(p: TokenProps) {
  return useBastionArt() ? <GraspFigure {...p} /> : <GsHauntingFigure {...p} />
}

export function MantraToken(p: TokenProps) {
  return useBastionArt() ? <EnchantmentToken {...p} /> : <GsMantraToken {...p} />
}

export function TaoDie(p: ComponentProps<typeof GsTaoDie>) {
  return useBastionArt() ? <CombatDie {...p} /> : <GsTaoDie {...p} />
}

export function CurseDie(p: ComponentProps<typeof GsCurseDie>) {
  return useBastionArt() ? <CorruptionDie {...p} /> : <GsCurseDie {...p} />
}

export function PowerIcon(p: PowerIconProps) {
  return useBastionArt() ? <HeroPowerIcon {...p} /> : <GsPowerIcon {...p} />
}

export function AbilityIcon(p: AbilityIconProps) {
  return useBastionArt() ? <BastionAbilityIcon {...p} /> : <GsAbilityIcon {...p} />
}

/** The title art; `variant` overrides the context (the main menu previews the selected game). */
export function Logo({ variant, ...p }: ArtBaseProps & { width?: number; variant?: GameVariant }) {
  const ctx = useArtVariant()
  return (variant ?? ctx) === 'bastion' ? <BastionLogo {...p} /> : <GsLogo {...p} />
}
