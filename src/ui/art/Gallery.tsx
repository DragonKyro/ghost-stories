// Dev gallery of every art piece in every variant. Open the dev server with
// ?gallery (all sections) or ?gallery=tiles,ghosts (some sections).
// Imports only from src/ui/art/ (types are erased), so it renders even while
// the rest of the app is mid-rewrite.
import type { CSSProperties, ReactNode } from 'react'
import type {
  AbilityKind,
  CatacombTokenKind,
  Color,
  CurseFace,
  DemonId,
  DieFace,
  FamilyId,
  GhostCard,
  PowerId,
  TaoColor,
  TileKind,
} from '@/game/types'
import { ArtDefs } from './ArtDefs'
import { AbilityIcon } from './AbilityIcon'
import { CatacombTokenArt, CurseTokenArt, DemonFigure, LadderIcon, ShadowFigure, SkeletonToken } from './BlackSecret'
import { CurseDie, TaoDie } from './Dice'
import { GhostCardArt } from './GhostCardArt'
import { Logo } from './Logo'
import { PowerIcon } from './PowerIcon'
import { TaoistFigure } from './TaoistFigure'
import { TileArt } from './TileArt'
import {
  BuddhaFigure,
  HauntingFigure,
  InactiveMarker,
  MantraToken,
  MoonCrystal,
  PowerToken,
  QiToken,
  TaoBlockMarker,
  TaoToken,
  YinYangToken,
} from './Tokens'
import { PortalIcon, ReceptacleIcon, SuLingFigure, VillagerToken } from './WhiteMoon'

// ---------------------------------------------------------------------------
// Sample data (inline so the gallery doesn't depend on the engine).
// ---------------------------------------------------------------------------
const TILES: TileKind[] = [
  'circleOfPrayer',
  'buddhistTemple',
  'cemetery',
  'taoistAltar',
  'herbalistShop',
  'sorcerersHut',
  'nightWatchman',
  'pavilion',
  'teaHouse',
  'kungFuSchool',
  'calligrapher',
]
const COLORS: Color[] = ['red', 'blue', 'green', 'yellow']
const TAO: TaoColor[] = ['red', 'blue', 'green', 'yellow', 'black']
const FACES: DieFace[] = ['red', 'blue', 'green', 'yellow', 'black', 'white']
const CURSE: CurseFace[] = ['blank', 'haunt', 'ghost', 'loseTao', 'loseQi']
const ABILITIES: AbilityKind[] = [
  'addGhost',
  'hauntTile',
  'loseQi',
  'haunterDirect',
  'haunter',
  'tormentor',
  'devourer',
  'powerBlocker',
  'taoBlocker',
  'dieCaptor',
  'diceImmune',
  'curse',
  'loseTao',
  'rewardQiOrYinYang',
  'rewardTao1',
  'rewardTao2',
  'rewardCrystal',
  'incarnationReward',
]
const POWERS: PowerId[] = [
  'danceOfTheSpires',
  'danceOfTheTwinWinds',
  'heavenlyGust',
  'secondWind',
  'godsFavorite',
  'strengthOfMountain',
  'bottomlessPockets',
  'enfeeblementMantra',
]
const FAMILIES: FamilyId[] = ['hua', 'zhou', 'li', 'sun', 'miao', 'xiang', 'sheng', 'wu', 'chang', 'teng', 'long', 'weng']
const DEMONS: DemonId[] = ['imp', 'fiend', 'archfiend']
const CATACOMB: CatacombTokenKind[] = ['dirt', 'buddha', 'bloodOfTheJust', 'cursedTablet', 'bones', 'bloodOfSuLing', 'urn']

const g = (
  id: string,
  name: string,
  color: TaoColor,
  n: number,
  left: AbilityKind[],
  center: AbilityKind[],
  right: AbilityKind[],
  groupCenter = false,
): GhostCard => ({
  id,
  name,
  color,
  resistance: { [color]: n },
  left: left.map((kind) => ({ kind })),
  center: center.map((kind) => ({ kind, ...(groupCenter ? { group: true } : {}) })),
  right: right.map((kind) => ({ kind })),
})

