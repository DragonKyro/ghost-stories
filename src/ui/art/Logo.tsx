// Title art for the main menu: a vermilion 鬼 seal, "GHOST STORIES" in
// inked capitals, a full moon over misty mountain ranges. Transparent
// background — made for the dark menu screen.
import { ArtSvg, type ArtBaseProps } from './ArtSvg'
import { brush, smooth, strokes, type Pt } from './brush'
import { GUI_PATH } from './glyphs'

const ridge = (pts: Pt[], bottom: number): string => `${smooth(pts)}L${pts[pts.length - 1][0]} ${bottom}L${pts[0][0]} ${bottom}Z`

const FAR = ridge(
  [[0, 150], [30, 122], [64, 132], [110, 94], [150, 116], [196, 104], [246, 126], [300, 88], [350, 114], [404, 98], [452, 122], [508, 92], [560, 116], [600, 102]],
  250,
)
const MID = ridge(
  [[0, 182], [40, 160], [90, 172], [140, 146], [190, 168], [240, 158], [300, 176], [350, 150], [400, 170], [452, 156], [500, 174], [552, 150], [600, 166]],
  250,
)
const NEAR_L = ridge([[0, 196], [20, 176], [44, 184], [74, 200], [110, 214], [150, 232], [190, 250]], 260)
const NEAR_R = ridge([[400, 252], [446, 226], [490, 206], [520, 186], [548, 174], [576, 182], [600, 170]], 260)
const PINE =
  brush([[560, 180], [556, 160], [562, 140], [558, 122]], 5, 'head') +
  strokes([
    [[[530, 150], [546, 144], [560, 146], [576, 140]], 7, 'both'],
    [[[538, 132], [552, 128], [562, 130], [584, 124]], 6, 'both'],
    [[[544, 118], [556, 114], [570, 116]], 5, 'both'],
  ])
const BIRDS = strokes([
  [[[396, 46], [402, 42], [407, 46]], 2.4, 'both'],
  [[[407, 46], [412, 41], [418, 44]], 2.4, 'both'],
  [[[426, 30], [431, 27], [435, 30]], 2, 'both'],
  [[[435, 30], [439, 26], [444, 28]], 2, 'both'],
  [[[380, 62], [384, 59], [388, 62]], 1.8, 'both'],
  [[[388, 62], [392, 58], [396, 60]], 1.8, 'both'],
])
// The seal: a rough vermilion square with the character knocked out.
const SEAL_EDGE = smooth(
  [[8, 6], [50, 3], [96, 8], [140, 4], [146, 50], [143, 100], [146, 142], [100, 146], [50, 143], [6, 147], [3, 100], [6, 50]],
  true,
)
const SEAL_BRUSH = brush([[18, 152], [70, 156], [130, 150]], 6, 'both')

const TITLE_FONT = "'Palatino Linotype', Palatino, 'Book Antiqua', 'URW Palladio L', Georgia, serif"

export function Logo({ width = 480, title = 'Ghost Stories', ...rest }: ArtBaseProps & { width?: number }) {
  return (
    <ArtSvg width={width} height={(width * 260) / 600} viewBox="0 0 600 260" title={title} {...rest}>
      {/* sky: moon and its halo */}
      <circle cx={470} cy={72} r={72} fill="url(#gs-moon-halo)" />
      <circle cx={470} cy={70} r={44} fill="url(#gs-moon)" />
      <path d={BIRDS} fill="#120e14" opacity={0.85} />
      {/* misty ranges, fading out at both ends */}
      <g mask="url(#gs-mask-hfade)">
      <rect x={0} y={80} width={600} height={180} fill="none" />
      <path d={FAR} fill="url(#gs-fade-far)" />
      <ellipse cx={300} cy={150} rx={300} ry={26} fill="url(#gs-mist)" />
      <path d={MID} fill="url(#gs-fade-mid)" />
      <ellipse cx={180} cy={196} rx={240} ry={22} fill="url(#gs-mist)" />
      <ellipse cx={440} cy={186} rx={160} ry={18} fill="url(#gs-mist)" />
      <path d={NEAR_L} fill="url(#gs-fade-near)" />
      <path d={NEAR_R} fill="url(#gs-fade-near)" />
      </g>
      <path d={PINE} fill="#120e14" opacity={0.9} />

      {/* vermilion seal with a brushed 鬼 */}
      <g transform="translate(26 40) rotate(-4 75 75)" filter="url(#gs-rough)">
        <path d={SEAL_EDGE} fill="#2a0b08" transform="translate(4 5)" opacity={0.55} />
        <path d={SEAL_EDGE} fill="url(#gs-seal)" />
        <rect x={12} y={12} width={126} height={126} rx={4} fill="none" stroke="#f3e3cf" strokeWidth={3} />
        <path d={GUI_PATH} transform="translate(22 22) scale(1.06)" fill="#f6e8d6" />
        <path d={SEAL_BRUSH} fill="#b8322a" opacity={0.9} />
      </g>

      {/* the title */}
      <g filter="url(#gs-rough)" fontFamily={TITLE_FONT} fontWeight={700}>
        <text x={203} y={127} fontSize={92} textLength={360} lengthAdjust="spacingAndGlyphs" fill="#000" opacity={0.6}>
          GHOST
        </text>
        <text
          x={198}
          y={122}
          fontSize={92}
          textLength={360}
          lengthAdjust="spacingAndGlyphs"
          fill="url(#gs-title)"
          stroke="#0d0a08"
          strokeWidth={4}
          paintOrder="stroke"
        >
          GHOST
        </text>
        <text x={203} y={219} fontSize={78} textLength={380} lengthAdjust="spacingAndGlyphs" fill="#000" opacity={0.6}>
          STORIES
        </text>
        <text
          x={198}
          y={214}
          fontSize={78}
          textLength={380}
          lengthAdjust="spacingAndGlyphs"
          fill="url(#gs-title)"
          stroke="#0d0a08"
          strokeWidth={4}
          paintOrder="stroke"
        >
          STORIES
        </text>
      </g>
      <path d={brush([[200, 140], [380, 136], [578, 142]], 5, 'both')} fill="#b8322a" opacity={0.9} />
    </ArtSvg>
  )
}
