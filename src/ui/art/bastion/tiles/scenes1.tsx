// Bastion tiles: the Standard, the Dwarven Quarry, the Dispensary.
import { COLOR_DARK, COLOR_HEX } from '../../palette'
import { CRIMSON, CRIMSON_DARK, LB_INK, MORTAR, PARCHMENT, STONE_DARK } from '../palette'
import { arch, circ, crenels, ell, Flame, joints, pointedArch, rect, type SceneDef } from './kit'
import { Ln, P } from './paint'

const TAO = ['red', 'blue', 'green', 'yellow', 'black'] as const

// ===========================================================================
// The Standard — a great crimson war banner over the battlements, a brazier
// on the wall, a rack of pennants in the five colours.
// ===========================================================================
const STD_WALL = crenels(-2, 242, 136, 194, 24, 15, 16)
const STD_WALL_JOINTS = joints(0, 136, 240, 192, 14, 30, 3)
const STD_MERLON_TOPS = (() => {
  let d = ''
  for (let x = -2; x < 240; x += 39) d += `M${x + 1} 121.5H${x + 23}`
  return d
})()
const STD_POLE = rect(69, 40, 6, 100)
const STD_FINIAL = 'M72 24L77.5 37H66.5Z'
const STD_FLAG = 'M75 46C104 37 134 57 188 48L170 79L190 112C136 120 106 102 75 110Z'
// In the Grasp the banner hangs torn.
const STD_FLAG_TORN = 'M75 46C104 37 134 57 160 52L150 62L164 70L146 80L158 92L140 100L150 108C126 112 104 102 75 110Z'
const STD_FOLDS = 'M104 44C109 68 107 92 104 107L120 107C122 88 124 66 120 47ZM150 50C155 72 153 94 151 114L163 115C165 94 166 72 164 50Z'
const STD_TOWER = 'M112 96V73H108.5V63.5H114V67H120V63.5H128V67H134V63.5H139.5V73H136V96Z'
const STD_DOOR = arch(120, 96, 8, 11)
const STD_BRAZIER = 'M8 114H36L31 123H13Z'
// Pennants on short spears behind the parapet, one per colour.
const PENNANTS = TAO.map((c, i) => {
  const x = 186 + i * 10
  return { c, pole: rect(x - 1, 94 + (i % 2) * 6, 2, 44), flag: `M${x + 1} ${96 + (i % 2) * 6}L${x + 13} ${101 + (i % 2) * 6}L${x + 1} ${106 + (i % 2) * 6}Z`, tip: `M${x} ${88 + (i % 2) * 6}L${x + 2.6} ${95 + (i % 2) * 6}H${x - 2.6}Z` }
})

const standard: SceneDef = {
  bg: 'sky',
  glow: [26, 104, 70],
  Scene: ({ grasp }) => (
    <>
      {/* pennant rack behind the wall */}
      {PENNANTS.map((p) => (
        <g key={p.c}>
          <P d={p.pole} fill="#5a3a22" sw={0.8} />
          <P d={p.tip} fill="url(#lb-steel)" sw={0.8} />
          <P d={p.flag} fill={COLOR_HEX[p.c]} stroke={p.c === 'black' ? '#000' : COLOR_DARK[p.c]} sw={1} />
        </g>
      ))}
      {/* the great banner */}
      <P d={STD_POLE} fill="url(#lb-tile-wood-h)" />
      <Ln d="M69 52H75M69 104H75" stroke="#e2b65a" sw={2} />
      <P d={STD_FINIAL} fill="url(#lb-gold)" sw={1.3} />
      <circle cx={72} cy={40} r={4.2} fill="url(#lb-gold)" stroke={LB_INK} strokeWidth={1.3} />
      <g className={grasp ? undefined : 'lb-sway'}>
        <path d={grasp ? STD_FLAG_TORN : STD_FLAG} fill={CRIMSON} />
        <path d={STD_FOLDS} fill={CRIMSON_DARK} opacity={0.5} />
        <path d="M80 50C104 43 132 60 176 53" fill="none" stroke="#e8505a" strokeWidth={2.4} opacity={0.6} />
        <P d={STD_TOWER} fill="url(#lb-gold)" sw={1.2} />
        <path d={STD_DOOR} fill={CRIMSON_DARK} />
        <path d={grasp ? STD_FLAG_TORN : STD_FLAG} fill="none" stroke={LB_INK} strokeWidth={3.6} strokeLinejoin="round" />
        <path d={grasp ? STD_FLAG_TORN : STD_FLAG} fill="none" stroke="#e2b65a" strokeWidth={1.5} strokeLinejoin="round" />
      </g>
      {/* the battlements */}
      <P d={STD_WALL} fill="url(#lb-stone)" sw={2} />
      <Ln d={STD_WALL_JOINTS} stroke={MORTAR} sw={1.2} o={0.6} />
      <Ln d={STD_MERLON_TOPS} stroke="#fff" sw={1.4} o={0.3} />
      <Ln d="M0 137H240" stroke={LB_INK} sw={1.4} o={0.5} />
      {/* brazier on the first merlon */}
      <Flame x={22} y={115} w={15} h={24} anim={!grasp} />
      <P d={STD_BRAZIER} fill="url(#lb-iron)" sw={1.5} />
      <Ln d="M15 123L17 120M29 123L27 120" sw={1.4} />
    </>
  ),
}

