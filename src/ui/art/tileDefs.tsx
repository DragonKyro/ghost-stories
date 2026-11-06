// Shared defs used only by the village tiles (rendered inside <ArtDefs />).
// Prefix every id with gs-tile-.
export function TileDefs() {
  return (
    <>
      <radialGradient id="gs-tile-greenfire" cx="0.5" cy="0.75" r="0.6">
        <stop offset="0" stopColor="#f4ffd0" />
        <stop offset="0.45" stopColor="#9be05a" />
        <stop offset="1" stopColor="#2f7a3a" />
      </radialGradient>
      <radialGradient id="gs-tile-greenglow" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#c8ff8a" stopOpacity="0.6" />
        <stop offset="1" stopColor="#7ad04a" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="gs-tile-bronze" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#e6c372" />
        <stop offset="0.5" stopColor="#a8792e" />
        <stop offset="1" stopColor="#5e3f14" />
      </linearGradient>
      <radialGradient id="gs-tile-gong" cx="0.4" cy="0.35" r="0.7">
        <stop offset="0" stopColor="#f8e3a0" />
        <stop offset="0.5" stopColor="#c99a3e" />
        <stop offset="1" stopColor="#6e4a14" />
      </radialGradient>
      <linearGradient id="gs-tile-clay" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#b8643a" />
        <stop offset="1" stopColor="#6a2e16" />
      </linearGradient>
      <linearGradient id="gs-tile-celadon" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#c6dfcf" />
        <stop offset="1" stopColor="#6f9a83" />
      </linearGradient>
      <linearGradient id="gs-tile-porcelain" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="1" stopColor="#c9cfd4" />
      </linearGradient>
      <linearGradient id="gs-tile-silk" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fbf4e4" />
        <stop offset="1" stopColor="#ead9b8" />
      </linearGradient>
      <linearGradient id="gs-tile-shade" x1="0" y1="0" x2="0.3" y2="1">
        <stop offset="0" stopColor="#1d1208" stopOpacity="0" />
        <stop offset="0.55" stopColor="#1d1208" stopOpacity="0.08" />
        <stop offset="1" stopColor="#1d1208" stopOpacity="0.38" />
      </linearGradient>
      <linearGradient id="gs-tile-peaks" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#4d5a66" stopOpacity="0.5" />
        <stop offset="1" stopColor="#4d5a66" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="gs-tile-dusk" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#3b3f6e" stopOpacity="0.55" />
        <stop offset="0.6" stopColor="#a3243b" stopOpacity="0.22" />
        <stop offset="1" stopColor="#a3243b" stopOpacity="0" />
      </linearGradient>
    </>
  )
}
