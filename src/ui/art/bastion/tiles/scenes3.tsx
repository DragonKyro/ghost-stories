// Bastion tiles: the Divine Fountain, the Strategist's Tower, the Tavern.
import { brush, strokes } from '../../brush'
import { COLOR_HEX } from '../../palette'
import { CRIMSON, LB_INK, MORTAR, PARCHMENT } from '../palette'
import { arch, circ, crenels, ell, Flame, joints, rect, type SceneDef } from './kit'
import { Ln, P } from './paint'

// ===========================================================================
// The Divine Fountain — a winged guardian statue holds up a radiant orb over
// a two-tier fountain in an arcaded court; holy light and falling water.
// ===========================================================================
const FTN_ARCADE = rect(0, 108, 240, 44)
const FTN_ARCHES = [8, 40, 72, 146, 178, 210].map((x) => arch(x, 152, 22, 32)).join('')
const FTN_ARCADE_TOP = rect(-2, 102, 244, 8)
const FTN_COURT = rect(0, 152, 240, 40)
const FTN_COURT_JOINTS = 'M0 168H240M0 182H240M30 152L24 168M80 152L78 168M160 152L162 168M210 152L216 168M52 168L48 182M120 168V182M188 168L192 182'
const FTN_BASIN_FRONT = 'M30 144Q120 162 210 144V164Q120 182 30 164Z'
const FTN_BASIN_RIM = ell(120, 144, 90, 12)
const FTN_BASIN_WATER = ell(120, 144, 82, 8.5)
const FTN_RIPPLES = 'M70 145Q84 142 98 145M136 147Q152 143 168 147M100 150Q116 153 132 150'
const FTN_PEDESTAL = 'M110 144V118H130V144Z'
const FTN_BOWL = 'M80 104H160Q156 120 120 122Q84 120 80 104Z'
const FTN_BOWL_WATER = ell(120, 104, 38, 4)
const FTN_FALLS = strokes([
  [[[84, 106], [74, 114], [68, 128], [66, 142]], 5, 'head'],
  [[[156, 106], [166, 114], [172, 128], [174, 142]], 5, 'head'],
  [[[96, 112], [90, 124], [88, 140]], 3, 'head'],
  [[[144, 112], [150, 124], [152, 140]], 3, 'head'],
])
// The statue: wings, a long robe, arms raised to the orb.
const FTN_WINGS =
  'M116 70C104 58 92 56 82 62C90 64 92 70 88 74C96 74 98 80 94 84C104 84 110 80 116 78Z' +
  'M124 70C136 58 148 56 158 62C150 64 148 70 152 74C144 74 142 80 146 84C136 84 130 80 124 78Z'
const FTN_FEATHERS = 'M90 66Q100 66 112 72M94 76Q104 76 114 76M150 66Q140 66 128 72M146 76Q136 76 126 76'
const FTN_ROBE = 'M114 66Q110 84 104 102H136Q130 84 126 66Z'
const FTN_ROBE_FOLDS = 'M117 72L112 100M123 72L128 100M120 74V101'
const FTN_HEAD = circ(120, 61, 6)
// Arms raised with the elbows out, the hands meeting under the orb.
const FTN_ARMS = strokes([
  [[[114.5, 68], [106, 59], [114, 50]], 4, 'none'],
  [[[125.5, 68], [134, 59], [126, 50]], 4, 'none'],
])
const FTN_ORB = circ(120, 45, 6.5)
const FTN_RAYS = (() => {
  let d = ''
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.2
    const long = i % 2 === 0 ? 46 : 30
    const p = (r: number, da: number) => `${(120 + Math.cos(a + da) * r).toFixed(1)} ${(45 + Math.sin(a + da) * r).toFixed(1)}`
    d += `M${p(9, -0.12)}L${p(long, 0)}L${p(9, 0.12)}Z`
  }
  return d
})()

