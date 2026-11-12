// Village tile scenes: Herbalist's Shop, Sorcerer's Hut, Night Watchman's Beat,
// Pavilion of the Heavenly Wind.
import { blob, brush, smooth, strokes, type Pt } from '../brush'
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
  SIL_FAR,
  SPECTRE,
  Spectre,
  Yurei,
  type Layer,
} from './kit'
import type { SceneDef } from './types'

// ===========================================================================
// Herbalist's Shop — an old herbalist with round spectacles and a skullcap;
// herb bundles hanging from a pole, jars on a shelf, a mortar on the counter.
// ===========================================================================
const HB_POLE = brush([[118, 16], [180, 18], [240, 15]], 5, 'none')
const bundle = (x: number, len: number, seed: number): { string: string; leaves: string; tie: string } => {
  const top = 18
  const tieY = top + 10
  let leaves = ''
  const n = 5
  for (let i = 0; i < n; i++) {
    const dx = (i - (n - 1) / 2) * 3.4
    const l = len * (0.75 + ((seed * (i + 3)) % 5) * 0.06)
    leaves += brush([[x + dx * 0.3, tieY], [x + dx, tieY + l * 0.5], [x + dx * 1.6, tieY + l]], 5.5, 'belly', { min: 0.1 })
  }
  return { string: `M${x} ${top}V${tieY}`, leaves, tie: ell(x, tieY + 1, 4, 2.4) }
}
const HB_BUNDLES = [bundle(136, 40, 1), bundle(164, 52, 2), bundle(194, 38, 3), bundle(224, 46, 4)]
const HB_LEAVES = HB_BUNDLES.map((b) => b.leaves).join('')
const HB_STRINGS = HB_BUNDLES.map((b) => b.string).join('')
const HB_TIES = HB_BUNDLES.map((b) => b.tie).join('')
const HB_SHELF = brush([[122, 112], [180, 111], [240, 112]], 4.4, 'none')
const jar = (x: number, w: number, h: number): string =>
  smooth([[x - w * 0.3, 110 - h], [x + w * 0.3, 110 - h], [x + w * 0.34, 110 - h * 0.86], [x + w * 0.55, 110 - h * 0.6], [x + w * 0.45, 110], [x - w * 0.45, 110], [x - w * 0.55, 110 - h * 0.6], [x - w * 0.34, 110 - h * 0.86]], true)
const HB_JAR_A = jar(142, 26, 30)
const HB_JAR_B = jar(176, 22, 24)
const HB_JAR_C = jar(212, 28, 34)
const HB_JAR_LIDS = ell(142, 80, 9, 3) + ell(176, 86, 7, 2.6) + ell(212, 76, 9, 3)
const HB_JAR_INK =
  brush([[128, 100], [142, 96], [156, 100]], 1.6, 'both') +
  brush([[200, 96], [212, 92], [224, 96]], 1.6, 'both') +
  brush([[204, 88], [212, 100], [220, 88]], 1.4, 'both')
const HB_COUNTER = 'M108 166H240V192H108Z'
const HB_COUNTER_TOP = brush([[106, 166], [170, 165], [240, 166]], 3.6, 'none')
const HB_MORTAR = smooth([[150, 146], [190, 146], [186, 160], [176, 166], [164, 166], [154, 160]], true)
const HB_MORTAR_RIM = ell(170, 146, 20, 4)
const HB_PESTLE = brush([[176, 146], [190, 120], [196, 110]], 7, 'head', { min: 0.6 })
const HB_SPRIG = strokes([
  [[[200, 166], [214, 150], [226, 140]], 2, 'both'],
  [[[210, 156], [206, 146]], 5, 'belly'],
  [[[216, 150], [222, 140]], 5, 'belly'],
  [[[220, 146], [230, 148]], 5, 'belly'],
])
const HB_WITHERED = strokes([
  [[[136, 28], [134, 50], [130, 62]], 3, 'tail'],
  [[[164, 28], [168, 54], [174, 70]], 3, 'tail'],
  [[[194, 28], [190, 46], [186, 56]], 3, 'tail'],
  [[[224, 28], [226, 52], [222, 66]], 3, 'tail'],
])
const HB_SHARDS = 'M196 110L204 100L208 110ZM214 110L220 96L226 104L224 110ZM150 166L156 158L160 166Z'

