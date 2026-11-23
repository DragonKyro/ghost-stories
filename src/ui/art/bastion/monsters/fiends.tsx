// Fiends of the Horde: the winged demon, the vampire, the dark knight, the
// assassin, the storm djinn and the siren. 160×150 box, ground at y ≈ 146.
import { brush, mirrorX, smooth, strokes, type Pt } from '../../brush'
import { CRIMSON, CRIMSON_DARK, STONE_DARK, STONE_MID } from '../palette'
import { BONE, Crown, DARK, Eyes, GOLD, INK, IRON, P, PALE_SKIN, STEEL, type Design } from './common'

const shadow = (rx: number) => <ellipse cx={80} cy={145} rx={rx} ry={4} fill="#000" opacity={0.4} />

// ---------------------------------------------------------------------------
// Demon — horned, bat-winged, digitigrade, claws out (a Warlord: a crown of
// horns and a mantle of fire).
// ---------------------------------------------------------------------------
const DEMON_WING_L: Pt[] = [[66, 58], [50, 40], [30, 26], [6, 22], [12, 34], [14, 46], [12, 58], [22, 56], [28, 60], [30, 68], [38, 64], [46, 66], [50, 74], [60, 72]]
const DEMON = {
  wingL: smooth(DEMON_WING_L, true),
  wingR: smooth(mirrorX(DEMON_WING_L, 80), true),
  wingBones: 'M66 58L8 24M60 62L14 46M58 66L28 62',
  tail: brush([[90, 100], [116, 118], [132, 108], [142, 90]], 6, 'tail'),
  tailTip: 'M142 92L136 80L150 82Z',
  legs: 'M68 100L62 118L68 130L58 146H72L80 128L74 116L78 104ZM92 100L98 118L92 130L102 146H88L80 128L86 116L82 104Z',
  torso: 'M62 56C66 50 94 50 98 56L104 74C100 86 96 96 94 104H66C64 96 60 86 56 74Z',
  abs: 'M72 74H88M72 84H88M74 94H86M80 64V100',
  armL: 'M62 58C50 62 42 72 40 86L38 100L46 102L50 88C52 78 58 72 64 68Z',
  armR: 'M98 58C110 62 118 72 120 86L122 100L114 102L110 88C108 78 102 72 96 68Z',
  clawsL: 'M38 98L32 108L40 102L38 112L44 103L46 112L47 101Z',
  head: 'M80 28C70 28 66 36 66 44C66 52 72 58 80 58C88 58 94 52 94 44C94 36 90 28 80 28Z',
  horns: brush([[70, 34], [60, 26], [56, 12], [62, 4]], 7, 'tail') + brush([[90, 34], [100, 26], [104, 12], [98, 4]], 7, 'tail'),
  bossHorns: brush([[68, 40], [52, 36], [44, 22]], 6, 'tail') + brush([[92, 40], [108, 36], [116, 22]], 6, 'tail') + brush([[76, 30], [74, 18], [78, 8]], 4, 'tail') + brush([[84, 30], [86, 18], [82, 8]], 4, 'tail'),
  mouth: 'M72 50Q80 56 88 50Q86 55 80 56Q74 55 72 50Z',
  flames: strokes([
    [[[48, 70], [40, 50], [46, 32]], 10, 'tail'],
    [[[112, 70], [120, 50], [114, 32]], 10, 'tail'],
    [[[60, 54], [56, 40], [62, 28]], 7, 'tail'],
    [[[100, 54], [104, 40], [98, 28]], 7, 'tail'],
  ]),
}

export const demon: Design = (t, boss) => (
  <g>
    {shadow(48)}
    {boss && <path d={DEMON.flames} fill={t.accent} opacity={0.75} />}
    <P d={DEMON.wingL} fill={t.deep} />
    <P d={DEMON.wingR} fill={t.deep} />
    <path d={DEMON.wingBones} stroke={INK} strokeWidth={1.6} opacity={0.75} />
    <path d={DEMON.wingBones} transform="translate(160 0) scale(-1 1)" stroke={INK} strokeWidth={1.6} opacity={0.75} />
    <path d={DEMON.tail} fill={t.deep} stroke={INK} strokeWidth={1.2} />
    <P d={DEMON.tailTip} fill={t.deep} />
    <P d={DEMON.legs} fill={t.deep} />
    <P d={DEMON.torso} fill={t.hide} />
    <path d={DEMON.abs} stroke={t.deep} strokeWidth={1.6} opacity={0.8} />
    <P d={DEMON.armL} fill={t.hide} />
    <P d={DEMON.armR} fill={t.hide} />
    <path d={DEMON.clawsL} fill={BONE} stroke={INK} strokeWidth={0.8} />
    <path d={DEMON.clawsL} transform="translate(160 0) scale(-1 1)" fill={BONE} stroke={INK} strokeWidth={0.8} />
    <path d={DEMON.horns} fill={BONE} stroke={INK} strokeWidth={1.4} />
    {boss && <path d={DEMON.bossHorns} fill={DARK} stroke={INK} strokeWidth={1.2} />}
    <P d={DEMON.head} fill={t.hide} />
    <path d="M70 39L78 43M90 39L82 43" stroke={INK} strokeWidth={2.4} strokeLinecap="round" />
    <Eyes x={80} y={43} gap={6} r={2.2} t={t} />
    <P d={DEMON.mouth} fill="#250605" sw={1.2} />
    <path d="M75 52L76 55M85 52L84 55" stroke={BONE} strokeWidth={1.4} />
  </g>
)

