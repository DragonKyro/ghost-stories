// Bastion tiles: the Trebuchet, the Market, the Tomb of the Ancient Kings.
import { brush } from '../../brush'
import { COLOR_DARK, COLOR_HEX } from '../../palette'
import { CRIMSON, CRIMSON_DARK, LB_INK, MORTAR, PARCHMENT } from '../palette'
import { circ, crenels, ell, Flame, joints, pointedArch, rect, type SceneDef } from './kit'
import { Ln, P } from './paint'

// ===========================================================================
// The Trebuchet — a great siege engine on the wall-walk, its arm raised
// against the dusk with a weighted net in the sling, a net flying out.
// ===========================================================================
const TRB_PARAPET = crenels(-2, 242, 118, 140, 20, 13, 12)
const TRB_WALK = rect(0, 140, 240, 52)
const TRB_FLAGS = 'M0 156H240M0 174H240M36 140L30 156M92 140L90 156M150 140L152 156M206 140L212 156M14 156L8 174M66 156L62 174M122 156L122 174M178 156L182 174M230 156L236 174M44 174L40 192M100 174L98 192M158 174L160 192M214 174L218 192'
const TRB_BASE = rect(48, 160, 104, 10)
const TRB_LEGS = 'M58 162L96 88H104L70 162Z' + 'M142 162L104 88H96L130 162Z'
const TRB_BRACE = rect(66, 128, 68, 6)
const TRB_WHEELS = circ(62, 170, 11) + circ(138, 170, 11)
const TRB_ARM = 'M66 118L184 40L188 46L72 124Z'
const TRB_PIVOT = circ(100, 92, 6)
const TRB_WEIGHT = 'M50 124H86L82 154H54Z'
const TRB_WEIGHT_BANDS = 'M51 134H85M52 144H84'
const TRB_SLING = 'M186 43Q194 58 198 70M186 43Q204 52 210 62'
const TRB_BUNDLE = circ(204, 74, 10)
const TRB_BUNDLE_NET = 'M196 68Q204 74 212 68M195 76Q204 82 213 76M200 65Q198 74 201 83M207 65Q209 74 206 83'
// A net already flying out over the wall (active side only).
const TRB_FLY_NET = 'M188 22Q206 14 226 24L230 48Q210 42 192 48Z'
const TRB_FLY_LINES = 'M193 30Q209 24 227 32M192 39Q210 33 229 40M198 20Q200 34 197 47M207 17Q209 32 206 45M216 19Q218 33 215 45'
const TRB_BALLS = circ(196, 170, 9) + circ(214, 172, 9) + circ(205, 158, 9)

const trebuchet: SceneDef = {
  bg: 'sky',
  Scene: ({ grasp }) => (
    <>
      <P d={TRB_PARAPET} fill="url(#lb-stone)" sw={1.8} />
      <Ln d={joints(0, 118, 240, 140, 11, 26, 9)} stroke={MORTAR} sw={1} o={0.5} />
      <P d={TRB_WALK} fill="#6c6f78" sw={0} />
      <Ln d={TRB_FLAGS} stroke={MORTAR} sw={1.2} o={0.55} />
      <Ln d="M0 140H240" stroke={LB_INK} sw={1.6} o={0.7} />
      {!grasp && (
        <g>
          <P d={TRB_FLY_NET} fill="#b08a55" o={0.35} sw={0} />
          <Ln d={TRB_FLY_LINES} stroke="#3a2412" sw={1.6} />
          <Ln d={TRB_FLY_NET} stroke="#3a2412" sw={1.8} />
        </g>
      )}
      {/* counterweight and arm */}
      <Ln d="M72 122L68 124" sw={2} />
      <P d={TRB_WEIGHT} fill="url(#lb-tile-wood)" sw={1.6} />
      <Ln d={TRB_WEIGHT_BANDS} stroke="#3a3d44" sw={2.6} />
      <P d={TRB_ARM} fill="url(#lb-tile-wood-h)" sw={1.6} />
      <Ln d="M120 86L124 92M150 66L154 72" stroke="#3a3d44" sw={2.6} />
      <Ln d={TRB_SLING} stroke="#d8c08a" sw={1.5} />
      <P d={TRB_BUNDLE} fill="#a88252" sw={1.6} />
      <Ln d={TRB_BUNDLE_NET} stroke="#3a2412" sw={1.3} />
      {/* the frame */}
      <P d={TRB_LEGS} fill="url(#lb-tile-wood)" sw={1.6} />
      <P d={TRB_BRACE} fill="url(#lb-tile-wood-h)" sw={1.4} />
      <P d={TRB_BASE} fill="url(#lb-tile-wood-h)" sw={1.6} />
      <P d={TRB_PIVOT} fill="url(#lb-iron)" sw={1.4} />
      <P d={TRB_WHEELS} fill="url(#lb-tile-wood)" sw={1.6} />
      <Ln d="M51 170H73M62 159V181M127 170H149M138 159V181" stroke="#3d2615" sw={2} />
      <circle cx={62} cy={170} r={3} fill="url(#lb-iron)" stroke={LB_INK} strokeWidth={1} />
      <circle cx={138} cy={170} r={3} fill="url(#lb-iron)" stroke={LB_INK} strokeWidth={1} />
      {/* a pile of stone shot */}
      <P d={TRB_BALLS} fill="#9aa0aa" sw={1.4} />
      <Ln d="M190 165Q192 161 196 161M208 167Q210 163 214 163M199 153Q201 149 205 149" stroke="#fff" sw={1.2} o={0.45} />
    </>
  ),
}

