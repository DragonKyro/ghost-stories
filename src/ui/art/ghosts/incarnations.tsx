// Wu-Feng incarnation illustrations: one imposing design per IncarnationId,
// drawn into the same 160×150 box as the ordinary ghosts.
import type { IncarnationId } from '@/game/types'
import { arcPts, blob, brush, mirrorX, strokes, type Pt } from '../brush'
import { GuiG, TaoDieFaceG } from '../glyphs'
import { COLOR_HEX, COLOR_LIGHT } from '../palette'
import { GHOST, GlowEye, INK, VOID, type Design } from './common'

const rad = (deg: number): number => (deg * Math.PI) / 180

/** Small triangles (fangs) along an edge from a to b, pointing along n. */
function fangs(a: Pt, b: Pt, ts: number[], n: Pt, len: number, half = 0.05): string {
  let d = ''
  for (const t of ts) {
    const p = (k: number): Pt => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]
    const p0 = p(t - half)
    const p1 = p(t + half)
    const m = p(t)
    d += `M${p0[0].toFixed(1)} ${p0[1].toFixed(1)}L${(m[0] + n[0] * len).toFixed(1)} ${(m[1] + n[1] * len).toFixed(1)}L${p1[0].toFixed(1)} ${p1[1].toFixed(1)}Z`
  }
  return d
}

// ---------------------------------------------------------------------------
// Howling Nightmare — a wolf-demon howling at the moon.
// ---------------------------------------------------------------------------
const HOWL = {
  head: 'M64 148L70 116L80 92L46 60L40 50L54 52L84 74L90 64L34 22L50 18L98 48L106 26L116 44L122 34L125 56C135 66 141 82 141 100L139 116L149 124L137 128L145 140L131 138L133 148Z',
  mouth: 'M40 50L54 52L84 74L90 64L34 22Z',
  fangsTop: fangs([34, 22], [90, 64], [0.2, 0.42, 0.64], [-0.6, 0.8], 9),
  fangsBot: fangs([54, 52], [84, 74], [0.3, 0.7], [0.59, -0.81], 7, 0.08),
  mane: strokes([
    [[[124, 58], [140, 48], [154, 44]], 10, 'tail'],
    [[[134, 76], [148, 70], [158, 72]], 10, 'tail'],
    [[[138, 96], [150, 96], [158, 102]], 9, 'tail'],
    [[[112, 50], [118, 36], [128, 28]], 8, 'tail'],
  ]),
  rings: [12, 22, 32].map((r) => brush(arcPts(36, 30, r, r, rad(185), rad(272), 6), 3.4, 'both')).join(''),
  ridge: brush([[50, 20], [74, 34], [98, 48]], 3, 'both'),
}
const howlingNightmare: Design = (t) => (
  <g>
    <circle cx={128} cy={30} r={44} fill="url(#gs-moon-halo)" />
    <circle cx={128} cy={30} r={24} fill="url(#gs-moon)" />
    <path d={HOWL.rings} fill={t.light} />
    <path d={HOWL.mouth} fill="#5a0d0a" />
    <path d={HOWL.mane} fill={VOID} />
    <path d={HOWL.head} fill="#130f0d" stroke={VOID} strokeWidth={1.5} strokeLinejoin="round" />
    <path d={HOWL.head} fill={t.tint} opacity={0.25} />
    <path d={HOWL.head} fill="url(#gs-streaks)" />
    <path d={HOWL.ridge} fill={t.light} opacity={0.7} />
    <path d={HOWL.fangsTop + HOWL.fangsBot} fill="#f4ecd8" />
    <GlowEye x={102} y={56} r={4} t={t} />
  </g>
)