const fountain: SceneDef = {
  bg: 'sky',
  Scene: ({ grasp }) => (
    <>
      <P d={FTN_ARCADE} fill="url(#lb-stone)" sw={1.6} />
      <path d={FTN_ARCHES} fill="#20232c" stroke={LB_INK} strokeWidth={1.4} />
      <P d={FTN_ARCADE_TOP} fill="#9aa0aa" sw={1.6} />
      <P d={FTN_COURT} fill="#6c6f78" sw={0} />
      <Ln d={FTN_COURT_JOINTS} stroke={MORTAR} sw={1.2} o={0.55} />
      <Ln d="M0 152H240" stroke={LB_INK} sw={1.6} o={0.7} />
      {/* holy light (snuffed out in the Grasp) */}
      {!grasp && (
        <g className="lb-shimmer">
          <circle cx={120} cy={45} r={56} fill="url(#lb-holy-glow)" opacity={0.75} />
          <path d={FTN_RAYS} fill="#fff4c8" opacity={0.5} />
        </g>
      )}
      {/* lower basin */}
      <P d={FTN_BASIN_FRONT} fill="url(#lb-stone)" sw={1.8} />
      <Ln d="M60 150V170M100 154V176M140 154V176M180 150V170" stroke={MORTAR} sw={1.2} o={0.6} />
      <P d={FTN_BASIN_RIM} fill="#a9adb5" sw={1.8} />
      <P d={FTN_BASIN_WATER} fill="url(#lb-tile-water)" sw={1} />
      <Ln d={FTN_RIPPLES} stroke="#e8f6ff" sw={1.4} o={0.8} />
      {/* pedestal, bowl, falling water */}
      <P d={FTN_PEDESTAL} fill="url(#lb-stone)" sw={1.6} />
      <Ln d="M108 124H132M108 136H132" stroke={LB_INK} sw={1.2} o={0.5} />
      <P d={FTN_BOWL} fill="url(#lb-stone)" sw={1.8} />
      <P d={FTN_BOWL_WATER} fill="url(#lb-tile-water)" sw={1} />
      {!grasp && (
        <g className="lb-shimmer">
          <path d={FTN_FALLS} fill="#bfe3ff" opacity={0.9} />
        </g>
      )}
      {/* the guardian statue */}
      <P d={FTN_WINGS} fill="#d6d9de" sw={1.5} />
      <Ln d={FTN_FEATHERS} stroke="#8d929c" sw={1.2} />
      <P d={FTN_ROBE} fill="#c9ccd2" sw={1.6} />
      <Ln d={FTN_ROBE_FOLDS} stroke="#8d929c" sw={1.2} />
      <P d={FTN_ARMS} fill="#c9ccd2" sw={1.3} />
      <P d={FTN_HEAD} fill="#d6d9de" sw={1.4} />
      {grasp ? (
        <>
          <P d={FTN_ORB} fill="#2a2030" stroke={LB_INK} sw={1.4} />
          <Ln d="M117 40L121 45L118 49" stroke="#8d7fa0" sw={1} />
        </>
      ) : (
        <P d={FTN_ORB} fill="#fffbe8" stroke="#c9a64a" sw={1.4} />
      )}
    </>
  ),
}

