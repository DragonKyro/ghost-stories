// Beasts of the Horde: hellhound, gargoyle, wyvern, thorn beast, serpent,
// crypt spider. Each draws into a 160×150 box (ground at y ≈ 146).
import { blob, brush, mirrorX, smooth, strokes, type Pt } from '../../brush'
import { BONE, BONE_SHADE, DARK, Eye, Eyes, INK, P, type Design } from './common'

const spikes = (pts: ReadonlyArray<readonly [number, number, number]>, lean = 4): string =>
  pts.map(([x, y, h]) => `M${x - 5} ${y}L${x + lean} ${y - h}L${x + 5} ${y}Z`).join('')

// ---------------------------------------------------------------------------
// Hellhound — a lean hound in profile, head low and snarling, spined back.
// ---------------------------------------------------------------------------
const HOUND = {
  torso: 'M46 84C50 70 66 62 88 62C108 63 124 70 132 84C138 96 136 108 130 116L124 121C116 123 106 121 98 118C88 121 74 121 64 117C56 112 50 104 46 96Z',
  belly: 'M60 108C72 116 92 117 104 113C98 120 70 121 60 112Z',
  legFar: 'M70 110L70 132L64 142L56 146H76L78 130L82 112ZM120 106L132 124L130 140L124 146H142L138 124L130 102Z',
  legNear: 'M52 100L48 128L42 140L32 146H54L58 132L66 108ZM104 108C116 114 120 124 116 134L118 142L108 146H128L128 132C132 122 128 110 120 102Z',
  neck: 'M44 96C40 86 42 74 54 68L66 66C62 78 58 88 56 100Z',
  head: 'M58 70C50 62 38 60 28 64C20 66 12 72 6 78L3 85L20 88L8 94L12 100C22 102 34 100 44 96C52 92 58 84 58 70Z',
  jaw: 'M9 95L22 91L40 95C34 104 22 108 11 103Z',
  teeth: 'M6 86L9 91L12 87L15 92L18 88L21 92ZM12 96L15 92L18 96L21 92L24 96Z',
  ear: 'M42 64L52 46L56 66Z',
  ridge: spikes([
    [62, 68, 13],
    [72, 64, 16],
    [83, 63, 17],
    [94, 63, 16],
    [105, 65, 15],
    [116, 69, 13],
    [126, 76, 10],
  ]),
  flames: strokes([
    [[[66, 66], [62, 52], [68, 40]], 8, 'tail'],
    [[[86, 62], [84, 46], [92, 32]], 9, 'tail'],
    [[[106, 64], [108, 50], [118, 42]], 8, 'tail'],
  ]),
  tail: brush([[130, 88], [144, 80], [150, 64], [146, 48]], 8, 'tail'),
  shade: 'M88 62C108 63 124 70 132 84C136 92 136 102 132 110C126 96 112 86 90 84C72 82 58 86 48 92C48 76 66 62 88 62Z',
}

export const hound: Design = (t) => (
  <g>
    <ellipse cx={86} cy={145} rx={60} ry={4} fill="#000" opacity={0.4} />
    <path d={HOUND.flames} fill={t.accent} opacity={0.85} />
    <path d={HOUND.tail} fill={t.deep} stroke={INK} strokeWidth={1.6} />
    <P d={HOUND.legFar} fill={t.deep} />
    <P d={HOUND.ridge} fill={DARK} sw={1.4} />
    <P d={HOUND.torso} fill={t.hide} />
    <path d={HOUND.shade} fill={t.light} opacity={0.25} />
    <path d={HOUND.belly} fill={t.deep} opacity={0.6} />
    <P d={HOUND.legNear} fill={t.hide} />
    <P d={HOUND.neck} fill={t.hide} sw={0} />
    <P d={HOUND.ear} fill={t.deep} />
    <P d={HOUND.jaw} fill="#3a0a08" />
    <P d={HOUND.head} fill={t.hide} />
    <path d={HOUND.teeth} fill={BONE} stroke={INK} strokeWidth={0.6} />
    <path d="M24 70Q34 72 44 66" fill="none" stroke={INK} strokeWidth={2.4} strokeLinecap="round" />
    <Eye x={34} y={74} r={2.6} t={t} />
  </g>
)