// ---------------------------------------------------------------------------
// Uncatchable — a grinning spirit streaking away, leaving afterimages.
// ---------------------------------------------------------------------------
const UNC = {
  tail: brush([[16, 150], [46, 114], [80, 80], [106, 52]], 50, 'head', { min: 0 }),
  speed: strokes([
    [[[6, 104], [34, 74], [54, 54]], 3.4, 'both'],
    [[[30, 140], [60, 106], [82, 84]], 3, 'both'],
    [[[64, 150], [96, 116], [118, 94]], 3.4, 'both'],
    [[[2, 70], [22, 50], [36, 38]], 2.6, 'both'],
    [[[100, 150], [124, 124], [140, 108]], 2.6, 'both'],
  ]),
  grin: 'M95 50Q112 72 131 45Q114 59 95 50Z',
  teeth: 'M98 52L101 57L104 54L107 59L110 56L113 59L116 56L119 58L122 54L126 51',
  eyes: strokes([
    [[[98, 41], [104, 34], [110, 40]], 3.6, 'both'],
    [[[114, 38], [120, 31], [127, 36]], 3.6, 'both'],
  ]),
  claws: strokes([
    [[[84, 74], [64, 78], [48, 88]], 5, 'tail'],
    [[[94, 82], [82, 98], [68, 108]], 5, 'tail'],
  ]),
  brow: brush([[94, 28], [104, 18], [120, 16], [132, 24]], 3.4, 'both'),
}
const uncatchable: Design = (t) => (
  <g>
    <path d={UNC.speed} fill={INK} opacity={0.6} />
    <circle cx={56} cy={104} r={15} fill={GHOST} stroke={INK} strokeOpacity={0.3} opacity={0.3} />
    <circle cx={82} cy={76} r={20} fill={GHOST} stroke={INK} strokeOpacity={0.4} opacity={0.45} />
    <path d={UNC.tail} fill="url(#gs-spirit)" stroke={INK} strokeWidth={1.6} />
    <path d={UNC.tail} fill={t.tint} opacity={0.35} />
    <path d={UNC.claws} fill="#e4e8e2" stroke={INK} strokeWidth={1} />
    <circle cx={112} cy={44} r={27} fill="url(#gs-spirit)" stroke={INK} strokeWidth={2.4} />
    <ellipse cx={112} cy={52} rx={20} ry={12} fill={t.tint} opacity={0.18} />
    <path d={UNC.eyes} fill={INK} />
    <path d={UNC.grin} fill={VOID} />
    <path d={UNC.teeth} fill="none" stroke="#f4ecd8" strokeWidth={1.4} />
    <path d={UNC.brow} fill={t.deep} />
  </g>
)

// ---------------------------------------------------------------------------
// Death Army — a skeletal general before ranks of spears.
// ---------------------------------------------------------------------------
const ARMY = {
  spears: ((): string => {
    let d = ''
    for (let x = 30; x <= 150; x += 11) {
      const top = 14 + ((x * 7) % 13)
      d += `M${x} ${top + 8}V96M${x - 3} ${top + 9}L${x} ${top}L${x + 3} ${top + 9}Z`
    }
    return d
  })(),
  heads: ((): string => {
    const out: string[] = []
    for (let i = 0; i < 12; i++) out.push(blob(32 + i * 10.5, 74 + (i % 2) * 5, 6, 6.5, 40 + i, 0.08, 7))
    return out.join('')
  })(),
  shoulders: 'M26 148C30 120 52 108 80 106C108 108 130 120 134 148Z',
  lamellae: ((): string => {
    let d = ''
    for (let row = 0; row < 3; row++) {
      const y = 120 + row * 9
      for (let x = 36 + (row % 2) * 5; x < 126; x += 10) d += `M${x} ${y}q5 6 10 0`
    }
    return d
  })(),
  helmet: 'M58 78C58 50 102 50 102 78L110 84L50 84Z',
  plume: brush([[80, 54], [82, 36], [92, 22], [104, 18]], 9, 'tail'),
  skull: 'M80 64C68 64 63 72 64 82C64 88 67 92 70 94L71 102L89 102L90 94C93 92 96 88 96 82C97 72 92 64 80 64Z',
  flag: 'M18 14L58 18L50 30L60 42L18 46Z',
}
const deathArmy: Design = (t) => (
  <g>
    <ellipse cx={86} cy={60} rx={70} ry={40} fill="url(#gs-wash-crimson)" />
    <path d={ARMY.spears} fill={INK} stroke={INK} strokeWidth={1.6} opacity={0.75} />
    <path d={ARMY.heads} fill="#221b17" />
    <path d="M18 8V148" stroke={INK} strokeWidth={3.2} />
    <path d={ARMY.flag} fill={t.tint === COLOR_HEX.black ? '#7a1f16' : t.deep} stroke={INK} strokeWidth={1.4} />
    <GuiG fill="#f0e2c8" x={24} y={18} s={24} />
    <path d={ARMY.shoulders} fill="#171210" />
    <path d={ARMY.lamellae} fill="none" stroke="#c99a3c" strokeWidth={1.4} />
    <path d={ARMY.skull} fill="url(#gs-bone)" stroke={INK} strokeWidth={1.8} />
    <ellipse cx={73.5} cy={82} rx={5.5} ry={6} fill={VOID} />
    <ellipse cx={86.5} cy={82} rx={5.5} ry={6} fill={VOID} />
    <GlowEye x={73.5} y={82} r={2.2} t={t} />
    <GlowEye x={86.5} y={82} r={2.2} t={t} />
    <path d="M80 87L77 93H83Z" fill={VOID} />
    <path d="M73 97V102M77 97V102M81 97V102M85 97V102" stroke={INK} strokeWidth={1.1} />
    <path d={ARMY.plume} fill="#b8322a" />
    <path d={ARMY.helmet} fill="#2a221c" stroke="#c99a3c" strokeWidth={2} />
    <path d="M64 70Q80 62 96 70" fill="none" stroke="#c99a3c" strokeWidth={1.6} />
  </g>
)

