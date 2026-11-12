// Village tile scenes: Tea House, Kung-Fu School (White Moon), Calligrapher
// (Black Secret).
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
  Lurker,
  MistBand,
  RobeView,
  S,
  SIL,
  SPECTRE,
  InkWraith,
  Yurei,
  type Layer,
} from './kit'
import type { SceneDef } from './types'

// ===========================================================================
// Tea House — a hostess with a black bob; a clay teapot, cups, steam and a
// hanging red lantern.
// ===========================================================================
const TH_LANTERN = ell(196, 44, 22, 19)
const TH_LANTERN_RIBS = strokes([
  [[[176, 36], [196, 32], [216, 36]], 1.2, 'both'],
  [[[174, 44], [196, 42], [218, 44]], 1.2, 'both'],
  [[[176, 52], [196, 54], [216, 52]], 1.2, 'both'],
  [[[196, 26], [196, 62]], 1.2, 'both'],
])
const TH_LANTERN_CAPS = 'M186 22h20v5h-20ZM186 61h20v5h-20Z'
const TH_TASSEL = brush([[196, 66], [196, 78], [194, 88]], 4, 'tail')
const TH_CORD = 'M196 0V22'
const TH_TABLE = 'M112 166H240V176H112ZM124 176H134V192H124ZM224 176H234V192H224Z'
const TH_TABLE_INK = brush([[110, 166], [176, 165], [240, 166]], 3, 'none')
const TH_POT = smooth([[154, 132], [198, 132], [204, 146], [196, 162], [156, 162], [148, 146]], true)
const TH_POT_LID = ell(176, 131, 14, 4) + circ(176, 125, 4)
const TH_SPOUT = brush([[152, 146], [140, 140], [134, 126]], 7, 'head', { min: 0.5 })
const TH_HANDLE = 'M200 136Q218 134 214 150Q210 158 200 156'
const TH_STEAM = curl([[134, 122], [128, 106], [138, 92], [130, 74]], 3.6) + curl([[176, 120], [182, 104], [174, 90], [182, 72]], 3)
const cup = (x: number) => smooth([[x - 9, 156], [x + 9, 156], [x + 7, 164], [x - 7, 164]], true)
const TH_CUPS = cup(128) + cup(222)
const TH_CUP_RIMS = ell(128, 156, 9, 2) + ell(222, 156, 9, 2)
const TH_SPILL = blob(160, 172, 30, 5, 3, 0.2)

const HOST_FACE = buildFace({ hx: 70, hy: 92, r: 20, eyes: 'open', brows: 'thin', mouth: 'lips', turn: 0.3 })
const HOST_ROBE = buildRobe({ cx: 70, top: 126, w: 42, collar: 'high', slope: 22, neck: 7 })
const HOST_HAIR_BACK = smooth([[46, 112], [44, 80], [52, 66], [70, 60], [88, 66], [96, 80], [94, 112], [86, 114], [88, 92], [52, 92], [54, 114]], true)
const HOST_BANGS = smooth([[48, 86], [50, 70], [62, 63], [80, 63], [92, 72], [93, 86], [80, 82], [66, 82]], true)
const HOST_FLOWER = [0, 1, 2, 3, 4].map((i) => {
  const a = (i / 5) * Math.PI * 2
  return circ(92 + Math.cos(a) * 4, 72 + Math.sin(a) * 4, 3.2)
}).join('')
const HOST_PATTERN = [circ(52, 160, 3), circ(84, 150, 3), circ(66, 178, 3), circ(96, 176, 2.6), circ(40, 182, 2.6)].join('')
const HOST_CUP_HAND = blob(108, 160, 9, 7, 30, 0.12)

const TH_PROPS: Layer[] = [
  S(TH_CORD, INK, 1.4, null),
  L(TH_TABLE, '#4a2a18'),
  L(TH_TABLE_INK, INK, null),
  L(TH_SPOUT, 'url(#gs-tile-clay)'),
  L(TH_POT, 'url(#gs-tile-clay)'),
  L(TH_POT_LID, '#5a2a14'),
  S(TH_HANDLE, '#6a2e16', 4.4),
  L(TH_CUPS, 'url(#gs-tile-porcelain)'),
  L(TH_CUP_RIMS, '#2c69b8', null),
]

