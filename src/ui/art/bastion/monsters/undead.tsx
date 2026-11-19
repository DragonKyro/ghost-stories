// The dead and their masters: wraith, lich, sorcerer, zombie, ghoul, mummy.
// 160×150 box, ground at y ≈ 146.
import { brush, strokes } from '../../brush'
import { WOOD_DARK } from '../palette'
import { BONE, BONE_SHADE, Crown, DARK, Eye, Eyes, GOLD, INK, IRON, P, type Design } from './common'

const shadow = (rx: number) => <ellipse cx={80} cy={145} rx={rx} ry={4} fill="#000" opacity={0.4} />

/** A skull face drawn at (x, y) = centre of the cranium, radius r. */
function Skull({ x, y, r, t }: { x: number; y: number; r: number; t: Parameters<Design>[0] }) {
  return (
    <g>
      <path
        d={`M${x} ${y - r}C${x - r * 1.05} ${y - r} ${x - r * 1.1} ${y + r * 0.2} ${x - r * 0.75} ${y + r * 0.6}V${y + r * 1.15}H${x + r * 0.75}V${y + r * 0.6}C${x + r * 1.1} ${y + r * 0.2} ${x + r * 1.05} ${y - r} ${x} ${y - r}Z`}
        fill={BONE}
        stroke={INK}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      <ellipse cx={x - r * 0.4} cy={y} rx={r * 0.3} ry={r * 0.34} fill={DARK} />
      <ellipse cx={x + r * 0.4} cy={y} rx={r * 0.3} ry={r * 0.34} fill={DARK} />
      <Eye x={x - r * 0.4} y={y} r={r * 0.16} t={t} />
      <Eye x={x + r * 0.4} y={y} r={r * 0.16} t={t} />
      <path d={`M${x - r * 0.12} ${y + r * 0.5}L${x} ${y + r * 0.3}L${x + r * 0.12} ${y + r * 0.5}Z`} fill={DARK} />
      <path d={`M${x - r * 0.45} ${y + r * 0.85}V${y + r * 1.15}M${x - r * 0.15} ${y + r * 0.85}V${y + r * 1.15}M${x + r * 0.15} ${y + r * 0.85}V${y + r * 1.15}M${x + r * 0.45} ${y + r * 0.85}V${y + r * 1.15}`} stroke={INK} strokeWidth={1} />
    </g>
  )
}

// ---------------------------------------------------------------------------
// Wraith — a floating hooded spectre in tatters, bony hands reaching (a
// Warlord: a crown of iron spikes and trailing chains).
// ---------------------------------------------------------------------------
const WRAITH = {
  robe: 'M80 22C64 22 54 36 54 54C52 74 46 96 36 122C46 118 52 122 54 130C60 124 66 128 70 138C74 128 80 128 84 138C88 128 94 126 100 132C102 124 108 120 120 122C110 98 106 74 106 54C106 36 96 22 80 22Z',
  shade: 'M80 22C92 22 104 34 106 54C106 74 110 98 120 122C110 120 104 124 100 132C100 110 96 80 90 60C88 44 86 30 80 22Z',
  hood: 'M68 46C68 36 74 32 80 32C86 32 92 36 92 46L90 60H70Z',
  sleeveL: 'M58 60C48 64 38 72 30 84L40 92C46 84 54 78 62 74Z',
  sleeveR: 'M102 60C112 64 122 72 130 84L120 92C114 84 106 78 98 74Z',
  handL: strokes([
    [[[32, 86], [22, 86], [14, 82]], 2.6, 'tail'],
    [[[34, 90], [24, 94], [18, 94]], 2.6, 'tail'],
    [[[36, 92], [30, 100], [26, 104]], 2.4, 'tail'],
  ]),
  tatters: 'M40 120L36 132L46 126ZM60 132L58 144L66 134ZM84 138L84 148L90 138ZM104 132L110 142L110 130Z',
  spikes: 'M66 34L62 18L70 30ZM74 30L74 12L79 28ZM86 30L88 12L91 30ZM94 34L100 18L92 30Z',
  chains: 'M44 100L34 118L40 134M116 100L126 118L120 134',
  // Banshee: streaming hair and a pale, wailing face.
  hair: 'M64 50C56 64 52 84 46 104C54 100 58 92 62 84C62 70 66 58 72 50ZM96 50C104 64 108 84 114 104C106 100 102 92 98 84C98 70 94 58 88 50Z',
  face: 'M80 30C72 30 68 38 68 46C68 56 74 62 80 62C86 62 92 56 92 46C92 38 88 30 80 30Z',
  hairTop: 'M66 48C62 34 70 24 80 24C90 24 98 34 94 48C90 38 70 38 66 48Z',
  wail: 'M76 50C76 46 84 46 84 50L83 58C82 60 78 60 77 58Z',
}