// ---------------------------------------------------------------------------
// Forgotten Ones — a huddle of hollow-eyed ghost children.
// ---------------------------------------------------------------------------
const FORGOT: Array<[number, number, number, number]> = [
  [40, 46, 13, 0.45],
  [120, 46, 13, 0.45],
  [80, 36, 15, 0.6],
  [22, 92, 10, 0.35],
  [138, 92, 10, 0.35],
  [54, 78, 16, 0.8],
  [106, 78, 16, 0.8],
  [80, 108, 20, 1],
]
const FORGOT_WISPS = strokes(
  FORGOT.map(([x, y, r]) => [[[x, y + r * 0.6], [x - r * 0.3, y + r * 1.8], [x + r * 0.2, y + r * 2.8]], r * 1.5, 'head'] as const),
)
const forgottenOnes: Design = (t) => (
  <g>
    <ellipse cx={80} cy={84} rx={74} ry={60} fill="url(#gs-mist)" />
    <path d={FORGOT_WISPS} fill={GHOST} opacity={0.35} />
    {FORGOT.map(([x, y, r, o], i) => (
      <g key={i} opacity={o}>
        <ellipse cx={x} cy={y} rx={r} ry={r * 1.15} fill="url(#gs-spirit)" stroke={INK} strokeWidth={1.4} />
        <ellipse cx={x} cy={y + r * 0.3} rx={r * 0.8} ry={r * 0.6} fill={t.tint} opacity={0.18} />
        <ellipse cx={x - r * 0.36} cy={y - r * 0.08} rx={r * 0.2} ry={r * 0.3} fill={VOID} />
        <ellipse cx={x + r * 0.36} cy={y - r * 0.08} rx={r * 0.2} ry={r * 0.3} fill={VOID} />
        <ellipse cx={x} cy={y + r * 0.52} rx={r * 0.12} ry={r * 0.18} fill={VOID} />
        <path d={`M${x - r * 0.36} ${y + r * 0.22}Q${x - r * 0.42} ${y + r * 0.6} ${x - r * 0.34} ${y + r * 0.9}`} fill="none" stroke={INK} strokeOpacity={0.6} strokeWidth={0.9} />
      </g>
    ))}
  </g>
)