const SAMPLE_GHOSTS: GhostCard[] = [
  g('red-1', 'Hollow Eye', 'red', 1, [], ['haunter'], []),
  g('red-7', 'Burning Yamen', 'red', 3, [], ['powerBlocker'], ['rewardTao2']),
  g('green-2', 'Twisted Pine', 'green', 1, ['addGhost'], [], ['rewardTao1']),
  g('green-6', 'Forest of Eyes', 'green', 2, ['hauntTile'], [], ['curse']),
  g('green-7', 'Bramble Snare', 'green', 3, [], ['dieCaptor'], ['rewardTao2']),
  g('blue-2', 'Drowned Maiden', 'blue', 1, ['addGhost'], [], ['rewardTao1']),
  g('blue-3', 'Lantern Drifter', 'blue', 2, [], ['tormentor'], ['curse']),
  g('blue-7', 'Tidewraith', 'blue', 3, [], ['diceImmune'], ['rewardTao2']),
  g('yellow-1', 'Reed Whisper', 'yellow', 1, [], ['haunter'], []),
  g('yellow-7', 'Marsh King', 'yellow', 3, [], ['taoBlocker'], ['rewardTao2']),
  g('black-3', 'Silent Reaper', 'black', 2, ['loseQi'], [], ['rewardQiOrYinYang']),
  g('black-7', 'Ash Empress', 'black', 3, [], ['powerBlocker'], ['rewardTao2'], true),
  g('black-8', 'Coal Eater', 'black', 3, ['haunterDirect'], ['haunter'], ['loseTao', 'rewardQiOrYinYang']),
  g('wm-10', 'Pale Hunger', 'blue', 3, [], ['devourer', 'tormentor'], ['curse', 'rewardCrystal']),
  g('bs-1', 'Catacomb Rat King of the Ninth Ossuary', 'red', 1, ['addGhost'], [], []),
  { id: 'skeleton', name: 'Skeleton', color: 'yellow', resistance: { yellow: 1 }, left: [], center: [], right: [] },
  { id: 'summon-1', name: 'Summon Wu-Feng', color: 'black', resistance: {}, left: [], center: [], right: [] },
]

const R = [{ kind: 'incarnationReward' as const }]
const inc = (
  id: NonNullable<GhostCard['incarnation']>,
  name: string,
  color: TaoColor,
  resistance: GhostCard['resistance'],
  center: AbilityKind[] = [],
  right: AbilityKind[] = [],
): GhostCard => ({
  id: `wf-${id}`,
  name,
  color,
  resistance,
  left: [],
  center: center.map((kind) => ({ kind })),
  right: [...right.map((kind) => ({ kind })), ...R],
  incarnation: id,
})

const INCARNATIONS: GhostCard[] = [
  inc('howlingNightmare', 'Howling Nightmare', 'red', { red: 4 }),
  inc('uncatchable', 'Uncatchable', 'green', { green: 3 }),
  inc('deathArmy', 'Death Army', 'black', { black: 4 }, ['tormentor'], ['curse']),
  inc('forgottenOnes', 'Forgotten Ones', 'yellow', { yellow: 4 }),
  inc('bonecracker', 'Bonecracker', 'blue', { blue: 4 }),
  inc('darkMistress', 'Dark Mistress', 'black', { black: 4 }, ['taoBlocker']),
  inc('creepingHorror', 'Creeping Horror', 'green', { green: 4 }, ['dieCaptor']),
  inc('vampireLord', 'Vampire Lord', 'red', { red: 4 }, ['haunter']),
  inc('hopeKiller', 'Hope Killer', 'black', { red: 2, blue: 2, green: 2, yellow: 2 }, [], ['curse']),
  inc('nameless', 'Nameless', 'black', { red: 1, blue: 1, green: 1, yellow: 1, black: 1 }),
]

// ---------------------------------------------------------------------------
// Layout helpers.
// ---------------------------------------------------------------------------
const page: CSSProperties = {
  background: '#1a1410',
  color: '#f4e9d6',
  fontFamily: 'Inter, system-ui, sans-serif',
  padding: '20px 28px 60px',
  minHeight: '100vh',
}
const row: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-end', marginBottom: 14 }

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={`gallery-${id}`} className="gs-gallery-section" style={{ marginBottom: 36 }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: '#d4a857', borderBottom: '1px solid #3a2e25', paddingBottom: 6, margin: '0 0 14px' }}>
        {title}
      </h2>
      {children}
    </section>
  )
}

