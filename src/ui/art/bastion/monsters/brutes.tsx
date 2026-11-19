// Brutes of the Horde: the cleaver brute, the golem, the orc, the goblin, the
// troll and the stitched abomination. 160×150 box, ground at y ≈ 146.
import { blob, brush, strokes } from '../../brush'
import { TORCH, TORCH_LIGHT, WOOD, WOOD_DARK } from '../palette'
import { BONE, Crown, DARK, Eye, Eyes, GOLD, INK, IRON, P, STEEL, type Design } from './common'

const shadow = (rx: number) => <ellipse cx={80} cy={145} rx={rx} ry={4} fill="#000" opacity={0.4} />

// ---------------------------------------------------------------------------
// Brute — a hunched hulk; a cleaver raised (a skull club and horned helm as
// a Warlord).
// ---------------------------------------------------------------------------
const BRUTE = {
  legs: 'M56 106L50 144H72L74 112ZM86 112L88 144H110L104 106Z',
  torso: 'M42 62C50 46 110 46 118 62C126 78 124 98 116 112H44C36 98 34 78 42 62Z',
  belly: 'M56 84C56 100 64 110 80 110C96 110 104 100 104 84C98 90 62 90 56 84Z',
  loin: 'M54 104H106L100 128L80 122L60 128Z',
  armL: 'M44 60C30 66 24 82 24 98C24 108 28 114 34 116L46 114C48 106 48 98 50 90L56 72Z',
  fistL: 'M24 112C22 120 28 126 36 126C44 126 48 120 46 112Z',
  armR: 'M114 58C126 52 134 42 138 30L128 24C122 36 116 42 106 48Z',
  fistR: 'M124 30C122 22 128 16 136 18C142 20 144 28 140 32C136 36 128 36 124 30Z',
  head: 'M68 50C66 38 72 30 80 30C88 30 94 38 92 50C90 56 70 56 68 50Z',
  brow: 'M68 40Q80 34 92 40L92 44Q80 40 68 44Z',
  tusks: 'M72 50L70 42L75 48ZM88 50L90 42L85 48Z',
  cleaver: 'M128 6L156 2L158 28L134 30Z',
  cleaverEdge: 'M156 2L158 28',
  haft: 'M131 24L138 12',
  club: brush([[134, 26], [140, 10], [146, -4]], 14, 'head', { min: 0.5 }),
  helm: 'M66 40C66 28 72 22 80 22C88 22 94 28 94 40Z',
  helmHorns: brush([[68, 32], [58, 26], [54, 12]], 7, 'tail') + brush([[92, 32], [102, 26], [106, 12]], 7, 'tail'),
  fur: blob(80, 54, 44, 12, 9, 0.18, 14),
}

export const brute: Design = (t, boss) => (
  <g>
    {shadow(56)}
    <P d={BRUTE.legs} fill={t.deep} />
    {boss && <P d={BRUTE.fur} fill="#4a3826" />}
    <P d={BRUTE.torso} fill={t.hide} />
    <path d={BRUTE.belly} fill={t.light} opacity={0.3} />
    <P d={BRUTE.loin} fill="#4a3020" />
    <path d="M56 106H104" stroke={GOLD} strokeWidth={3} />
    <P d={BRUTE.armL} fill={t.hide} />
    <P d={BRUTE.fistL} fill={t.hide} />
    {boss ? (
      <>
        <path d={BRUTE.club} fill={WOOD} stroke={INK} strokeWidth={1.8} />
        <ellipse cx={146} cy={-2} rx={8} ry={7} fill={BONE} stroke={INK} strokeWidth={1.4} />
        <path d="M142 -3h3v3h-3ZM147 -3h3v3h-3Z" fill={DARK} />
      </>
    ) : (
      <>
        <path d={BRUTE.haft} stroke={WOOD_DARK} strokeWidth={5} strokeLinecap="round" />
        <P d={BRUTE.cleaver} fill={STEEL} />
        <path d={BRUTE.cleaverEdge} stroke="#fff" strokeWidth={1.4} />
        <circle cx={136} cy={10} r={2.4} fill={DARK} />
      </>
    )}
    <P d={BRUTE.armR} fill={t.hide} />
    <P d={BRUTE.fistR} fill={t.hide} />
    <P d={BRUTE.head} fill={t.hide} />
    <path d={BRUTE.brow} fill={t.deep} />
    {boss && (
      <>
        <path d={BRUTE.helmHorns} fill={BONE} stroke={INK} strokeWidth={1.4} />
        <P d={BRUTE.helm} fill={IRON} />
        <Crown x={80} y={24} w={22} />
      </>
    )}
    <path d={BRUTE.tusks} fill={BONE} stroke={INK} strokeWidth={0.7} />
    <Eyes x={80} y={45} gap={5} r={1.9} t={t} />
  </g>
)