// ---------------------------------------------------------------------------
// Bonecracker — a hulking brute splitting a bone in its jaws.
// ---------------------------------------------------------------------------
const BONE = {
  body: 'M6 150C8 112 28 84 56 74C68 70 92 70 104 74C132 84 152 112 154 150Z',
  spikes: 'M30 96L14 64L42 86ZM130 96L146 64L118 86ZM48 80L40 50L62 74ZM112 80L120 50L98 74Z',
  head: 'M55 92C51 58 63 32 80 32C97 32 109 58 105 92Z',
  jaw: 'M50 92C50 114 63 124 80 124C97 124 110 114 110 92Z',
  boneL: 'M40 90L77 90L72 95.5L78 101L40 101ZM36 95.5m-6.5 -6a6.5 6.5 0 1 0 13 0a6.5 6.5 0 1 0 -13 0M36 95.5m-6.5 6a6.5 6.5 0 1 0 13 0a6.5 6.5 0 1 0 -13 0',
  hands: [blob(28, 98, 14, 12, 51, 0.12), blob(132, 98, 14, 12, 53, 0.12)].join(''),
  claws: strokes([
    [[[18, 92], [14, 84], [12, 76]], 3.6, 'tail'],
    [[[25, 88], [23, 80], [23, 72]], 3.6, 'tail'],
    [[[142, 92], [146, 84], [148, 76]], 3.6, 'tail'],
    [[[135, 88], [137, 80], [137, 72]], 3.6, 'tail'],
  ]),
  tusks: strokes([
    [[[62, 114], [58, 98], [56, 82]], 6.5, 'tail'],
    [[[98, 114], [102, 98], [104, 82]], 6.5, 'tail'],
  ]),
  fangs: 'M66 89L69 97L72 89ZM88 89L91 97L94 89Z',
  brows: strokes([
    [[[61, 56], [70, 60], [78, 63]], 3.6, 'head'],
    [[[99, 56], [90, 60], [82, 63]], 3.6, 'head'],
  ]),
  shards: 'M80 84L83 78L85 85ZM74 106L77 112L79 105ZM86 104L91 108L88 101Z',
}
const BONE_R = BONE.boneL
const bonecracker: Design = (t) => (
  <g>
    <circle cx={80} cy={62} r={58} fill="url(#gs-mist)" />
    <path d={BONE.body} fill="#151110" />
    <path d={BONE.body} fill={t.tint} opacity={0.32} />
    <path d={BONE.body} fill="url(#gs-streaks)" />
    <path d={BONE.spikes} fill="url(#gs-bone)" stroke={INK} strokeWidth={1.2} />
    <path d={BONE.head} fill="#151110" />
    <path d={BONE.head} fill={t.tint} opacity={0.18} />
    <path d={BONE.brows} fill={t.light} />
    <GlowEye x={70} y={68} r={3.6} t={t} />
    <GlowEye x={90} y={68} r={3.6} t={t} />
    <path d={BONE.jaw} fill="#151110" />
    <path d="M58 92H102" stroke="#5a0d0a" strokeWidth={6} />
    <path d={BONE.boneL} fill="url(#gs-bone)" stroke={INK} strokeWidth={1.4} />
    <path d={BONE_R} transform="translate(160 0) scale(-1 1)" fill="url(#gs-bone)" stroke={INK} strokeWidth={1.4} />
    <path d={BONE.shards} fill="#f4ecd8" />
    <path d={BONE.fangs} fill="#f4ecd8" stroke={INK} strokeWidth={0.6} />
    <path d={BONE.tusks} fill="#f4ecd8" stroke={INK} strokeWidth={0.9} />
    <path d={BONE.hands} fill="#151110" />
    <path d={BONE.claws} fill="#f4ecd8" />
  </g>
)

