// Village tile scenes: Circle of Prayer, Cemetery, Buddhist Temple, Taoist Altar.
import { blob, brush, ring, smooth, strokes } from '../brush'
import { INK, VERMILION } from '../palette'
import {
  buildFace,
  buildRobe,
  circ,
  Crack,
  curl,
  ell,
  FaceView,
  GlowEyes,
  L,
  Layers,
  MistBand,
  RobeView,
  S,
  SIL,
  SIL_FAR,
  SPECTRE,
  Spectre,
  SpectreHand,
  type Layer,
} from './kit'
import type { SceneDef } from './types'

// ===========================================================================
// Circle of Prayer — a bald monk at prayer inside a vermilion ensō; a ring of
// standing stones around a smoking incense burner.
// ===========================================================================
const COP_ENSO = ring(84, 98, 68, 15, -2.5, 5.75)
const COP_ENSO_BROKEN = ring(84, 98, 68, 11, -2.5, 2.3) + ring(84, 98, 68, 9, 0.5, 2.1)
const STONE_RING: Array<[number, number, number]> = [
  [140, 160, 15],
  [158, 155, 18],
  [180, 153, 20],
  [202, 155, 17],
  [220, 160, 14],
  [130, 172, 13],
  [228, 173, 12],
]
const stonePath = ([x, y, h]: [number, number, number], i: number) => blob(x, y - h / 2, 6 + (i % 2), h / 2, 20 + i, 0.08, 8)
const COP_STONES_BACK = STONE_RING.slice(0, 5).map(stonePath).join('')
const COP_STONES_FRONT = STONE_RING.slice(5).map((s, i) => stonePath(s, i + 5)).join('')
const COP_STONE_INK = STONE_RING.map(([x, y, h]) => brush([[x - 6, y - 2], [x - 5, y - h * 0.6], [x - 2, y - h + 1]], 2.2, 'tail')).join('')
const COP_GROUND = blob(180, 172, 58, 13, 8, 0.1)
// Incense burner (ding).
const DING_BODY = smooth([[160, 141], [196, 141], [193, 158], [184, 164], [172, 164], [163, 158]], true)
const DING_INK =
  brush([[158, 141], [178, 139], [198, 141]], 3.4, 'none') +
  brush([[161, 144], [164, 158], [172, 164]], 2.6, 'both') +
  brush([[195, 144], [192, 158], [184, 164]], 2.6, 'both') +
  strokes([
    [[[167, 162], [164, 172]], 3, 'tail'],
    [[[178, 165], [178, 175]], 3, 'tail'],
    [[[189, 162], [192, 172]], 3, 'tail'],
  ])
const DING_HANDLES = 'M163 141Q160 130 168 131M193 141Q196 130 188 131'
const INCENSE = 'M172 140L170 118M178 140L178 114M184 140L187 118'
const SMOKE = [
  curl([[170, 116], [164, 96], [174, 80], [166, 58], [176, 40]], 4),
  curl([[178, 112], [184, 92], [176, 74], [186, 54], [180, 30], [190, 14]], 4.6),
  curl([[187, 116], [196, 100], [190, 84], [200, 66]], 3.6),
].join('')

const MONK_FACE = buildFace({ hx: 74, hy: 84, r: 22, eyes: 'closed', brows: 'normal', mouth: 'smile', bald: true })
const MONK_ROBE = buildRobe({ cx: 74, top: 116, w: 46, collar: 'cross', slope: 22 })
const MONK_SASH = brush([[40, 126], [70, 150], [104, 192]], 18, 'none')
const MONK_HANDS = smooth([[74, 136], [81, 147], [83, 164], [79, 177], [69, 177], [65, 164], [67, 147]], true)
const MONK_BEADS = Array.from({ length: 13 }, (_, i) => {
  const t = i / 12
  const x = 58 + t * 32
  const y = 116 + Math.sin(t * Math.PI) * 26
  return circ(x, y, 2.6)
}).join('')

const COP_BEADS_SCATTERED =
  [[52, 182], [60, 186], [66, 180], [74, 184], [83, 187], [90, 181], [99, 185], [46, 188], [108, 182]]
    .map(([x, y]) => circ(x, y, 2.6))
    .join('') + brush([[56, 184], [70, 182], [86, 186], [100, 183]], 1.2, 'both')