// ===========================================================================
// The Strategist's Tower — a slender tower with a slate cone and lit windows;
// before it, the war table with a campaign map, arrows and pins.
// ===========================================================================
const TWR_BODY = rect(132, 84, 48, 110)
const TWR_COURSES = (() => {
  let d = ''
  for (let y = 98; y < 192; y += 13) d += `M132 ${y}Q156 ${y + 3} 180 ${y}`
  return d
})()
const TWR_CRENELS = crenels(127, 185, 88, 96, 8, 5, 8)
const TWR_ROOF = 'M122 82L156 30L190 82Z'
const TWR_ROOF_EDGE = ell(156, 82, 34, 4)
const TWR_ROOF_SHADE = 'M156 30L172 82H190Z'
const TWR_FLAGPOLE = 'M156 30V16'
const TWR_FLAG = 'M156 16L172 20L156 25Z'
const TWR_WINDOW_1 = arch(150, 124, 12, 20)
const TWR_WINDOW_2 = arch(150, 162, 12, 20)
const TWR_WALL = crenels(-2, 128, 134, 194, 16, 10, 10)
const TWR_WALL_R = crenels(184, 242, 134, 194, 16, 10, 10)
// The war table and its map.
const TWR_TABLE_TOP = 'M8 146L28 124H124L112 146Z'
const TWR_TABLE_FRONT = rect(8, 146, 104, 8)
const TWR_TABLE_SIDE = 'M112 146L124 124V132L112 154Z'
const TWR_LEGS = rect(12, 154, 6, 28) + rect(102, 154, 6, 28)
const TWR_MAP = 'M20 143L36 127H116L104 143Z'
const TWR_MAP_INK = 'M44 131Q60 136 70 132Q84 128 96 134M30 140Q50 138 62 140'
const TWR_RIVER = 'M56 127Q60 134 54 143'
const TWR_ARROW_RED = brush([[40, 138], [62, 134], [82, 132]], 3.6, 'head', { min: 0.4 }) + 'M80 128L90 131L81 136Z'
const TWR_ARROW_BLUE = brush([[104, 130], [94, 136], [84, 139]], 3, 'head', { min: 0.4 }) + 'M86 135L78 140L87 142Z'
const TWR_KEEP = rect(66, 129, 8, 6)
const PINS: Array<{ x: number; y: number; c: 'red' | 'blue' | 'green' | 'yellow' }> = [
  { x: 46, y: 134, c: 'red' },
  { x: 92, y: 131, c: 'blue' },
  { x: 100, y: 138, c: 'green' },
  { x: 34, y: 140, c: 'yellow' },
]
const TWR_CANDLE = rect(24, 116, 6, 14)
const TWR_DAGGER = 'M108 128L118 136M106 130L110 126'

const tower: SceneDef = {
  bg: 'sky',
  glow: [70, 122, 60],
  Scene: ({ grasp }) => (
    <>
      <P d={TWR_WALL} fill="url(#lb-stone)" sw={1.6} />
      <P d={TWR_WALL_R} fill="url(#lb-stone)" sw={1.6} />
      <Ln d={joints(0, 134, 240, 192, 14, 28, 21)} stroke={MORTAR} sw={1.1} o={0.5} />
      {/* the tower */}
      <P d={TWR_BODY} fill="url(#lb-stone)" sw={1.8} />
      <Ln d={TWR_COURSES} stroke={MORTAR} sw={1.1} o={0.55} />
      <path d="M170 84V192" stroke="#000" strokeOpacity={0.25} strokeWidth={14} />
      <P d={TWR_WINDOW_1} fill={grasp ? '#1b1426' : '#ffcf73'} sw={1.4} />
      <P d={TWR_WINDOW_2} fill={grasp ? '#1b1426' : '#ffcf73'} sw={1.4} />
      <Ln d="M156 106V124M156 144V162" sw={1.6} />
      {!grasp && <circle cx={156} cy={116} r={16} fill="url(#lb-tile-warm)" />}
      <P d={TWR_CRENELS} fill="#9aa0aa" sw={1.5} />
      <P d={TWR_ROOF} fill="#3e4f78" sw={1.8} />
      <path d={TWR_ROOF_SHADE} fill="#1f2944" opacity={0.6} />
      <Ln d="M142 52L170 52M134 66L178 66" stroke="#6f84b8" sw={1.2} o={0.6} />
      <P d={TWR_ROOF_EDGE} fill="#2c3a5c" sw={1.4} />
      <Ln d={TWR_FLAGPOLE} sw={1.6} />
      <g className={grasp ? undefined : 'lb-sway'}>
        <P d={TWR_FLAG} fill={CRIMSON} sw={1.1} />
      </g>
      {/* the war table */}
      <P d={TWR_LEGS} fill="url(#lb-tile-wood)" sw={1.4} />
      <P d={TWR_TABLE_SIDE} fill="#4a2c16" sw={1.4} />
      <P d={TWR_TABLE_FRONT} fill="url(#lb-tile-wood-h)" sw={1.6} />
      <P d={TWR_TABLE_TOP} fill="url(#lb-tile-wood)" sw={1.6} />
      <P d={TWR_MAP} fill={PARCHMENT} sw={1.4} />
      <Ln d={TWR_MAP_INK} stroke="#8a6a40" sw={1.2} />
      <Ln d={TWR_RIVER} stroke="#4a7ab0" sw={2} />
      <P d={TWR_KEEP} fill="#5a5f6b" sw={1} />
      <path d={TWR_ARROW_RED} fill="#b8322a" />
      <path d={TWR_ARROW_BLUE} fill="#2c69b8" />
      {PINS.map((p, i) => (
        <g key={i}>
          <Ln d={`M${p.x} ${p.y}V${p.y - 8}`} sw={1.2} />
          <path d={`M${p.x} ${p.y - 8}L${p.x + 6} ${p.y - 6}L${p.x} ${p.y - 4}Z`} fill={COLOR_HEX[p.c]} stroke={LB_INK} strokeWidth={0.8} />
        </g>
      ))}
      <Ln d={TWR_DAGGER} stroke={LB_INK} sw={3} />
      <Ln d={TWR_DAGGER} stroke="#d5dbe2" sw={1.4} />
      <P d={TWR_CANDLE} fill="#efe6cf" sw={1.2} />
      <Flame x={27} y={116} w={6} h={11} anim={!grasp} glow={1.6} />
    </>
  ),
}