// ===========================================================================
// The Dwarven Quarry — a rune-carved gate into the mountain, a lantern in its
// mouth, rails running out to a cart heavy with cut stone, a pick in a block.
// ===========================================================================
const QRY_CLIFF = 'M48 194L56 140L70 118L80 96L98 76L124 62L152 54L186 50L214 56L244 60V194Z'
const QRY_LEDGES = 'M64 128L102 122L138 126M84 98L122 90L170 94L212 88L244 92M118 70L154 64L190 66'
const QRY_CRACKS = 'M210 100L216 118L210 130M226 130L232 150M90 140L86 158'
const QRY_PILLARS = rect(104, 86, 16, 92) + rect(186, 86, 16, 92)
const QRY_LINTEL = 'M98 72H208V90H98Z'
const QRY_STEP = rect(100, 176, 106, 8)
const QRY_DOOR = rect(120, 90, 66, 88)
const QRY_RUNES = 'M112 76V86M112 80L116 76M124 76L128 86L132 76M140 76V86H146M154 76L158 81L154 86M162 76H168M165 76V86M178 76L182 86M182 76L178 86M192 76V86L196 82'
const QRY_TIMBER = rect(124, 92, 6, 86) + rect(176, 92, 6, 86) + rect(124, 92, 58, 6)
// Rails from the gate to the bottom-left corner.
const QRY_RAILS = 'M136 180L60 194M168 180L118 194'
const QRY_SLEEPERS = 'M126 182L150 182M108 185L136 186M88 189L120 190'
const QRY_CART = 'M30 132H106L98 168H38Z'
const QRY_CART_BANDS = 'M33 144H103M36 157H100'
const QRY_BLOCKS = rect(38, 112, 22, 20) + rect(58, 116, 22, 16) + rect(78, 110, 22, 22) + rect(50, 98, 20, 16)
const QRY_WHEELS = circ(48, 170, 8) + circ(88, 170, 8)
const QRY_BLOCK_R = rect(198, 142, 38, 34)
const QRY_PICK_HAFT = 'M206 108L222 146L226 144L210 106Z'
const QRY_PICK_HEAD = 'M190 116Q206 100 226 102Q212 106 210 112Q200 112 190 116Z'
const QRY_CRANE = rect(24, 58, 6, 136) + 'M27 62L76 48L78 53L29 68Z'
const QRY_ROPE = 'M72 52V86'
const QRY_HUNG_BLOCK = rect(62, 86, 20, 16)