const COP_PROPS: Layer[] = [
  L(COP_GROUND, '#a88a5c', SIL_FAR, 0.35),
  L(COP_STONES_BACK, '#9b958a'),
  S(COP_STONE_INK, INK, 0, null),
  L(DING_BODY, '#8a6431'),
  S(DING_HANDLES, INK, 2.6),
  L(DING_INK, INK),
  S(INCENSE, '#5e3b1e', 1.8),
  L(COP_STONES_FRONT, '#8f897e'),
]

function circleOfPrayer({ night }: { night: boolean }) {
  return (
    <>
      <path d={night ? COP_ENSO_BROKEN : COP_ENSO} fill={night ? '#4a3f5c' : VERMILION} opacity={night ? 0.9 : 0.62} />
      {!night && <path d={SMOKE} fill="#8d8780" opacity={0.5} />}
      <Layers list={COP_PROPS} night={night} />
      {!night ? (
        <>
          <path d={COP_STONE_INK} fill={INK} opacity={0.7} />
          <circle cx={170} cy={118} r={1.8} fill="#e2552c" />
          <circle cx={178} cy={114} r={1.8} fill="#e2552c" />
          <circle cx={187} cy={118} r={1.8} fill="#e2552c" />
          <RobeView r={MONK_ROBE} fill="#b9452c" trim="#e7ad45" />
          <path d={MONK_SASH} fill="#e0973a" opacity={0.92} />
          <path d={MONK_SASH} fill="url(#gs-streaks)" />
          <path d={MONK_BEADS} fill="#3b2414" />
          <FaceView f={MONK_FACE} />
          <path d={MONK_HANDS} fill="url(#gs-skin)" stroke={INK} strokeWidth={1.6} />
          <path d="M74 139L74 174" stroke={INK} strokeWidth={1.2} />
        </>
      ) : (
        <>
          <path d={SMOKE} fill={SPECTRE} opacity={0.42} />
          <path d={blob(183, 30, 15, 13, 4, 0.18)} fill={SPECTRE} opacity={0.3} />
          <GlowEyes x={183} y={28} gap={5.5} r={4.6} />
          <path d={ell(183, 38, 3, 4)} fill="#07050a" opacity={0.8} />
          <MistBand y={150} h={30} />
          <path d={COP_BEADS_SCATTERED} fill="#07050a" />
          <SpectreHand x={56} y={100} s={56} rot={-6} o={0.5} />
          <GlowEyes x={84} y={92} gap={9} r={6} slant={1} />
          <MistBand y={184} h={20} o={0.9} />
        </>
      )}
    </>
  )
}

// ===========================================================================
// Cemetery — an old gravekeeper in a straw hat with his shovel; grave mounds,
// stone tablets and a crooked tree.
// ===========================================================================
const CEM_HILL = smooth([[0, 138], [40, 124], [96, 132], [150, 118], [200, 126], [240, 116], [240, 192], [0, 192]], true)
const CEM_TREE =
  brush([[214, 192], [210, 160], [216, 132], [204, 104], [206, 76], [196, 52]], 11, 'head', { min: 0.25 }) +
  strokes([
    [[[205, 100], [186, 86], [176, 66], [164, 58]], 5, 'tail'],
    [[[206, 80], [222, 62], [230, 40]], 4.5, 'tail'],
    [[[214, 128], [230, 116], [238, 104]], 4.5, 'tail'],
    [[[197, 56], [190, 36], [194, 22]], 3.4, 'tail'],
    [[[180, 72], [168, 76], [158, 72]], 2.6, 'tail'],
    [[[200, 62], [210, 44], [208, 30]], 2.6, 'tail'],
  ])
const CEM_MOUNDS = ell(152, 182, 44, 13) + ell(212, 186, 34, 10)
const tablet = (x: number, y: number, w: number, h: number) =>
  `M${x} ${y + h}V${y + w / 2}Q${x} ${y} ${x + w / 2} ${y}Q${x + w} ${y} ${x + w} ${y + w / 2}V${y + h}Z`