// ---------------------------------------------------------------------------
// Tormentor — the brute's frame in an executioner's hood, a hook on a chain in
// one fist and a spiked flail swung overhead in the other.
// ---------------------------------------------------------------------------
const TORMENT = {
  hood: 'M64 52C62 34 70 24 80 24C90 24 98 34 96 52C92 58 68 58 64 52Z',
  harness: 'M50 62L104 104M110 62L56 104',
  chainL: 'M30 124C28 132 30 138 34 140',
  hook: 'M34 140C38 146 46 144 46 136C46 130 40 130 38 134',
  flailChain: 'M138 22C144 20 148 22 148 25',
  ball: 'M148 34m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0',
  ballSpikes: 'M156.0 31.1L162.0 34.0L156.0 36.9ZM155.7 37.6L157.9 43.9L151.6 41.7ZM150.9 42.0L148.0 48.0L145.1 42.0ZM144.4 41.7L138.1 43.9L140.3 37.6ZM140.0 36.9L134.0 34.0L140.0 31.1ZM140.3 30.4L138.1 24.1L144.4 26.3ZM145.1 26.0L148.0 20.0L150.9 26.0ZM151.6 26.3L157.9 24.1L155.7 30.4Z',
}

export const tormentor: Design = (t) => (
  <g>
    {shadow(56)}
    <P d={BRUTE.legs} fill={t.deep} />
    <P d={BRUTE.torso} fill={t.hide} />
    <path d={BRUTE.belly} fill={t.light} opacity={0.3} />
    <path d={TORMENT.harness} stroke="#2a1c12" strokeWidth={5} />
    <circle cx={80} cy={83} r={5} fill={IRON} stroke={INK} strokeWidth={1.2} />
    <P d={BRUTE.loin} fill="#2a1c12" />
    <P d={BRUTE.armL} fill={t.hide} />
    <P d={BRUTE.fistL} fill={t.hide} />
    <path d={TORMENT.chainL} fill="none" stroke={INK} strokeWidth={3.4} strokeDasharray="3 1.5" />
    <path d={TORMENT.hook} fill="none" stroke={INK} strokeWidth={4.5} strokeLinecap="round" />
    <path d={TORMENT.hook} fill="none" stroke="#a7b0ba" strokeWidth={2.6} strokeLinecap="round" />
    <path d={TORMENT.flailChain} fill="none" stroke={INK} strokeWidth={3.4} strokeDasharray="3 1.5" />
    <P d={TORMENT.ballSpikes} fill={STEEL} sw={0.8} />
    <P d={TORMENT.ball} fill={IRON} sw={1.6} />
    <P d={BRUTE.armR} fill={t.hide} />
    <P d={BRUTE.fistR} fill={t.hide} />
    <P d={TORMENT.hood} fill={DARK} />
    <path d="M68 40H92" stroke={t.base} strokeWidth={1.4} opacity={0.6} />
    <Eyes x={80} y={44} gap={6} r={2.2} t={t} />
  </g>
)