// ===========================================================================
// The Tavern — a roaring hearth with a cauldron and antlers over the mantel,
// kegs on a rack, foaming tankards on the table, a lantern from the beam.
// ===========================================================================
const TVN_BEAM = rect(-2, 10, 244, 10)
const TVN_CHIMNEY = rect(116, 20, 98, 62)
const TVN_CHIMNEY_JOINTS = joints(116, 20, 214, 82, 14, 26, 17)
const TVN_MANTEL = rect(106, 80, 118, 9)
const TVN_HEARTH = rect(112, 89, 106, 76)
const TVN_HEARTH_JOINTS = 'M112 108H124M206 108H218M112 128H124M206 128H218M112 148H124M206 148H218'
const TVN_FIREBOX = arch(124, 162, 82, 66)
const TVN_HEARTHSTONE = rect(104, 162, 122, 10)
const TVN_LOGS = 'M134 158L190 150L192 156L136 164ZM140 150L196 158L194 164L138 156Z'
const TVN_CAULDRON = 'M146 116H184Q186 132 176 138H154Q144 132 146 116Z'
const TVN_CHAIN = 'M165 89V114'
const TVN_ANTLERS = strokes([
  [[[165, 62], [154, 56], [146, 46], [144, 34]], 4, 'tail'],
  [[[165, 62], [176, 56], [184, 46], [186, 34]], 4, 'tail'],
  [[[152, 54], [146, 54], [140, 48]], 3, 'tail'],
  [[[178, 54], [184, 54], [190, 48]], 3, 'tail'],
  [[[148, 44], [142, 40]], 2.6, 'tail'],
  [[[182, 44], [188, 40]], 2.6, 'tail'],
])
const TVN_PLAQUE = 'M156 60H174L170 72H160Z'
const TVN_RACK = rect(8, 112, 92, 6)
const TVN_KEGS = ell(32, 94, 20, 18) + ell(76, 94, 20, 18)
// Keg ends: a hoop ring and the staves.
const TVN_KEG_RINGS = ell(32, 94, 15, 13.5) + ell(76, 94, 15, 13.5)
const TVN_KEG_STAVES = [32, 76].map((x) => `M${x - 8} 82V106M${x} 80.5V107.5M${x + 8} 82V106`).join('')
const TVN_TAPS = rect(29, 102, 6, 8) + rect(73, 102, 6, 8)
const TVN_TABLE = rect(4, 140, 100, 8) + rect(10, 148, 6, 34) + rect(90, 148, 6, 34)
const TVN_MUGS = [22, 48, 76].map((x) => ({ body: rect(x - 8, 120, 16, 20), foam: `M${x - 9} 122Q${x - 10} 114 ${x - 4} 115Q${x - 2} 110 ${x + 3} 113Q${x + 9} 112 ${x + 9} 118Q${x + 11} 122 ${x + 8} 123Z`, handle: `M${x + 8} 124Q${x + 15} 124 ${x + 15} 130Q${x + 15} 136 ${x + 8} 136` }))
const TVN_BREAD = 'M88 140Q88 128 100 128Q110 128 110 140Z'
const TVN_LANTERN = 'M66 36H78L76 50H68Z'