const CEM_TABLETS = tablet(140, 128, 22, 50) + tablet(196, 146, 18, 38)
const CEM_TABLET_SMALL = 'M116 184L118 160Q124 154 130 161L130 186Z'
const CEM_TABLET_INK =
  brush([[140, 178], [140, 140], [151, 128], [162, 139], [162, 178]], 2.6, 'both', { min: 0.3 }) +
  brush([[196, 184], [196, 155], [205, 146], [214, 155], [214, 184]], 2.2, 'both', { min: 0.3 }) +
  strokes([
    [[[151, 140], [151, 146]], 2.4, 'tail'],
    [[[148, 150], [154, 150]], 2.2, 'both'],
    [[[151, 154], [150, 162]], 2.4, 'tail'],
    [[[205, 156], [205, 162]], 2, 'tail'],
    [[[205, 166], [205, 172]], 2, 'tail'],
  ])
const CEM_TABLET_CRACKS = 'M146 128L152 142L147 152L155 166M200 148L206 158L202 168'

const KEEPER_FACE = buildFace({ hx: 72, hy: 100, r: 21, eyes: 'narrow', brows: 'normal', mouth: 'neutral', beard: 'wispy', age: true, turn: 0.3 })
const KEEPER_ROBE = buildRobe({ cx: 70, top: 130, w: 44, collar: 'cross', slope: 20 })
const KEEPER_HAT = smooth([[72, 50], [100, 72], [132, 92], [104, 92], [72, 87], [40, 92], [10, 94], [42, 72]], true)
const KEEPER_HAT_INK =
  brush([[8, 94], [40, 90], [72, 86], [104, 90], [134, 92]], 3.6, 'both', { min: 0.3 }) +
  strokes([
    [[[72, 52], [50, 70], [26, 90]], 1.6, 'both'],
    [[[72, 52], [62, 72], [52, 88]], 1.6, 'both'],
    [[[72, 52], [76, 72], [80, 87]], 1.6, 'both'],
    [[[72, 52], [92, 70], [110, 89]], 1.6, 'both'],
  ])
const KEEPER_HAT_TIE = brush([[56, 92], [60, 112], [66, 124]], 1.6, 'both') + brush([[92, 92], [88, 112], [80, 124]], 1.6, 'both')
const SHOVEL = brush([[122, 102], [124, 150], [128, 198]], 5, 'none')
const KEEPER_HAND = blob(124, 150, 8, 7, 9, 0.12)
const KEEPER_KNUCKLES = brush([[118, 146], [124, 144], [130, 147]], 1.6, 'both') + brush([[118, 152], [124, 151], [130, 153]], 1.4, 'both')

const CEM_PEAKS = smooth([[96, 128], [118, 96], [132, 84], [146, 104], [164, 90], [180, 110], [196, 120], [96, 132]], true)

const CEM_PROPS: Layer[] = [
  L(CEM_PEAKS, 'url(#gs-tile-peaks)', SIL_FAR, 1, 0.6),
  L(CEM_HILL, 'url(#gs-wash-olive)', SIL_FAR, 0.8),
  L(CEM_TREE, INK),
  L(CEM_MOUNDS, '#9a8758', undefined, 0.6),
  L(CEM_TABLETS + CEM_TABLET_SMALL, '#b3ad9e'),
  L(CEM_TABLET_INK, INK, null),
  S(CEM_TABLET_SMALL, INK, 2.2, null),
]