// ---------------------------------------------------------------------------
// Siege behemoth — an armoured beast with a ram for a horn and a siege tower
// lashed to its back.
// ---------------------------------------------------------------------------
const BEHEMOTH = {
  legsFar: 'M58 116L56 146H72L74 118ZM118 116L120 146H136L134 114Z',
  body: 'M34 98C34 78 54 66 84 64C114 62 138 72 146 92C152 106 148 120 138 126H44C38 120 34 110 34 98Z',
  plates: 'M52 72C58 90 58 108 54 124M76 66C82 86 82 108 78 126M100 66C106 86 106 108 102 126M122 72C128 90 128 108 124 124',
  legsNear: 'M42 118L40 146H58L60 122ZM98 120L98 146H116L116 120Z',
  head: 'M44 82C32 76 18 80 14 92C12 104 18 112 30 112L46 108Z',
  ram: 'M18 88L2 97L18 106Z',
  tusk: 'M24 108C20 116 22 124 30 126C28 120 30 114 34 110Z',
  tower: 'M72 66V30H76V24H82V30H88V24H94V30H98V66Z',
  towerBoards: 'M72 40H98M72 52H98M85 30V66',
  flag: 'M85 24V6M85 6H100L95 11L100 16H85',
  ropes: 'M68 66L56 110M102 66L118 110',
}

export const behemoth: Design = (t) => (
  <g>
    <ellipse cx={86} cy={145} rx={66} ry={4} fill="#000" opacity={0.4} />
    <P d={BEHEMOTH.legsFar} fill={t.deep} />
    <P d={BEHEMOTH.body} fill={t.hide} />
    <path d={BEHEMOTH.plates} fill="none" stroke={IRON} strokeWidth={6} />
    <path d={BEHEMOTH.plates} fill="none" stroke={INK} strokeWidth={1} />
    <path d={BEHEMOTH.ropes} stroke="#c9a46a" strokeWidth={1.8} />
    <P d={BEHEMOTH.tower} fill={WOOD} />
    <path d={BEHEMOTH.towerBoards} stroke={WOOD_DARK} strokeWidth={1.4} />
    <rect x={81} y={42} width={8} height={7} fill="#140c08" />
    <path d={BEHEMOTH.flag} fill={t.accent} stroke={INK} strokeWidth={1.2} strokeLinejoin="round" />
    <P d={BEHEMOTH.legsNear} fill={t.hide} />
    <P d={BEHEMOTH.ram} fill={STEEL} sw={1.4} />
    <P d={BEHEMOTH.head} fill={t.hide} />
    <path d="M28 82Q38 80 44 88" fill="none" stroke={IRON} strokeWidth={5} />
    <P d={BEHEMOTH.tusk} fill={BONE} sw={1.2} />
    <path d="M24 88L34 92" stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
    <Eye x={30} y={94} r={2.4} t={t} />
  </g>
)

// ---------------------------------------------------------------------------
// Golem — piled stone blocks with glowing seams.
// ---------------------------------------------------------------------------
const GOLEM = {
  legs: 'M56 108L52 146H78L78 110ZM84 110L84 146H110L106 108Z',
  torso: 'M48 50L112 50L120 92L102 112H58L40 92Z',
  shoulderL: blob(44, 56, 17, 15, 3, 0.12, 8),
  shoulderR: blob(116, 56, 17, 15, 8, 0.12, 8),
  armL: 'M30 64L48 66L46 90L28 88Z',
  fistL: 'M20 90L48 92L46 118L18 114Z',
  armR: 'M130 64L112 66L114 90L132 88Z',
  fistR: 'M140 90L112 92L114 118L142 114Z',
  head: 'M66 24H94L98 48H62Z',
  seams: strokes([
    [[[56, 58], [66, 72], [60, 86], [70, 100]], 3, 'both'],
    [[[104, 56], [96, 70], [104, 82], [96, 98]], 3, 'both'],
    [[[78, 54], [82, 70], [78, 82]], 2.6, 'both'],
    [[[26, 98], [36, 104], [32, 112]], 2.4, 'both'],
    [[[134, 98], [124, 104], [128, 112]], 2.4, 'both'],
  ]),
  blocks: 'M48 70H112M44 88H116M80 50V70M64 70V88M96 70V88M52 128H78M84 128H110',
  spikes: 'M64 24L68 8L74 24ZM76 24L80 2L84 24ZM86 24L92 8L96 24Z',
}

