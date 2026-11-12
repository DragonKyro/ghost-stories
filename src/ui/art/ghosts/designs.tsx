// Ordinary ghost illustrations. Each draws into a 160×150 box, tinted by the
// card colour. Paths are module-level constants (computed once at import).
import { blob, brush, mirrorX, smooth, strokes, type Pt } from '../brush'
import { GuiG } from '../glyphs'
import { GHOST, GHOST_SHADE, GlowEye, INK, VOID, type Design, type Tint } from './common'

// ---------------------------------------------------------------------------
// 1. Yūrei — long black hair, white burial robe, limp dangling hands.
// ---------------------------------------------------------------------------
const YUREI = {
  robe: 'M62 60C52 78 50 100 58 118C66 134 92 144 126 141C108 134 98 124 100 110C102 94 104 78 98 60C90 56 70 56 62 60Z',
  robeShade: 'M88 64C98 80 98 104 94 120C102 132 112 138 124 141C104 136 96 126 98 110C100 94 100 78 96 62Z',
  outline: strokes([
    [[[62, 60], [53, 84], [55, 108], [67, 128], [95, 140], [126, 141]], 3.2, 'tail'],
    [[[98, 60], [102, 86], [98, 110], [106, 128], [124, 140]], 2.4, 'tail'],
    [[[71, 58], [76, 66], [81, 76]], 3, 'tail'],
    [[[89, 58], [84, 68], [78, 80]], 3, 'tail'],
  ]),
  sleeveL: 'M65 62C52 66 42 76 39 92C46 97 55 95 61 88C63 80 65 72 65 62Z',
  hands: strokes([
    [[[43, 92], [41, 102], [39, 111]], 3.6, 'tail'],
    [[[47, 94], [46, 105], [45, 113]], 3.6, 'tail'],
    [[[51, 93], [51, 102], [51, 108]], 3.2, 'tail'],
  ]),
  hair:
    'M80 20C62 20 56 34 58 50C60 70 54 92 48 114C56 110 62 102 66 92C68 74 68 56 71 44C74 38 86 38 89 44C92 56 92 74 94 92C98 102 104 110 112 114C106 92 100 70 102 50C104 34 98 20 80 20Z',
  strands: strokes([
    [[[61, 58], [54, 96], [46, 128]], 4.5, 'tail'],
    [[[99, 58], [107, 96], [116, 130]], 4.5, 'tail'],
    [[[65, 70], [61, 106], [57, 132]], 3.5, 'tail'],
    [[[95, 72], [100, 104], [104, 126]], 3.2, 'tail'],
    [[[74, 38], [72, 56], [70, 74]], 6, 'tail'],
  ]),
}
const YUREI_SLEEVE_R = smooth(mirrorX([[65, 62], [52, 66], [42, 76], [39, 92], [46, 97], [55, 95], [61, 88], [63, 80]], 80), true)
const YUREI_HANDS_R = strokes([
  [mirrorX([[43, 92], [41, 102], [39, 111]], 80), 3.6, 'tail'],
  [mirrorX([[47, 94], [46, 105], [45, 113]], 80), 3.6, 'tail'],
  [mirrorX([[51, 93], [51, 102], [51, 108]], 80), 3.2, 'tail'],
])

const yurei: Design = (t) => (
  <g>
    <ellipse cx={80} cy={80} rx={52} ry={60} fill={t.wash} />
    <path d={YUREI.robe} fill="url(#gs-spirit-fade)" />
    <path d={YUREI.robeShade} fill={t.tint} opacity={0.4} />
    <path d={YUREI.outline} fill={INK} />
    <path d={YUREI.sleeveL} fill={GHOST} stroke={INK} strokeWidth={1.6} />
    <path d={YUREI_SLEEVE_R} fill={GHOST} stroke={INK} strokeWidth={1.6} />
    <path d={YUREI.sleeveL} fill={t.tint} opacity={0.25} />
    <path d={YUREI.hands} fill={GHOST_SHADE} stroke={INK} strokeWidth={0.6} />
    <path d={YUREI_HANDS_R} fill={GHOST_SHADE} stroke={INK} strokeWidth={0.6} />
    <ellipse cx={80} cy={50} rx={10.5} ry={13.5} fill="#f6f5ef" />
    <ellipse cx={80} cy={54} rx={9} ry={8} fill={t.tint} opacity={0.15} />
    <path d={YUREI.hair} fill="#120e0c" />
    <path d={YUREI.hair} fill="url(#gs-streaks)" />
    <path d={YUREI.strands} fill="#120e0c" />
    <path d="M75 36L85 36L80 42Z" fill="#fbfaf4" stroke={INK} strokeWidth={0.8} />
    <GlowEye x={84.5} y={49} r={2.6} t={t} />
    <ellipse cx={80} cy={58.5} rx={2.6} ry={3.6} fill="#2a0f0c" />
  </g>
)