function cemetery({ night }: { night: boolean }) {
  return (
    <>
      <Layers list={CEM_PROPS} night={night} />
      {!night ? (
        <>
          <path d={SHOVEL} fill="#6a4524" />
          <RobeView r={KEEPER_ROBE} fill="#6f6c52" trim="#ddd3b6" />
          <FaceView f={KEEPER_FACE} />
          <path d={KEEPER_HAT_TIE} fill={INK} />
          <path d={KEEPER_HAT} fill="#cfa95e" />
          <path d={KEEPER_HAT} fill="url(#gs-streaks)" />
          <path d={KEEPER_HAT_INK} fill="#5a3f17" />
          <path d={KEEPER_HAND} fill="url(#gs-skin)" stroke={INK} strokeWidth={1.4} />
          <path d={KEEPER_KNUCKLES} fill={INK} />
        </>
      ) : (
        <>
          <path d={CEM_TABLET_CRACKS} fill="none" stroke="#6a6178" strokeWidth={1.6} />
          <MistBand y={176} h={26} />
          <SpectreHand x={132} y={128} s={44} rot={-8} o={0.62} />
          <SpectreHand x={194} y={142} s={34} rot={12} o={0.55} />
          <SpectreHand x={92} y={146} s={40} rot={-24} o={0.45} />
          <path d={SHOVEL} fill={SIL} transform="rotate(38 128 190)" />
          <path d={KEEPER_HAT} fill={SIL} transform="translate(28 96) rotate(-8 72 80) scale(0.6)" />
          <GlowEyes x={206} y={86} gap={4} r={3.6} />
          <GlowEyes x={60} y={110} gap={8} r={5.5} slant={-1} />
          <MistBand y={190} h={16} o={0.9} />
        </>
      )}
    </>
  )
}

// ===========================================================================
// Buddhist Temple — a temple hall under a sweeping roof, a golden Buddha
// inside; an old monk with long white brows.
// ===========================================================================
const TMP_ROOF = smooth(
  [
    [4, 64],
    [16, 60],
    [40, 46],
    [70, 30],
    [100, 46],
    [124, 60],
    [136, 64],
    [124, 66],
    [100, 64],
    [70, 62],
    [40, 64],
    [16, 66],
  ],
  true,
)
const TMP_RIDGE = brush([[30, 38], [70, 28], [110, 38]], 5, 'both') + brush([[66, 18], [70, 28], [74, 18]], 3.4, 'both')
const TMP_ROOF_LINES = strokes([
  [[[36, 52], [48, 62]], 1.6, 'both'],
  [[[52, 44], [58, 62]], 1.6, 'both'],
  [[[70, 36], [70, 61]], 1.6, 'both'],
  [[[88, 44], [82, 62]], 1.6, 'both'],
  [[[104, 52], [92, 62]], 1.6, 'both'],
])
const TMP_EAVE = brush([[2, 62], [16, 66], [70, 64], [124, 66], [138, 60]], 4.4, 'both', { min: 0.3 })
const TMP_BEAM = 'M18 70H122V78H18Z'
const TMP_PILLARS = 'M24 78H31V170H24ZM109 78H116V170H109Z'
const TMP_INNER = 'M31 78H109V170H31Z'
const TMP_STEPS = 'M10 170H130V178H10ZM2 178H138V188H2Z'
const TMP_STEP_INK = brush([[10, 170], [70, 169], [130, 170]], 2.2, 'both') + brush([[2, 178], [70, 177], [138, 178]], 2.2, 'both')
const TMP_ROOF_GAP = 'M58 40L76 34L84 48L70 62L60 60Z'

const ELDER_FACE = buildFace({ hx: 172, hy: 90, r: 23, eyes: 'lidded', brows: 'long', mouth: 'neutral', beard: 'long', age: true, bald: true, turn: -0.35 })
const ELDER_ROBE = buildRobe({ cx: 172, top: 124, w: 46, collar: 'cross', slope: 22 })
const ELDER_KASAYA = smooth([[132, 150], [150, 132], [190, 128], [216, 150], [222, 196], [140, 196]], true)
const ELDER_KASAYA_INK =
  brush([[150, 132], [176, 160], [200, 196]], 2.4, 'both') + brush([[136, 168], [164, 170], [196, 168]], 1.8, 'both')

// Seated Buddha statue (gold) inside the hall.
const BUD_HALO = ell(70, 118, 30, 40)
const BUD_HEAD = circ(70, 104, 10)
const BUD_USHNISHA = circ(70, 92, 5.5)
const BUD_EARS = ell(59.5, 107, 2.4, 6) + ell(80.5, 107, 2.4, 6)
const BUD_TORSO = smooth([[70, 113], [84, 117], [90, 132], [88, 148], [52, 148], [50, 132], [56, 117]], true)
const BUD_LEGS = smooth([[38, 156], [54, 145], [86, 145], [102, 156], [92, 164], [48, 164]], true)
const BUD_HANDS = ell(70, 147, 10, 4)
const BUD_LOTUS = [0, 1, 2, 3, 4, 5, 6]
  .map((i) => {
    const x = 40 + i * 10
    return smooth([[x - 7, 172], [x - 4, 164], [x, 160], [x + 4, 164], [x + 7, 172]], true)
  })
  .join('')