// ---------------------------------------------------------------------------
// Vampire — a pale lord in a high-collared cape, claws raised.
// ---------------------------------------------------------------------------
const VAMP = {
  cape: 'M80 40C56 44 30 60 14 98C26 94 34 98 38 106C44 100 52 102 56 110L80 72L104 110C108 102 116 100 122 106C126 98 134 94 146 98C130 60 104 44 80 40Z',
  lining: 'M80 46C62 50 44 62 32 86C40 86 46 90 50 96L80 62L110 96C114 90 120 86 128 86C116 62 98 50 80 46Z',
  coat: 'M70 50H90L96 100L92 144H68L64 100Z',
  vest: 'M74 52H86L88 92H72Z',
  collar: 'M66 48L56 22L76 44ZM94 48L104 22L84 44Z',
  head: 'M80 26C73 26 70 32 70 38C70 46 74 52 80 52C86 52 90 46 90 38C90 32 87 26 80 26Z',
  hair: 'M70 36C68 26 74 20 80 20C86 20 92 26 90 36L86 30L80 34L74 30Z',
  armL: 'M68 56C58 58 50 64 46 74L42 82L48 86L54 78C58 72 64 68 70 66Z',
  armR: 'M92 56C102 58 110 64 114 74L118 82L112 86L106 78C102 72 96 68 90 66Z',
  claws: 'M42 82L34 78L40 86L34 88L42 90L40 94L48 88Z',
}

export const vampire: Design = (t) => (
  <g>
    {shadow(50)}
    <P d={VAMP.cape} fill={t.deep} />
    <path d={VAMP.lining} fill={CRIMSON} opacity={0.85} />
    <path d="M68 144L64 146H76ZM84 144L80 146H94Z" fill={INK} />
    <P d={VAMP.coat} fill={DARK} />
    <P d={VAMP.vest} fill={t.hide} sw={1.2} />
    <path d="M80 54V90" stroke={GOLD} strokeWidth={1.4} />
    <P d={VAMP.armL} fill={DARK} />
    <P d={VAMP.armR} fill={DARK} />
    <path d={VAMP.claws} fill={PALE_SKIN} stroke={INK} strokeWidth={1} />
    <path d={VAMP.claws} transform="translate(160 0) scale(-1 1)" fill={PALE_SKIN} stroke={INK} strokeWidth={1} />
    <P d={VAMP.collar} fill={CRIMSON_DARK} />
    <P d={VAMP.head} fill={PALE_SKIN} />
    <P d={VAMP.hair} fill="#120e14" sw={1} />
    <path d="M73 37L78 39M87 37L82 39" stroke={INK} strokeWidth={1.8} strokeLinecap="round" />
    <Eyes x={80} y={40} gap={4.5} r={1.8} t={t} />
    <path d="M76 46Q80 48 84 46" fill="none" stroke="#5a0c10" strokeWidth={1.4} />
    <path d="M77 46L78 50L79 46.5ZM81 46.5L82 50L83 46Z" fill="#fff" />
  </g>
)

