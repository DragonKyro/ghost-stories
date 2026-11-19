// Gallery sections for the Last Bastion art set (?gallery=lb-tiles,lb-cards…).
// Unlike the Ghost Stories gallery it reads the real Horde deck from the
// catalogue, so every card can be checked.
import type { ReactNode } from 'react'
import { allCards } from '@/game/catalogue'
import { BASTION_POWER_NAME, BASTION_TILE_NAME } from '@/game/rules'
import { BASE_TILES, type AbilityKind, type Color, type CurseFace, type DieFace, type PowerId, type TaoColor } from '@/game/types'
import { Cell, row, Section } from '../galleryKit'
import { BASTION_ABILITY_LABEL, BastionAbilityIcon } from './AbilityIcon'
import { CombatDie, CorruptionDie } from './Dice'
import { HeroFigure } from './HeroFigure'
import { HordeCardArt } from './HordeCardArt'
import { BastionLogo } from './Logo'
import { HeroPowerIcon } from './PowerIcon'
import { BastionTileArt } from './TileArt'
import { CallToArmsToken, EnchantmentToken, EquipmentToken, GraspFigure, LifeToken, NetToken, StandardToken, TrapFigure } from './Tokens'

const TILES = BASE_TILES
const COLORS: Color[] = ['red', 'blue', 'green', 'yellow']
const TAO: TaoColor[] = ['red', 'blue', 'green', 'yellow', 'black']
const FACES: DieFace[] = ['red', 'blue', 'green', 'yellow', 'black', 'white']
const CORRUPTION: CurseFace[] = ['blank', 'haunt', 'ghost', 'loseTao', 'loseQi']
const POWERS = Object.keys(BASTION_POWER_NAME) as PowerId[]
const ABILITIES = Object.keys(BASTION_ABILITY_LABEL) as AbilityKind[]
const CARDS = allCards().filter((c) => c.id.startsWith('lb-'))
const MONSTERS = CARDS.filter((c) => !c.incarnation)
const WARLORDS = CARDS.filter((c) => c.incarnation)

/** The Bastion UI background, so pieces are judged where they'll be seen. */
function Night({ children }: { children: ReactNode }) {
  return <div style={{ background: '#14171e', padding: 14, borderRadius: 8, margin: '0 -14px 14px' }}>{children}</div>
}

function LogoSection() {
  return (
    <Section id="lb-logo" title="Last Bastion — logo">
      <Night>
        <div style={row}>
          <BastionLogo width={560} />
          <BastionLogo width={280} />
        </div>
      </Night>
    </Section>
  )
}

function TilesSection() {
  return (
    <Section id="lb-tiles" title="Bastion tiles — active / Grasp of Evil at 200px, then 150px and 110px">
      <Night>
        {[200, 150, 110].map((size) => (
          <div key={size} style={row}>
            {TILES.map((k) => (
              <Cell key={k} label={size === 200 ? BASTION_TILE_NAME[k] : undefined}>
                <BastionTileArt kind={k} haunted={false} size={size} />
                <BastionTileArt kind={k} haunted size={size} />
              </Cell>
            ))}
          </div>
        ))}
      </Night>
    </Section>
  )
}

function CardRows({ cards }: { cards: typeof CARDS }) {
  return (
    <Night>
      <div style={row}>
        {cards.map((c) => (
          <Cell key={c.id} label={c.id}>
            <HordeCardArt card={c} width={170} />
          </Cell>
        ))}
      </div>
      {[90, 70].map((w) => (
        <div key={w} style={row}>
          {cards.map((c) => (
            <HordeCardArt key={c.id} card={c} width={w} compact />
          ))}
        </div>
      ))}
    </Night>
  )
}

function CardsSection() {
  return (
    <Section id="lb-cards" title={`Monster cards (${MONSTERS.length}) — 170px, then compact 90px / 70px`}>
      <CardRows cards={MONSTERS} />
    </Section>
  )
}

function WarlordsSection() {
  return (
    <Section id="lb-warlords" title={`Warlord cards (${WARLORDS.length})`}>
      <CardRows cards={WARLORDS} />
    </Section>
  )
}

function HeroesSection() {
  return (
    <Section id="lb-heroes" title="Hero figures — 30 / 40 / 80px, active, wounded, taken out (lying)">
      <Night>
        <div style={row}>
          {COLORS.map((c) => (
            <Cell key={c} label={c}>
              <HeroFigure color={c} size={30} />
              <HeroFigure color={c} size={40} />
              <HeroFigure color={c} size={80} />
              <HeroFigure color={c} size={80} active />
              <HeroFigure color={c} size={80} wounded />
              <HeroFigure color={c} size={80} lying />
            </Cell>
          ))}
        </div>
      </Night>
    </Section>
  )
}

function TokensSection() {
  const both = (f: (s: number) => ReactNode) => [16, 24, 48].map((s) => <span key={s}>{f(s)}</span>)
  return (
    <Section id="lb-tokens" title="Tokens and figures — 16 / 24 / 48px">
      <Night>
        <div style={row}>
          <Cell label="Life">{both((s) => <LifeToken size={s} />)}</Cell>
          <Cell label="Call to Arms / spent">
            {both((s) => <CallToArmsToken size={s} />)}
            <CallToArmsToken size={48} spent />
          </Cell>
          <Cell label="Trap">{both((s) => <TrapFigure size={s} />)}</Cell>
          <Cell label="Grasp of Evil">{both((s) => <GraspFigure size={s} />)}</Cell>
          <Cell label="Enchantment">{both((s) => <EnchantmentToken size={s} />)}</Cell>
          <Cell label="Net">{both((s) => <NetToken size={s} />)}</Cell>
        </div>
        <div style={row}>
          {TAO.map((c) => (
            <Cell key={c} label={`Equipment / Standard — ${c}`}>
              <EquipmentToken color={c} size={16} />
              <EquipmentToken color={c} size={24} />
              <EquipmentToken color={c} size={48} />
              <StandardToken color={c} size={24} />
              <StandardToken color={c} size={48} />
            </Cell>
          ))}
        </div>
      </Night>
    </Section>
  )
}