const BUD_LINES =
  brush([[64, 104], [66, 105.5], [68, 104]], 1.2, 'both') +
  brush([[72, 104], [74, 105.5], [76, 104]], 1.2, 'both') +
  circ(70, 99, 1) +
  brush([[66, 109], [70, 110], [74, 109]], 1, 'both') +
  brush([[58, 122], [70, 134], [84, 124]], 1.4, 'both') +
  brush([[48, 156], [70, 152], [92, 156]], 1.4, 'both')

function BuddhaStatue() {
  return (
    <>
      <path d={BUD_HALO} fill="url(#gs-halo)" />
      <path d={BUD_HALO} fill="none" stroke="#e2bd62" strokeWidth={2} opacity={0.8} />
      <path d={BUD_LOTUS} fill="#c9963e" stroke="#7a5418" strokeWidth={1.2} />
      <path d={BUD_LEGS + BUD_TORSO} fill="url(#gs-gold)" stroke="#7a5418" strokeWidth={1.6} />
      <path d={BUD_HANDS} fill="#f0d68c" stroke="#7a5418" strokeWidth={1.2} />
      <path d={BUD_EARS} fill="url(#gs-gold-r)" stroke="#7a5418" strokeWidth={1} />
      <path d={BUD_HEAD + BUD_USHNISHA} fill="url(#gs-gold-r)" stroke="#7a5418" strokeWidth={1.4} />
      <path d={BUD_LINES} fill="#6a4610" />
    </>
  )
}

const TMP_PROPS: Layer[] = [
  L(TMP_INNER, '#5a2a1a', '#0d0a12', 0.85),
  L(TMP_PILLARS, '#9c2e22'),
  L(TMP_BEAM, '#7a2a1c'),
  L(TMP_ROOF, '#2b2722'),
  L(TMP_ROOF, 'url(#gs-streaks)', null),
  L(TMP_ROOF_LINES, '#6b6258', null),
  L(TMP_RIDGE, INK),
  L(TMP_EAVE, INK),
  L(TMP_STEPS, '#b4a789'),
  L(TMP_STEP_INK, INK, null),
]

function buddhistTemple({ night }: { night: boolean }) {
  return (
    <>
      {!night && <path d={blob(70, 122, 34, 40, 4, 0.1)} fill="url(#gs-halo)" />}
      <Layers list={TMP_PROPS} night={night} />
      {!night ? (
        <>
          <BuddhaStatue />
          <RobeView r={ELDER_ROBE} fill="#d98a2b" trim="#f0c060" />
          <path d={ELDER_KASAYA} fill="#9a3a22" opacity={0.85} />
          <path d={ELDER_KASAYA_INK} fill={INK} opacity={0.7} />
          <path d={ELDER_ROBE.outline} fill={INK} />
          <FaceView f={ELDER_FACE} paleColor="#efeae0" />
        </>
      ) : (
        <>
          <path d={TMP_ROOF_GAP} fill="#3b3449" />
          <path d={blob(70, 150, 22, 6, 2)} fill="#2a2436" />
          <GlowEyes x={70} y={118} gap={9} r={6.5} />
          <MistBand y={176} h={22} />
          <path d={BUD_HALO} fill="none" stroke="#5e566a" strokeWidth={1.4} opacity={0.6} />
          <Spectre x={174} y={100} k={0.88} o={0.3} />
          <MistBand y={190} h={16} o={0.9} />
        </>
      )}
    </>
  )
}