// ---------------------------------------------------------------------------
// Dark knight — spiked plate, a horned helm with a burning visor, a greatsword
// planted point-down (a Warlord: crowned helm, great pauldrons, a banner).
// ---------------------------------------------------------------------------
const KNIGHT = {
  cape: 'M60 50C48 70 40 100 34 144H126C120 100 112 70 100 50Z',
  legs: 'M64 102L60 144H78L80 108ZM82 108L84 144H100L96 102Z',
  sabatons: 'M56 140H80V146H54ZM82 140H104L106 146H82Z',
  torso: 'M62 52H98L102 90L96 104H64L58 90Z',
  tabard: 'M68 70H92L94 114L80 124L66 114Z',
  pauldronL: 'M58 50C48 48 40 56 42 68C50 70 58 66 64 60Z',
  pauldronR: 'M102 50C112 48 120 56 118 68C110 70 102 66 96 60Z',
  pauldronSpikes: 'M46 54L36 44L50 50ZM44 62L32 60L44 66ZM114 54L124 44L110 50ZM116 62L128 60L116 66Z',
  armL: 'M58 64L52 84L70 92L72 82Z',
  armR: 'M102 64L108 84L90 92L88 82Z',
  helm: 'M68 22C68 12 74 8 80 8C86 8 92 12 92 22V46H68Z',
  helmHorns: brush([[70, 20], [60, 14], [56, 2]], 5.5, 'tail') + brush([[90, 20], [100, 14], [104, 2]], 5.5, 'tail'),
  blade: 'M76 96H84L83 138L80 146L77 138Z',
  guard: 'M64 90H96L94 96H66Z',
  grip: 'M77 74H83V90H77Z',
  banner: 'M126 14V146',
  bannerCloth: 'M128 18H150L145 33L150 48H128Z',
}

export const darkKnight: Design = (t, boss) => (
  <g>
    {shadow(52)}
    {boss && (
      <>
        <path d={KNIGHT.banner} stroke={INK} strokeWidth={4} strokeLinecap="round" />
        <path d={KNIGHT.banner} stroke={GOLD} strokeWidth={2} strokeLinecap="round" />
        <P d={KNIGHT.bannerCloth} fill={t.hide} />
        <path d="M133 26L140 33L133 40" fill="none" stroke={DARK} strokeWidth={2.4} />
      </>
    )}
    <P d={KNIGHT.cape} fill={boss ? CRIMSON_DARK : t.deep} />
    <path d="M70 70L60 140M90 70L100 140" stroke={INK} strokeWidth={1.4} opacity={0.4} />
    <P d={KNIGHT.legs} fill={IRON} />
    <P d={KNIGHT.sabatons} fill={IRON} />
    <P d={KNIGHT.torso} fill={IRON} />
    <path d="M64 54H96L100 88" fill="none" stroke={t.light} strokeWidth={1.4} opacity={0.7} />
    <path d="M64 66H96M62 80H98" stroke={STONE_MID} strokeWidth={1.2} />
    <P d={KNIGHT.tabard} fill={t.hide} />
    <P d={KNIGHT.armL} fill={IRON} />
    <P d={KNIGHT.armR} fill={IRON} />
    <P d={KNIGHT.blade} fill={STEEL} sw={1.4} />
    <path d="M80 98V138" stroke="#fff" strokeWidth={1} opacity={0.7} />
    <P d={KNIGHT.guard} fill={boss ? GOLD : STONE_DARK} sw={1.4} />
    <P d={KNIGHT.grip} fill="#3a2416" sw={1.2} />
    <circle cx={80} cy={72} r={4} fill={boss ? GOLD : STONE_DARK} stroke={INK} strokeWidth={1.2} />
    <ellipse cx={74} cy={86} rx={6} ry={5} fill={IRON} stroke={INK} strokeWidth={1.4} />
    <ellipse cx={86} cy={86} rx={6} ry={5} fill={IRON} stroke={INK} strokeWidth={1.4} />
    <path d={KNIGHT.pauldronSpikes} fill={STEEL} stroke={INK} strokeWidth={0.8} />
    <P d={KNIGHT.pauldronL} fill={IRON} />
    <P d={KNIGHT.pauldronR} fill={IRON} />
    <path d="M46 56C50 52 56 52 60 54M100 54C104 52 110 52 114 56" fill="none" stroke={t.light} strokeWidth={1.4} opacity={0.75} />
    <path d={KNIGHT.helmHorns} fill={boss ? GOLD : BONE} stroke={INK} strokeWidth={1.2} />
    <P d={KNIGHT.helm} fill={IRON} />
    <path d="M70 20C70 13 74 10 80 10" fill="none" stroke={t.light} strokeWidth={1.4} opacity={0.75} />
    {boss && <Crown x={80} y={12} w={22} />}
    <path d="M80 10V46" stroke={STONE_MID} strokeWidth={1.4} />
    <rect x={70} y={26} width={20} height={4} rx={1.5} fill={t.accent} />
    <rect x={68} y={24} width={24} height={8} rx={3} fill={t.eye} opacity={0.85} />
  </g>
)