// ---------------------------------------------------------------------------
// 2. Chōchin-obake — a paper lantern with one huge eye and a lolling tongue.
// ---------------------------------------------------------------------------
const LANTERN_RIBS = ((): string => {
  let d = ''
  for (const y of [40, 51, 62, 73, 84, 95, 105]) {
    const w = 38 * Math.sqrt(Math.max(0, 1 - ((y - 72) / 42) ** 2))
    d += `M${(80 - w).toFixed(1)} ${y}Q80 ${y + 5} ${(80 + w).toFixed(1)} ${y}`
  }
  return d
})()
const LANTERN = {
  mouth: 'M44 80L52 85L58 79L66 87L74 80L82 88L90 80L98 87L106 79L115 83C110 99 96 109 80 109C62 109 50 99 44 80Z',
  teeth: 'M44 80L52 85L58 79L66 87L74 80L82 88L90 80L98 87L106 79L115 83L113 78L44 76Z',
  tongue: 'M74 100C68 116 72 133 84 141C94 146 100 137 93 129C88 121 90 110 88 100Z',
  tear: brush([[106, 40], [112, 48], [108, 56], [116, 62]], 3, 'both'),
  wisp: brush([[118, 112], [134, 120], [138, 136], [126, 142]], 7, 'head'),
}

const lantern: Design = (t) => (
  <g>
    <ellipse cx={80} cy={72} rx={60} ry={62} fill={t.wash} />
    <path d="M80 2V24" stroke={INK} strokeWidth={2} />
    <path d="M74 6Q80 -2 86 6" fill="none" stroke={INK} strokeWidth={2} />
    <path d={LANTERN.wisp} fill={t.light} opacity={0.7} />
    <ellipse cx={80} cy={72} rx={39} ry={43} fill="#f6e7c3" stroke={INK} strokeWidth={2.5} />
    <ellipse cx={80} cy={72} rx={39} ry={43} fill="url(#gs-lantern)" opacity={0.55} />
    <ellipse cx={80} cy={72} rx={39} ry={43} fill={t.wash} />
    <path d={LANTERN_RIBS} fill="none" stroke={INK} strokeOpacity={0.45} strokeWidth={1.3} />
    <rect x={63} y={23} width={34} height={9} rx={2} fill={INK} />
    <rect x={66} y={110} width={28} height={9} rx={2} fill={INK} />
    <path d={LANTERN.mouth} fill="#2a0e0a" stroke={INK} strokeWidth={2} />
    <path d={LANTERN.teeth} fill="#f8f2e0" />
    <path d={LANTERN.tongue} fill="#cf3f35" stroke="#5e120c" strokeWidth={1.6} />
    <path d="M84 108Q83 124 88 134" fill="none" stroke="#5e120c" strokeWidth={1.2} />
    <ellipse cx={64} cy={55} rx={13} ry={10.5} fill="#fffdf4" stroke={INK} strokeWidth={2.2} />
    <circle cx={66} cy={56} r={5.5} fill={INK} />
    <circle cx={64} cy={54} r={1.6} fill="#fff" />
    <path d={brush([[90, 54], [98, 50], [106, 53]], 3.6, 'both')} fill={INK} />
    <path d={LANTERN.tear} fill={INK} />
  </g>
)

// ---------------------------------------------------------------------------
// 3. Jiangshi — hopping corpse in a Qing robe, arms out, talisman on the brow.
// ---------------------------------------------------------------------------
const JIANG = {
  robe: 'M76 60C71 80 71 104 74 124L114 124C117 104 115 80 110 60C100 55 86 55 76 60Z',
  sleeveBack: 'M82 62L38 54L35 70L84 76Z',
  sleeveFront: 'M80 68L34 66L32 84L82 86Z',
  handsBack: strokes([
    [[[36, 57], [26, 58], [20, 63]], 3, 'tail'],
    [[[36, 61], [25, 63], [19, 68]], 3, 'tail'],
  ]),
  handsFront: strokes([
    [[[33, 69], [21, 71], [13, 77]], 3.6, 'tail'],
    [[[33, 74], [21, 77], [14, 83]], 3.6, 'tail'],
    [[[33, 79], [22, 82], [17, 88]], 3.2, 'tail'],
  ]),
  hop: strokes([
    [[[64, 134], [60, 140], [62, 146]], 2.4, 'both'],
    [[[126, 134], [130, 140], [128, 146]], 2.4, 'both'],
  ]),
  script: strokes([
    [[[89, 37], [96, 37]], 1.8, 'none'],
    [[[92.5, 37], [92.5, 46]], 1.8, 'tail'],
    [[[89, 47], [93, 50], [89, 53], [96, 56]], 1.6, 'both'],
  ]),
}

