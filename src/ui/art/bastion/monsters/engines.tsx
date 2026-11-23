// Siege engines and the Baleful Queen's own: the bone catapult, the demon-mouthed
// cannon, the Avatar (a crowned spectral queen) and her Priestess.
// 160×150 box, ground at y ≈ 146.
import { brush, strokes } from '../../brush'
import { EMBER, TORCH, TORCH_LIGHT, WOOD, WOOD_DARK, WOOD_LIGHT } from '../palette'
import { BONE, BONE_SHADE, Crown, DARK, Eye, Eyes, GOLD, INK, IRON, P, PALE_SKIN, type Design } from './common'

const shadow = (rx: number) => <ellipse cx={80} cy={145} rx={rx} ry={4} fill="#000" opacity={0.4} />

function Wheel({ x, y, r }: { x: number; y: number; r: number }) {
  const spokes = [0, 1, 2, 3].map((i) => {
    const a = (i * Math.PI) / 4
    return `M${x + Math.cos(a) * r} ${y + Math.sin(a) * r}L${x - Math.cos(a) * r} ${y - Math.sin(a) * r}`
  })
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill="none" stroke={INK} strokeWidth={7} />
      <circle cx={x} cy={y} r={r} fill="none" stroke={WOOD} strokeWidth={4.5} />
      <path d={spokes.join('')} stroke={WOOD_DARK} strokeWidth={2.6} />
      <circle cx={x} cy={y} r={r * 0.28} fill={IRON} stroke={INK} strokeWidth={1.4} />
      <circle cx={x} cy={y} r={r} fill="none" stroke="#6e737d" strokeWidth={1.4} strokeDasharray="3 5" />
    </g>
  )
}

// ---------------------------------------------------------------------------
// Bone catapult — a frame lashed from timber and bones, its arm cocked with skulls.
// ---------------------------------------------------------------------------
const CATAPULT = {
  base: 'M18 112H142V124H18Z',
  frame: 'M40 112L66 54L74 54L56 112ZM120 112L94 54L86 54L104 112Z',
  beam: 'M60 58H100V66H60Z',
  arm: brush([[46, 110], [80, 64], [118, 22]], 9, 'tail', { min: 0.6 }),
  cup: 'M110 22C108 10 118 2 128 4C138 6 142 16 138 24C132 30 116 30 110 22Z',
  ribs: strokes([
    [[[24, 112], [28, 98], [38, 94]], 3, 'tail'],
    [[[30, 112], [34, 100], [44, 97]], 3, 'tail'],
  ]),
  rope: 'M46 110L80 64M80 66L80 112',
}

export const catapult: Design = (t) => (
  <g>
    {shadow(66)}
    <P d={CATAPULT.frame} fill={WOOD} />
    <path d={CATAPULT.rope} stroke="#c9a46a" strokeWidth={1.6} strokeDasharray="3 2" />
    <P d={CATAPULT.beam} fill={WOOD_DARK} />
    <path d={CATAPULT.arm} fill={BONE} stroke={INK} strokeWidth={1.8} />
    <P d={CATAPULT.cup} fill={t.hide} />
    <ellipse cx={120} cy={10} rx={7} ry={6} fill={BONE} stroke={INK} strokeWidth={1.2} />
    <ellipse cx={132} cy={12} rx={6} ry={5} fill={BONE_SHADE} stroke={INK} strokeWidth={1.2} />
    <path d="M117 10h2.5v2.5h-2.5ZM122 10h2.5v2.5h-2.5Z" fill={DARK} />
    <P d={CATAPULT.base} fill={WOOD_DARK} />
    <path d={CATAPULT.ribs} fill={BONE} stroke={INK} strokeWidth={0.6} />
    <path d="M18 118H142" stroke={t.hide} strokeWidth={3} />
    {/* skull ornament on the prow */}
    <ellipse cx={18} cy={106} rx={9} ry={8} fill={BONE} stroke={INK} strokeWidth={1.4} />
    <Eyes x={18} y={106} gap={3.2} r={1.3} t={t} />
    <Wheel x={42} y={130} r={14} />
    <Wheel x={118} y={130} r={14} />
  </g>
)