// ---------------------------------------------------------------------------
// Assassin — crouched to spring, hood and scarf, a dagger in each hand.
// ---------------------------------------------------------------------------
const ASSASSIN = {
  scarf: brush([[72, 44], [52, 40], [34, 48], [14, 40]], 9, 'tail'),
  legs: 'M60 104L44 132L40 146H58L60 132L74 114ZM96 106L114 124L110 146H126L124 122L104 98Z',
  cloak: 'M70 46C58 54 50 72 50 90L42 118L60 110L68 124L80 110L96 120L102 100C108 86 104 64 96 52C90 44 78 42 70 46Z',
  hood: 'M68 30C68 18 78 12 88 14C98 18 100 32 96 46L70 50Z',
  face: 'M74 34C76 28 86 28 90 34L88 44H76Z',
  armL: 'M66 58C54 64 44 72 36 80L42 88C52 82 60 76 70 70Z',
  daggerL: 'M36 84L14 74L32 90Z',
  armR: 'M96 60C106 62 114 70 118 80L112 86C108 78 102 72 94 70Z',
  daggerR: 'M114 82L130 102L116 88Z',
}

export const assassin: Design = (t) => (
  <g>
    {shadow(50)}
    <path d={ASSASSIN.scarf} fill={t.deep} stroke={INK} strokeWidth={1.2} />
    <P d={ASSASSIN.legs} fill={DARK} />
    <P d={ASSASSIN.cloak} fill={t.hide} />
    <path d={ASSASSIN.cloak} fill={t.deep} opacity={0.4} />
    <path d="M60 80L56 110M80 70L78 108M94 76L98 112" stroke={INK} strokeWidth={1.2} opacity={0.5} />
    <path d="M62 86H98" stroke={t.deep} strokeWidth={4} />
    <P d={ASSASSIN.armR} fill={t.hide} />
    <P d={ASSASSIN.daggerR} fill={STEEL} sw={1.2} />
    <P d={ASSASSIN.armL} fill={t.hide} />
    <P d={ASSASSIN.daggerL} fill={STEEL} sw={1.2} />
    <P d={ASSASSIN.hood} fill={t.hide} />
    <path d={ASSASSIN.face} fill="#07050a" />
    <path d="M74 40H90" stroke={t.deep} strokeWidth={5} />
    <Eyes x={82} y={36} gap={4} r={1.6} t={t} />
  </g>
)

// ---------------------------------------------------------------------------
// Djinn — a storm spirit: a muscled torso over a whirlwind, lightning in hand.
// ---------------------------------------------------------------------------
const DJINN = {
  whirl: brush([[80, 146], [72, 134], [88, 122], [70, 112], [84, 100]], 24, 'head', { min: 0.12 }),
  whirlLines: strokes([
    [[[66, 126], [80, 122], [94, 124]], 2, 'both'],
    [[[62, 112], [78, 108], [96, 110]], 2.2, 'both'],
    [[[74, 138], [82, 136], [88, 138]], 1.6, 'both'],
  ]),
  torso: 'M58 62C62 52 98 52 102 62L104 86C100 98 92 104 80 106C68 104 60 98 56 86Z',
  armL: 'M60 62C48 58 40 46 36 32L44 26C48 38 56 48 66 52Z',
  armR: 'M100 62C112 58 120 46 124 32L116 26C112 38 104 48 94 52Z',
  head: 'M80 30C72 30 68 36 68 44C68 52 74 56 80 56C86 56 92 52 92 44C92 36 88 30 80 30Z',
  topknot: brush([[80, 30], [84, 18], [96, 8], [110, 10]], 7, 'tail'),
  ears: 'M68 42L60 36L68 48ZM92 42L100 36L92 48Z',
  beard: 'M74 52L80 66L86 52Z',
  bolt: 'M40 24L30 4L38 6L34 -8L48 12L40 10Z',
  boltR: 'M120 24L130 4L122 6L126 -8L112 12L120 10Z',
  arc: strokes([[[[38, 22], [60, 12], [80, 18], [100, 12], [122, 22]], 2.2, 'both']]),
}