export const golem: Design = (t, boss) => (
  <g>
    {shadow(60)}
    <P d={GOLEM.legs} fill={t.deep} />
    <P d={GOLEM.torso} fill={t.hide} />
    <path d={GOLEM.blocks} stroke={INK} strokeWidth={1.4} opacity={0.55} />
    <path d={GOLEM.seams} fill="none" stroke={t.accent} strokeWidth={5} strokeOpacity={0.3} />
    <path d={GOLEM.seams} fill={t.accent} />
    <P d={GOLEM.armL} fill={t.deep} />
    <P d={GOLEM.armR} fill={t.deep} />
    <P d={GOLEM.fistL} fill={t.hide} />
    <P d={GOLEM.fistR} fill={t.hide} />
    <P d={GOLEM.shoulderL} fill={t.hide} />
    <P d={GOLEM.shoulderR} fill={t.hide} />
    <path d={GOLEM.shoulderL} fill={t.light} opacity={0.2} />
    {boss && <P d={GOLEM.spikes} fill={t.deep} />}
    <P d={GOLEM.head} fill={t.hide} />
    <path d="M64 33H96" stroke={INK} strokeWidth={2} />
    <rect x={68} y={37} width={24} height={5} rx={2} fill={t.accent} />
    <rect x={66} y={35} width={28} height={9} rx={3} fill={t.eye} opacity={0.8} />
  </g>
)

// ---------------------------------------------------------------------------
// Orc — a tusked raider with a round shield and a great axe.
// ---------------------------------------------------------------------------
const ORC = {
  legs: 'M62 108L58 144H76L78 112ZM84 112L86 144H104L98 108Z',
  loin: 'M60 104H100L96 126L80 120L64 126Z',
  torso: 'M54 58C60 50 100 50 106 58L112 84C110 96 104 104 98 110H62C56 104 50 96 48 84Z',
  straps: 'M58 60L100 104M102 60L60 104',
  armR: 'M104 60C116 64 122 74 122 86L114 90C112 80 108 74 100 70Z',
  haft: 'M116 146L126 18',
  axe: 'M124 22C140 16 152 28 150 46C142 40 134 38 126 40Z',
  axeBack: 'M126 24C114 20 106 28 106 38C114 34 120 34 126 36Z',
  head: 'M66 34C64 24 70 16 80 16C90 16 96 24 94 34L96 46C92 54 68 54 64 46Z',
  jaw: 'M65 42Q80 52 95 42L95 48Q80 58 65 48Z',
  tusks: 'M70 47L67 37L75 45ZM90 47L93 37L85 45Z',
  ears: 'M66 30L52 24L64 38ZM94 30L108 24L96 38Z',
  mohawk: brush([[80, 10], [80, 16], [80, 22]], 10, 'both'),
  pauldron: 'M96 56C102 46 116 48 118 58C116 66 104 66 98 64Z',
  pauldronSpikes: 'M102 52L104 42L108 52ZM110 52L114 44L116 56Z',
}

const WARCHIEF = {
  pole: 'M30 146L26 2',
  banner: 'M28 6H56L50 22L56 38H28Z',
  helm: 'M64 30C64 18 70 12 80 12C90 12 96 18 96 30Z',
  horns: brush([[66, 24], [54, 18], [50, 4]], 6, 'tail') + brush([[94, 24], [106, 18], [110, 4]], 6, 'tail'),
}