// ---------------------------------------------------------------------------
// Gargoyle — a stone beast crouched on a plinth, wings folded high.
// ---------------------------------------------------------------------------
const GARG_WING_L: Pt[] = [[64, 86], [48, 74], [34, 54], [30, 20], [40, 30], [48, 34], [48, 46], [54, 56], [58, 46], [64, 40], [66, 56], [70, 72]]
const GARG = {
  plinth: 'M28 124H132V132H124V146H36V132H28Z',
  wingL: smooth(GARG_WING_L, true),
  wingR: smooth(mirrorX(GARG_WING_L, 80), true),
  haunch: 'M48 126C42 110 46 94 58 86C70 78 90 78 102 86C114 94 118 110 112 126Z',
  chest: 'M64 96C60 82 66 70 80 68C94 70 100 82 96 96C90 104 70 104 64 96Z',
  head: 'M66 66C62 54 68 42 80 42C92 42 98 54 94 66C90 74 70 74 66 66Z',
  horns: brush([[70, 50], [62, 40], [58, 26]], 7, 'tail') + brush([[90, 50], [98, 40], [102, 26]], 7, 'tail'),
  ears: 'M66 54L54 50L66 60ZM94 54L106 50L94 60Z',
  mouth: 'M69 61Q80 68 91 61Q87 70 80 70Q73 70 69 61Z',
  fangs: 'M72 62L74 67L76 63ZM84 63L86 67L88 62Z',
  armL: 'M62 96C54 104 52 114 54 126H64L66 110L70 100Z',
  armR: 'M98 96C106 104 108 114 106 126H96L94 110L90 100Z',
  claws: 'M52 126L50 131L56 127L56 132L60 127L62 131L64 126ZM96 126L98 131L100 127L104 132L104 127L110 131L108 126Z',
  cracks: 'M58 108L64 114L62 120M100 100L96 108L100 114M76 76L78 82',
}

export const gargoyle: Design = (t) => (
  <g>
    <P d={GARG.wingL} fill={t.deep} />
    <P d={GARG.wingR} fill={t.deep} />
    <path d="M36 26L48 46M44 32L56 56M124 26L112 46M116 32L104 56" stroke={INK} strokeWidth={1.6} opacity={0.6} />
    <P d={GARG.plinth} fill="url(#lb-stone)" />
    <path d="M36 132H124" stroke={INK} strokeWidth={1.4} opacity={0.6} />
    <P d={GARG.haunch} fill={t.hide} />
    <P d={GARG.chest} fill={t.hide} />
    <path d={GARG.chest} fill={t.light} opacity={0.2} />
    <P d={GARG.armL} fill={t.hide} />
    <P d={GARG.armR} fill={t.hide} />
    <path d={GARG.claws} fill={BONE} stroke={INK} strokeWidth={0.8} />
    <path d={GARG.horns} fill={BONE_SHADE} stroke={INK} strokeWidth={1.4} />
    <P d={GARG.ears} fill={t.deep} />
    <P d={GARG.head} fill={t.hide} />
    <P d={GARG.mouth} fill="#250807" sw={1.4} />
    <path d={GARG.fangs} fill={BONE} />
    <path d="M70 53L78 57M90 53L82 57" stroke={INK} strokeWidth={2.4} strokeLinecap="round" />
    <Eyes x={80} y={57} gap={6} r={2.2} t={t} />
    <path d={GARG.cracks} fill="none" stroke={INK} strokeWidth={1.2} opacity={0.7} />
  </g>
)

// ---------------------------------------------------------------------------
// Wyvern — wings raised, a long neck, two clawed legs and a barbed tail.
// ---------------------------------------------------------------------------
const WY_WING_L: Pt[] = [[68, 76], [56, 54], [38, 32], [8, 18], [16, 32], [18, 46], [16, 60], [26, 58], [32, 64], [34, 74], [42, 70], [50, 74], [54, 84]]
const WYVERN = {
  wingL: smooth(WY_WING_L, true),
  wingR: smooth(mirrorX(WY_WING_L, 80), true),
  bonesL: 'M68 76L10 20M60 70L18 46M58 74L32 64',
  body: 'M62 80C60 98 66 116 80 124C94 116 100 98 98 80C92 72 68 72 62 80Z',
  belly: 'M70 88H90M68 98H92M70 108H90M74 116H86',
  neck: brush([[80, 82], [74, 64], [70, 50]], 18, 'tail', { min: 0.6 }),
  head: 'M58 46C58 34 70 28 82 32L100 38L92 42L100 48L82 52C70 56 58 54 58 46Z',
  horns: brush([[64, 36], [56, 28], [52, 18]], 5, 'tail') + brush([[72, 32], [68, 22], [70, 12]], 5, 'tail'),
  teeth: 'M84 41L86 44L88 41L90 44L92 41ZM84 49L86 46L88 49L90 46Z',
  legs: 'M68 116L60 136L50 146H72L74 128ZM92 116L100 136L110 146H88L86 128Z',
  tail: brush([[86, 122], [110, 132], [132, 128], [146, 112], [150, 96]], 12, 'tail'),
  barb: 'M150 98L142 86L156 84Z',
  drip: 'M100 50C102 56 104 58 102 62C100 64 98 62 98 58Z',
}