function teaHouse({ night }: { night: boolean }) {
  return (
    <>
      {!night && (
        <>
          <circle cx={196} cy={46} r={52} fill="url(#gs-lamp-glow)" />
          <path d={TH_STEAM} fill="#a39d96" opacity={0.5} />
        </>
      )}
      <Layers list={TH_PROPS} night={night} />
      {!night ? (
        <>
          <path d={TH_POT + TH_CUPS} fill="none" stroke={INK} strokeWidth={1.8} />
          <path d={TH_LANTERN} fill="url(#gs-lantern)" />
          <path d={TH_LANTERN_RIBS} fill="#7e1d17" opacity={0.7} />
          <path d={TH_LANTERN_CAPS} fill={INK} />
          <path d={TH_TASSEL} fill="#d4a857" />
          <path d={HOST_HAIR_BACK} fill="#120d0b" />
          <RobeView r={HOST_ROBE} fill="#a3243b" trim="#d4a857" />
          <path d={HOST_PATTERN} fill="#d4a857" opacity={0.8} />
          <FaceView f={HOST_FACE} skin="url(#gs-skin-pale)" blush />
          <path d={HOST_BANGS} fill="#120d0b" />
          <path d={HOST_FLOWER} fill="#e8687a" stroke={INK} strokeWidth={0.6} />
          <circle cx={92} cy={72} r={2.2} fill="#f3d27a" />
          <path d={HOST_CUP_HAND} fill="url(#gs-skin-pale)" stroke={INK} strokeWidth={1.2} />
        </>
      ) : (
        <>
          <path d={TH_LANTERN} fill="#2c2536" transform="rotate(24 196 22)" />
          <path d="M180 30L192 50L186 62M206 34L200 52" stroke="#5e566a" strokeWidth={1.6} fill="none" transform="rotate(24 196 22)" />
          <Crack pts={[[170, 132], [176, 142], [170, 150], [178, 162]]} />
          <path d={TH_SPILL} fill="#2a2436" />
          <path d={TH_STEAM} fill={SPECTRE} opacity={0.3} />
          <GlowEyes x={133} y={84} gap={4} r={3.6} />
          <MistBand y={176} h={24} />
          <Yurei x={70} y={92} k={1.1} />
          <MistBand y={190} h={16} o={0.9} />
        </>
      )}
    </>
  )
}

// ===========================================================================
// Kung-Fu School — a fighter mid-strike before a wooden training dummy and a
// school banner.
// ===========================================================================
const KF_BANNER_POLE = 'M10 8h4v176h-4Z'
const KF_BANNER = 'M14 14H44V112L36 104L29 114L22 104L14 112Z'
const KF_BANNER_ENSO = ring(29, 52, 10, 4, -2.3, 5.6)
const KF_BANNER_TORN = 'M14 14H44V62L38 56L30 70L22 58L14 66Z'
const KF_TRUNK = 'M58 40Q58 30 68 30Q78 30 78 40V176H58Z'
const KF_ARMS =
  brush([[60, 72], [44, 66], [34, 64]], 6, 'none') +
  brush([[76, 72], [92, 66], [102, 64]], 6, 'none') +
  brush([[76, 100], [96, 100], [108, 100]], 6, 'none') +
  brush([[66, 140], [52, 150], [46, 168]], 6, 'none')