const jiangshi: Design = (t) => (
  <g>
    <ellipse cx={86} cy={80} rx={60} ry={60} fill={t.wash} />
    <ellipse cx={94} cy={146} rx={26} ry={3.5} fill={INK} opacity={0.3} />
    <path d={JIANG.hop} fill={INK} opacity={0.6} />
    <path d={JIANG.sleeveBack} fill={t.deep} stroke={INK} strokeWidth={1.5} />
    <path d={JIANG.handsBack} fill="#b7c7b5" stroke={INK} strokeWidth={0.5} />
    <path d={JIANG.robe} fill={t.tint} stroke={INK} strokeWidth={2.2} />
    <path d={JIANG.robe} fill="url(#gs-streaks)" />
    <rect x={84} y={78} width={20} height={18} fill="none" stroke="#e7c873" strokeWidth={1.8} />
    <circle cx={94} cy={87} r={4} fill="none" stroke="#e7c873" strokeWidth={1.4} />
    <path d="M74 120H114" stroke="#e7c873" strokeWidth={2} />
    <rect x={82} y={124} width={24} height={7} fill={INK} />
    <path d="M80 130H108Q110 138 104 138H82Q78 138 80 130Z" fill={INK} />
    <path d={JIANG.sleeveFront} fill={t.tint} stroke={INK} strokeWidth={2} />
    <path d={JIANG.sleeveFront} fill={INK} opacity={0.18} />
    <rect x={29} y={64} width={7} height={22} rx={1.5} fill={INK} />
    <path d={JIANG.handsFront} fill="#c3d2bf" stroke={INK} strokeWidth={0.6} />
    <ellipse cx={93} cy={46} rx={12.5} ry={14} fill="#cddbc8" stroke={INK} strokeWidth={1.8} />
    <path d={brush([[83, 46], [88, 47]], 2.4, 'both')} fill={INK} />
    <path d={brush([[98, 47], [103, 46]], 2.4, 'both')} fill={INK} />
    <path d="M86 57Q93 54 100 57" fill="none" stroke={INK} strokeWidth={1.4} />
    <ellipse cx={93} cy={31} rx={26} ry={6.5} fill={INK} />
    <path d="M75 30C75 15 111 15 111 30Z" fill={INK} />
    <path d="M78 26Q93 19 108 26" fill="none" stroke={t.tint} strokeWidth={1.6} />
    <circle cx={93} cy={13} r={4.2} fill={t.color === 'red' ? '#e8c35a' : '#c1392b'} stroke={INK} strokeWidth={1} />
    <path d="M87 33H99L98 61L93 58L88 61Z" fill="url(#gs-talisman)" stroke="#8a6620" strokeWidth={0.8} />
    <path d={JIANG.script} fill="#b8322a" />
  </g>
)

// ---------------------------------------------------------------------------
// 4. Fox spirit — sly white fox with a fan of flame-tails.
// ---------------------------------------------------------------------------
const FOX_TAILS: string[] = (
  [
    [[80, 116], [50, 92], [26, 48]],
    [[80, 112], [62, 72], [50, 22]],
    [[80, 110], [80, 60], [80, 10]],
    [[80, 112], [98, 72], [110, 22]],
    [[80, 116], [110, 92], [134, 48]],
  ] as Pt[][]
).map((pts) => brush(pts, 30, 'belly', { min: 0.05 }))
const FOX_TIPS: string[] = (
  [
    [[34, 62], [26, 48]],
    [[54, 36], [50, 22]],
    [[80, 26], [80, 10]],
    [[106, 36], [110, 22]],
    [[126, 62], [134, 48]],
  ] as Pt[][]
).map((pts) => brush(pts, 12, 'head', { min: 0.1 }))
const FOX = {
  body: 'M80 70C64 76 56 100 58 128C62 140 98 140 102 128C104 100 96 76 80 70Z',
  head: 'M80 82C69 80 59 71 55 56L52 24L68 40C74 37 86 37 92 40L108 24L105 56C101 71 91 80 80 82Z',
  earL: 'M56 31L65 42L58 48Z',
  marks: strokes([
    [[[80, 42], [80, 50], [80, 56]], 4.2, 'belly'],
    [[[59, 63], [64, 66], [70, 66]], 3, 'tail'],
    [[[101, 63], [96, 66], [90, 66]], 3, 'tail'],
  ]),
  eyes: strokes([
    [[[63, 55], [68, 58], [74, 58]], 3.6, 'head'],
    [[[97, 55], [92, 58], [86, 58]], 3.6, 'head'],
  ]),
  mouth: brush([[73, 75], [80, 78], [87, 75]], 1.8, 'both'),
}

const fox: Design = (t) => (
  <g>
    <ellipse cx={80} cy={78} rx={66} ry={64} fill={t.wash} />
    {FOX_TAILS.map((d, i) => (
      <path key={i} d={d} fill={t.tint} stroke={INK} strokeWidth={1.4} />
    ))}
    {FOX_TIPS.map((d, i) => (
      <path key={i} d={d} fill="#fbf7ec" />
    ))}
    <path d={FOX.body} fill="#f7f2e6" stroke={INK} strokeWidth={2} />
    <path d="M66 98Q80 108 94 98" fill="none" stroke={t.tint} strokeWidth={2} opacity={0.7} />
    <ellipse cx={70} cy={136} rx={7} ry={4} fill="#f7f2e6" stroke={INK} strokeWidth={1.5} />
    <ellipse cx={90} cy={136} rx={7} ry={4} fill="#f7f2e6" stroke={INK} strokeWidth={1.5} />
    <path d={FOX.head} fill="#f9f5ea" stroke={INK} strokeWidth={2.2} strokeLinejoin="round" />
    <path d={FOX.earL} fill={t.deep} />
    <path d={smooth(mirrorX([[56, 31], [65, 42], [58, 48]], 80), true)} fill={t.deep} />
    <path d={FOX.marks} fill={t.tint} />
    <path d={FOX.eyes} fill={INK} />
    <circle cx={69} cy={57.5} r={1.4} fill="#f5d34a" />
    <circle cx={91} cy={57.5} r={1.4} fill="#f5d34a" />
    <ellipse cx={80} cy={72} rx={3} ry={2.2} fill={INK} />
    <path d={FOX.mouth} fill={INK} />
  </g>
)