// ---------------------------------------------------------------------------
// Dark Mistress — a courtly lady in black with burning eyes and a fan.
// ---------------------------------------------------------------------------
const MIST = {
  hair: 'M80 12C56 12 44 26 46 46C30 48 26 64 36 76C44 68 50 64 58 64L102 64C110 64 116 68 124 76C134 64 130 48 114 46C116 26 104 12 80 12Z',
  pins: strokes([
    [[[34, 42], [52, 30], [68, 22]], 2.6, 'none'],
    [[[126, 42], [108, 30], [92, 22]], 2.6, 'none'],
  ]),
  robe: 'M30 148C32 114 54 98 80 96C106 98 128 114 130 148Z',
  collar: 'M64 94L80 122L96 94L89 92L80 108L71 92Z',
  swirls: strokes([
    [[[42, 130], [50, 122], [58, 128], [52, 136]], 2.6, 'both'],
    [[[100, 132], [108, 124], [116, 130]], 2.6, 'both'],
  ]),
  locks: strokes([
    [[[58, 58], [52, 82], [46, 104], [50, 118]], 9, 'tail'],
    [mirrorX([[58, 58], [52, 82], [46, 104], [50, 118]], 80), 9, 'tail'],
  ]),
  eyes: strokes([
    [[[66, 58], [72, 60], [78, 58]], 3, 'tail'],
    [[[94, 58], [88, 60], [82, 58]], 3, 'tail'],
  ]),
  brows: strokes([
    [[[64, 50], [72, 48], [77, 50]], 2, 'head'],
    [[[96, 50], [88, 48], [83, 50]], 2, 'head'],
  ]),
}
const FAN_RIBS = ((): string => {
  let d = ''
  for (let i = 0; i <= 8; i++) {
    const a = rad(-165 + (150 * i) / 8)
    d += `M118 128L${(118 + Math.cos(a) * 34).toFixed(1)} ${(128 + Math.sin(a) * 34).toFixed(1)}`
  }
  return d
})()
const FAN_EDGE = ((): string => {
  const pts = arcPts(118, 128, 34, 34, rad(-165), rad(-15), 12)
  return `M118 128L${pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('L')}Z`
})()
const darkMistress: Design = (t) => (
  <g>
    <circle cx={80} cy={60} r={56} fill="url(#gs-mist)" />
    <path d={MIST.robe} fill="#110d0c" />
    <path d={MIST.swirls} fill={t.light} opacity={0.6} />
    <path d={MIST.collar} fill={t.tint === COLOR_HEX.black ? '#8e1f1a' : t.tint} />
    <path d={MIST.locks} fill="#0d0a09" />
    <ellipse cx={80} cy={64} rx={15} ry={19} fill="#f5f0e8" stroke={INK} strokeWidth={1.4} />
    <ellipse cx={80} cy={70} rx={12} ry={10} fill="#d9c8cc" opacity={0.35} />
    <path d={MIST.hair} fill="#0d0a09" />
    <path d={MIST.hair} fill="url(#gs-streaks)" />
    <path d={MIST.pins} fill="url(#gs-gold)" />
    <circle cx={34} cy={42} r={3} fill="url(#gs-gold-r)" />
    <circle cx={126} cy={42} r={3} fill="url(#gs-gold-r)" />
    <path d="M34 45V58M126 45V58" stroke="#b8322a" strokeWidth={2} />
    <path d={MIST.brows} fill={INK} />
    <path d={MIST.eyes} fill={INK} />
    <GlowEye x={73} y={59} r={2} t={t} />
    <GlowEye x={87} y={59} r={2} t={t} />
    <path d="M75 75Q80 73 85 75Q80 80 75 75Z" fill="#b01e1a" />
    <path d={FAN_EDGE} fill={t.tint === COLOR_HEX.black ? '#5a1814' : t.deep} stroke={INK} strokeWidth={1.6} />
    <path d={FAN_RIBS} stroke="#d9b45a" strokeWidth={1} />
    <path d={brush(arcPts(118, 128, 28, 28, rad(-160), rad(-20), 8), 2.4, 'both')} fill="#d9b45a" />
    <ellipse cx={118} cy={130} rx={6} ry={5} fill="#f5f0e8" stroke={INK} strokeWidth={1} />
  </g>
)