export const orc: Design = (t, _boss, alt) => (
  <g>
    {shadow(54)}
    {alt && (
      <>
        <path d={WARCHIEF.pole} stroke={INK} strokeWidth={5} strokeLinecap="round" />
        <path d={WARCHIEF.pole} stroke={WOOD} strokeWidth={3} strokeLinecap="round" />
        <P d={WARCHIEF.banner} fill={t.deep} />
        <ellipse cx={40} cy={21} rx={6} ry={5.5} fill={BONE} stroke={INK} strokeWidth={1.2} />
        <path d="M37.5 20h2v2h-2ZM40.5 20h2v2h-2Z" fill={DARK} />
      </>
    )}
    <P d={ORC.legs} fill={t.deep} />
    <path d={ORC.haft} stroke={INK} strokeWidth={6} strokeLinecap="round" />
    <path d={ORC.haft} stroke={WOOD} strokeWidth={3.6} strokeLinecap="round" />
    <P d={ORC.axeBack} fill={STEEL} />
    <P d={ORC.axe} fill={STEEL} />
    <P d={ORC.torso} fill={t.hide} />
    <path d={ORC.straps} stroke="#3a2416" strokeWidth={4.5} />
    <circle cx={80} cy={82} r={4} fill={GOLD} stroke={INK} strokeWidth={1} />
    <P d={ORC.loin} fill="#4a3020" />
    <P d={ORC.armR} fill={t.hide} />
    <circle cx={118} cy={88} r={6} fill={t.hide} stroke={INK} strokeWidth={1.8} />
    {/* round shield on the left arm */}
    <circle cx={44} cy={86} r={22} fill={WOOD} stroke={INK} strokeWidth={2.2} />
    <circle cx={44} cy={86} r={22} fill="none" stroke={IRON} strokeWidth={4} />
    <path d="M30 72L58 100M58 72L30 100" stroke={WOOD_DARK} strokeWidth={1.6} opacity={0.7} />
    <circle cx={44} cy={86} r={6} fill={IRON} stroke={INK} strokeWidth={1.4} />
    <P d={ORC.pauldron} fill={IRON} />
    <path d={ORC.pauldronSpikes} fill={STEEL} stroke={INK} strokeWidth={0.8} />
    <P d={ORC.ears} fill={t.hide} />
    <P d={ORC.head} fill={t.hide} />
    {alt ? (
      <>
        <path d={WARCHIEF.horns} fill={BONE} stroke={INK} strokeWidth={1.2} />
        <P d={WARCHIEF.helm} fill={IRON} />
        <path d="M80 13V30" stroke="#8d929c" strokeWidth={1.4} />
      </>
    ) : (
      <path d={ORC.mohawk} fill={DARK} />
    )}
    <P d={ORC.jaw} fill={t.deep} sw={1.2} />
    <path d={ORC.tusks} fill={BONE} stroke={INK} strokeWidth={0.8} />
    <path d="M68 30L77 34M92 30L83 34" stroke={INK} strokeWidth={2.4} strokeLinecap="round" />
    <Eyes x={80} y={36} gap={6} r={2} t={t} />
  </g>
)

// ---------------------------------------------------------------------------
// Goblin — small and wiry, huge ears, a torch and a jagged knife.
// ---------------------------------------------------------------------------
const GOBLIN = {
  legs: 'M70 128L66 146H76L78 130ZM84 130L86 146H96L92 128Z',
  body: 'M64 96C60 108 60 120 62 132H98C100 120 100 108 96 96C88 90 72 90 64 96Z',
  ragHem: 'M62 130L68 138L74 130L80 138L86 130L92 138L98 130Z',
  head: 'M62 80C62 68 70 62 80 62C90 62 98 68 98 80C98 90 90 96 80 96C70 96 62 90 62 80Z',
  ears: 'M64 76L30 62L60 88ZM96 76L130 62L100 88Z',
  nose: 'M79 78L72 92L86 88Z',
  grin: 'M68 88Q80 98 92 88Q88 94 80 95Q72 94 68 88Z',
  armL: 'M64 100L48 92L44 98L60 108Z',
  armR: 'M96 100L110 92L114 98L100 108Z',
  torchStick: 'M46 94L38 64',
  flame: 'M38 66C30 58 32 46 38 38C40 46 44 48 46 44C48 52 46 62 38 66Z',
  knife: 'M112 94L124 70L118 92Z',
}