export const wraith: Design = (t, boss, alt) => (
  <g>
    <ellipse cx={80} cy={140} rx={40} ry={6} fill={t.accent} opacity={0.18} />
    <g mask="url(#lb-card-fade-mask)">
      <P d={WRAITH.robe} fill={t.hide} />
      <path d={WRAITH.shade} fill={t.deep} opacity={0.45} />
      <path d={WRAITH.tatters} fill={t.hide} />
    </g>
    <P d={WRAITH.sleeveL} fill={t.hide} />
    <P d={WRAITH.sleeveR} fill={t.hide} />
    <path d={WRAITH.handL} fill={BONE} stroke={INK} strokeWidth={0.6} />
    <path d={WRAITH.handL} transform="translate(160 0) scale(-1 1)" fill={BONE} stroke={INK} strokeWidth={0.6} />
    {boss && (
      <>
        <path d={WRAITH.chains} fill="none" stroke={INK} strokeWidth={4.4} strokeDasharray="4 2" />
        <path d={WRAITH.chains} fill="none" stroke="#8d97a3" strokeWidth={2.4} strokeDasharray="4 2" />
        <P d={WRAITH.spikes} fill={IRON} sw={1.2} />
      </>
    )}
    {alt ? (
      <>
        <path d={WRAITH.hair} fill={t.deep} stroke={INK} strokeWidth={1.2} />
        <P d={WRAITH.face} fill="#eef3f6" />
        <path d={WRAITH.hairTop} fill={t.deep} />
        <ellipse cx={75} cy={44} rx={2.8} ry={3.4} fill="#07050a" />
        <ellipse cx={85} cy={44} rx={2.8} ry={3.4} fill="#07050a" />
        <Eyes x={80} y={44} gap={5} r={1.4} t={t} />
        <path d={WRAITH.wail} fill="#07050a" />
        <path d="M60 34Q54 26 56 18M100 34Q106 26 104 18M56 46Q46 42 42 34M104 46Q114 42 118 34" fill="none" stroke={t.accent} strokeWidth={1.8} strokeLinecap="round" opacity={0.75} />
      </>
    ) : (
      <>
        <path d={WRAITH.hood} fill="#07050a" />
        <Eyes x={80} y={48} gap={5} r={2.4} t={t} />
      </>
    )}
  </g>
)

// ---------------------------------------------------------------------------
// Lich — a skeletal mage in a high-collared robe, a staff with a burning orb.
// ---------------------------------------------------------------------------
const LICH = {
  robe: 'M80 44C64 48 56 62 54 82C52 104 46 126 38 146H122C114 126 108 104 106 82C104 62 96 48 80 44Z',
  trim: 'M80 50V146M54 104C66 108 94 108 106 104',
  collar: 'M60 52L48 28L72 46ZM100 52L112 28L88 46Z',
  hood: 'M66 44C64 30 70 20 80 20C90 20 96 30 94 44C90 52 70 52 66 44Z',
  staff: 'M120 146L118 26',
  staffHead: 'M118 30C108 26 106 14 112 8L114 16L118 6L122 16L124 8C130 14 128 26 118 30Z',
  armR: 'M102 60C110 66 114 74 116 84L110 88C108 80 104 74 98 70Z',
  armL: 'M58 60C48 64 40 72 36 84L44 88C48 80 54 74 62 70Z',
  handL: strokes([
    [[[38, 86], [32, 80], [30, 72]], 2.4, 'tail'],
    [[[40, 86], [36, 78], [38, 70]], 2.4, 'tail'],
    [[[42, 86], [44, 78], [46, 72]], 2.2, 'tail'],
  ]),
  spell: strokes([[[[36, 70], [30, 58], [38, 48], [34, 38]], 3, 'tail']]),
}