function DiceSection() {
  return (
    <Section id="lb-dice" title="Combat dice and the Corruption die — 18 / 40 / 64px">
      <Night>
        <div style={row}>
          {FACES.map((f) => (
            <Cell key={f} label={f}>
              <CombatDie face={f} size={18} />
              <CombatDie face={f} size={40} />
              <CombatDie face={f} size={64} />
            </Cell>
          ))}
          <Cell label="dim / rolling">
            <CombatDie face="red" size={40} dim />
            <CombatDie face="blue" size={40} rolling />
          </Cell>
        </div>
        <div style={row}>
          {CORRUPTION.map((f) => (
            <Cell key={f} label={f}>
              <CorruptionDie face={f} size={18} />
              <CorruptionDie face={f} size={40} />
              <CorruptionDie face={f} size={64} />
            </Cell>
          ))}
        </div>
      </Night>
    </Section>
  )
}

function PowersSection() {
  return (
    <Section id="lb-powers" title="Hero powers — 22 / 32 / 64px, inactive">
      <Night>
        <div style={row}>
          {POWERS.map((p) => (
            <Cell key={p} label={`${BASTION_POWER_NAME[p]} (${p})`}>
              <HeroPowerIcon power={p} size={22} />
              <HeroPowerIcon power={p} size={32} />
              <HeroPowerIcon power={p} size={64} />
              <HeroPowerIcon power={p} size={32} inactive />
            </Cell>
          ))}
        </div>
      </Night>
    </Section>
  )
}

function AbilitiesSection() {
  return (
    <Section id="lb-abilities" title="Horde card effects — 24 / 40 / 64px, group">
      <Night>
        <div style={row}>
          {ABILITIES.map((k) => (
            <Cell key={k} label={BASTION_ABILITY_LABEL[k]}>
              <BastionAbilityIcon kind={k} size={24} />
              <BastionAbilityIcon kind={k} size={40} />
              <BastionAbilityIcon kind={k} size={64} />
              <BastionAbilityIcon kind={k} size={40} group />
            </Cell>
          ))}
        </div>
      </Night>
    </Section>
  )
}

/** The Bastion at game size: tiles at 150px, compact cards, heroes and tokens on top. */
function MockSection() {
  const T = 150
  const haunted = new Set([2, 6])
  const card = (i: number) => <HordeCardArt card={CARDS[i % CARDS.length]!} width={Math.round(T * 0.6)} compact />
  return (
    <Section id="lb-mock" title="In context — tiles at 150px, compact cards at 90px">
      <Night>
        <div style={{ display: 'grid', gridTemplateColumns: `110px ${T * 3}px 110px`, gap: 8, alignItems: 'center', justifyItems: 'center', width: 'max-content' }}>
          <div />
          <div style={{ display: 'flex', gap: 30 }}>
            {card(0)}
            {card(13)}
            {card(55)}
          </div>
          <div />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {card(31)}
            {card(44)}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(3, ${T}px)`, position: 'relative' }}>
            {TILES.map((k, i) => (
              <div key={k} style={{ position: 'relative', width: T, height: T }}>
                <BastionTileArt kind={k} haunted={haunted.has(i)} size={T} />
                {haunted.has(i) && (
                  <div style={{ position: 'absolute', right: 6, top: 26 }}>
                    <GraspFigure size={28} />
                  </div>
                )}
                {i === 4 && (
                  <div style={{ position: 'absolute', left: 0, right: 0, bottom: 26, display: 'flex', justifyContent: 'center', gap: 2 }}>
                    <HeroFigure color="red" size={36} active />
                    <HeroFigure color="blue" size={36} />
                    <HeroFigure color="green" size={36} />
                    <HeroFigure color="yellow" size={36} wounded />
                  </div>
                )}
                {i === 0 && (
                  <div style={{ position: 'absolute', left: 4, top: 26 }}>
                    <StandardToken color="green" size={26} />
                  </div>
                )}
                {i === 1 && (
                  <div style={{ position: 'absolute', left: 4, top: 26 }}>
                    <TrapFigure size={26} />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {card(20)}
            {card(57)}
          </div>
        </div>
        <div style={{ ...row, marginTop: 16, alignItems: 'center' }}>
          <LifeToken size={20} />
          <LifeToken size={20} />
          <LifeToken size={20} />
          <CallToArmsToken size={20} />
          <EquipmentToken color="red" size={20} />
          <EquipmentToken color="blue" size={20} />
          <EquipmentToken color="black" size={20} />
          <CombatDie face="red" size={34} />
          <CombatDie face="white" size={34} />
          <CombatDie face="black" size={34} />
          <CorruptionDie face="loseQi" size={34} />
          <GraspFigure size={22} />
          <HeroPowerIcon power="heavenlyGust" size={22} />
        </div>
      </Night>
    </Section>
  )
}

export const BASTION_SECTIONS: Record<string, () => ReactNode> = {
  'lb-logo': LogoSection,
  'lb-tiles': TilesSection,
  'lb-cards': CardsSection,
  'lb-warlords': WarlordsSection,
  'lb-heroes': HeroesSection,
  'lb-tokens': TokensSection,
  'lb-dice': DiceSection,
  'lb-powers': PowersSection,
  'lb-abilities': AbilitiesSection,
  'lb-mock': MockSection,
}