// ---------------------------------------------------------------------------
// 5. Mokumokuren cloud — a churning ink cloud full of eyes.
// ---------------------------------------------------------------------------
const CLOUD_BLOBS = [
  blob(80, 64, 50, 36, 3, 0.12),
  blob(46, 82, 30, 26, 5, 0.14),
  blob(116, 80, 32, 26, 7, 0.14),
  blob(80, 98, 44, 24, 9, 0.12),
  blob(58, 44, 26, 20, 11, 0.14),
  blob(104, 44, 26, 22, 13, 0.14),
].join('')
const CLOUD_DRIPS = strokes([
  [[[50, 100], [46, 122], [50, 140]], 9, 'tail'],
  [[[76, 112], [78, 130], [72, 146]], 8, 'tail'],
  [[[106, 104], [112, 124], [108, 140]], 9, 'tail'],
  [[[130, 88], [140, 104], [146, 118]], 6, 'tail'],
])
const CLOUD_EYES: Array<[number, number, number]> = [
  [52, 56, 9],
  [80, 46, 12],
  [108, 56, 8],
  [66, 80, 7],
  [96, 82, 10],
  [42, 92, 6],
  [122, 86, 6],
  [80, 104, 7],
  [56, 108, 5],
]

const eyeCloud: Design = (t) => (
  <g>
    <ellipse cx={80} cy={76} rx={70} ry={64} fill={t.wash} />
    <path d={CLOUD_DRIPS} fill="#221c19" />
    <path d={CLOUD_BLOBS} fill="#221c19" />
    <path d={CLOUD_BLOBS} fill={t.tint} opacity={0.35} />
    <path d={CLOUD_BLOBS} fill="url(#gs-streaks)" />
    {CLOUD_EYES.map(([x, y, r], i) => (
      <g key={i}>
        <path d={`M${x - r * 1.4} ${y}Q${x} ${y - r * 1.25} ${x + r * 1.4} ${y}Q${x} ${y + r * 1.25} ${x - r * 1.4} ${y}Z`} fill="#f6f2e4" stroke={INK} strokeWidth={1} />
        <circle cx={x} cy={y} r={r * 0.62} fill="#f2cf3c" />
        <ellipse cx={x} cy={y} rx={r * 0.18} ry={r * 0.55} fill={INK} />
      </g>
    ))}
  </g>
)

// ---------------------------------------------------------------------------
// 6. Drowned maiden — rising from black water, hair plastered, hand reaching.
// ---------------------------------------------------------------------------
const MAIDEN = {
  water: 'M-24 114C-4 108 16 116 36 111C56 106 76 116 96 111C116 106 136 116 156 110C166 108 176 111 184 113L184 156L-24 156Z',
  ripples: strokes([
    [[[-10, 122], [20, 118], [50, 124], [82, 119], [112, 124], [142, 118], [172, 122]], 3, 'both'],
    [[[-16, 133], [16, 129], [52, 135], [88, 130], [122, 135], [176, 131]], 2.6, 'both'],
    [[[-12, 144], [26, 141], [62, 146], [100, 142], [140, 146], [176, 143]], 2.2, 'both'],
  ]),
  shoulders: 'M48 118C50 98 63 88 80 88C97 88 108 98 110 118Z',
  hair: 'M80 38C62 38 57 52 59 70C59 88 55 104 50 118L61 118C63 102 67 86 69 70C71 60 75 55 80 55C85 55 89 60 91 70C93 86 96 102 99 118L110 118C105 104 101 88 101 70C103 52 98 38 80 38Z',
  strands: strokes([
    [[[76, 50], [74, 66], [71, 86]], 4.2, 'tail'],
    [[[85, 52], [87, 70], [89, 88]], 3.2, 'tail'],
    [[[63, 66], [58, 92], [54, 118]], 3, 'tail'],
  ]),
  arm: brush([[118, 120], [121, 92], [124, 60]], 10, 'head', { min: 0.6 }),
  fingers: strokes([
    [[[120, 46], [116, 38], [113, 30]], 3.8, 'tail'],
    [[[123, 44], [122, 35], [121, 26]], 3.8, 'tail'],
    [[[127, 44], [129, 35], [131, 27]], 3.8, 'tail'],
    [[[130, 47], [135, 41], [140, 35]], 3.4, 'tail'],
    [[[119, 53], [114, 50], [110, 46]], 3.4, 'tail'],
  ]),
}