export const goblin: Design = (t) => (
  <g>
    {shadow(36)}
    <circle cx={38} cy={54} r={22} fill="url(#lb-torch-glow)" />
    <P d={GOBLIN.legs} fill={t.deep} />
    <P d={GOBLIN.body} fill="#4a3826" />
    <path d={GOBLIN.ragHem} fill="#4a3826" stroke={INK} strokeWidth={1.2} />
    <path d="M70 100L78 112M90 100L84 114" stroke="#2a1c10" strokeWidth={1.6} />
    <path d={GOBLIN.torchStick} stroke={WOOD_DARK} strokeWidth={4} strokeLinecap="round" />
    <P d={GOBLIN.flame} fill={TORCH} sw={1.2} />
    <path d="M39 62C35 56 37 50 40 46C42 52 43 56 39 62Z" fill={TORCH_LIGHT} />
    <P d={GOBLIN.armL} fill={t.hide} />
    <P d={GOBLIN.armR} fill={t.hide} />
    <P d={GOBLIN.knife} fill={STEEL} sw={1.2} />
    <P d={GOBLIN.ears} fill={t.hide} />
    <path d="M60 78L40 68M100 78L120 68" stroke={t.deep} strokeWidth={2} />
    <P d={GOBLIN.head} fill={t.hide} />
    <P d={GOBLIN.grin} fill="#2a0a08" sw={1.2} />
    <path d="M72 90L74 93L76 91L78 94L80 91L82 94L84 91L86 93L88 90" fill="none" stroke={BONE} strokeWidth={1.4} />
    <P d={GOBLIN.nose} fill={t.hide} sw={1.4} />
    <path d="M66 72L76 76M94 72L84 76" stroke={INK} strokeWidth={2.4} strokeLinecap="round" />
    <Eyes x={80} y={78} gap={8} r={2.6} t={t} />
  </g>
)

// ---------------------------------------------------------------------------
// Troll — hunched and long-armed, a log club dragging (a bone crown and moss
// mantle as a Warlord).
// ---------------------------------------------------------------------------
const TROLL = {
  legs: 'M74 116L68 146H88L90 122ZM100 120L106 146H124L116 114Z',
  body: 'M56 56C72 40 112 42 122 64C130 80 126 102 116 114L110 124H70C60 108 50 84 56 56Z',
  mantle: 'M54 58C70 40 114 40 124 66C116 60 104 62 96 58C86 66 74 60 64 66Z',
  armL: 'M62 62C48 74 40 94 36 116L32 134C34 140 44 142 46 134L50 116C54 98 60 86 70 76Z',
  fistL: blob(38, 138, 9, 7, 5, 0.1, 7),
  armR: 'M116 66C128 76 134 92 134 108L124 112C122 98 118 86 110 78Z',
  club: brush([[126, 106], [136, 126], [148, 146]], 16, 'head', { min: 0.45 }),
  head: 'M40 66C34 58 36 44 48 42C60 40 70 48 70 58C70 66 64 74 54 74C48 74 44 70 40 66Z',
  nose: 'M44 58C36 62 34 72 40 76C44 74 48 68 50 62Z',
  ear: 'M64 52L76 44L70 58Z',
  tusks: 'M48 72L46 64L51 70ZM58 72L60 64L55 70Z',
  boneCrown: 'M40 46L36 30L44 40L48 24L52 40L58 26L60 42L66 32L64 46Z',
}