export const djinn: Design = (t) => (
  <g>
    <path d={DJINN.whirl} fill={t.light} opacity={0.75} stroke={INK} strokeWidth={1.4} />
    <path d={DJINN.whirlLines} fill={t.deep} opacity={0.6} />
    <P d={DJINN.torso} fill={t.hide} />
    <path d="M70 74Q80 80 90 74M72 88Q80 92 88 88" fill="none" stroke={t.deep} strokeWidth={1.6} />
    <path d={DJINN.arc} fill={t.accent} opacity={0.85} />
    <P d={DJINN.armL} fill={t.hide} />
    <P d={DJINN.armR} fill={t.hide} />
    <rect x={36} y={30} width={10} height={6} rx={2} transform="rotate(-50 41 33)" fill={GOLD} stroke={INK} strokeWidth={1} />
    <rect x={114} y={30} width={10} height={6} rx={2} transform="rotate(50 119 33)" fill={GOLD} stroke={INK} strokeWidth={1} />
    <P d={DJINN.bolt} fill={t.accent} sw={1} />
    <P d={DJINN.boltR} fill={t.accent} sw={1} />
    <path d={DJINN.topknot} fill={DARK} stroke={INK} strokeWidth={1} />
    <P d={DJINN.ears} fill={t.hide} />
    <P d={DJINN.head} fill={t.hide} />
    <P d={DJINN.beard} fill={DARK} sw={1} />
    <path d="M71 40L78 43M89 40L82 43" stroke={INK} strokeWidth={2.2} strokeLinecap="round" />
    <Eyes x={80} y={44} gap={5.5} r={2} t={t} />
    <circle cx={67} cy={50} r={2} fill="none" stroke={GOLD} strokeWidth={1.4} />
  </g>
)

// ---------------------------------------------------------------------------
// Siren — on a rock in the surf: a long fish tail, streaming hair, webbed claws.
// ---------------------------------------------------------------------------
const SIREN = {
  rock: 'M28 146C32 124 50 114 80 116C112 118 130 130 136 146Z',
  tail: brush([[80, 106], [98, 122], [120, 128], [138, 118]], 22, 'tail', { min: 0.3 }),
  fin: 'M134 120L152 100L148 122L158 136Z',
  hairBack: 'M70 50C56 58 50 80 52 104C58 100 62 96 64 90C62 76 66 62 74 56ZM90 50C104 58 110 80 108 104C102 100 98 96 96 90C98 76 94 62 86 56Z',
  torso: 'M68 72C70 64 90 64 92 72L94 98C90 108 70 108 66 98Z',
  head: 'M80 42C73 42 70 48 70 54C70 62 74 66 80 66C86 66 90 62 90 54C90 48 87 42 80 42Z',
  hairTop: 'M70 52C68 42 74 36 80 36C86 36 92 42 90 52C86 46 74 46 70 52Z',
  finEars: 'M70 54L60 46L68 60ZM90 54L100 46L92 60Z',
  armL: 'M68 74C58 76 48 70 40 62L36 68C44 78 56 84 68 84Z',
  claw: 'M40 64L28 56L36 64L26 64L36 68L30 74L40 70Z',
  armR: 'M92 76C100 84 104 96 104 108L96 110C96 100 92 90 88 84Z',
  scales: 'M90 112Q96 108 102 112M104 118Q110 114 116 118M118 122Q124 118 130 122',
  foam: 'M20 140Q34 134 46 140T74 140M96 142Q110 136 124 142T148 140',
}

export const siren: Design = (t) => (
  <g>
    <P d={SIREN.rock} fill={STONE_DARK} />
    <path d="M44 132L60 126M104 128L120 134" stroke={INK} strokeWidth={1.2} opacity={0.6} />
    <P d={SIREN.hairBack} fill={t.deep} />
    <path d={SIREN.tail} fill={t.hide} stroke={INK} strokeWidth={2} />
    <path d={SIREN.scales} fill="none" stroke={t.deep} strokeWidth={1.4} />
    <P d={SIREN.fin} fill={t.light} />
    <path d="M136 118L150 104M138 122L154 134" stroke={t.deep} strokeWidth={1.2} />
    <P d={SIREN.armR} fill={t.light} />
    <P d={SIREN.torso} fill={t.light} />
    <path d="M70 80Q80 86 90 80" fill="none" stroke={t.deep} strokeWidth={2} />
    <P d={SIREN.armL} fill={t.light} />
    <P d={SIREN.claw} fill={t.light} sw={1.2} />
    <P d={SIREN.finEars} fill={t.base} />
    <P d={SIREN.head} fill={t.light} />
    <P d={SIREN.hairTop} fill={t.deep} sw={1} />
    <Eyes x={80} y={54} gap={4.5} r={1.8} t={t} />
    <ellipse cx={80} cy={61} rx={2.6} ry={2.2} fill="#1d0a12" />
    <path d={SIREN.foam} fill="none" stroke="#e8f6ff" strokeWidth={2.4} strokeLinecap="round" opacity={0.85} />
  </g>
)