const maiden: Design = (t) => (
  <g>
    <ellipse cx={80} cy={64} rx={64} ry={54} fill={t.wash} />
    <path d={MAIDEN.shoulders} fill={GHOST} stroke={INK} strokeWidth={1.8} />
    <path d={MAIDEN.shoulders} fill={t.tint} opacity={0.2} />
    <ellipse cx={80} cy={64} rx={13.5} ry={17} fill="#eef3ee" />
    <path d={MAIDEN.hair} fill="#100d0c" />
    <path d={MAIDEN.hair} fill="url(#gs-streaks)" />
    <path d={MAIDEN.strands} fill="#100d0c" />
    <GlowEye x={83} y={62} r={2.4} t={t} />
    <ellipse cx={80} cy={75} rx={2.8} ry={4} fill="#2a0f0c" />
    <path d={MAIDEN.arm} fill={GHOST} stroke={INK} strokeWidth={1.4} />
    <ellipse cx={124} cy={51} rx={7.5} ry={8.5} fill={GHOST} stroke={INK} strokeWidth={1.4} />
    <path d={MAIDEN.fingers} fill={GHOST} stroke={INK} strokeWidth={0.9} />
    <path d={MAIDEN.water} fill={t.deep} opacity={0.85} />
    <path d={MAIDEN.water} fill="#0c0a10" opacity={0.35} />
    <path d={MAIDEN.ripples} fill={t.light} opacity={0.75} />
    <path d="M128 66Q131 72 128 74Q125 72 128 66Z" fill={t.light} />
    <path d="M116 80Q119 86 116 88Q113 86 116 80Z" fill={t.light} />
    <path d="M70 92Q73 98 70 100Q67 98 70 92Z" fill={t.light} opacity={0.8} />
  </g>
)

// ---------------------------------------------------------------------------
// 7. Tree spirit — a gnarled trunk with a face and grasping twig hands.
// ---------------------------------------------------------------------------
const TREE = {
  trunk:
    'M60 147C60 132 48 130 30 140C48 120 61 112 63 96C65 78 57 62 47 50C60 54 68 61 71 67C73 53 71 39 64 27C75 33 81 45 82 57C86 45 93 35 104 30C97 42 92 54 92 67C99 59 109 55 120 55C107 63 99 73 97 87C95 105 101 121 126 139C109 136 101 133 98 147Z',
  bark: strokes([
    [[[70, 120], [72, 104], [70, 92]], 2, 'both'],
    [[[88, 124], [86, 108], [88, 96]], 2, 'both'],
    [[[78, 140], [80, 126]], 1.8, 'both'],
    [[[62, 70], [66, 80]], 1.6, 'both'],
  ]),
  arms: strokes([
    [[[58, 62], [40, 52], [22, 48]], 8, 'tail'],
    [[[30, 50], [22, 40], [18, 30]], 3.6, 'tail'],
    [[[26, 49], [14, 50], [6, 56]], 3.6, 'tail'],
    [[[38, 52], [32, 62], [28, 70]], 3.2, 'tail'],
    [[[98, 60], [116, 46], [138, 40]], 8, 'tail'],
    [[[128, 42], [138, 30], [142, 20]], 3.6, 'tail'],
    [[[134, 41], [146, 44], [154, 50]], 3.6, 'tail'],
    [[[116, 46], [124, 56], [128, 64]], 3.2, 'tail'],
  ]),
  mouth: 'M69 103C73 96 87 96 91 103C90 116 71 117 69 103Z',
  leaves: [blob(36, 30, 22, 13, 21, 0.2), blob(124, 24, 24, 13, 23, 0.2), blob(82, 16, 26, 12, 25, 0.2)].join(''),
  needles: strokes([
    [[[24, 30], [34, 26]], 2, 'both'],
    [[[38, 34], [48, 30]], 2, 'both'],
    [[[112, 24], [122, 20]], 2, 'both'],
    [[[126, 30], [136, 26]], 2, 'both'],
    [[[72, 16], [82, 12]], 2, 'both'],
    [[[86, 20], [96, 16]], 2, 'both'],
  ]),
}

const treeSpirit: Design = (t) => (
  <g>
    <ellipse cx={80} cy={80} rx={70} ry={64} fill={t.wash} />
    <path d={TREE.leaves} fill={t.tint} opacity={0.75} />
    <path d={TREE.needles} fill={INK} opacity={0.7} />
    <path d={TREE.arms} fill="#2e231b" />
    <path d={TREE.trunk} fill="#3b2d23" stroke={INK} strokeWidth={1.8} />
    <path d={TREE.trunk} fill={t.tint} opacity={0.22} />
    <path d={TREE.trunk} fill="url(#gs-streaks)" />
    <path d={TREE.bark} fill={INK} />
    <ellipse cx={71} cy={82} rx={6.5} ry={8.5} fill={VOID} />
    <ellipse cx={90} cy={80} rx={6.5} ry={8.5} fill={VOID} />
    <GlowEye x={71} y={83} r={2.4} t={t} />
    <GlowEye x={90} y={81} r={2.4} t={t} />
    <path d={TREE.mouth} fill={VOID} />
    <path d="M73 102L76 107L79 101L82 107L85 101L88 106" fill="none" stroke="#d8cdb4" strokeWidth={1.4} />
  </g>
)