// ---------------------------------------------------------------------------
// Creeping Horror — a great centipede coiling, a Tao die caught in its jaws.
// ---------------------------------------------------------------------------
const CENTI_PATH: Pt[] = [
  [20, 142],
  [44, 130],
  [66, 124],
  [88, 114],
  [102, 98],
  [100, 80],
  [86, 68],
  [82, 52],
  [92, 38],
  [108, 30],
]
const CENTI = ((): { segs: Array<[number, number, number]>; legs: string } => {
  const segs: Array<[number, number, number]> = []
  let legs = ''
  for (let i = 0; i < CENTI_PATH.length; i++) {
    const a = CENTI_PATH[Math.max(0, i - 1)]
    const b = CENTI_PATH[Math.min(CENTI_PATH.length - 1, i + 1)]
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0])
    const [x, y] = CENTI_PATH[i]
    segs.push([x, y, (ang * 180) / Math.PI])
    const nx = -Math.sin(ang)
    const ny = Math.cos(ang)
    for (const s of [-1, 1]) {
      const kx = x + nx * s * 15 - Math.cos(ang) * 4
      const ky = y + ny * s * 15 - Math.sin(ang) * 4
      const fx = x + nx * s * 22 - Math.cos(ang) * 10
      const fy = y + ny * s * 22 - Math.sin(ang) * 10
      legs += brush([[x, y], [kx, ky], [fx, fy]], 2.6, 'tail')
    }
  }
  return { segs, legs }
})()
const creepingHorror: Design = (t) => (
  <g>
    <ellipse cx={80} cy={84} rx={72} ry={60} fill="url(#gs-mist)" />
    <path d={CENTI.legs} fill={VOID} />
    {CENTI.segs.map(([x, y, a], i) => (
      <g key={i} transform={`translate(${x} ${y}) rotate(${a})`}>
        <ellipse rx={13} ry={11} fill="#16120f" stroke={VOID} strokeWidth={1} />
        <ellipse rx={10} ry={4} cy={-3} fill={t.tint} opacity={0.45} />
      </g>
    ))}
    <g transform="translate(118 26) rotate(-24)">
      <ellipse rx={16} ry={13} fill="#16120f" />
      <path d={brush([[10, -10], [22, -14], [30, -8]], 4, 'tail')} fill={VOID} />
      <path d={brush([[10, 10], [22, 14], [30, 8]], 4, 'tail')} fill={VOID} />
    </g>
    <GlowEye x={114} y={20} r={2.6} t={t} />
    <GlowEye x={122} y={17} r={2.6} t={t} />
    <TaoDieFaceG face="white" x={130} y={22} s={26} />
    <path d={brush([[124, 14], [138, 16], [146, 24]], 4, 'tail')} fill={VOID} />
    <path d={brush([[128, 40], [140, 46], [150, 42]], 4, 'tail')} fill={VOID} />
  </g>
)