const KF_ARMS_BROKEN = brush([[60, 72], [50, 70]], 6, 'none') + brush([[76, 72], [84, 69]], 6, 'none') + brush([[76, 100], [96, 100], [108, 100]], 6, 'none')
const KF_STAND = 'M40 176H96V182H40ZM48 182h6v8h-6ZM82 182h6v8h-6Z'
const KF_GRAIN = strokes([
  [[[63, 44], [62, 90], [64, 170]], 1.4, 'both'],
  [[[72, 50], [73, 110], [71, 168]], 1.2, 'both'],
])
const KF_RACK = 'M112 120h3v58h-3ZM132 120h3v58h-3ZM110 124h28v3h-28ZM110 160h28v3h-28Z'
const KF_STAFF = brush([[118, 104], [118, 186]], 3, 'none') + brush([[128, 98], [130, 186]], 3, 'none')
const KF_SPEAR_TIP = 'M128 98L132 84L134 98Z'
const KF_SPLINTERS = 'M44 66L36 74L40 64ZM96 66L104 72L100 62Z'

const FIGHT_FACE = buildFace({ hx: 178, hy: 84, r: 20, eyes: 'stern', brows: 'stern', mouth: 'frown', turn: -0.35 })
const FIGHT_ROBE = buildRobe({ cx: 180, top: 116, w: 48, collar: 'high', slope: 18, neck: 9 })
const FIGHT_HAIR = smooth([[157, 84], [158, 66], [170, 58], [186, 58], [198, 66], [200, 84], [192, 74], [178, 70], [164, 74]], true)
const FIGHT_KNOT = circ(178, 52, 7)
const FIGHT_BAND = brush([[157, 74], [178, 68], [200, 74]], 6, 'none')
const FIGHT_BAND_TAILS = brush([[200, 74], [212, 80], [222, 76], [232, 84]], 4.4, 'tail') + brush([[200, 75], [212, 88], [220, 94]], 4, 'tail')
const FIGHT_ARM = smooth([[150, 132], [134, 122], [122, 112], [116, 118], [126, 132], [144, 150]], true)
const FIGHT_FIST = smooth([[106, 104], [118, 100], [124, 108], [122, 120], [110, 122], [104, 114]], true)
const FIGHT_KNUCKLES = strokes([
  [[[108, 106], [110, 120]], 1.4, 'both'],
  [[[113, 104], [115, 120]], 1.4, 'both'],
  [[[118, 103], [120, 119]], 1.4, 'both'],
])
const FIGHT_BUTTONS = 'M184 136h8M184 148h8M184 160h8M184 172h8'
const KF_IMPACT = strokes([
  [[[100, 92], [92, 84]], 2.4, 'both'],
  [[[98, 108], [88, 110]], 2.4, 'both'],
  [[[104, 96], [100, 86]], 2, 'both'],
])

const KF_PROPS: Layer[] = [
  L(KF_BANNER_POLE, '#4a2d18'),
  L(KF_RACK, '#5a3a1e'),
  L(KF_STAFF, '#7a5228'),
  L(KF_SPEAR_TIP, '#9aa2a8'),
  L(KF_STAND, '#4a2d18'),
  L(KF_TRUNK, 'url(#gs-wood)'),
  L(KF_GRAIN, '#3b2410', null, 0.6),
]

function kungFuSchool({ night }: { night: boolean }) {
  return (
    <>
      <Layers list={KF_PROPS} night={night} />
      {!night ? (
        <>
          <path d={KF_BANNER} fill="#b8322a" />
          <path d={KF_BANNER} fill="url(#gs-streaks)" />
          <path d={KF_BANNER_ENSO} fill={INK} />
          <path d={brush([[24, 76], [34, 76]], 3, 'both') + brush([[29, 70], [29, 96]], 3, 'tail') + brush([[22, 90], [36, 88]], 2.6, 'both')} fill={INK} />
          <path d={KF_ARMS} fill="#6a4524" />
          <path d={KF_TRUNK} fill="none" stroke={INK} strokeWidth={2} />
          <path d={KF_IMPACT} fill={INK} />
          <RobeView r={FIGHT_ROBE} fill="#26262e" trim="#e9e2d0" />
          <path d={FIGHT_BUTTONS} stroke="#e9e2d0" strokeWidth={2.2} strokeLinecap="round" />
          <FaceView f={FIGHT_FACE} />
          <path d={FIGHT_HAIR + FIGHT_KNOT} fill="#16110d" />
          <path d={FIGHT_BAND_TAILS} fill="#2c69b8" />
          <path d={FIGHT_BAND} fill="#2c69b8" />
          <path d={FIGHT_ARM} fill="#26262e" stroke={INK} strokeWidth={1.6} />
          <path d={FIGHT_FIST} fill="url(#gs-skin)" stroke={INK} strokeWidth={1.6} />
          <path d={FIGHT_KNUCKLES} fill={INK} />
        </>
      ) : (
        <>
          <path d={KF_BANNER_TORN} fill="#3a3346" />
          <path d={KF_ARMS_BROKEN} fill={SIL} />
          <path d={KF_SPLINTERS} fill={SIL} />
          <path d={brush([[34, 186], [52, 184], [62, 188]], 6, 'none')} fill={SIL} />
          <Crack pts={[[66, 30], [70, 50], [64, 66], [70, 84]]} />
          <MistBand y={176} h={26} />
          <Lurker x={176} y={90} k={1.05} />
          <MistBand y={190} h={16} o={0.9} />
        </>
      )}
    </>
  )
}