export const lich: Design = (t, boss) => (
  <g>
    {shadow(48)}
    <path d={LICH.staff} stroke={INK} strokeWidth={5} strokeLinecap="round" />
    <path d={LICH.staff} stroke={WOOD_DARK} strokeWidth={3} strokeLinecap="round" />
    <circle cx={118} cy={18} r={18} fill={t.eye} opacity={0.7} />
    <circle cx={118} cy={18} r={6} fill={t.accent} stroke={INK} strokeWidth={1} />
    <P d={LICH.staffHead} fill={BONE_SHADE} sw={1.2} />
    <P d={LICH.robe} fill={t.hide} />
    <path d={LICH.trim} fill="none" stroke={boss ? GOLD : t.deep} strokeWidth={3} />
    <P d={LICH.armR} fill={t.hide} />
    <circle cx={116} cy={86} r={4} fill={BONE} stroke={INK} strokeWidth={1.2} />
    <P d={LICH.armL} fill={t.hide} />
    <path d={LICH.handL} fill={BONE} stroke={INK} strokeWidth={0.6} />
    <circle cx={36} cy={60} r={14} fill={t.eye} opacity={0.6} />
    <path d={LICH.spell} fill={t.accent} />
    <P d={LICH.collar} fill={t.deep} />
    {!boss && <P d={LICH.hood} fill={t.deep} />}
    <Skull x={80} y={36} r={11} t={t} />
    {boss && <Crown x={80} y={24} w={26} spikes={5} />}
  </g>
)

// ---------------------------------------------------------------------------
// Sorcerer — a hooded cultist calling up fire inside a ring of runes.
// ---------------------------------------------------------------------------
const SORC = {
  ring: 'M24 138a56 10 0 1 0 112 0a56 10 0 1 0 -112 0Z',
  runes: 'M34 136l4 -4M50 144l3 -5M74 147l2 -5M100 146l3 -5M120 140l4 -4M44 131l4 2M116 131l-4 2',
  robe: 'M80 34C64 36 58 52 56 72C54 96 50 120 44 142H116C110 120 106 96 104 72C102 52 96 36 80 34Z',
  hood: 'M80 20C68 20 62 30 62 42C62 52 66 58 70 62H90C94 58 98 52 98 42C98 30 92 20 80 20Z',
  face: 'M70 46C70 38 74 34 80 34C86 34 90 38 90 46L88 58H72Z',
  sleeves: 'M58 66C52 76 54 88 64 94L76 88C70 82 68 74 68 68ZM102 66C108 76 106 88 96 94L84 88C90 82 92 74 92 68Z',
  hands: 'M68 90C70 96 76 98 80 98C84 98 90 96 92 90L86 86H74Z',
  flame: 'M80 84C70 76 72 62 80 52C82 60 86 62 88 58C92 68 90 78 80 84Z',
  sash: 'M78 98H82L84 140H76Z',
}