const HERB_FACE = buildFace({ hx: 70, hy: 94, r: 21, eyes: 'open', glasses: true, brows: 'normal', mouth: 'neutral', beard: 'moustache', age: true, turn: 0.3 })
const HERB_ROBE = buildRobe({ cx: 70, top: 126, w: 44, collar: 'cross', slope: 20 })
const HERB_CAP = smooth([[47, 90], [50, 74], [70, 64], [90, 74], [93, 90], [70, 84]], true)
const HERB_CAP_INK = brush([[47, 90], [70, 84], [93, 90]], 3, 'both', { min: 0.4 }) + brush([[70, 66], [70, 84]], 1.4, 'both')
const HERB_HAND = blob(108, 158, 9, 8, 12, 0.12)
const HERB_HAND_SPRIG = strokes([
  [[[108, 152], [112, 132], [118, 118]], 2, 'both'],
  [[[111, 138], [104, 130]], 6, 'belly'],
  [[[114, 128], [122, 122]], 6, 'belly'],
  [[[116, 122], [112, 112]], 6, 'belly'],
])

const HB_PROPS: Layer[] = [
  L(HB_POLE, '#5a3a1e'),
  S(HB_STRINGS, INK, 1.2, null),
  L(HB_LEAVES, '#5d8a45', null, 0.95),
  L(HB_WITHERED, null, '#4a4356'),
  L(HB_TIES, '#a3271f', null),
  L(HB_SHELF, '#4a2d18'),
  L(HB_JAR_A, 'url(#gs-tile-celadon)'),
  L(HB_JAR_B, 'url(#gs-tile-clay)'),
  L(HB_JAR_C, 'url(#gs-tile-porcelain)'),
  L(HB_JAR_LIDS, '#3b2a1c'),
  L(HB_JAR_INK, '#2c5f9a', null),
  L(HB_COUNTER, 'url(#gs-wood)'),
  L(HB_COUNTER_TOP, INK),
  L(HB_MORTAR, '#8d877c'),
  L(HB_MORTAR_RIM, '#4a453e', '#2a2436'),
  L(HB_PESTLE, '#a39c90'),
  L(HB_SPRIG, '#4f7d3a', null),
]

function herbalistShop({ night }: { night: boolean }) {
  return (
    <>
      <Layers list={HB_PROPS} night={night} />
      {!night ? (
        <>
          <path d={HB_JAR_A + HB_JAR_B + HB_JAR_C + HB_MORTAR} fill="none" stroke={INK} strokeWidth={1.8} />
          <RobeView r={HERB_ROBE} fill="#8a5a32" trim="#e6d6b0" />
          <FaceView f={HERB_FACE} />
          <path d={HERB_CAP} fill="#4b2f1c" />
          <path d={HERB_CAP_INK} fill={INK} />
          <circle cx={70} cy={63} r={3.6} fill={VERMILION} stroke={INK} strokeWidth={1} />
          <path d={HERB_HAND_SPRIG} fill="#4f7d3a" />
          <path d={HERB_HAND} fill="url(#gs-skin)" stroke={INK} strokeWidth={1.4} />
        </>
      ) : (
        <>
          <path d={HB_SHARDS} fill="#3a3346" />
          <GlowEyes x={176} y={98} gap={4} r={3.6} />
          <MistBand y={170} h={26} />
          <Spectre x={70} y={96} k={0.95} o={0.34} />
          <GlowEyes x={142} y={96} gap={4} r={3.4} slant={1} />
          <MistBand y={190} h={16} o={0.9} />
        </>
      )}
    </>
  )
}