// ===========================================================================
// Calligrapher — a scholar in a winged black hat holding his brush; a hanging
// scroll and a desk with an inkstone.
// ===========================================================================
const CL_SCROLL = 'M152 18H214V168H152Z'
const CL_SCROLL_PAPER = 'M158 26H208V158H158Z'
const CL_RODS = 'M146 12H220V20H146ZM146 166H220V174H146Z'
const CL_KNOBS = circ(146, 170, 4) + circ(220, 170, 4)
const CL_CORD = 'M164 12L183 0L202 12'
const CL_CHARS = strokes([
  // 山-like
  [[[183, 34], [183, 62]], 6, 'tail'],
  [[[168, 46], [168, 64]], 5, 'tail'],
  [[[198, 46], [198, 64]], 5, 'tail'],
  [[[167, 64], [184, 65], [199, 63]], 5.5, 'tail'],
  // 风-like
  [[[170, 82], [169, 104], [164, 120]], 5, 'tail'],
  [[[170, 82], [196, 81], [197, 106], [204, 120]], 5, 'tail'],
  [[[178, 92], [190, 108]], 4.4, 'tail'],
  [[[190, 92], [178, 108]], 4.4, 'tail'],
  // dot + sweep
  [[[184, 128], [186, 134]], 6, 'head'],
  [[[168, 140], [184, 138], [200, 142]], 5, 'tail'],
])
const CL_SEAL = 'M194 146h9v9h-9Z'
const CL_DESK = 'M108 168H240V180H108ZM116 180H126V192H116ZM226 180H236V192H226Z'
const CL_DESK_INK = brush([[106, 168], [170, 167], [240, 168]], 3, 'none')
const CL_INKSTONE = 'M124 156H158V168H124Z'
const CL_INKWELL = ell(134, 160, 6, 2.6)
const CL_PAPER = 'M168 162L230 160L232 168L170 168Z'
const CL_SPILL = blob(150, 172, 34, 7, 9, 0.25) + blob(132, 184, 8, 10, 3, 0.2)
const CL_SCROLL_TORN = 'M158 90L170 100L162 112L176 120L168 134L158 128Z'

const SCHOLAR_FACE = buildFace({ hx: 70, hy: 96, r: 21, eyes: 'narrow', brows: 'normal', mouth: 'neutral', beard: 'wispy', age: true, turn: 0.3 })
const SCHOLAR_ROBE = buildRobe({ cx: 70, top: 128, w: 44, collar: 'cross', slope: 20 })
const SCHOLAR_HAT = smooth([[48, 86], [48, 70], [58, 60], [80, 60], [92, 70], [92, 86], [70, 82]], true)
const SCHOLAR_WINGS = brush([[14, 70], [40, 72], [70, 72]], 4.5, 'none') + brush([[70, 72], [100, 72], [126, 70]], 4.5, 'none')
const SCHOLAR_HAT_INK = brush([[48, 86], [70, 82], [92, 86]], 2.4, 'both', { min: 0.4 })
const SCHOLAR_BRUSH = brush([[112, 100], [114, 150]], 4.4, 'none')
const SCHOLAR_BRUSH_TIP = smooth([[110, 150], [118, 150], [116, 164], [114, 172], [112, 164]], true)
const SCHOLAR_HAND = blob(114, 130, 9, 8, 33, 0.12)
const SCHOLAR_SLEEVE = smooth([[96, 146], [108, 132], [122, 136], [118, 152], [104, 160]], true)