// ===========================================================================
// Taoist Altar — a red altar table with a bronze censer and candles,
// talismans hanging from the beam; a hooded priest.
// ===========================================================================
const ALT_BEAM = brush([[0, 16], [60, 18], [140, 15]], 7, 'none')
const talisman = (x: number, y: number, h: number) => `M${x} ${y}h16l1 ${h}l-5 -4l-4 5l-4 -5l-5 4Z`
const ALT_TALISMANS = talisman(22, 18, 54) + talisman(56, 18, 64) + talisman(90, 18, 50)
const ALT_TALISMAN_TORN = 'M22 18h16l-2 30l-4 -6l-6 8l-4 -12ZM56 18h16l1 22l-8 4l-3 -6l-6 10ZM90 18h16l0 18l-6 4l-10 -6Z'
const scriptAt = (x: number, y: number) =>
  strokes([
    [[[x + 4, y + 8], [x + 12, y + 8]], 2.2, 'both'],
    [[[x + 8, y + 6], [x + 8, y + 22]], 2.2, 'tail'],
    [[[x + 3, y + 26], [x + 13, y + 24]], 2.2, 'both'],
    [[[x + 5, y + 31], [x + 11, y + 35], [x + 5, y + 39]], 2, 'both'],
  ])
const ALT_SCRIPT = scriptAt(22, 22) + scriptAt(56, 26) + scriptAt(90, 20)
const ALT_TABLE_TOP = 'M6 132H136L140 140H2Z'
const ALT_TABLE = 'M10 140H132V150H10ZM14 150H24V188H14ZM118 150H128V188H118ZM24 150H118V160H24Z'
const ALT_TABLE_INK = brush([[2, 140], [70, 139], [140, 140]], 2.6, 'both') + brush([[14, 150], [70, 151], [128, 150]], 2, 'both')
const ALT_CENSER = smooth([[48, 108], [94, 108], [90, 126], [80, 132], [62, 132], [52, 126]], true)
const ALT_CENSER_INK =
  brush([[44, 108], [71, 106], [98, 108]], 3.4, 'none') + 'M50 108Q44 96 54 97M92 108Q98 96 88 97' + strokes([[[[60, 130], [56, 138]], 3, 'tail'], [[[82, 130], [86, 138]], 3, 'tail']])
const ALT_INCENSE = 'M64 106L62 80M71 106L71 76M78 106L80 80'
const ALT_SMOKE = curl([[62, 78], [56, 62], [66, 48], [60, 32]], 3.4) + curl([[71, 74], [78, 58], [70, 44], [78, 26]], 3.8) + curl([[80, 78], [90, 64], [86, 50]], 3)
const ALT_CANDLES = 'M20 108h8v24h-8ZM114 108h8v24h-8Z'
const ALT_FLAMES = 'M24 96Q30 104 24 108Q18 104 24 96ZM118 96Q124 104 118 108Q112 104 118 96Z'

const PRIEST_FACE = buildFace({ hx: 176, hy: 98, r: 20, eyes: 'stern', brows: 'stern', mouth: 'frown', beard: 'moustache', turn: -0.4 })
const PRIEST_ROBE = buildRobe({ cx: 176, top: 130, w: 48, collar: 'v', slope: 18 })
const PRIEST_HOOD = smooth(
  [
    [176, 56],
    [204, 66],
    [214, 100],
    [212, 132],
    [222, 150],
    [196, 140],
    [198, 108],
    [190, 84],
    [176, 78],
    [162, 84],
    [154, 108],
    [156, 140],
    [130, 150],
    [140, 132],
    [138, 100],
    [148, 66],
  ],
  true,
)
const PRIEST_HOOD_INK =
  brush([[150, 140], [140, 104], [152, 70], [176, 58], [202, 70], [212, 104], [204, 140]], 3.4, 'both', { min: 0.2 }) +
  brush([[156, 132], [154, 104], [166, 84], [176, 79], [188, 84], [198, 104], [196, 134]], 2.4, 'both', { min: 0.2 })
const PRIEST_HAND = smooth([[136, 144], [146, 132], [154, 130], [158, 138], [152, 150], [140, 154]], true)
const PRIEST_TALISMAN = 'M140 96h12l2 44h-14Z'