// ===========================================================================
// Sorcerer's Hut — a hooded sorcerer with a glowing face over a bubbling
// cauldron; smoke spirits rise in front of a thatched hut.
// ===========================================================================
const SH_ROOF = smooth([[0, 90], [24, 64], [58, 34], [92, 60], [126, 92], [96, 96], [62, 92], [28, 96]], true)
const SH_THATCH = strokes([
  [[[58, 38], [40, 64], [16, 90]], 1.8, 'both'],
  [[[58, 38], [52, 66], [44, 92]], 1.8, 'both'],
  [[[58, 38], [66, 66], [74, 92]], 1.8, 'both'],
  [[[58, 38], [84, 64], [104, 92]], 1.8, 'both'],
  [[[6, 90], [60, 92], [122, 92]], 3, 'both'],
])
const SH_WALL = 'M14 92H112V150H14Z'
const SH_DOOR = 'M48 108Q62 98 76 108V150H48Z'
const SH_SKULL = circ(92, 112, 6) + 'M88 116h8v5h-8Z'
const SH_POT = smooth([[46, 146], [104, 146], [108, 162], [98, 178], [52, 178], [42, 162]], true)
const SH_POT_RIM = ell(75, 146, 30, 6)
const SH_LEGS = strokes([
  [[[54, 176], [48, 188]], 4, 'tail'],
  [[[96, 176], [102, 188]], 4, 'tail'],
])
const SH_FIRE = 'M58 190Q62 176 68 186Q72 170 78 184Q84 172 88 188Q92 180 94 190Z'
const SH_BREW = ell(75, 145, 26, 4)
const SH_SPIRITS = [
  curl([[64, 140], [56, 118], [68, 100], [58, 80], [70, 60]], 9),
  curl([[84, 140], [96, 116], [86, 96], [100, 74], [94, 50]], 10),
].join('')
const SH_SPIRIT_EYES: Array<[number, number]> = [
  [68, 66],
  [95, 58],
]

const SORC_FACE = buildFace({ hx: 176, hy: 96, r: 19, eyes: 'none', brows: 'none', mouth: 'grin', turn: -0.4 })
const SORC_ROBE = buildRobe({ cx: 178, top: 130, w: 50, collar: 'v', slope: 16 })
const SORC_HOOD = smooth(
  [
    [184, 40],
    [204, 70],
    [216, 110],
    [214, 136],
    [226, 160],
    [196, 146],
    [196, 112],
    [188, 86],
    [174, 80],
    [160, 88],
    [154, 112],
    [156, 146],
    [128, 158],
    [138, 134],
    [136, 102],
    [150, 64],
  ],
  true,
)
const SORC_HOOD_INK =
  brush([[136, 150], [138, 104], [152, 66], [184, 42]], 3.4, 'head', { min: 0.2 }) +
  brush([[184, 42], [206, 72], [214, 112], [216, 150]], 3.4, 'tail', { min: 0.2 }) +
  brush([[156, 140], [156, 108], [166, 88], [176, 82], [188, 88], [196, 110], [196, 140]], 2.4, 'both', { min: 0.2 })
const SORC_ARM = smooth([[150, 150], [128, 136], [114, 130], [118, 140], [140, 160], [150, 166]], true)
const SORC_FINGERS = strokes([
  [[[118, 132], [106, 124], [98, 122]], 3.2, 'tail'],
  [[[116, 134], [104, 132], [96, 134]], 3.2, 'tail'],
  [[[116, 138], [106, 140], [98, 146]], 3, 'tail'],
  [[[120, 130], [116, 120], [110, 114]], 3, 'tail'],
])

const SH_PROPS: Layer[] = [
  L(SH_WALL, '#5a4630'),
  L(SH_DOOR, '#1c140c', '#07050a'),
  L(SH_ROOF, '#a28a52'),
  L(SH_ROOF, 'url(#gs-streaks)', null),
  L(SH_THATCH, '#5a4520', null),
  L(SH_SKULL, '#e8e0cc', '#3d3549'),
  L(SH_LEGS, INK),
  L(SH_POT, '#22201c'),
  L(SH_POT_RIM, '#3b3832', '#2a2436'),
]