// ---------------------------------------------------------------------------
// 8. Hooded wraith — a ragged cloak around a void with two burning eyes.
// ---------------------------------------------------------------------------
const WRAITH = {
  cloak:
    'M80 12C60 12 50 28 48 48C40 62 32 82 28 106C26 122 30 134 34 146L44 136L52 147L62 134L72 147L82 134L92 147L102 134L112 147L120 136L130 146C133 130 133 110 127 92C123 70 112 56 110 46C108 26 98 12 80 12Z',
  hood: 'M80 28C66 28 60 42 62 56C64 68 72 75 80 75C88 75 96 68 98 56C100 42 94 28 80 28Z',
  rim: brush([[63, 62], [62, 44], [72, 31], [86, 30], [97, 42], [97, 60]], 3, 'both'),
  folds: strokes([
    [[[58, 84], [50, 112], [46, 136]], 2.4, 'both'],
    [[[80, 84], [80, 112], [82, 132]], 2.2, 'both'],
    [[[104, 84], [110, 112], [114, 134]], 2.4, 'both'],
  ]),
  handL: strokes([
    [[[56, 96], [48, 100], [42, 108]], 3, 'tail'],
    [[[57, 99], [50, 106], [47, 114]], 3, 'tail'],
    [[[59, 101], [55, 110], [54, 118]], 2.8, 'tail'],
  ]),
}
const WRAITH_HAND_R = strokes([
  [mirrorX([[56, 96], [48, 100], [42, 108]], 80), 3, 'tail'],
  [mirrorX([[57, 99], [50, 106], [47, 114]], 80), 3, 'tail'],
  [mirrorX([[59, 101], [55, 110], [54, 118]], 80), 2.8, 'tail'],
])

const wraith: Design = (t) => (
  <g>
    <ellipse cx={80} cy={74} rx={66} ry={66} fill={t.wash} />
    <ellipse cx={80} cy={50} rx={36} ry={30} fill="url(#gs-mist)" />
    <path d={WRAITH.cloak} fill="#1b1714" stroke={INK} strokeWidth={1.5} />
    <path d={WRAITH.cloak} fill={t.tint} opacity={0.28} />
    <path d={WRAITH.cloak} fill="url(#gs-streaks)" />
    <path d={WRAITH.folds} fill={t.light} opacity={0.35} />
    <path d={WRAITH.hood} fill={VOID} />
    <path d={WRAITH.rim} fill={t.light} opacity={0.6} />
    <GlowEye x={72} y={54} r={3.4} t={t} />
    <GlowEye x={88} y={54} r={3.4} t={t} />
    <path d={WRAITH.handL} fill="#d7d9cf" stroke={INK} strokeWidth={0.6} />
    <path d={WRAITH_HAND_R} fill="#d7d9cf" stroke={INK} strokeWidth={0.6} />
  </g>
)

// ---------------------------------------------------------------------------
// 9. Crawling shadow — a spider-limbed thing creeping along the ground.
// ---------------------------------------------------------------------------
const CRAWL_LEGS = strokes(
  (
    [
      [[50, 104], [34, 72], [16, 144]],
      [[66, 96], [58, 56], [44, 146]],
      [[86, 90], [88, 50], [80, 146]],
      [[104, 92], [116, 54], [108, 146]],
      [[118, 98], [140, 64], [134, 146]],
      [[130, 104], [154, 82], [152, 140]],
    ] as Pt[][]
  ).map((p) => [p, 4.6, 'tail'] as const),
)
const CRAWL = {
  body: 'M26 118C30 92 56 72 86 70C114 68 134 84 138 106C128 100 114 100 104 104C88 110 66 114 48 122Z',
  head: blob(36, 114, 19, 15, 31, 0.08),
  hair: strokes([
    [[[22, 104], [16, 124], [18, 144]], 4, 'tail'],
    [[[30, 102], [26, 126], [30, 146]], 4, 'tail'],
    [[[42, 104], [44, 128], [40, 146]], 3.6, 'tail'],
  ]),
  teeth: 'M24 122L27 127L30 122L33 128L36 122L39 127L42 122L45 126L47 121Z',
}

const crawler: Design = (t) => (
  <g>
    <ellipse cx={86} cy={96} rx={72} ry={52} fill={t.wash} />
    <ellipse cx={84} cy={146} rx={70} ry={4} fill={INK} opacity={0.35} />
    <path d={CRAWL_LEGS} fill="#171310" />
    <path d={CRAWL.body} fill="#171310" />
    <path d={CRAWL.body} fill={t.tint} opacity={0.3} />
    <path d={CRAWL.body} fill="url(#gs-streaks)" />
    <path d={CRAWL.hair} fill="#100d0b" />
    <path d={CRAWL.head} fill="#171310" />
    <path d={CRAWL.teeth} fill="#efe7d2" />
    <GlowEye x={30} y={110} r={3.2} t={t} />
    <GlowEye x={42} y={108} r={3.2} t={t} />
    <GlowEye x={36} y={102} r={2} t={t} />
  </g>
)