const CL_PROPS: Layer[] = [
  S(CL_CORD, INK, 1.4, null),
  L(CL_SCROLL, '#3a4a42'),
  L(CL_SCROLL_PAPER, 'url(#gs-tile-silk)', '#2a2436'),
  L(CL_CHARS, INK, null),
  L(CL_SEAL, VERMILION, null),
  L(CL_RODS + CL_KNOBS, '#3b2410'),
  L(CL_DESK, '#3b2416'),
  L(CL_DESK_INK, INK, null),
  L(CL_PAPER, '#f6eedb', null),
  L(CL_INKSTONE, '#24201d'),
  L(CL_INKWELL, '#0b0907', null),
]

function calligrapher({ night }: { night: boolean }) {
  return (
    <>
      <Layers list={CL_PROPS} night={night} />
      {!night ? (
        <>
          <path d={brush([[178, 164], [190, 163], [204, 165], [218, 163]], 2, 'both')} fill={INK} opacity={0.7} />
          <RobeView r={SCHOLAR_ROBE} fill="#8ea2a6" trim="#f0ebe0" />
          <FaceView f={SCHOLAR_FACE} />
          <path d={SCHOLAR_WINGS} fill="#16110d" />
          <path d={SCHOLAR_HAT} fill="#16110d" />
          <path d={SCHOLAR_HAT_INK} fill="#4a4038" />
          <path d={SCHOLAR_SLEEVE} fill="#8ea2a6" stroke={INK} strokeWidth={1.6} />
          <path d={SCHOLAR_BRUSH} fill="#a0784a" />
          <path d={SCHOLAR_BRUSH_TIP} fill={INK} />
          <path d={SCHOLAR_HAND} fill="url(#gs-skin)" stroke={INK} strokeWidth={1.4} />
        </>
      ) : (
        <>
          <path d={CL_CHARS} fill="#4a4356" />
          <path d={CL_SCROLL_TORN} fill="#120e19" />
          <path d={CL_SPILL} fill="#050407" />
          <path d={brush([[164, 158], [166, 176], [162, 190]], 4, 'tail')} fill="#050407" />
          <GlowEyes x={183} y={100} gap={6} r={5} />
          <MistBand y={176} h={24} />
          <InkWraith x={72} y={110} k={1.05} />
          <MistBand y={190} h={16} o={0.9} />
        </>
      )}
    </>
  )
}

export const SCENES_3: Record<'teaHouse' | 'kungFuSchool' | 'calligrapher', SceneDef> = {
  teaHouse: {
    washes: [
      [110, 100, 120, 86, 'rose', 2, 0.6],
      [196, 46, 50, 40, 'crimson', 5, 0.5],
      [176, 150, 60, 30, 'ochre', 8, 0.5],
    ],
    moon: [40, 30],
    seal: [14, 14],
    Scene: teaHouse,
  },
  kungFuSchool: {
    washes: [
      [100, 90, 120, 90, 'blue', 4, 0.5],
      [180, 60, 60, 60, 'teal', 1, 0.5],
      [90, 180, 120, 20, 'ochre', 6, 0.5],
    ],
    moon: [130, 32],
    seal: [222, 14],
    Scene: kungFuSchool,
  },
  calligrapher: {
    washes: [
      [110, 90, 120, 90, 'ash', 3, 0.6],
      [190, 100, 50, 80, 'jade', 7, 0.45],
      [60, 60, 50, 40, 'ink', 2, 0.15],
    ],
    moon: null,
    seal: [14, 14],
    Scene: calligrapher,
  },
}