function sorcerersHut({ night }: { night: boolean }) {
  return (
    <>
      <Layers list={SH_PROPS} night={night} />
      {!night ? (
        <>
          <path d={blob(62, 128, 10, 18, 3)} fill="url(#gs-tile-greenglow)" />
          <path d={SH_FIRE} fill="url(#gs-tile-greenfire)" />
          <path d={SH_BREW} fill="#9be05a" />
          <path d={blob(75, 120, 50, 40, 5)} fill="url(#gs-tile-greenglow)" />
          <path d={SH_SPIRITS} fill="#c9d8bf" opacity={0.75} />
          {SH_SPIRIT_EYES.map(([x, y], i) => (
            <g key={i}>
              <circle cx={x - 3} cy={y} r={1.6} fill={INK} />
              <circle cx={x + 3} cy={y} r={1.6} fill={INK} />
            </g>
          ))}
          <RobeView r={SORC_ROBE} fill="#2f4424" trim="#7c8a3a" neck={false} />
          <path d={SORC_HOOD} fill="#3e5a2a" />
          <path d={SORC_HOOD} fill="url(#gs-streaks)" />
          <path d={blob(176, 100, 20, 25, 8, 0.05)} fill="#141a0c" />
          <path d={blob(176, 108, 13, 13, 2, 0.1)} fill="url(#gs-tile-greenglow)" />
          <path d={SORC_FACE.outline} fill="#7fa04a" opacity={0.5} />
          <path d={SORC_FACE.ink} fill="#c8e88a" />
          <GlowEyes x={172} y={96} gap={6} r={5} slant={-1} />
          <path d={SORC_HOOD_INK} fill={INK} />
          <path d={SORC_ARM} fill="#2f4424" stroke={INK} strokeWidth={1.6} />
          <path d={SORC_FINGERS} fill="#b8c79a" />
        </>
      ) : (
        <>
          <path d="M44 92L58 60L70 70L84 46L96 66L112 92Z" fill="#2a2436" />
          <path d={SH_SPIRITS} fill={SPECTRE} opacity={0.5} />
          {SH_SPIRIT_EYES.map(([x, y], i) => (
            <GlowEyes key={i} x={x} y={y} gap={3.6} r={3.4} />
          ))}
          <path d={blob(62, 132, 6, 12, 3)} fill="url(#gs-eye-glow)" opacity={0.5} />
          <MistBand y={172} h={26} />
          <Lurker x={176} y={104} k={1} />
          <MistBand y={190} h={16} o={0.9} />
        </>
      )}
    </>
  )
}

// ===========================================================================
// Night Watchman's Beat — a watchman in a red headband with a paper lantern;
// the city wall, a gate tower and a hanging gong.
// ===========================================================================
const NW_WALL = 'M110 112H240V192H110Z'
const NW_CRENEL = Array.from({ length: 7 }, (_, i) => `M${112 + i * 19} 112v-9h11v9Z`).join('')
const NW_BRICKS = strokes([
  [[[112, 132], [176, 131], [240, 132]], 1.4, 'both'],
  [[[112, 152], [176, 151], [240, 152]], 1.4, 'both'],
  [[[112, 172], [176, 171], [240, 172]], 1.4, 'both'],
])
const NW_TOWER_ROOF = smooth([[136, 70], [150, 64], [178, 50], [206, 64], [222, 70], [206, 72], [178, 70], [150, 72]], true)
const NW_TOWER = 'M152 72H204V103H152Z'
const NW_TOWER_WIN = 'M164 80h8v14h-8ZM184 80h8v14h-8Z'
const NW_FRAME = 'M190 106h5v80h-5ZM228 106h5v80h-5ZM186 102h52v6h-52Z'
const NW_GONG = circ(211, 140, 17)
const NW_GONG_RINGS = circ(211, 140, 11) + circ(211, 140, 4)
const NW_GONG_STRINGS = 'M200 108L204 125M222 108L218 125'

const WATCH_FACE = buildFace({ hx: 66, hy: 92, r: 21, eyes: 'stern', brows: 'stern', mouth: 'frown', beard: 'moustache', turn: 0.35 })
const WATCH_ROBE = buildRobe({ cx: 64, top: 124, w: 44, collar: 'cross', slope: 20 })
const WATCH_HAIR = smooth([[44, 92], [44, 74], [56, 64], [70, 62], [84, 68], [89, 84], [88, 94], [82, 80], [66, 76], [52, 80]], true)
const WATCH_BUN = circ(64, 60, 8)
const WATCH_BAND = brush([[44, 80], [66, 75], [89, 80]], 7, 'none')
const WATCH_BAND_TAILS = brush([[44, 80], [34, 84], [24, 80], [14, 86]], 5, 'tail') + brush([[44, 81], [34, 92], [26, 96]], 4.4, 'tail')
const WATCH_POLE = brush([[104, 172], [116, 120], [128, 58]], 4, 'none')
const WATCH_HAND = blob(108, 156, 9, 8, 14, 0.12)
const LANTERN_X = 134
const LANTERN_Y = 84
const LANTERN = ell(LANTERN_X, LANTERN_Y, 13, 17)
const LANTERN_RIBS = strokes([
  [[[LANTERN_X - 12, LANTERN_Y - 6], [LANTERN_X, LANTERN_Y - 8], [LANTERN_X + 12, LANTERN_Y - 6]], 1.2, 'both'],
  [[[LANTERN_X - 13, LANTERN_Y + 1], [LANTERN_X, LANTERN_Y], [LANTERN_X + 13, LANTERN_Y + 1]], 1.2, 'both'],
  [[[LANTERN_X - 12, LANTERN_Y + 8], [LANTERN_X, LANTERN_Y + 9], [LANTERN_X + 12, LANTERN_Y + 8]], 1.2, 'both'],
])
const LANTERN_CAPS = `M${LANTERN_X - 7} ${LANTERN_Y - 20}h14v5h-14ZM${LANTERN_X - 7} ${LANTERN_Y + 15}h14v5h-14Z`