// ---------------------------------------------------------------------------
// 10. Onibi skull — a skull wreathed in ghost-fire.
// ---------------------------------------------------------------------------
const FLAMES_OUT = (
  [
    [[56, 96], [40, 70], [38, 40]],
    [[66, 80], [56, 50], [60, 18]],
    [[80, 74], [76, 40], [82, 4]],
    [[94, 80], [104, 50], [100, 18]],
    [[104, 96], [120, 70], [122, 40]],
  ] as Pt[][]
).map((p) => brush(p, 26, 'head', { min: 0.02 }))
const FLAMES_IN = (
  [
    [[60, 94], [48, 72], [46, 52]],
    [[68, 82], [62, 58], [64, 34]],
    [[80, 78], [78, 52], [82, 24]],
    [[92, 82], [98, 58], [96, 34]],
    [[100, 94], [112, 72], [114, 52]],
  ] as Pt[][]
).map((p) => brush(p, 12, 'head', { min: 0.02 }))
const SKULL = {
  cranium: 'M80 36C58 36 48 52 50 70C51 80 56 86 60 89L61 99L99 99L100 89C104 86 109 80 110 70C112 52 102 36 80 36Z',
  jaw: 'M63 104L97 104L95 116C88 120 72 120 65 116Z',
  teeth: 'M63 99V104M69 99V105M75 99V105M81 99V105M87 99V105M93 99V104',
  crack: brush([[90, 40], [94, 50], [90, 56], [93, 62]], 2.2, 'both'),
}

const skullFire: Design = (t) => (
  <g>
    <ellipse cx={80} cy={72} rx={64} ry={66} fill={t.wash} />
    {FLAMES_OUT.map((d, i) => (
      <path key={i} d={d} fill={t.tint} opacity={0.9} />
    ))}
    {FLAMES_IN.map((d, i) => (
      <path key={i} d={d} fill={t.light} />
    ))}
    <path d="M70 116C66 128 72 138 64 148M90 116C96 128 88 138 96 148" fill="none" stroke={t.light} strokeWidth={3} opacity={0.6} />
    <path d={SKULL.cranium} fill="url(#gs-bone)" stroke={INK} strokeWidth={2} />
    <path d={SKULL.jaw} fill="url(#gs-bone)" stroke={INK} strokeWidth={2} />
    <path d={SKULL.teeth} stroke={INK} strokeWidth={1.4} />
    <ellipse cx={68} cy={70} rx={8.5} ry={9.5} fill={VOID} />
    <ellipse cx={92} cy={70} rx={8.5} ry={9.5} fill={VOID} />
    <GlowEye x={68} y={71} r={2.6} t={t} />
    <GlowEye x={92} y={71} r={2.6} t={t} />
    <path d="M80 78L75.5 89H84.5Z" fill={VOID} />
    <path d={SKULL.crack} fill={INK} />
  </g>
)

// ---------------------------------------------------------------------------
// Skeleton (Black Secret skeleton tokens on a ghost space).
// ---------------------------------------------------------------------------
const BONES = {
  skull: 'M80 14C68 14 62 22 63 32C63 38 66 42 69 44L70 50L90 50L91 44C94 42 97 38 97 32C98 22 92 14 80 14Z',
  spine: brush([[80, 50], [80, 80], [80, 104]], 4, 'none'),
  ribs: strokes([
    [[[80, 60], [66, 62], [62, 70]], 3, 'tail'],
    [[[80, 68], [64, 70], [60, 80]], 3, 'tail'],
    [[[80, 76], [66, 78], [63, 86]], 3, 'tail'],
    [[[80, 60], [94, 62], [98, 70]], 3, 'tail'],
    [[[80, 68], [96, 70], [100, 80]], 3, 'tail'],
    [[[80, 76], [94, 78], [97, 86]], 3, 'tail'],
  ]),
  limbs: strokes([
    [[[68, 56], [52, 70], [40, 56], [34, 40]], 4, 'none'],
    [[[92, 56], [108, 70], [120, 56], [126, 40]], 4, 'none'],
    [[[72, 106], [66, 126], [64, 146]], 4.4, 'none'],
    [[[88, 106], [94, 126], [98, 146]], 4.4, 'none'],
  ]),
  pelvis: 'M68 100C70 96 90 96 92 100L90 110L80 106L70 110Z',
}