export const wyvern: Design = (t) => (
  <g>
    <P d={WYVERN.wingL} fill={t.deep} />
    <P d={WYVERN.wingR} fill={t.deep} />
    <path d={WYVERN.wingL} fill={t.base} opacity={0.35} />
    <path d={WYVERN.wingR} fill={t.base} opacity={0.35} />
    <path d={WYVERN.bonesL} transform="translate(0 0)" stroke={INK} strokeWidth={1.6} fill="none" opacity={0.8} />
    <path d={WYVERN.bonesL} transform="translate(160 0) scale(-1 1)" stroke={INK} strokeWidth={1.6} fill="none" opacity={0.8} />
    <path d={WYVERN.tail} fill={t.hide} stroke={INK} strokeWidth={1.8} />
    <P d={WYVERN.barb} fill={t.accent} />
    <P d={WYVERN.legs} fill={t.deep} />
    <P d={WYVERN.body} fill={t.hide} />
    <path d={WYVERN.belly} stroke={t.light} strokeWidth={2.4} opacity={0.75} strokeLinecap="round" />
    <path d={WYVERN.neck} fill={t.hide} stroke={INK} strokeWidth={1.8} />
    <path d={WYVERN.horns} fill={BONE} stroke={INK} strokeWidth={1.2} />
    <P d={WYVERN.head} fill={t.hide} />
    <path d={WYVERN.teeth} fill={BONE} />
    <P d={WYVERN.drip} fill={t.accent} sw={0.8} />
    <Eye x={72} y={40} r={2.4} t={t} />
  </g>
)

// ---------------------------------------------------------------------------
// Thorn beast — a hulking quadruped grown over with briars and branch antlers.
// ---------------------------------------------------------------------------
const THORN = {
  legsFar: 'M56 120L58 146H72L70 120ZM114 118L120 146H134L128 116Z',
  body: 'M24 112C20 92 34 74 58 70C84 66 112 70 126 84C134 92 136 104 132 114C130 120 124 124 116 124H34C28 122 24 118 24 112Z',
  legsNear: 'M34 116L30 146H48L52 120ZM92 120L90 146H108L110 118Z',
  head: 'M116 82C124 72 140 72 148 80C154 86 154 96 150 102L140 108C132 110 124 106 120 100Z',
  jaw: 'M126 104L148 102L144 110C136 114 130 112 126 104Z',
  tusks: 'M132 104L128 94L136 102ZM144 102L146 92L148 102Z',
  antlers: strokes([
    [[[126, 76], [120, 60], [110, 52], [100, 50]], 4.5, 'tail'],
    [[[120, 62], [124, 50], [122, 40]], 3.5, 'tail'],
    [[[138, 74], [142, 58], [152, 48], [158, 46]], 4.5, 'tail'],
    [[[144, 58], [140, 46], [144, 36]], 3.5, 'tail'],
  ]),
  thorns: spikes(
    [
      [34, 90, 12],
      [44, 80, 14],
      [56, 74, 16],
      [70, 70, 18],
      [84, 70, 18],
      [98, 72, 16],
      [110, 76, 14],
      [40, 104, 10],
      [62, 92, 12],
      [86, 90, 12],
      [108, 94, 10],
    ],
    -3,
  ),
  vines: strokes([
    [[[30, 100], [50, 96], [70, 106], [92, 100], [118, 108]], 3, 'both'],
    [[[40, 84], [62, 82], [82, 88], [104, 84]], 2.6, 'both'],
  ]),
}

export const thornBeast: Design = (t) => (
  <g>
    <ellipse cx={84} cy={145} rx={64} ry={4} fill="#000" opacity={0.4} />
    <P d={THORN.legsFar} fill={t.deep} />
    <path d={THORN.antlers} fill="#4a2e18" stroke={INK} strokeWidth={1.2} />
    <P d={THORN.body} fill={t.hide} />
    <path d={THORN.vines} fill={t.deep} opacity={0.8} />
    <P d={THORN.thorns} fill="#3a2414" sw={1.2} />
    <P d={THORN.legsNear} fill={t.hide} />
    <P d={THORN.jaw} fill="#1d0c06" />
    <P d={THORN.head} fill={t.hide} />
    <path d={THORN.tusks} fill={BONE} stroke={INK} strokeWidth={0.8} />
    <Eye x={136} y={88} r={2.6} t={t} />
  </g>
)