// Chochin-obake: the torn lantern come alive, one eye and a lolling tongue.
const LG_BODY = smooth([[62, 112], [82, 108], [96, 124], [98, 150], [86, 170], [64, 172], [50, 156], [48, 130]], true)
const LG_RIBS = strokes([
  [[[50, 128], [72, 124], [96, 130]], 1.6, 'both'],
  [[[48, 142], [74, 140], [98, 146]], 1.6, 'both'],
  [[[52, 158], [72, 158], [92, 160]], 1.6, 'both'],
])
const LG_TEAR = 'M70 136Q78 132 88 136Q90 150 82 160Q72 162 66 154Q64 144 70 136Z'
const LG_TONGUE = smooth([[72, 156], [84, 156], [86, 172], [80, 186], [74, 180], [72, 166]], true)
const LG_CAPS = 'M60 104h22l2 7h-26ZM58 168h26l-2 7h-22Z'
function LanternGhost() {
  return (
    <g transform="rotate(-14 72 140)">
      <circle cx={72} cy={140} r={50} fill="url(#gs-tile-greenglow)" opacity={0.5} />
      <path d={LG_BODY} fill="#4d4258" />
      <path d={LG_RIBS} fill="#231d2b" />
      <path d={LG_TEAR} fill="#0b0810" />
      <path d={LG_TONGUE} fill="#a3243b" />
      <path d={LG_CAPS} fill="#0b0810" />
      <circle cx={66} cy={128} r={9} fill="url(#gs-eye-glow)" />
      <circle cx={66} cy={128} r={2.4} fill="#0b0810" />
    </g>
  )
}

const NW_PROPS: Layer[] = [
  L(NW_TOWER_ROOF, '#2b2722'),
  L(NW_TOWER, '#7a6a58', SIL_FAR),
  L(NW_TOWER_WIN, '#2a1f18', '#e8d070', 1, 0.5),
  L(NW_WALL + NW_CRENEL, '#8d8478'),
  L(NW_BRICKS, '#4d463e', null, 0.7),
  L(NW_FRAME, 'url(#gs-wood)'),
  S(NW_GONG_STRINGS, INK, 1.4, null),
  L(NW_GONG, 'url(#gs-tile-gong)'),
  S(NW_GONG_RINGS, '#6e4a14', 1.4, null),
]

function nightWatchman({ night }: { night: boolean }) {
  return (
    <>
      {!night && <path d="M0 0H240V120H0Z" fill="url(#gs-tile-dusk)" />}
      <Layers list={NW_PROPS} night={night} />
      {!night ? (
        <>
          <path d={NW_GONG} fill="none" stroke={INK} strokeWidth={1.8} />
          <circle cx={LANTERN_X} cy={LANTERN_Y} r={44} fill="url(#gs-lamp-glow)" />
          <RobeView r={WATCH_ROBE} fill="#7a2a1c" trim="#5a5550" />
          <FaceView f={WATCH_FACE} />
          <path d={WATCH_HAIR + WATCH_BUN} fill="#16110d" />
          <path d={WATCH_BAND_TAILS} fill="#c1392b" />
          <path d={WATCH_BAND} fill="#c1392b" />
          <path d={WATCH_POLE} fill="#5e3b1e" />
          <path d={`M128 58L${LANTERN_X} ${LANTERN_Y - 20}`} stroke={INK} strokeWidth={1.4} />
          <path d={LANTERN} fill="url(#gs-lantern)" />
          <path d={LANTERN_RIBS} fill="#7e1d17" opacity={0.7} />
          <path d={LANTERN_CAPS} fill={INK} />
          <path d={WATCH_HAND} fill="url(#gs-skin)" stroke={INK} strokeWidth={1.4} />
        </>
      ) : (
        <>
          <Crack pts={[[211, 123], [207, 134], [214, 142], [209, 156]]} />
          <path d={WATCH_POLE} fill={SIL} transform="rotate(-60 104 180)" />
          <MistBand y={174} h={26} />
          <LanternGhost />
          <MistBand y={190} h={16} o={0.9} />
        </>
      )}
    </>
  )
}