// ---------------------------------------------------------------------------
// Cannon — an iron barrel cast as a fanged maw on a spiked carriage, fire in its throat.
// ---------------------------------------------------------------------------
const CANNON = {
  carriage: 'M30 104L58 84H104L124 104L116 124H38Z',
  spikes: 'M38 124L34 134L44 124ZM116 124L120 134L110 124ZM124 104L134 100L124 110Z',
  barrel: 'M44 88C40 70 52 58 70 56L132 46C140 46 146 52 146 60V78C146 86 140 92 132 92L70 94C56 96 46 94 44 88Z',
  bands: 'M74 56V94M96 52V93M114 49V92',
  maw: 'M132 46C140 46 150 52 152 62C152 72 148 82 140 90L132 92Z',
  teeth: 'M136 50L140 56L142 50ZM146 56L144 62L150 60ZM144 82L140 88L146 86ZM136 90L140 84L134 86Z',
  smoke: 'M150 66C158 60 160 50 154 42C162 46 164 58 156 68Z',
}

export const cannon: Design = (t) => (
  <g>
    {shadow(64)}
    <path d={CANNON.smoke} fill="#5a5560" opacity={0.6} />
    <P d={CANNON.carriage} fill={WOOD} />
    <path d="M40 110H116" stroke={WOOD_LIGHT} strokeWidth={1.4} />
    <path d={CANNON.spikes} fill="url(#lb-steel)" stroke={INK} strokeWidth={0.8} />
    <P d={CANNON.barrel} fill={t.hide} />
    <path d={CANNON.bands} stroke={GOLD} strokeWidth={3.4} />
    <path d={CANNON.bands} stroke={INK} strokeWidth={0.8} />
    <P d={CANNON.maw} fill={t.deep} />
    <ellipse cx={144} cy={70} rx={6} ry={14} fill="#1a0604" />
    <ellipse cx={144} cy={70} rx={4} ry={10} fill={EMBER} />
    <ellipse cx={144} cy={70} rx={2} ry={5} fill={TORCH_LIGHT} />
    <path d={CANNON.teeth} fill={BONE} stroke={INK} strokeWidth={0.6} />
    <Eye x={128} y={56} r={2.2} t={t} />
    <circle cx={44} cy={88} r={8} fill={IRON} stroke={INK} strokeWidth={1.4} />
    <path d="M44 80C42 72 46 66 52 64" fill="none" stroke={TORCH} strokeWidth={2} />
    <Wheel x={54} y={124} r={18} />
    <Wheel x={108} y={124} r={18} />
  </g>
)

// ---------------------------------------------------------------------------
// The Avatar of the Baleful Queen — crowned, gowned, arms raised in power,
// her hem dissolving into shadow.
// ---------------------------------------------------------------------------
const QUEEN = {
  aura: 'M80 4C40 20 16 60 18 110C30 92 44 86 56 90C60 60 70 40 80 32C90 40 100 60 104 90C116 86 130 92 142 110C144 60 120 20 80 4Z',
  gown: 'M80 46C70 48 64 58 62 72C58 96 46 122 26 146H134C114 122 102 96 98 72C96 58 90 48 80 46Z',
  gownTrim: 'M64 70Q80 78 96 70M60 96Q80 104 100 96',
  collar: 'M80 46L56 30L62 54ZM80 46L104 30L98 54Z',
  armL: 'M64 58C52 52 42 40 36 24L44 20C50 34 58 44 70 50Z',
  armR: 'M96 58C108 52 118 40 124 24L116 20C110 34 102 44 90 50Z',
  head: 'M80 22C73 22 70 28 70 34C70 42 74 46 80 46C86 46 90 42 90 34C90 28 87 22 80 22Z',
  hair: 'M70 34C66 44 64 56 66 66L72 50C72 44 72 38 74 32ZM90 34C94 44 96 56 94 66L88 50C88 44 88 38 86 32Z',
  orbs: strokes([
    [[[40, 22], [34, 12], [40, 2]], 4, 'tail'],
    [[[120, 22], [126, 12], [120, 2]], 4, 'tail'],
  ]),
}