// ===========================================================================
// The Market — a striped stall under the keep wall: arms and armour hung
// up, painted shields in every colour, a lantern on the pole, crates.
// ===========================================================================
const MKT_KEEP = rect(0, 46, 240, 146)
const MKT_KEEP_JOINTS = joints(0, 46, 240, 192, 16, 30, 12)
const MKT_KEEP_TOP = crenels(-2, 242, 46, 52, 18, 12, 9)
const MKT_BACK = rect(46, 92, 148, 52)
const MKT_POLES = rect(42, 84, 6, 92) + rect(192, 84, 6, 92)
// The awning: scalloped edge, alternating stripes.
const MKT_AWNING = 'M30 72L60 56H180L210 72V90H30Z'
const MKT_STRIPES = (() => {
  let d = ''
  for (let i = 0; i < 6; i++) {
    const x0 = 30 + i * 30
    d += `M${60 + i * 20} 56L${x0} 72V90H${x0 + 15}V72L${60 + i * 20 + 10} 56Z`
  }
  return d
})()
const MKT_SCALLOPS = (() => {
  let d = 'M30 90'
  for (let i = 0; i < 12; i++) d += `Q${37.5 + i * 15} 102 ${45 + i * 15} 90`
  return d + 'Z'
})()
const MKT_COUNTER = rect(36, 144, 168, 8) + rect(40, 152, 160, 24)
const MKT_COUNTER_PLANKS = 'M40 160H200M40 168H200M80 152V176M124 152V176M164 152V176'
const MKT_SWORDS = 'M66 96L66 132M84 94L84 132'
const MKT_GUARDS = 'M60 126H72M78 126H90'
const SHIELDS: Array<{ c: 'red' | 'blue' | 'green' | 'yellow'; x: number; y: number; r: number }> = [
  { c: 'blue', x: 112, y: 112, r: 13 },
  { c: 'green', x: 142, y: 110, r: 12 },
  { c: 'yellow', x: 170, y: 114, r: 11 },
  { c: 'red', x: 128, y: 136, r: 10 },
]
const MKT_HELM = 'M150 144Q150 128 162 128Q174 128 174 144Z'
const MKT_DICE = rect(84, 136, 9, 9) + rect(96, 138, 9, 9)
const MKT_CRATES = rect(4, 150, 34, 30) + rect(12, 128, 24, 22)
const MKT_CRATE_LINES = 'M4 150L38 180M38 150L4 180M12 128L36 150M36 128L12 150'
const MKT_BARREL = 'M206 136Q202 158 206 180H232Q236 158 232 136Z'