export const sorcerer: Design = (t) => (
  <g>
    <path d={SORC.ring} fill="none" stroke={t.accent} strokeWidth={2.4} opacity={0.85} />
    <path d={SORC.runes} stroke={t.accent} strokeWidth={2} />
    <P d={SORC.robe} fill={t.hide} />
    <path d={SORC.robe} fill={t.deep} opacity={0.45} />
    <path d="M66 70L60 138M94 70L100 138" stroke={INK} strokeWidth={1.4} opacity={0.5} />
    <path d={SORC.sash} fill={t.hide} />
    <P d={SORC.hood} fill={t.hide} />
    <path d={SORC.face} fill="#07050a" />
    <Eyes x={80} y={46} gap={4.5} r={1.9} t={t} />
    <circle cx={80} cy={72} r={20} fill={t.eye} opacity={0.75} />
    <P d={SORC.sleeves} fill={t.hide} />
    <P d={SORC.hands} fill="#c9b9a6" sw={1.2} />
    <P d={SORC.flame} fill={t.accent} sw={1.2} />
    <path d="M80 80C76 74 77 68 80 62C82 68 84 74 80 80Z" fill="#fff" opacity={0.8} />
  </g>
)

// ---------------------------------------------------------------------------
// Inquisitor — a towering mitre, a grim face, a censer of witch-fire swinging.
// ---------------------------------------------------------------------------
const INQ = {
  robe: 'M80 50C66 52 60 64 58 80C56 102 50 124 42 146H118C110 124 104 102 102 80C100 64 94 52 80 50Z',
  stole: 'M72 54L68 146H78L80 60L82 146H92L88 54Z',
  mitre: 'M66 36L70 4L80 12L90 4L94 36Z',
  band: 'M66 30H94V37H66Z',
  face: 'M70 42C70 36 74 34 80 34C86 34 90 36 90 42C90 50 86 56 80 56C74 56 70 50 70 42Z',
  collar: 'M64 50L58 36L76 48ZM96 50L102 36L84 48Z',
  armR: 'M100 62C108 68 114 76 116 86L110 90C108 82 104 76 98 72Z',
  censerChain: 'M114 88L122 110',
  censer: 'M114 110C114 104 130 104 130 110L128 122C126 126 118 126 116 122Z',
  armL: 'M60 62C52 66 46 72 42 80L48 86C52 80 56 76 64 72Z',
}

export const inquisitor: Design = (t) => (
  <g>
    {shadow(46)}
    <P d={INQ.robe} fill={t.hide} />
    <P d={INQ.stole} fill={t.deep} sw={1.2} />
    <path d="M70 90H90M69 110H91" stroke={GOLD} strokeWidth={2} />
    <P d={INQ.armL} fill={t.hide} />
    <path d="M42 82L32 74" stroke="#d8c8b4" strokeWidth={4} strokeLinecap="round" />
    <P d={INQ.armR} fill={t.hide} />
    <path d={INQ.censerChain} stroke={INK} strokeWidth={1.6} strokeDasharray="2 1.2" />
    <circle cx={122} cy={114} r={14} fill={t.eye} opacity={0.75} />
    <P d={INQ.censer} fill={GOLD} sw={1.2} />
    <path d="M118 104C116 98 120 94 122 90C124 94 128 98 126 104Z" fill={t.accent} />
    <P d={INQ.collar} fill={t.deep} />
    <P d={INQ.face} fill="#d8c8b4" />
    <path d="M73 41L78 43M87 41L82 43" stroke={INK} strokeWidth={1.8} strokeLinecap="round" />
    <Eyes x={80} y={44} gap={4} r={1.5} t={t} />
    <path d="M76 51Q80 49 84 51" fill="none" stroke={INK} strokeWidth={1.2} />
    <P d={INQ.mitre} fill={t.hide} />
    <path d="M80 12V30" stroke={GOLD} strokeWidth={2.4} />
    <path d="M74 20H86" stroke={GOLD} strokeWidth={2.4} />
    <P d={INQ.band} fill={GOLD} sw={1.2} />
  </g>
)