// ---------------------------------------------------------------------------
// Vampire Lord — a jiangshi lord: tall hat, fangs, long-nailed hands raised.
// ---------------------------------------------------------------------------
const VAMP = {
  crown: 'M54 30C54 10 106 10 106 30Z',
  tassels: ((): string => {
    let d = ''
    for (let i = 0; i < 9; i++) {
      const a = rad(-170 + i * 20)
      d += `M80 10L${(80 + Math.cos(a) * 25).toFixed(1)} ${(30 + Math.sin(a) * 4 + (i % 2) * 2).toFixed(1)}`
    }
    return d
  })(),
  face: 'M64 34L96 34L98 58C96 72 88 80 80 80C72 80 64 72 62 58Z',
  robe: 'M22 148C24 116 42 100 62 98L98 98C118 100 136 116 138 148Z',
  collar: 'M58 82L102 82L112 102L48 102Z',
  handL: strokes([
    [[[34, 118], [26, 100], [22, 82]], 3.6, 'tail'],
    [[[38, 116], [34, 96], [34, 76]], 3.6, 'tail'],
    [[[42, 118], [42, 100], [46, 82]], 3.4, 'tail'],
  ]),
  cheeks: strokes([
    [[[66, 58], [69, 66], [72, 70]], 2, 'both'],
    [[[94, 58], [91, 66], [88, 70]], 2, 'both'],
  ]),
}
const VAMP_HAND_R = strokes([
  [mirrorX([[34, 118], [26, 100], [22, 82]], 80), 3.6, 'tail'],
  [mirrorX([[38, 116], [34, 96], [34, 76]], 80), 3.6, 'tail'],
  [mirrorX([[42, 118], [42, 100], [46, 82]], 80), 3.4, 'tail'],
])
const vampireLord: Design = (t) => (
  <g>
    <circle cx={80} cy={64} r={58} fill="url(#gs-mist)" />
    <path d={VAMP.robe} fill={t.deep} stroke={INK} strokeWidth={1.8} />
    <path d={VAMP.robe} fill="url(#gs-streaks)" />
    <rect x={68} y={108} width={24} height={24} fill="#1d1712" stroke="#d9b45a" strokeWidth={2} />
    <path d={brush([[72, 126], [80, 114], [88, 126]], 2.4, 'both')} fill="#d9b45a" />
    <ellipse cx={36} cy={124} rx={10} ry={8} fill="#b9c9b3" stroke={INK} strokeWidth={1.2} />
    <ellipse cx={124} cy={124} rx={10} ry={8} fill="#b9c9b3" stroke={INK} strokeWidth={1.2} />
    <path d={VAMP.handL + VAMP_HAND_R} fill="#b9c9b3" stroke={INK} strokeWidth={0.8} />
    <path d={VAMP.collar} fill={t.tint} stroke="#d9b45a" strokeWidth={1.6} />
    <path d={VAMP.face} fill="#c8d6c2" stroke={INK} strokeWidth={1.8} />
    <path d={VAMP.cheeks} fill={INK} opacity={0.5} />
    <GlowEye x={72} y={50} r={2.8} t={t} />
    <GlowEye x={88} y={50} r={2.8} t={t} />
    <path d={brush([[66, 44], [72, 42], [77, 45]], 2.4, 'head')} fill={INK} />
    <path d={brush([[94, 44], [88, 42], [83, 45]], 2.4, 'head')} fill={INK} />
    <path d="M71 67Q80 72 89 67" fill="none" stroke={INK} strokeWidth={1.6} />
    <path d="M74 68L75.5 76L77.5 69ZM86 68L84.5 76L82.5 69Z" fill="#fbf6ea" stroke={INK} strokeWidth={0.6} />
    <ellipse cx={80} cy={31} rx={34} ry={7.5} fill={INK} />
    <path d={VAMP.crown} fill={INK} />
    <path d={VAMP.tassels} stroke="#b8322a" strokeWidth={2.2} />
    <circle cx={80} cy={9} r={5} fill="url(#gs-gold-r)" stroke={INK} strokeWidth={1} />
    <path d="M54 34L60 36L58 64L52 62Z" fill="url(#gs-talisman)" stroke="#8a6620" strokeWidth={0.6} transform="rotate(-8 56 48)" />
  </g>
)