const quarry: SceneDef = {
  bg: 'sky',
  glow: [153, 120, 66],
  Scene: ({ grasp }) => (
    <>
      {/* wooden crane lifting a block (left) */}
      <P d={QRY_CRANE} fill="url(#lb-tile-wood-h)" sw={1.4} />
      <Ln d={QRY_ROPE} stroke="#d8c08a" sw={1.4} />
      <P d={QRY_HUNG_BLOCK} fill="#9aa0aa" sw={1.4} />
      {/* the mountain */}
      <P d={QRY_CLIFF} fill="url(#lb-stone)" sw={2} />
      <Ln d={QRY_LEDGES} stroke="#c3c7cf" sw={1.6} o={0.55} />
      <Ln d={QRY_CRACKS} stroke={LB_INK} sw={1.3} o={0.5} />
      {/* the gate */}
      <P d={QRY_DOOR} fill="#120d0a" sw={0} />
      <circle cx={153} cy={126} r={30} fill="url(#lb-tile-warm)" />
      <P d={QRY_TIMBER} fill="url(#lb-tile-wood-h)" sw={1.2} />
      <P d={QRY_PILLARS} fill="url(#lb-stone)" sw={1.8} />
      <Ln d="M104 112H120M104 140H120M186 118H202M186 150H202" stroke={MORTAR} sw={1.2} o={0.7} />
      <P d={QRY_STEP} fill="#8d929c" sw={1.6} />
      <P d={QRY_LINTEL} fill="url(#lb-stone)" sw={2} />
      <Ln d={QRY_RUNES} stroke="#e2b65a" sw={2} />
      {/* lantern hanging in the mouth */}
      <Ln d="M153 98V104" sw={1.2} />
      <P d="M147 104H159L157 118H149Z" fill="url(#lb-iron)" sw={1.2} />
      <Flame x={153} y={116} w={6} h={10} anim={!grasp} glow={2.2} />
      {/* rails and the cart */}
      <Ln d={QRY_SLEEPERS} stroke="#5a3a22" sw={3} />
      <Ln d={QRY_RAILS} stroke="#9aa0aa" sw={2.2} />
      <P d={QRY_BLOCKS} fill="#a4a9b2" sw={1.4} />
      <Ln d="M38 118H60M78 117H100" stroke="#fff" sw={1} o={0.35} />
      <P d={QRY_CART} fill="url(#lb-tile-wood)" sw={1.8} />
      <Ln d={QRY_CART_BANDS} stroke={STONE_DARK} sw={3} />
      <P d={QRY_WHEELS} fill="url(#lb-iron)" sw={1.6} />
      <circle cx={48} cy={170} r={2.2} fill={LB_INK} />
      <circle cx={88} cy={170} r={2.2} fill={LB_INK} />
      {/* a cut block with a pick in it */}
      <P d={QRY_BLOCK_R} fill="#959aa4" sw={1.6} />
      <Ln d="M198 152H236" stroke="#fff" sw={1} o={0.3} />
      <P d={QRY_PICK_HAFT} fill="url(#lb-tile-wood-h)" sw={1.2} />
      <P d={QRY_PICK_HEAD} fill="url(#lb-steel)" sw={1.4} />
    </>
  ),
}

// ===========================================================================
// The Dispensary — a stone infirmary: a tall arched window, an apothecary
// cabinet of glowing potions, a cot with a crimson blanket, bandages.
// ===========================================================================
const DSP_WIN_FRAME = pointedArch(28, 122, 62, 100)
const DSP_WIN_GLASS = pointedArch(35, 116, 48, 88)
const DSP_LEADING = 'M59 30V116M35 72H83M35 96H83'
const DSP_LIGHT = 'M35 116L83 116L120 150L44 150Z'
const DSP_CABINET = rect(144, 26, 86, 128)
const DSP_CAB_BACK = rect(151, 33, 72, 116)
const DSP_SHELVES = rect(148, 62, 78, 5) + rect(148, 96, 78, 5) + rect(148, 130, 78, 5)
const DSP_CROWN = 'M140 26H234V20H140Z'
type Bottle = { x: number; y: number; kind: 'flask' | 'tall' | 'vial'; fill: string }
const BOTTLES: Bottle[] = [
  { x: 160, y: 62, kind: 'flask', fill: '#c2303a' },
  { x: 178, y: 62, kind: 'tall', fill: '#3e6fc4' },
  { x: 192, y: 62, kind: 'vial', fill: '#e2b65a' },
  { x: 208, y: 62, kind: 'flask', fill: '#7b48b8' },
  { x: 162, y: 96, kind: 'tall', fill: '#d49b2e' },
  { x: 188, y: 96, kind: 'flask', fill: 'url(#lb-tile-glass-green)' },
  { x: 212, y: 96, kind: 'vial', fill: '#c2303a' },
  { x: 160, y: 130, kind: 'vial', fill: '#3fa66a' },
  { x: 174, y: 130, kind: 'flask', fill: '#c2303a' },
  { x: 196, y: 130, kind: 'tall', fill: '#5a4a8a' },
  { x: 212, y: 130, kind: 'vial', fill: '#3e6fc4' },
]
function bottlePath(b: Bottle): string {
  const { x, y } = b
  switch (b.kind) {
    case 'flask':
      return `${circ(x, y - 9, 8.5)}${rect(x - 2.5, y - 25, 5, 9)}`
    case 'tall':
      return `M${x - 5} ${y}V${y - 18}Q${x - 5} ${y - 22} ${x - 2} ${y - 23}V${y - 28}H${x + 2}V${y - 23}Q${x + 5} ${y - 22} ${x + 5} ${y - 18}V${y}Z`
    case 'vial':
      return `M${x - 3.5} ${y}V${y - 13}H${x - 2}V${y - 17}H${x + 2}V${y - 13}H${x + 3.5}V${y}Z`
  }
}
const DSP_COT = rect(10, 150, 118, 10)
const DSP_COT_LEGS = rect(14, 160, 5, 18) + rect(119, 160, 5, 18)
const DSP_MATTRESS = 'M12 150Q12 140 22 140H124Q128 140 128 150Z'
const DSP_PILLOW = ell(28, 138, 15, 7)
const DSP_BLANKET = 'M50 139H126Q132 140 130 152L128 166Q100 170 76 166L52 162Q46 150 50 139Z'
const DSP_BLANKET_FOLDS = 'M70 141L66 164M98 141L100 168M116 141L120 166'
const DSP_TABLE = rect(146, 154, 70, 6) + rect(150, 160, 5, 18) + rect(207, 160, 5, 18)
// A stack of folded linen bandages.
const DSP_LINEN = 'M152 154V148Q152 146 154 146H180Q182 146 182 148V154ZM154 146V141Q154 139 156 139H178Q180 139 180 141V146ZM156 139V134Q156 132 158 132H176Q178 132 178 134V139Z'
const DSP_MORTAR = 'M190 140H214L210 154H194Z'