// ---------------------------------------------------------------------------
// Zombie — a shambling corpse in rags, one arm reaching out.
// ---------------------------------------------------------------------------
const ZOMBIE = {
  legs: 'M64 104L58 128L62 146H74L72 128L80 108ZM84 108L92 126L88 146H100L104 124L96 102Z',
  torso: 'M64 54C70 48 92 48 98 56L102 86C100 98 96 104 92 108H66C62 98 60 86 60 74Z',
  rags: 'M60 92L58 112L64 104L68 116L74 106L80 118L84 106L90 114L94 102L100 110L102 90Z',
  ribs: 'M72 66Q80 70 88 66M71 74Q80 78 89 74M72 82Q80 86 88 82',
  wound: 'M70 62C74 58 88 58 90 62L90 88C86 92 74 92 70 88Z',
  armL: 'M64 58C52 60 40 64 28 66L28 74C40 74 52 72 64 70Z',
  handL: strokes([
    [[[28, 66], [18, 64], [12, 62]], 3, 'tail'],
    [[[28, 70], [18, 70], [10, 70]], 3, 'tail'],
    [[[28, 74], [20, 76], [14, 78]], 2.8, 'tail'],
  ]),
  armR: 'M98 58C104 70 106 84 104 98L98 98C98 86 96 74 92 66Z',
  head: 'M70 40C68 30 74 22 82 22C92 22 96 30 94 40C92 50 86 54 80 54C74 54 70 48 70 40Z',
  jaw: 'M74 46L88 46L86 54L76 54Z',
  cowl: 'M66 44C64 28 72 18 82 18C94 18 100 28 98 44L96 58C90 52 74 52 68 58Z',
  bell: 'M6 62C6 54 10 50 14 50C18 50 22 54 22 62L24 66H4Z',
  fumes: strokes([
    [[[40, 58], [34, 46], [42, 36], [36, 24]], 5, 'tail'],
    [[[100, 100], [110, 90], [104, 78], [112, 66]], 5, 'tail'],
    [[[18, 80], [10, 92], [18, 104]], 4, 'tail'],
  ]),
}

export const zombie: Design = (t, _boss, alt) => (
  <g>
    {shadow(46)}
    {alt && <path d={ZOMBIE.fumes} fill={t.accent} opacity={0.5} />}
    <P d={ZOMBIE.legs} fill="#4a4034" />
    <P d={ZOMBIE.torso} fill={t.hide} />
    <path d={ZOMBIE.wound} fill="#3a1010" opacity={0.85} />
    <path d={ZOMBIE.ribs} fill="none" stroke={BONE} strokeWidth={2.2} strokeLinecap="round" />
    <P d={ZOMBIE.rags} fill="#5a4a36" />
    <P d={ZOMBIE.armR} fill={t.hide} />
    <P d={ZOMBIE.armL} fill={t.hide} />
    <path d={ZOMBIE.handL} fill={t.hide} stroke={INK} strokeWidth={0.8} />
    {alt && (
      <>
        <path d="M14 50V44" stroke={INK} strokeWidth={2} />
        <P d={ZOMBIE.bell} fill={GOLD} sw={1.4} />
        <circle cx={14} cy={67} r={2.4} fill={DARK} />
      </>
    )}
    <g transform="rotate(-12 82 40)">
      <P d={ZOMBIE.head} fill={t.hide} />
      <P d={ZOMBIE.jaw} fill="#2a0a08" sw={1.2} />
      <path d="M76 46V50M80 46V51M84 46V50" stroke={BONE} strokeWidth={1.4} />
      <path d="M72 32Q76 30 80 33" fill="none" stroke={INK} strokeWidth={1.6} />
      <Eye x={76} y={38} r={2} t={t} />
      <circle cx={88} cy={37} r={3} fill={DARK} />
      {alt && <P d={ZOMBIE.cowl} fill="#4a4034" />}
    </g>
  </g>
)