const skeleton: Design = (t) => (
  <g>
    <ellipse cx={80} cy={78} rx={62} ry={64} fill={t.wash} />
    <path d={BONES.limbs} fill="url(#gs-bone)" stroke={INK} strokeWidth={1.2} />
    <path d={BONES.spine} fill="url(#gs-bone)" stroke={INK} strokeWidth={1} />
    <path d={BONES.ribs} fill="url(#gs-bone)" stroke={INK} strokeWidth={0.9} />
    <path d={BONES.pelvis} fill="url(#gs-bone)" stroke={INK} strokeWidth={1.4} />
    <circle cx={34} cy={38} r={4} fill="url(#gs-bone)" stroke={INK} strokeWidth={1} />
    <circle cx={126} cy={38} r={4} fill="url(#gs-bone)" stroke={INK} strokeWidth={1} />
    <path d={BONES.skull} fill="url(#gs-bone)" stroke={INK} strokeWidth={1.8} />
    <ellipse cx={73} cy={31} rx={5} ry={5.5} fill={VOID} />
    <ellipse cx={87} cy={31} rx={5} ry={5.5} fill={VOID} />
    <GlowEye x={73} y={31} r={1.8} t={t} />
    <GlowEye x={87} y={31} r={1.8} t={t} />
    <path d="M80 37L77 42H83Z" fill={VOID} />
    <path d="M72 46V50M76 46V50M80 46V50M84 46V50M88 46V50" stroke={INK} strokeWidth={1} />
  </g>
)

// ---------------------------------------------------------------------------
// Summon card — Wu-Feng's summoning seal: a trigram ring around 鬼.
// ---------------------------------------------------------------------------
const TRIGRAMS = ((): string => {
  // 8 trigrams around the ring; broken lines are split in two.
  const codes = ['111', '000', '100', '011', '010', '101', '001', '110']
  let d = ''
  codes.forEach((code, i) => {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2
    const cx = 80 + Math.cos(a) * 50
    const cy = 74 + Math.sin(a) * 50
    const ux = -Math.sin(a)
    const uy = Math.cos(a)
    const nx = Math.cos(a)
    const ny = Math.sin(a)
    code.split('').forEach((bit, j) => {
      const off = (j - 1) * 4.2
      const px = cx + nx * off
      const py = cy + ny * off
      const half = 8
      if (bit === '1') {
        d += `M${(px - ux * half).toFixed(1)} ${(py - uy * half).toFixed(1)}L${(px + ux * half).toFixed(1)} ${(py + uy * half).toFixed(1)}`
      } else {
        d += `M${(px - ux * half).toFixed(1)} ${(py - uy * half).toFixed(1)}L${(px - ux * 2).toFixed(1)} ${(py - uy * 2).toFixed(1)}`
        d += `M${(px + ux * 2).toFixed(1)} ${(py + uy * 2).toFixed(1)}L${(px + ux * half).toFixed(1)} ${(py + uy * half).toFixed(1)}`
      }
    })
  })
  return d
})()
const SMOKE = strokes([
  [[[20, 140], [40, 120], [30, 100], [44, 84]], 6, 'both'],
  [[[140, 140], [120, 122], [132, 104], [118, 88]], 6, 'both'],
])

const summon: Design = (t) => (
  <g>
    <ellipse cx={80} cy={74} rx={70} ry={66} fill="url(#gs-wash-crimson)" />
    <path d={SMOKE} fill={t.light} opacity={0.5} />
    <circle cx={80} cy={74} r={62} fill="none" stroke={INK} strokeWidth={2.5} />
    <circle cx={80} cy={74} r={38} fill="none" stroke={INK} strokeWidth={2} />
    <path d={TRIGRAMS} stroke={INK} strokeWidth={2.6} strokeLinecap="round" />
    <circle cx={80} cy={74} r={34} fill="url(#gs-seal)" />
    <GuiG fill="#f6e8d6" x={58} y={52} s={44} />
  </g>
)

// ---------------------------------------------------------------------------
// Selection.
// ---------------------------------------------------------------------------
export const GHOST_DESIGNS = {
  yurei,
  lantern,
  jiangshi,
  fox,
  eyeCloud,
  maiden,
  treeSpirit,
  wraith,
  crawler,
  skullFire,
} as const satisfies Record<string, Design>
export type GhostDesignId = keyof typeof GHOST_DESIGNS

export const SPECIAL_DESIGNS = { skeleton, summon } as const satisfies Record<string, Design>

export const KEYWORDS: Array<[RegExp, GhostDesignId]> = [
  [/drown|maiden|bride|daughter|widow|mother|well|choker/i, 'maiden'],
  [/lantern|lamp|bell|page/i, 'lantern'],
  [/eyes|choir|brood|shapeless|cloud/i, 'eyeCloud'],
  [/crawl|spider|\brat\b|cricket|serpent|snare|shadow/i, 'crawler'],
  [/pine|sapling|root|moss|mold|bramble|vine|tree|wood/i, 'treeSpirit'],
  [/reaper|hollow|herald|silent|grave|shroud|wraith/i, 'wraith'],
  [/fox|fire|cinder|flame|vermilion|crimson|lash/i, 'fox'],
  [/yamen|knight|stitched|walker|lord|king|tomb|corpse/i, 'jiangshi'],
  [/skull|bone|maw|eater|hunger|gnaw|devour|crown|throne|ossuary/i, 'skullFire'],
  [/whisper|singer|crone|veil|empress|speaker|witch|wind|mist|current|cold|flood|salt|glass|onyx/i, 'yurei'],
]

export type { Tint }
