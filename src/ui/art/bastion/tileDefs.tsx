// Defs used only by the Bastion tiles (rendered inside <BastionDefs />).
// Prefix every id with lb-tile-.
import { SKY_LOW, SKY_MID, SKY_TOP } from './palette'

/**
 * The Grasp of Evil look: desaturate, push toward violet and darken. One
 * colour matrix, shared by every tile in the Grasp (cheap; nothing animated
 * sits under it).
 */
const GRASP_MATRIX = [
  '0.25 0.36 0.05 0 0.015',
  '0.07 0.30 0.03 0 0',
  '0.15 0.44 0.21 0 0.035',
  '0 0 0 1 0',
].join(' ')

/** The action strip in the Grasp: greyed, still readable. */
const GRASP_STRIP_MATRIX = [
  '0.30 0.48 0.08 0 0.02',
  '0.25 0.48 0.08 0 0',
  '0.30 0.48 0.16 0 0.04',
  '0 0 0 1 0',
].join(' ')

export function TileDefs() {
  return (
    <>
      <filter id="lb-tile-grasp" x="0" y="0" width="1" height="1" colorInterpolationFilters="sRGB">
        <feColorMatrix type="matrix" values={GRASP_MATRIX} />
      </filter>
      <filter id="lb-tile-grasp-strip" x="0" y="0" width="1" height="1" colorInterpolationFilters="sRGB">
        <feColorMatrix type="matrix" values={GRASP_STRIP_MATRIX} />
      </filter>
      <linearGradient id="lb-tile-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={SKY_TOP} />
        <stop offset="0.5" stopColor={SKY_MID} />
        <stop offset="0.82" stopColor="#9a6a6e" />
        <stop offset="1" stopColor={SKY_LOW} />
      </linearGradient>
      <linearGradient id="lb-tile-hall" x1="0" y1="0" x2="0.3" y2="1">
        <stop offset="0" stopColor="#3d4250" />
        <stop offset="0.6" stopColor="#4b4f5b" />
        <stop offset="1" stopColor="#2e313a" />
      </linearGradient>
      <linearGradient id="lb-tile-floor" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#4a4038" />
        <stop offset="1" stopColor="#2a231e" />
      </linearGradient>
      <linearGradient id="lb-tile-wall-warm" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#8f8a86" />
        <stop offset="0.6" stopColor="#77716d" />
        <stop offset="1" stopColor="#57524f" />
      </linearGradient>
      <linearGradient id="lb-tile-wood" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#a5703f" />
        <stop offset="0.5" stopColor="#7a4c2a" />
        <stop offset="1" stopColor="#4a2c16" />
      </linearGradient>
      <linearGradient id="lb-tile-wood-h" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#5a371d" />
        <stop offset="0.35" stopColor="#9a6a3e" />
        <stop offset="1" stopColor="#4a2c16" />
      </linearGradient>
      <radialGradient id="lb-tile-fire" cx="0.5" cy="0.85" r="0.75">
        <stop offset="0" stopColor="#fff6cf" />
        <stop offset="0.35" stopColor="#ffc95a" />
        <stop offset="0.75" stopColor="#f07a2a" />
        <stop offset="1" stopColor="#c2401c" />
      </radialGradient>
      <radialGradient id="lb-tile-warm" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#ffc770" stopOpacity="0.55" />
        <stop offset="0.5" stopColor="#f39a3b" stopOpacity="0.2" />
        <stop offset="1" stopColor="#f39a3b" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="lb-tile-water" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#d9f2ff" />
        <stop offset="0.5" stopColor="#7cbbe6" />
        <stop offset="1" stopColor="#2f6aa0" />
      </linearGradient>
      <linearGradient id="lb-tile-glass-green" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#c8ffd0" />
        <stop offset="0.5" stopColor="#3fbf6a" />
        <stop offset="1" stopColor="#14532d" />
      </linearGradient>
      <linearGradient id="lb-tile-rays" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fff4c8" stopOpacity="0.55" />
        <stop offset="1" stopColor="#fff4c8" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="lb-tile-plinth" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#6c717c" />
        <stop offset="1" stopColor="#3c404a" />
      </linearGradient>
      <linearGradient id="lb-tile-plinth-grasp" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#3a2f4a" />
        <stop offset="1" stopColor="#1a1222" />
      </linearGradient>
      <linearGradient id="lb-tile-stone-grasp" x1="0" y1="0" x2="0.4" y2="1">
        <stop offset="0" stopColor="#5d5470" />
        <stop offset="0.5" stopColor="#3e3550" />
        <stop offset="1" stopColor="#211a2c" />
      </linearGradient>
      <radialGradient id="lb-tile-vignette" cx="0.5" cy="0.45" r="0.72">
        <stop offset="0.55" stopColor="#0b0a10" stopOpacity="0" />
        <stop offset="1" stopColor="#0b0a10" stopOpacity="0.45" />
      </radialGradient>
      <radialGradient id="lb-tile-grasp-vignette" cx="0.62" cy="0.3" r="0.85">
        <stop offset="0.3" stopColor="#0d0812" stopOpacity="0" />
        <stop offset="0.8" stopColor="#12091c" stopOpacity="0.4" />
        <stop offset="1" stopColor="#07040b" stopOpacity="0.7" />
      </radialGradient>
      <linearGradient id="lb-tile-mist" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#c9b8e8" stopOpacity="0" />
        <stop offset="0.5" stopColor="#c9b8e8" stopOpacity="0.16" />
        <stop offset="1" stopColor="#c9b8e8" stopOpacity="0" />
      </linearGradient>
    </>
  )
}