// ---------------------------------------------------------------------------
// Ghoul — an emaciated thing on all fours, spine ridged, long claws.
// ---------------------------------------------------------------------------
const GHOUL = {
  legsFar: 'M98 104L112 122L108 146H120L124 120L110 96ZM56 104L52 126L46 146H58L62 124L68 108Z',
  body: 'M44 94C44 78 62 66 86 68C108 70 124 82 128 98C130 108 124 116 114 116H58C50 114 44 106 44 94Z',
  spine: 'M58 72L62 64L66 72ZM70 68L74 60L78 68ZM84 68L88 60L92 69ZM98 72L103 64L106 74ZM110 78L116 72L118 82Z',
  ribs: 'M62 92Q70 100 78 94M76 96Q84 104 92 96M90 96Q98 104 106 98',
  legsNear: 'M48 98L36 126L30 146H44L48 126L60 106ZM112 104L128 126L130 146H142L140 122L122 98Z',
  head: 'M48 90C38 88 28 80 26 70C26 60 34 54 44 56C54 58 60 66 60 76C60 84 56 90 48 90Z',
  mouth: 'M28 76Q36 86 48 86Q42 92 34 90Q28 86 28 76Z',
  claws: 'M30 144L22 146L32 140ZM44 146L40 150L50 146ZM128 146L124 150L134 146Z',
  ear: 'M50 58L60 46L58 62Z',
}

export const ghoul: Design = (t) => (
  <g>
    {shadow(60)}
    <P d={GHOUL.legsFar} fill={t.deep} />
    <P d={GHOUL.body} fill={t.hide} />
    <P d={GHOUL.spine} fill={t.deep} sw={1.2} />
    <path d={GHOUL.ribs} fill="none" stroke={t.deep} strokeWidth={1.8} />
    <P d={GHOUL.legsNear} fill={t.hide} />
    <path d={GHOUL.claws} fill={BONE} stroke={INK} strokeWidth={0.8} />
    <P d={GHOUL.ear} fill={t.deep} />
    <P d={GHOUL.head} fill={t.hide} />
    <P d={GHOUL.mouth} fill="#250605" sw={1.2} />
    <path d="M30 78L33 82L36 79L39 84L42 80L45 85" fill="none" stroke={BONE} strokeWidth={1.4} />
    <path d="M34 64L44 66" stroke={INK} strokeWidth={2} strokeLinecap="round" />
    <Eye x={40} y={69} r={2.6} t={t} />
  </g>
)

// ---------------------------------------------------------------------------
// Mummy — bound in grave wrappings, arms out, trailing strips; one eye burns.
// ---------------------------------------------------------------------------
const MUMMY = {
  legs: 'M64 106L60 146H78L80 110ZM82 110L84 146H100L96 106Z',
  body: 'M62 52C68 46 92 46 98 52L102 84C100 96 98 104 96 110H64C62 104 60 96 58 84Z',
  head: 'M68 32C68 22 74 18 80 18C86 18 92 22 92 32V44C90 50 70 50 68 44Z',
  armL: 'M62 56L30 64L30 76L62 70Z',
  armR: 'M98 56L130 64L130 76L98 70Z',
  wraps: 'M62 60L98 66M60 72L100 76M60 84L102 86M62 96L100 92M64 104L96 108M70 22L90 30M68 34L92 30M68 42L92 40M34 64L38 76M42 62L46 74M50 60L54 72M118 62L114 74M126 64L122 76M110 60L106 72M62 116L78 120M64 128L78 126M84 118L98 122M84 132L100 130',
  strips: brush([[30, 74], [26, 92], [32, 110], [26, 128]], 4.5, 'tail') + brush([[96, 110], [104, 126], [98, 140]], 4, 'tail'),
}

export const mummy: Design = (t) => (
  <g>
    {shadow(46)}
    <path d={MUMMY.strips} fill={t.light} stroke={INK} strokeWidth={0.8} />
    <P d={MUMMY.legs} fill={t.hide} />
    <P d={MUMMY.body} fill={t.hide} />
    <P d={MUMMY.armL} fill={t.hide} />
    <P d={MUMMY.armR} fill={t.hide} />
    <P d={MUMMY.head} fill={t.hide} />
    <path d={MUMMY.wraps} fill="none" stroke={t.deep} strokeWidth={1.4} opacity={0.75} />
    <path d="M70 32H92V38H70Z" fill="#07050a" />
    <Eye x={76} y={35} r={2.2} t={t} />
  </g>
)