// ===========================================================================
// Pavilion of the Heavenly Wind — an open pavilion on red pillars, wind
// ribbons and petals swirling past; a lady with hairpins and a round fan.
// ===========================================================================
const PV_ROOF = smooth(
  [
    [2, 70],
    [14, 64],
    [40, 52],
    [66, 26],
    [92, 52],
    [118, 64],
    [130, 70],
    [116, 72],
    [92, 70],
    [66, 68],
    [40, 70],
    [16, 72],
  ],
  true,
)
const PV_FINIAL = brush([[66, 10], [66, 28]], 4, 'both') + circ(66, 12, 3.4)
const PV_EAVE = brush([[0, 66], [16, 72], [66, 70], [116, 72], [132, 66]], 4, 'both', { min: 0.3 })
const PV_PILLARS = 'M20 72H26V168H20ZM63 72H69V168H63ZM106 72H112V168H106Z'
const PV_RAIL = 'M20 138H112V142H20ZM20 152H112V155H20Z'
const PV_RAIL_POSTS = 'M40 138h3v17h-3ZM86 138h3v17h-3Z'
const PV_BASE = 'M8 168H124V178H8Z'
const RIBBONS: Array<readonly Pt[]> = [
  [[0, 112], [40, 96], [90, 112], [140, 84], [190, 92], [240, 60]],
  [[0, 150], [50, 128], [110, 140], [150, 118], [210, 128], [240, 112]],
  [[30, 44], [80, 36], [120, 50], [170, 30], [220, 36]],
]
const PV_RIBBONS = RIBBONS.map((p, i) => brush(p, 7 - i, 'belly', { min: 0.05 })).join('')
const PV_RIBBON_INK = RIBBONS.map((p) => brush(p.map(([x, y]) => [x, y + 2.5] as const), 1.2, 'both')).join('')
const PV_PETALS = [
  [146, 60],
  [210, 104],
  [132, 132],
  [40, 104],
  [226, 150],
  [96, 30],
]
  .map(([x, y], i) => brush([[x, y], [x + 4, y + 3 - (i % 2) * 6]], 4, 'belly'))
  .join('')
const PV_ROOF_BROKEN = 'M44 52L58 34L66 46L74 30L86 48L66 64Z'

const LADY_FACE = buildFace({ hx: 176, hy: 92, r: 19, eyes: 'lidded', brows: 'thin', mouth: 'lips', turn: -0.35 })
const LADY_ROBE = buildRobe({ cx: 176, top: 122, w: 42, collar: 'cross', slope: 22, neck: 7 })
const LADY_HAIR_BACK = smooth([[154, 96], [152, 74], [164, 62], [188, 60], [200, 72], [200, 100], [196, 118], [190, 92], [186, 76], [168, 74], [160, 92], [158, 114]], true)
const LADY_BUN = ell(178, 56, 22, 13)
const LADY_PINS = brush([[150, 40], [206, 64]], 2.4, 'none') + brush([[206, 40], [154, 66]], 2.4, 'none')
const LADY_BEADS = circ(150, 40, 3) + circ(207, 40, 3) + circ(148, 48, 2.2) + circ(209, 48, 2.2)
const LADY_TASSEL = brush([[208, 50], [210, 62], [208, 74]], 3, 'tail')
const LADY_FAN = circ(142, 132, 20)
const LADY_FAN_PLUM =
  brush([[128, 144], [140, 132], [150, 122], [158, 118]], 2, 'tail') + circ(142, 128, 2.6) + circ(150, 124, 2.4) + circ(134, 138, 2.4)
const LADY_FAN_HANDLE = brush([[142, 152], [144, 172]], 3.6, 'none')
const LADY_HAND = blob(146, 172, 7, 6, 21, 0.12)