export const troll: Design = (t, boss) => (
  <g>
    {shadow(60)}
    <P d={TROLL.legs} fill={t.deep} />
    <path d={TROLL.club} fill={WOOD} stroke={INK} strokeWidth={1.8} />
    <path d="M140 132l4 -2M136 124l4 -1" stroke={WOOD_DARK} strokeWidth={2} />
    <P d={TROLL.body} fill={t.hide} />
    <path d="M70 90C80 100 100 104 116 98" fill="none" stroke={t.deep} strokeWidth={2} opacity={0.7} />
    {boss && <P d={TROLL.mantle} fill="#2f4a22" />}
    <P d={TROLL.armR} fill={t.hide} />
    <circle cx={128} cy={110} r={7} fill={t.hide} stroke={INK} strokeWidth={1.8} />
    <P d={TROLL.armL} fill={t.hide} />
    <P d={TROLL.fistL} fill={t.hide} />
    <P d={TROLL.ear} fill={t.deep} />
    <P d={TROLL.head} fill={t.hide} />
    {boss && <P d={TROLL.boneCrown} fill={BONE} sw={1.4} />}
    <P d={TROLL.nose} fill={t.hide} sw={1.6} />
    <path d={TROLL.tusks} fill={BONE} stroke={INK} strokeWidth={0.8} />
    <path d="M46 52L54 55M60 50L66 54" stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
    <Eye x={52} y={58} r={2.2} t={t} />
    <Eye x={63} y={56} r={2} t={t} />
  </g>
)

// ---------------------------------------------------------------------------
// Abomination — a bloated, stitched mass with two heads, a belly maw and a hook.
// ---------------------------------------------------------------------------
const ABOM = {
  legs: 'M54 126L50 146H70L70 128ZM92 128L92 146H112L106 126Z',
  body: blob(80, 96, 46, 40, 21, 0.08, 12),
  maw: 'M62 100Q80 92 98 100Q96 118 80 120Q64 118 62 100Z',
  teeth: 'M64 101L68 107L71 99L75 106L78 97L82 106L85 98L89 106L92 99L96 102M66 114L70 110L74 116L78 111L82 117L86 111L90 115L94 110',
  headL: 'M56 60C54 50 60 42 68 42C76 42 82 50 80 60C78 66 58 66 56 60Z',
  headR: 'M90 66C90 58 96 54 102 54C108 54 112 58 112 66C110 70 92 70 90 66Z',
  stitches: 'M44 84L58 90M48 82l2 4M53 84l2 4M108 78L118 92M110 82l4 -2M113 86l4 -2M74 128L86 126',
  armL: 'M42 92C28 96 22 108 24 120L34 122C34 112 38 104 46 102Z',
  hook: 'M24 120C18 128 20 138 28 140C34 140 36 134 32 130',
  armR: 'M118 94C130 98 136 106 134 116L126 116C126 110 122 104 116 102Z',
  armR2: 'M114 112C124 118 128 126 126 134L118 132C118 126 114 120 110 118Z',
}

export const abomination: Design = (t) => (
  <g>
    {shadow(60)}
    <P d={ABOM.legs} fill={t.deep} />
    <P d={ABOM.armR2} fill={t.deep} />
    <P d={ABOM.body} fill={t.hide} />
    <path d={ABOM.body} fill={t.light} opacity={0.18} />
    <path d={ABOM.stitches} stroke={INK} strokeWidth={1.6} fill="none" />
    <P d={ABOM.maw} fill="#2a0806" />
    <path d={ABOM.teeth} fill="none" stroke={BONE} strokeWidth={2} strokeLinejoin="round" />
    <P d={ABOM.armL} fill={t.hide} />
    <path d={ABOM.hook} fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" />
    <path d={ABOM.hook} fill="none" stroke="#9aa3ad" strokeWidth={3} strokeLinecap="round" />
    <P d={ABOM.armR} fill={t.hide} />
    <P d={ABOM.headL} fill={t.hide} />
    <P d={ABOM.headR} fill={t.hide} />
    <path d="M60 60Q68 64 76 60" fill="none" stroke={INK} strokeWidth={1.6} />
    <Eyes x={68} y={52} gap={5} r={2} t={t} />
    <Eye x={101} y={62} r={1.8} t={t} />
    <path d="M96 66L106 66" stroke={INK} strokeWidth={1.4} />
  </g>
)