const market: SceneDef = {
  bg: 'sky',
  glow: [48, 92, 50],
  Scene: ({ grasp }) => (
    <>
      <P d={MKT_KEEP} fill="url(#lb-tile-wall-warm)" sw={0} />
      <Ln d={MKT_KEEP_JOINTS} stroke={MORTAR} sw={1.2} o={0.45} />
      <P d={MKT_KEEP_TOP} fill="url(#lb-stone)" sw={1.6} />
      <P d={MKT_BACK} fill="#3a2a1e" sw={1.4} />
      {/* goods hung on the stall's back */}
      <Ln d={MKT_SWORDS} stroke={LB_INK} sw={4.4} />
      <Ln d={MKT_SWORDS} stroke="#d5dbe2" sw={2.4} />
      <Ln d={MKT_GUARDS} stroke="#e2b65a" sw={3} />
      <Ln d="M66 126V136M84 126V136" stroke="#5a3a22" sw={3} />
      {SHIELDS.map((s) => (
        <g key={s.c}>
          <P d={circ(s.x, s.y, s.r)} fill={`url(#lb-enamel-${s.c})`} stroke={LB_INK} sw={1.6} />
          <circle cx={s.x} cy={s.y} r={s.r - 3} fill="none" stroke={COLOR_DARK[s.c]} strokeWidth={1.6} />
          <circle cx={s.x} cy={s.y} r={2.6} fill="url(#lb-gold)" stroke={LB_INK} strokeWidth={0.8} />
        </g>
      ))}
      <P d={MKT_HELM} fill="url(#lb-steel)" sw={1.4} />
      <Ln d="M162 128V144M154 138H170" sw={1.4} />
      {/* the counter */}
      <P d={MKT_COUNTER} fill="url(#lb-tile-wood)" sw={1.6} />
      <Ln d={MKT_COUNTER_PLANKS} stroke="#3d2615" sw={1.2} o={0.7} />
      <P d={MKT_DICE} fill="url(#lb-bone)" sw={1.2} />
      <circle cx={88.5} cy={140.5} r={2} fill={COLOR_HEX.red} />
      <circle cx={100.5} cy={142.5} r={2} fill={COLOR_HEX.blue} />
      <P d={rect(98, 128, 30, 8)} fill="#7a5a3a" sw={1.2} />
      <P d={ell(112, 128, 13, 3)} fill="#e2b65a" sw={1} />
      {/* awning on its poles */}
      <P d={MKT_POLES} fill="url(#lb-tile-wood-h)" sw={1.4} />
      <P d={MKT_AWNING} fill={PARCHMENT} sw={1.8} />
      <path d={MKT_STRIPES} fill={CRIMSON} />
      <P d={MKT_SCALLOPS} fill={PARCHMENT} sw={1.6} />
      <Ln d="M30 90H210" stroke={CRIMSON_DARK} sw={2} />
      <P d={MKT_AWNING} fill="none" sw={1.8} />
      {/* lantern hung from the left pole */}
      <Ln d="M45 84V96" sw={1.2} />
      <P d="M39 96H51L49 110H41Z" fill="url(#lb-iron)" sw={1.2} />
      <Flame x={45} y={108} w={6} h={10} anim={!grasp} glow={2} />
      {/* crates and a barrel */}
      <P d={MKT_CRATES} fill="url(#lb-tile-wood)" sw={1.6} />
      <Ln d={MKT_CRATE_LINES} stroke="#3d2615" sw={1.4} o={0.8} />
      <P d={MKT_BARREL} fill="url(#lb-tile-wood-h)" sw={1.6} />
      <Ln d="M204 146H234M203 170H235" stroke="#3a3d44" sw={2.6} />
    </>
  ),
}

// ===========================================================================
// The Tomb of the Ancient Kings — a vaulted crypt: a crowned stone effigy on
// its sarcophagus, gold runes along the side, candles on iron stands, the
// kings' crest in the niche behind.
// ===========================================================================
const TMB_VAULT = 'M0 0H240V62Q200 18 120 16Q40 18 0 62Z'
const TMB_RIBS = 'M0 62Q40 18 120 16Q200 18 240 62M120 16V0'
const TMB_PILLARS = rect(10, 40, 26, 152) + rect(204, 40, 26, 152)
const TMB_CAPITALS = rect(6, 36, 34, 8) + rect(200, 36, 34, 8)
const TMB_NICHE = pointedArch(78, 98, 84, 70)
const TMB_CREST = 'M100 44H140V64Q140 80 120 88Q100 80 100 64Z'
const TMB_CROWN = 'M106 46L104 34L112 40L120 30L128 40L136 34L134 46Z'
const TMB_LID = 'M38 104L52 92H200L190 104Z'
const TMB_FRONT = rect(38, 104, 152, 44)
const TMB_SIDE = 'M190 104L200 92V136L190 148Z'
const TMB_PANELS = rect(46, 112, 40, 28) + rect(94, 112, 40, 28) + rect(142, 112, 40, 28)
const TMB_RUNES =
  'M56 118V134M56 124L62 118M66 118L70 134L74 118M104 118V134H110M114 118L118 126L114 134M124 118H130M127 118V134M152 118L158 134M158 118L152 134M164 118V134L170 128M174 118V134'