export const queen: Design = (t) => (
  <g>
    <path d={QUEEN.aura} fill={t.accent} opacity={0.22} />
    <g mask="url(#lb-card-fade-mask)">
      <P d={QUEEN.gown} fill={t.hide} />
      <path d={QUEEN.gownTrim} fill="none" stroke={GOLD} strokeWidth={2.4} />
    </g>
    <P d={QUEEN.armL} fill={t.hide} />
    <P d={QUEEN.armR} fill={t.hide} />
    <circle cx={40} cy={20} r={12} fill={t.eye} />
    <circle cx={120} cy={20} r={12} fill={t.eye} />
    <path d={QUEEN.orbs} fill={t.accent} />
    <P d={QUEEN.collar} fill={DARK} />
    <path d={QUEEN.hair} fill="#0b0810" />
    <P d={QUEEN.head} fill={PALE_SKIN} />
    <Eyes x={80} y={35} gap={4.2} r={1.8} t={t} />
    <path d="M77 42Q80 43.5 83 42" fill="none" stroke="#5a1a30" strokeWidth={1.2} />
    <Crown x={80} y={22} w={26} spikes={7} />
  </g>
)

// ---------------------------------------------------------------------------
// The Priestess — veiled and circleted, a crescent staff, her rites burning.
// ---------------------------------------------------------------------------
const PRIESTESS = {
  staff: 'M122 146L116 18',
  crescent: 'M116 20C104 18 98 6 104 -2C104 8 112 14 122 12C128 10 130 6 130 2C134 12 126 22 116 20Z',
  robe: 'M80 40C66 42 60 56 58 74C54 98 46 122 34 146H126C114 122 106 98 102 74C100 56 94 42 80 40Z',
  veil: 'M80 16C66 16 60 28 60 40C60 56 56 70 52 80C62 78 70 70 72 60L88 60C90 70 98 78 108 80C104 70 100 56 100 40C100 28 94 16 80 16Z',
  face: 'M72 36C72 30 76 26 80 26C84 26 88 30 88 36C88 44 84 48 80 48C76 48 72 44 72 36Z',
  armR: 'M98 62C106 68 112 76 116 88L110 92C106 82 100 74 94 70Z',
  hands: 'M66 78C70 84 76 86 80 86C84 86 90 84 94 78L88 74H72Z',
  bowl: 'M68 86Q80 98 92 86Z',
  fire: 'M80 86C72 80 74 70 80 62C82 68 86 70 88 66C90 74 88 82 80 86Z',
}

export const priestess: Design = (t) => (
  <g>
    {shadow(50)}
    <path d={PRIESTESS.staff} stroke={INK} strokeWidth={5} strokeLinecap="round" />
    <path d={PRIESTESS.staff} stroke={GOLD} strokeWidth={2.6} strokeLinecap="round" />
    <P d={PRIESTESS.crescent} fill={GOLD} sw={1.2} />
    <circle cx={117} cy={8} r={10} fill={t.eye} opacity={0.8} />
    <P d={PRIESTESS.robe} fill={t.hide} />
    <path d="M80 60V146M62 100Q80 108 98 100" fill="none" stroke={GOLD} strokeWidth={2} />
    <P d={PRIESTESS.armR} fill={t.hide} />
    <circle cx={114} cy={90} r={4} fill={PALE_SKIN} stroke={INK} strokeWidth={1.2} />
    <circle cx={80} cy={76} r={18} fill={t.eye} opacity={0.65} />
    <P d={PRIESTESS.hands} fill={PALE_SKIN} sw={1.2} />
    <P d={PRIESTESS.bowl} fill={GOLD} sw={1.2} />
    <P d={PRIESTESS.fire} fill={t.accent} sw={1.2} />
    <P d={PRIESTESS.veil} fill={DARK} />
    <path d={PRIESTESS.veil} fill={t.hide} opacity={0.3} />
    <P d={PRIESTESS.face} fill={PALE_SKIN} />
    <path d="M72 30Q80 24 88 30" fill="none" stroke={GOLD} strokeWidth={2.4} />
    <circle cx={80} cy={26} r={2.4} fill={t.accent} stroke={INK} strokeWidth={0.8} />
    <Eyes x={80} y={37} gap={3.8} r={1.6} t={t} />
    <Crown x={80} y={14} w={16} spikes={3} />
  </g>
)