const tavern: SceneDef = {
  bg: 'hall',
  glow: [165, 130, 104],
  Scene: ({ grasp }) => (
    <>
      <P d={TVN_BEAM} fill="url(#lb-tile-wood)" sw={1.6} />
      <Ln d="M72 20V36" sw={1.2} />
      <P d={TVN_LANTERN} fill="url(#lb-iron)" sw={1.2} />
      <Flame x={72} y={48} w={6} h={10} anim={!grasp} glow={2.4} />
      {/* the hearth */}
      <P d={TVN_CHIMNEY} fill="url(#lb-stone)" sw={1.6} />
      <Ln d={TVN_CHIMNEY_JOINTS} stroke={MORTAR} sw={1.1} o={0.55} />
      <P d={TVN_HEARTH} fill="url(#lb-stone)" sw={1.6} />
      <Ln d={TVN_HEARTH_JOINTS} stroke={MORTAR} sw={1.1} o={0.6} />
      <P d={TVN_FIREBOX} fill="#160c07" sw={1.8} />
      <circle cx={165} cy={146} r={34} fill="url(#lb-tile-warm)" />
      <P d={TVN_LOGS} fill="#5a3a22" sw={1.3} />
      <g className={grasp ? undefined : 'lb-flicker'}>
        <Flame x={150} y={156} w={14} h={26} glow={0} />
        <Flame x={168} y={155} w={18} h={34} glow={0} />
        <Flame x={184} y={156} w={12} h={22} glow={0} />
      </g>
      <Ln d={TVN_CHAIN} stroke="#2a2b31" sw={2} />
      <P d={TVN_CAULDRON} fill="#24252b" sw={1.6} />
      <Ln d="M147 120H183" stroke="#5a5f6b" sw={2} />
      <P d={TVN_HEARTHSTONE} fill="#8d929c" sw={1.6} />
      <P d={TVN_MANTEL} fill="url(#lb-tile-wood-h)" sw={1.6} />
      <path d={TVN_ANTLERS} fill="#e9dcc0" stroke={LB_INK} strokeWidth={1} />
      <P d={TVN_PLAQUE} fill="url(#lb-tile-wood)" sw={1.2} />
      {/* kegs on their rack */}
      <P d={TVN_KEGS} fill="url(#lb-tile-wood)" sw={1.6} />
      <Ln d={TVN_KEG_STAVES} stroke="#3d2615" sw={1.2} o={0.8} />
      <path d={TVN_KEG_RINGS} fill="none" stroke="#3a3d44" strokeWidth={2.6} />
      <P d={TVN_TAPS} fill="url(#lb-gold)" sw={1} />
      <P d={TVN_RACK} fill="url(#lb-tile-wood-h)" sw={1.4} />
      {/* the table and its tankards */}
      <P d={TVN_TABLE} fill="url(#lb-tile-wood-h)" sw={1.6} />
      {TVN_MUGS.map((m, i) => (
        <g key={i}>
          <Ln d={m.handle} sw={3.6} />
          <Ln d={m.handle} stroke="#9a6a3e" sw={1.8} />
          <P d={m.body} fill="url(#lb-tile-wood-h)" sw={1.4} />
          <Ln d={`M${22 + [0, 26, 54][i] - 8} 126H${22 + [0, 26, 54][i] + 8}M${22 + [0, 26, 54][i] - 8} 134H${22 + [0, 26, 54][i] + 8}`} stroke="#3a3d44" sw={1.8} />
          <P d={m.foam} fill="#fbf6e8" sw={1.2} />
        </g>
      ))}
      <P d={TVN_BREAD} fill="#c88a4a" sw={1.4} />
      <Ln d="M94 132L98 136M100 130L104 134" stroke="#7a4c2a" sw={1.4} />
    </>
  ),
}

export const SCENES_3 = { nightWatchman: fountain, pavilion: tower, teaHouse: tavern }