// The effigy on the lid: head (left) with crown, body, hands on a sword.
const TMB_EFFIGY = brush([[62, 95], [80, 93], [120, 93], [160, 94], [184, 95]], 14, 'none')
const TMB_HEAD = ell(62, 92, 8, 7)
const TMB_EFF_CROWN = 'M53 86L55 78L59 82L62 76L65 82L69 78L71 86Z'
const TMB_SWORD = 'M84 92H172M88 88V96'
const TMB_FEET = ell(186, 90, 4, 6)
const TMB_STANDS = rect(26, 104, 4, 50) + rect(210, 104, 4, 50) + 'M20 154L28 146L36 154ZM204 154L212 146L220 154Z'
const TMB_CANDLES = rect(23, 90, 10, 15) + rect(207, 90, 10, 15)

const tomb: SceneDef = {
  bg: 'hall',
  glow: [120, 72, 96],
  Scene: ({ grasp }) => (
    <>
      <P d={TMB_VAULT} fill="#22252e" sw={0} />
      <Ln d={TMB_RIBS} stroke="#5a5f6b" sw={3} />
      {/* the niche and the crest of the kings */}
      <P d={TMB_NICHE} fill="#1b1d24" sw={1.8} />
      <g className={grasp ? undefined : 'lb-shimmer'}>
        <ellipse cx={120} cy={60} rx={34} ry={30} fill="url(#lb-holy-glow)" opacity={0.45} />
      </g>
      <P d={TMB_CREST} fill="url(#lb-tile-plinth)" sw={1.8} />
      {/* a sword, point down, on the crest */}
      <path d="M120 54V82" stroke={LB_INK} strokeWidth={4.6} strokeLinecap="round" />
      <path d="M120 54V82" stroke="#e3e7ec" strokeWidth={2.4} strokeLinecap="round" />
      <path d="M110 56H130" stroke={LB_INK} strokeWidth={4.4} strokeLinecap="round" />
      <path d="M110 56H130" stroke="#e2b65a" strokeWidth={2.4} strokeLinecap="round" />
      <path d="M120 48V54" stroke="#5a3a22" strokeWidth={3} />
      <P d={TMB_CROWN} fill="url(#lb-gold)" sw={1.4} />
      {/* pillars */}
      <P d={TMB_PILLARS} fill="url(#lb-stone)" sw={1.8} />
      <Ln d="M10 80H36M10 120H36M204 80H230M204 120H230" stroke={MORTAR} sw={1.2} o={0.6} />
      <P d={TMB_CAPITALS} fill="#8d929c" sw={1.6} />
      {/* candles */}
      <P d={TMB_STANDS} fill="url(#lb-iron)" sw={1.3} />
      <P d={TMB_CANDLES} fill="#efe6cf" sw={1.2} />
      <Flame x={28} y={90} w={7} h={14} anim={!grasp} glow={1.6} />
      <Flame x={212} y={90} w={7} h={14} anim={!grasp} glow={1.6} />
      {/* the sarcophagus */}
      <P d={TMB_SIDE} fill="#5a5f6b" sw={1.6} />
      <P d={TMB_FRONT} fill="url(#lb-stone)" sw={1.8} />
      <Ln d={TMB_PANELS} stroke={LB_INK} sw={1.2} o={0.5} />
      <Ln d={TMB_RUNES} stroke="#e2b65a" sw={2} />
      <P d={TMB_LID} fill="#9aa0aa" sw={1.8} />
      <P d={TMB_EFFIGY} fill="#c3c7cf" sw={1.4} />
      <P d={TMB_FEET} fill="#c3c7cf" sw={1.2} />
      <P d={TMB_HEAD} fill="#c3c7cf" sw={1.4} />
      <P d={TMB_EFF_CROWN} fill="url(#lb-gold)" sw={1.1} />
      <Ln d={TMB_SWORD} stroke={LB_INK} sw={3.4} />
      <Ln d={TMB_SWORD} stroke="#e3e7ec" sw={1.6} />
      <Ln d="M84 92H90" stroke="#e2b65a" sw={2.6} />
    </>
  ),
}

export const SCENES_2 = { taoistAltar: trebuchet, herbalistShop: market, sorcerersHut: tomb }