const dispensary: SceneDef = {
  bg: 'hall',
  glow: [190, 92, 86],
  Scene: () => (
    <>
      {/* the window and its cold light */}
      <path d={DSP_LIGHT} fill="#dfe8ff" opacity={0.08} />
      <P d={DSP_WIN_FRAME} fill="url(#lb-stone)" sw={1.8} />
      <P d={DSP_WIN_GLASS} fill="#1d2a4d" sw={1.4} />
      <circle cx={70} cy={50} r={8} fill="#f3ecd2" opacity={0.85} />
      <circle cx={74} cy={47} r={7} fill="#1d2a4d" opacity={0.9} />
      <Ln d={DSP_LEADING} stroke={LB_INK} sw={2} />
      {/* the apothecary cabinet */}
      <P d={DSP_CROWN} fill="url(#lb-tile-wood)" sw={1.6} />
      <P d={DSP_CABINET} fill="url(#lb-tile-wood)" sw={1.8} />
      <P d={DSP_CAB_BACK} fill="#2a1a10" sw={1} />
      <circle cx={188} cy={84} r={30} fill="url(#lb-tile-warm)" />
      {BOTTLES.map((b, i) => (
        <g key={i}>
          <P d={bottlePath(b)} fill={b.fill} sw={1.2} />
          <path d={`M${b.x - 2.5} ${b.y - (b.kind === 'flask' ? 13 : 14)}v6`} stroke="#fff" strokeOpacity={0.55} strokeWidth={1.4} strokeLinecap="round" />
        </g>
      ))}
      <circle cx={188} cy={87} r={14} fill="url(#lb-holy-glow)" opacity={0.6} />
      <P d={DSP_SHELVES} fill="url(#lb-tile-wood-h)" sw={1.2} />
      {/* the cot */}
      <P d={DSP_COT_LEGS} fill="url(#lb-tile-wood)" sw={1.2} />
      <P d={DSP_COT} fill="url(#lb-tile-wood-h)" sw={1.6} />
      <P d={DSP_MATTRESS} fill={PARCHMENT} sw={1.6} />
      <P d={DSP_PILLOW} fill="#f6f1e6" sw={1.4} />
      <P d={DSP_BLANKET} fill={CRIMSON} sw={1.6} />
      <Ln d={DSP_BLANKET_FOLDS} stroke={CRIMSON_DARK} sw={2} o={0.7} />
      <Ln d="M54 146H124" stroke="#e2b65a" sw={1.6} o={0.8} />
      {/* a table with bandages and a mortar */}
      <P d={DSP_TABLE} fill="url(#lb-tile-wood-h)" sw={1.4} />
      <P d={DSP_LINEN} fill="#f4efe2" sw={1.2} />
      <Ln d="M154 151H180M156 143.5H178M158 136.5H176" stroke="#c9bfa8" sw={1} />
      <P d={DSP_MORTAR} fill="#a4a9b2" sw={1.4} />
      <P d="M205 142L218 124L221 126L209 144Z" fill="#8a8f99" sw={1.2} />
    </>
  ),
}

export const SCENES_1 = { circleOfPrayer: standard, buddhistTemple: quarry, cemetery: dispensary }