function Cell({ label, children, light }: { label?: string; children: ReactNode; light?: boolean }) {
  return (
    <figure style={{ margin: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', padding: light ? 6 : 0, background: light ? '#efe4cc' : undefined, borderRadius: 4 }}>
        {children}
      </div>
      {label && <figcaption style={{ fontSize: 10, color: '#8a7e6b', maxWidth: 220, textAlign: 'center' }}>{label}</figcaption>}
    </figure>
  )
}

// ---------------------------------------------------------------------------
// Sections.
// ---------------------------------------------------------------------------
function LogoSection() {
  return (
    <Section id="logo" title="Logo">
      <div style={row}>
        <Logo width={560} />
        <Logo width={280} />
      </div>
    </Section>
  )
}

function TilesSection() {
  return (
    <Section id="tiles" title="Village tiles — active / haunted at 200px, then 150px">
      <div style={row}>
        {TILES.map((k) => (
          <Cell key={k} label={k}>
            <TileArt kind={k} haunted={false} size={200} />
            <TileArt kind={k} haunted size={200} />
          </Cell>
        ))}
      </div>
      <div style={row}>
        {TILES.map((k) => (
          <Cell key={k} label={k}>
            <TileArt kind={k} haunted={false} size={150} />
            <TileArt kind={k} haunted size={150} />
          </Cell>
        ))}
      </div>
    </Section>
  )
}

function GhostsSection() {
  return (
    <Section id="ghosts" title="Ghost cards — 200px, then compact 90px / 70px">
      <div style={row}>
        {SAMPLE_GHOSTS.map((c) => (
          <Cell key={c.id} label={c.id}>
            <GhostCardArt card={c} width={200} />
          </Cell>
        ))}
      </div>
      <div style={row}>
        {SAMPLE_GHOSTS.map((c) => (
          <Cell key={c.id}>
            <GhostCardArt card={c} width={90} compact />
          </Cell>
        ))}
      </div>
      <div style={row}>
        {SAMPLE_GHOSTS.map((c) => (
          <Cell key={c.id}>
            <GhostCardArt card={c} width={70} compact />
          </Cell>
        ))}
      </div>
    </Section>
  )
}

function IncarnationsSection() {
  return (
    <Section id="incarnations" title="Wu-Feng incarnations — 200px, then compact 90px">
      <div style={row}>
        {INCARNATIONS.map((c) => (
          <Cell key={c.id} label={c.incarnation}>
            <GhostCardArt card={c} width={200} />
          </Cell>
        ))}
      </div>
      <div style={row}>
        {INCARNATIONS.map((c) => (
          <Cell key={c.id}>
            <GhostCardArt card={c} width={90} compact />
          </Cell>
        ))}
      </div>
    </Section>
  )
}

function AbilitiesSection() {
  return (
    <Section id="abilities" title="Ability icons — 24 / 40 / 64px, group variant, no plate on paper">
      <div style={row}>
        {ABILITIES.map((k) => (
          <Cell key={k} label={k}>
            <AbilityIcon kind={k} size={24} />
            <AbilityIcon kind={k} size={40} />
            <AbilityIcon kind={k} size={64} />
          </Cell>
        ))}
      </div>
      <div style={row}>
        {ABILITIES.map((k) => (
          <Cell key={k} light>
            <AbilityIcon kind={k} size={40} group />
            <AbilityIcon kind={k} size={40} plate={false} />
          </Cell>
        ))}
      </div>
    </Section>
  )
}

function DiceSection() {
  return (
    <Section id="dice" title="Dice — Tao dice 28 / 44px (dim = captive), curse die 28 / 44px, rolling">
      <div style={row}>
        {FACES.map((f) => (
          <Cell key={f} label={f}>
            <TaoDie face={f} size={28} />
            <TaoDie face={f} size={44} />
            <TaoDie face={f} size={44} dim />
          </Cell>
        ))}
      </div>
      <div style={row}>
        {CURSE.map((f) => (
          <Cell key={f} label={f}>
            <CurseDie face={f} size={28} />
            <CurseDie face={f} size={44} />
          </Cell>
        ))}
        <Cell label="rolling">
          <TaoDie face="green" size={44} rolling />
          <CurseDie face="haunt" size={44} rolling />
        </Cell>
      </div>
    </Section>
  )
}

function TokensSection() {
  const sizes = [16, 24, 40]
  const each = (label: string, f: (s: number) => ReactNode, light = false) => (
    <Cell key={label} label={label} light={light}>
      {sizes.map((s) => (
        <span key={s}>{f(s)}</span>
      ))}
    </Cell>
  )
  return (
    <Section id="tokens" title="Tokens — 16 / 24 / 40px (dark ground, then paper)">
      {[false, true].map((light) => (
        <div key={String(light)} style={row}>
          {TAO.map((c) => each(`tao ${c}`, (s) => <TaoToken color={c} size={s} />, light))}
          {each('qi', (s) => <QiToken size={s} />, light)}
          {each('yin-yang', (s) => <YinYangToken size={s} />, light)}
          {each('yin-yang spent', (s) => <YinYangToken size={s} spent />, light)}
          {COLORS.map((c) => each(`power ${c}`, (s) => <PowerToken color={c} size={s} />, light))}
          {each('buddha', (s) => <BuddhaFigure size={s} />, light)}
          {each('haunting', (s) => <HauntingFigure size={s} />, light)}
          {each('mantra', (s) => <MantraToken size={s} />, light)}
          {each('inactive', (s) => <InactiveMarker size={s} />, light)}
          {each('crystal', (s) => <MoonCrystal size={s} />, light)}
          {each('tao block', (s) => <TaoBlockMarker size={s} />, light)}
        </div>
      ))}
    </Section>
  )
}

function TaoistsSection() {
  return (
    <Section id="taoists" title="Taoist figures — 40 / 80px, active, lying (dead)">
      <div style={row}>
        {COLORS.map((c) => (
          <Cell key={c} label={c}>
            <TaoistFigure color={c} size={40} />
            <TaoistFigure color={c} size={80} />
            <TaoistFigure color={c} size={80} active />
            <TaoistFigure color={c} size={80} lying />
          </Cell>
        ))}
      </div>
    </Section>
  )
}

function PowersSection() {
  return (
    <Section id="powers" title="Taoist powers — 32 / 64px">
      <div style={row}>
        {POWERS.map((p) => (
          <Cell key={p} label={p}>
            <PowerIcon power={p} size={32} />
            <PowerIcon power={p} size={64} />
          </Cell>
        ))}
      </div>
    </Section>
  )
}

function WhiteMoonSection() {
  return (
    <Section id="whiteMoon" title="White Moon — villagers 24 / 40px, Su-Ling, Portal, receptacles">
      <div style={row}>
        {FAMILIES.map((f) => (
          <Cell key={f} label={f}>
            <VillagerToken family={f} size={24} />
            <VillagerToken family={f} size={40} />
          </Cell>
        ))}
      </div>
      <div style={row}>
        <Cell label="Su-Ling">
          <SuLingFigure size={32} />
          <SuLingFigure size={64} />
        </Cell>
        <Cell label="Portal">
          <PortalIcon size={32} />
          <PortalIcon size={64} />
        </Cell>
        <Cell label="Receptacle empty / filled">
          <ReceptacleIcon filled={false} size={32} />
          <ReceptacleIcon filled size={32} />
          <ReceptacleIcon filled={false} size={56} />
          <ReceptacleIcon filled size={56} />
        </Cell>
      </div>
    </Section>
  )
}

function BlackSecretSection() {
  return (
    <Section id="blackSecret" title="Black Secret — demons, Shadow, skeleton, ladder, curse tokens, catacomb tokens">
      <div style={row}>
        {DEMONS.map((d) => (
          <Cell key={d} label={d}>
            <DemonFigure id={d} size={32} />
            <DemonFigure id={d} size={64} />
          </Cell>
        ))}
        <Cell label="Shadow of Wu-Feng">
          <ShadowFigure size={32} />
          <ShadowFigure size={64} />
        </Cell>
        <Cell label="skeleton">
          <SkeletonToken size={24} />
          <SkeletonToken size={48} />
        </Cell>
        <Cell label="ladder">
          <LadderIcon size={24} />
          <LadderIcon size={48} />
        </Cell>
      </div>
      <div style={row}>
        {([1, 2, 3, 4] as const).map((lv) => (
          <Cell key={lv} label={`curse level ${lv}`}>
            {TAO.map((c) => (
              <CurseTokenArt key={c} level={lv} color={c} size={32} />
            ))}
          </Cell>
        ))}
      </div>
      <div style={row}>
        {CATACOMB.map((k) => (
          <Cell key={k} label={k}>
            <CatacombTokenArt kind={k} size={28} />
            <CatacombTokenArt kind={k} size={48} />
          </Cell>
        ))}
      </div>
    </Section>
  )
}

/** A rough in-context mock: the village at game size with cards and tokens around it. */
function MockSection() {
  const layout: TileKind[] = ['cemetery', 'herbalistShop', 'pavilion', 'taoistAltar', 'circleOfPrayer', 'teaHouse', 'sorcerersHut', 'buddhistTemple', 'nightWatchman']
  const haunted = new Set([2, 6])
  const T = 165
  const cards = (list: GhostCard[]) => list.map((c, i) => <GhostCardArt key={i} card={c} width={80} compact />)
  return (
    <Section id="mock" title="In context — tiles at 165px, compact cards at 80px">
      <div style={{ display: 'grid', gridTemplateColumns: `100px ${T * 3 + 8}px 100px`, gap: 10, alignItems: 'center', justifyItems: 'center', width: 'max-content' }}>
        <div />
        <div style={{ display: 'flex', gap: 30 }}>{cards([SAMPLE_GHOSTS[0], SAMPLE_GHOSTS[1], INCARNATIONS[0]])}</div>
        <div />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{cards([SAMPLE_GHOSTS[8], SAMPLE_GHOSTS[9]])}</div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(3, ${T}px)`, gap: 4, position: 'relative' }}>
          {layout.map((k, i) => (
            <div key={i} style={{ position: 'relative', width: T, height: T }}>
              <TileArt kind={k} haunted={haunted.has(i)} size={T} />
              {i === 4 && (
                <div style={{ position: 'absolute', left: 8, top: 8, display: 'flex', gap: 2 }}>
                  <TaoistFigure color="red" size={44} active />
                  <TaoistFigure color="blue" size={44} />
                </div>
              )}
              {i === 4 && (
                <div style={{ position: 'absolute', right: 10, top: 12 }}>
                  <TaoToken color="green" size={26} />
                </div>
              )}
              {i === 0 && (
                <div style={{ position: 'absolute', left: 30, top: 40 }}>
                  <TaoistFigure color="green" size={44} lying />
                </div>
              )}
              {i === 7 && (
                <div style={{ position: 'absolute', right: 8, top: 8, display: 'flex' }}>
                  <BuddhaFigure size={26} />
                  <BuddhaFigure size={26} />
                </div>
              )}
              {i === 5 && (
                <div style={{ position: 'absolute', left: 8, top: 8 }}>
                  <TaoistFigure color="yellow" size={44} />
                </div>
              )}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{cards([SAMPLE_GHOSTS[5], SAMPLE_GHOSTS[7], SAMPLE_GHOSTS[13]])}</div>
        <div />
        <div style={{ display: 'flex', gap: 30 }}>{cards([SAMPLE_GHOSTS[3], INCARNATIONS[8], SAMPLE_GHOSTS[12]])}</div>
        <div />
      </div>
      <div style={{ ...row, marginTop: 16, alignItems: 'center' }}>
        <QiToken size={22} />
        <QiToken size={22} />
        <QiToken size={22} />
        <YinYangToken size={22} />
        <TaoToken color="red" size={20} />
        <TaoToken color="blue" size={20} />
        <TaoToken color="black" size={20} />
        <TaoDie face="red" size={34} />
        <TaoDie face="white" size={34} />
        <TaoDie face="black" size={34} />
        <CurseDie face="loseQi" size={34} />
        <HauntingFigure size={22} />
        <PowerIcon power="heavenlyGust" size={36} />
      </div>
    </Section>
  )
}

const SECTIONS: Record<string, () => ReactNode> = {
  logo: LogoSection,
  tiles: TilesSection,
  ghosts: GhostsSection,
  incarnations: IncarnationsSection,
  abilities: AbilitiesSection,
  dice: DiceSection,
  tokens: TokensSection,
  taoists: TaoistsSection,
  powers: PowersSection,
  whiteMoon: WhiteMoonSection,
  blackSecret: BlackSecretSection,
  mock: MockSection,
}

export function Gallery({ sections }: { sections?: string[] }) {
  const keys = sections && sections.length ? sections.filter((s) => s in SECTIONS) : Object.keys(SECTIONS)
  return (
    <div style={page} className="gs-gallery" data-ready="1">
      <h1 style={{ fontSize: 22, margin: '0 0 18px', color: '#f4e9d6' }}>Ghost Stories — art gallery</h1>
      {keys.map((k) => {
        const S = SECTIONS[k]
        return <S key={k} />
      })}
    </div>
  )
}

/** Gallery + defs, reading ?gallery=a,b from the URL. */
export function GalleryPage() {
  const param = new URLSearchParams(location.search).get('gallery') ?? ''
  const sections = param.split(',').map((s) => s.trim()).filter(Boolean)
  return (
    <>
      <ArtDefs />
      <Gallery sections={sections} />
    </>
  )
}