const ALT_PROPS: Layer[] = [
  L(ALT_BEAM, '#4a2d18'),
  S('M30 18V12M64 18V12M98 18V12', INK, 1.4, null),
  L(ALT_TALISMANS, 'url(#gs-talisman)', null),
  L(ALT_SCRIPT, VERMILION, null),
  L(ALT_TABLE, '#8e2a1e'),
  L(ALT_TABLE_TOP, '#a83a26'),
  L(ALT_TABLE_INK, INK, null),
  L(ALT_CANDLES, '#d8c9a8', SIL_FAR),
  L(ALT_CENSER, '#7c6232'),
  S(ALT_INCENSE, '#5e3b1e', 1.6),
]

function taoistAltar({ night }: { night: boolean }) {
  return (
    <>
      {!night && <path d={ALT_SMOKE} fill="#8a8580" opacity={0.45} />}
      <Layers list={ALT_PROPS} night={night} />
      {!night ? (
        <>
          <path d={ALT_FLAMES} fill="url(#gs-fire)" />
          <path d={ALT_CENSER_INK} fill="none" stroke={INK} strokeWidth={2.4} />
          <path d={ALT_CENSER_INK} fill={INK} />
          <RobeView r={PRIEST_ROBE} fill="#3b3a6a" trim="#c9b27a" />
          <path d={PRIEST_HOOD} fill="#2a2850" />
          <path d={PRIEST_HOOD} fill="url(#gs-streaks)" />
          <path d={blob(176, 100, 21, 26, 6, 0.04)} fill="#1a1830" opacity={0.6} />
          <FaceView f={PRIEST_FACE} />
          <path d={PRIEST_HOOD_INK} fill={INK} />
          <path d={PRIEST_TALISMAN} fill="url(#gs-talisman)" stroke="#8a6620" strokeWidth={1} />
          <path d={scriptAt(139, 100)} fill={VERMILION} />
          <path d={PRIEST_HAND} fill="url(#gs-skin)" stroke={INK} strokeWidth={1.4} />
        </>
      ) : (
        <>
          <path d={ALT_TALISMAN_TORN} fill="#5e566a" opacity={0.85} />
          <path d={brush([[38, 60], [46, 82], [40, 104]], 6, 'both')} fill="#5e566a" opacity={0.6} transform="rotate(20 40 80)" />
          <path d="M24 96Q30 104 24 108Q18 104 24 96ZM118 96Q124 104 118 108Q112 104 118 96Z" fill="url(#gs-eye-glow)" />
          <path d={ALT_SMOKE} fill={SPECTRE} opacity={0.3} />
          <Crack pts={[[78, 132], [72, 140], [80, 148], [74, 160]]} />
          <MistBand y={178} h={24} />
          <Spectre x={176} y={102} k={1} o={0.34} />
          <MistBand y={190} h={16} o={0.9} />
        </>
      )}
    </>
  )
}

export const SCENES_1: Record<'circleOfPrayer' | 'cemetery' | 'buddhistTemple' | 'taoistAltar', SceneDef> = {
  circleOfPrayer: {
    washes: [
      [86, 96, 96, 84, 'red', 3, 0.55],
      [184, 150, 70, 46, 'ochre', 5, 0.8],
      [200, 50, 50, 40, 'gold', 9, 0.5],
    ],
    moon: [128, 30],
    seal: [220, 14],
    Scene: circleOfPrayer,
  },
  cemetery: {
    washes: [
      [150, 90, 110, 80, 'olive', 2, 0.75],
      [60, 60, 70, 56, 'ochre', 4, 0.6],
      [120, 182, 130, 20, 'sepia', 6, 0.5],
    ],
    moon: [150, 40],
    seal: [14, 14],
    Scene: cemetery,
  },
  buddhistTemple: {
    washes: [
      [100, 90, 120, 90, 'gold', 7, 0.9],
      [190, 140, 60, 60, 'ochre', 2, 0.6],
    ],
    moon: [168, 30],
    seal: [220, 14],
    Scene: buddhistTemple,
  },
  taoistAltar: {
    washes: [
      [120, 80, 120, 90, 'indigo', 1, 0.7],
      [60, 130, 80, 50, 'violet', 3, 0.5],
      [70, 60, 40, 40, 'gold', 8, 0.35],
    ],
    moon: null,
    seal: [220, 24],
    Scene: taoistAltar,
  },
}
