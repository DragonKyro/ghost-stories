// Defs used only by the heroes, tokens, dice and icons (rendered inside <BastionDefs />).
// Prefix every id with lb-piece-.
export function PieceDefs() {
  return (
    <>
      {/* Kazgin's fourth die: grey granite. */}
      <linearGradient id="lb-piece-greydie" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#c9c6cc" />
        <stop offset="0.6" stopColor="#9b98a0" />
        <stop offset="1" stopColor="#66636b" />
      </linearGradient>
      {/* Hero-power medallion field: deep enamel. */}
      <radialGradient id="lb-piece-field" cx="0.4" cy="0.35" r="0.75">
        <stop offset="0" stopColor="#3a4258" />
        <stop offset="0.6" stopColor="#232838" />
        <stop offset="1" stopColor="#141722" />
      </radialGradient>
      {/* Pale stone of a standalone effect icon (matches the cards' effect stones). */}
      <radialGradient id="lb-piece-stone" cx="0.4" cy="0.35" r="0.75">
        <stop offset="0" stopColor="#f4efe4" />
        <stop offset="0.65" stopColor="#d9d2c3" />
        <stop offset="1" stopColor="#a9a192" />
      </radialGradient>
      {/* Mage's crystal and spell light. */}
      <radialGradient id="lb-piece-arcane" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="0.3" stopColor="#bfe6ff" stopOpacity="0.9" />
        <stop offset="1" stopColor="#5fb0ff" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="lb-piece-beard" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#c2683a" />
        <stop offset="1" stopColor="#7a3418" />
      </linearGradient>
      <linearGradient id="lb-piece-wood" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#9a6a3e" />
        <stop offset="0.5" stopColor="#6b4528" />
        <stop offset="1" stopColor="#3d2615" />
      </linearGradient>
      <linearGradient id="lb-piece-bandage" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="1" stopColor="#d9d2c2" />
      </linearGradient>
    </>
  )
}