const PV_PEAKS = smooth([[92, 150], [110, 112], [124, 96], [138, 116], [150, 104], [168, 76], [190, 108], [214, 96], [240, 120], [240, 160], [92, 160]], true)

const PV_PROPS: Layer[] = [
  L(PV_PEAKS, 'url(#gs-tile-peaks)', SIL_FAR, 1, 0.7),
  L(PV_BASE, '#9d927c'),
  L(PV_PILLARS, '#a83226'),
  L(PV_RAIL + PV_RAIL_POSTS, '#6a2a1c'),
  L(PV_ROOF, '#2c2a33'),
  L(PV_ROOF, 'url(#gs-streaks)', null),
  L(PV_FINIAL, INK),
  L(PV_EAVE, INK),
]

function pavilion({ night }: { night: boolean }) {
  return (
    <>
      <Layers list={PV_PROPS} night={night} />
      {!night ? (
        <>
          <path d={PV_RIBBONS} fill="#f6f2ea" opacity={0.92} />
          <path d={PV_RIBBON_INK} fill="#5a6a78" opacity={0.6} />
          <path d={PV_PETALS} fill="#e48a9c" />
          <path d={LADY_HAIR_BACK} fill="#120d0b" />
          <RobeView r={LADY_ROBE} fill="#6a3c7c" trim="#e7a6b6" />
          <FaceView f={LADY_FACE} skin="url(#gs-skin-pale)" blush />
          <path d={smooth([[158, 92], [160, 74], [178, 68], [196, 74], [198, 92], [190, 80], [176, 78], [164, 82]], true)} fill="#120d0b" />
          <path d={LADY_BUN} fill="#120d0b" />
          <path d={LADY_PINS} fill="#c9a248" />
          <path d={LADY_BEADS} fill="#d4a857" stroke={INK} strokeWidth={0.8} />
          <path d={LADY_TASSEL} fill={VERMILION} />
          <path d={LADY_FAN_HANDLE} fill="#5e3b1e" />
          <path d={LADY_FAN} fill="url(#gs-tile-silk)" stroke={INK} strokeWidth={2} />
          <path d={LADY_FAN_PLUM} fill="#a3243b" />
          <path d={LADY_HAND} fill="url(#gs-skin-pale)" stroke={INK} strokeWidth={1.2} />
        </>
      ) : (
        <>
          <path d={PV_ROOF_BROKEN} fill="#3b3449" />
          <path d={PV_RIBBONS} fill={SPECTRE} opacity={0.32} />
          <GlowEyes x={196} y={64} gap={5} r={4.2} />
          <path d={LADY_FAN} fill="#3a3346" transform="translate(-30 40) rotate(-30 142 132)" />
          <MistBand y={176} h={24} />
          <Yurei x={176} y={92} k={1.05} />
          <MistBand y={190} h={16} o={0.9} />
        </>
      )}
    </>
  )
}

export const SCENES_2: Record<'herbalistShop' | 'sorcerersHut' | 'nightWatchman' | 'pavilion', SceneDef> = {
  herbalistShop: {
    washes: [
      [160, 96, 100, 86, 'sepia', 1, 0.7],
      [176, 46, 70, 36, 'jade', 4, 0.6],
      [60, 110, 60, 70, 'ochre', 7, 0.45],
    ],
    moon: null,
    seal: [14, 14],
    Scene: herbalistShop,
  },
  sorcerersHut: {
    washes: [
      [80, 100, 110, 86, 'green', 3, 0.7],
      [190, 70, 60, 70, 'teal', 5, 0.55],
      [70, 160, 70, 30, 'olive', 8, 0.6],
    ],
    moon: [24, 30],
    seal: [14, 14],
    Scene: sorcerersHut,
  },
  nightWatchman: {
    washes: [
      [120, 70, 130, 70, 'crimson', 2, 0.45],
      [180, 150, 70, 50, 'ash', 4, 0.5],
      [130, 84, 40, 40, 'gold', 7, 0.55],
    ],
    moon: [100, 30],
    seal: [14, 14],
    Scene: nightWatchman,
  },
  pavilion: {
    washes: [
      [80, 90, 100, 86, 'violet', 1, 0.55],
      [190, 120, 60, 70, 'rose', 6, 0.5],
      [40, 40, 50, 40, 'teal', 9, 0.4],
    ],
    moon: [150, 34],
    seal: [14, 14],
    Scene: pavilion,
  },
}