// ---------------------------------------------------------------------------
// Hope Killer — a crowned, horned demon king with four arms, wreathed in fire.
// ---------------------------------------------------------------------------
const HOPE_FLAMES = (
  [
    [[40, 110], [24, 70], [30, 30]],
    [[60, 96], [52, 56], [60, 12]],
    [[100, 96], [108, 56], [100, 12]],
    [[120, 110], [136, 70], [130, 30]],
  ] as Pt[][]
).map((p) => brush(p, 30, 'head', { min: 0 }))
const HOPE = {
  hornL: brush([[62, 40], [44, 30], [28, 34], [18, 50]], 15, 'tail'),
  hornR: brush(mirrorX([[62, 40], [44, 30], [28, 34], [18, 50]], 80), 15, 'tail'),
  head: 'M56 44C56 28 104 28 104 44L108 70C104 88 92 98 80 98C68 98 56 88 52 70Z',
  crown: 'M58 42L63 26L70 36L80 18L90 36L97 26L102 42Z',
  body: 'M24 148C26 118 46 100 80 100C114 100 134 118 136 148Z',
  arms: strokes([
    [[[42, 112], [22, 86], [14, 58]], 13, 'tail'],
    [[[38, 128], [16, 124], [4, 108]], 11, 'tail'],
    [mirrorX([[42, 112], [22, 86], [14, 58]], 80), 13, 'tail'],
    [mirrorX([[38, 128], [16, 124], [4, 108]], 80), 11, 'tail'],
  ]),
  mouth: 'M62 76Q80 92 98 76Q80 84 62 76Z',
  fangs: 'M66 78L69 86L71 80ZM94 78L91 86L89 80ZM76 82L78 87L80 83ZM84 82L82 87L80 83Z',
  brows: strokes([
    [[[62, 52], [70, 56], [77, 60]], 3.4, 'head'],
    [[[98, 52], [90, 56], [83, 60]], 3.4, 'head'],
  ]),
}
const hopeKiller: Design = (t) => (
  <g>
    {HOPE_FLAMES.map((d, i) => (
      <path key={i} d={d} fill={i % 2 ? COLOR_HEX.red : '#e0862e'} opacity={0.85} />
    ))}
    <path d={HOPE.arms} fill="#120e0c" />
    <path d={HOPE.body} fill="#120e0c" />
    <path d={HOPE.body} fill={t.tint} opacity={0.25} />
    <path d="M58 112Q80 124 102 112L100 120Q80 132 60 120Z" fill="url(#gs-gold)" />
    <path d={HOPE.hornL + HOPE.hornR} fill="url(#gs-bone)" stroke={INK} strokeWidth={1.4} />
    <path d={HOPE.head} fill="#120e0c" />
    <path d={HOPE.head} fill="url(#gs-streaks)" />
    <path d={HOPE.crown} fill="url(#gs-gold)" stroke="#6b4a12" strokeWidth={1} />
    <circle cx={80} cy={34} r={3} fill={COLOR_HEX.red} />
    <path d={HOPE.brows} fill={COLOR_LIGHT.yellow} />
    <GlowEye x={70} y={62} r={3.2} t={t} />
    <GlowEye x={90} y={62} r={3.2} t={t} />
    <path d={HOPE.mouth} fill="#5a0d0a" />
    <path d={HOPE.fangs} fill="#f4ecd8" />
  </g>
)

// ---------------------------------------------------------------------------
// Nameless — a void in a cloak, a blank mask, five coloured wisps circling.
// ---------------------------------------------------------------------------
const NAMELESS_WISPS: Array<[string, string]> = (
  [
    [200, COLOR_HEX.red],
    [272, COLOR_HEX.yellow],
    [344, COLOR_HEX.blue],
    [56, COLOR_HEX.green],
    [128, '#3a3330'],
  ] as Array<[number, string]>
).map(([deg, c]) => [brush(arcPts(80, 82, 66, 54, rad(deg), rad(deg + 52), 6), 10, 'head', { min: 0 }), c])
const NAMELESS = {
  cloak: 'M80 10C62 10 54 26 54 44C46 70 38 100 32 148L128 148C122 100 114 70 106 44C106 26 98 10 80 10Z',
  crack: brush([[84, 30], [80, 40], [84, 48], [81, 58]], 1.8, 'both'),
}
const nameless: Design = () => (
  <g>
    <ellipse cx={80} cy={80} rx={70} ry={62} fill="url(#gs-mist)" />
    {NAMELESS_WISPS.map(([d, c], i) => (
      <path key={i} d={d} fill={c} stroke="#f4efe4" strokeOpacity={0.7} strokeWidth={1} />
    ))}
    <path d={NAMELESS.cloak} fill="#070505" />
    <path d={NAMELESS.cloak} fill="url(#gs-streaks)" />
    <ellipse cx={80} cy={46} rx={14} ry={18} fill="#f6f3ea" stroke={INK} strokeWidth={1.2} />
    <ellipse cx={84} cy={50} rx={9} ry={12} fill="#d8d2c6" opacity={0.5} />
    <path d={NAMELESS.crack} fill={INK} />
  </g>
)

export const INCARNATION_DESIGNS: Record<IncarnationId, Design> = {
  howlingNightmare,
  uncatchable,
  deathArmy,
  forgottenOnes,
  bonecracker,
  darkMistress,
  creepingHorror,
  vampireLord,
  hopeKiller,
  nameless,
}