// ---------------------------------------------------------------------------
// Serpent — great coils on the ground, the neck reared and the frill spread.
// ---------------------------------------------------------------------------
const SERPENT = {
  coilBack: brush([[22, 132], [46, 114], [86, 110], [124, 116], [146, 130]], 22, 'both', { min: 0.5 }),
  neck: brush([[112, 128], [120, 104], [112, 80], [94, 62], [84, 46]], 26, 'tail', { min: 0.5 }),
  neckBelly: brush([[104, 126], [110, 104], [102, 82], [88, 66]], 9, 'tail', { min: 0.4 }),
  coilFront: brush([[10, 142], [34, 128], [70, 126], [102, 136], [128, 132], [146, 120]], 24, 'both', { min: 0.5 }),
  frill: 'M96 40L118 20L114 38L132 30L120 46L138 48L118 56L100 54Z',
  head: 'M62 42C64 30 76 24 88 26C100 28 106 38 104 48L94 54C84 58 68 56 62 42Z',
  jaw: 'M60 44C56 52 58 60 66 62L86 58L78 52Z',
  fangs: 'M64 46L66 54L69 47ZM74 50L75 57L78 51Z',
  scales: 'M30 128Q36 124 42 128M50 124Q56 120 62 124M90 128Q96 124 102 128M116 128Q122 124 128 128',
}

export const serpent: Design = (t) => (
  <g>
    <ellipse cx={80} cy={145} rx={70} ry={4} fill="#000" opacity={0.4} />
    <path d={SERPENT.coilBack} fill={t.deep} stroke={INK} strokeWidth={2} />
    <P d={SERPENT.frill} fill={t.deep} />
    <path d="M100 48L116 24M104 50L128 34M104 52L132 48" stroke={t.accent} strokeWidth={1.4} opacity={0.6} />
    <path d={SERPENT.neck} fill={t.hide} stroke={INK} strokeWidth={2} />
    <path d={SERPENT.neckBelly} fill={t.light} opacity={0.7} />
    <path d={SERPENT.coilFront} fill={t.hide} stroke={INK} strokeWidth={2} />
    <path d={SERPENT.scales} fill="none" stroke={t.deep} strokeWidth={1.6} />
    <P d={SERPENT.jaw} fill="#2a0a0a" />
    <path d={SERPENT.fangs} fill={BONE} />
    <P d={SERPENT.head} fill={t.hide} />
    <path d="M70 36Q80 32 88 36" fill="none" stroke={INK} strokeWidth={2} strokeLinecap="round" />
    <Eye x={82} y={40} r={2.8} t={t} />
  </g>
)

// ---------------------------------------------------------------------------
// Crypt spider — a great bone-pale spider, skull-marked, many-eyed.
// ---------------------------------------------------------------------------
const leg = (pts: Pt[], w: number): string => brush(pts, w, 'tail', { min: 0.35 })
const SPIDER_LEGS: Pt[][] = [
  [[66, 98], [40, 66], [22, 74], [8, 110]],
  [[66, 102], [34, 84], [18, 106], [12, 140]],
  [[68, 106], [44, 104], [32, 124], [30, 146]],
  [[70, 110], [56, 120], [50, 136], [52, 146]],
]
const SPIDER = {
  legsL: SPIDER_LEGS.map((p, i) => leg(p, i === 3 ? 6.5 : 7)).join(''),
  legsR: SPIDER_LEGS.map((p, i) => leg(mirrorX(p, 80), i === 3 ? 6.5 : 7)).join(''),
  abdomen: blob(80, 66, 36, 32, 4, 0.04, 10),
  thorax: 'M62 104C62 92 70 86 80 86C90 86 98 92 98 104C98 114 90 120 80 120C70 120 62 114 62 104Z',
  skull: 'M80 46C70 46 64 52 64 60C64 66 68 70 72 72V78H88V72C92 70 96 66 96 60C96 52 90 46 80 46Z',
  skullHoles: 'M70 59a4 4.5 0 1 0 8 0a4 4.5 0 1 0 -8 0ZM82 59a4 4.5 0 1 0 8 0a4 4.5 0 1 0 -8 0Z',
  fangs: 'M72 116C70 124 72 130 76 132C76 126 76 122 78 118ZM88 116C90 124 88 130 84 132C84 126 84 122 82 118Z',
}

export const spider: Design = (t) => (
  <g>
    <ellipse cx={80} cy={145} rx={66} ry={4} fill="#000" opacity={0.4} />
    <path d={SPIDER.legsL} fill={t.deep} stroke={INK} strokeWidth={1.4} />
    <path d={SPIDER.legsR} fill={t.deep} stroke={INK} strokeWidth={1.4} />
    <P d={SPIDER.abdomen} fill={t.hide} />
    <path d={SPIDER.skull} fill={DARK} opacity={0.85} />
    <path d={SPIDER.skullHoles} fill={t.accent} opacity={0.8} />
    <P d={SPIDER.fangs} fill={BONE} sw={1.2} />
    <P d={SPIDER.thorax} fill={t.hide} />
    <Eyes x={80} y={100} gap={6} r={2.2} t={t} />
    <Eyes x={80} y={108} gap={10} r={1.5} t={t} />
    <Eyes x={80} y={94} gap={3} r={1.3} t={t} />
  </g>
)
