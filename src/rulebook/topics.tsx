// Rulebook content. Each topic is a small TSX component that renders prose +
// optional inline SVG diagrams. The framework in ./index.tsx handles
// navigation and search.

import type { ReactElement } from 'react'

export type Topic = {
  id: string
  title: string
  category: 'overview' | 'turn' | 'mechanics' | 'reference' | 'modes'
  /** Search-friendly plaintext blob; the framework grep's this for matches. */
  searchBlob: string
  body: () => ReactElement
}

// ---- Diagrams ---------------------------------------------------------

function HauntingTrackDiagram() {
  return (
    <svg viewBox="0 0 220 60" width={220} height={60} style={{ display: 'block', marginTop: 8 }}>
      <text x={4} y={14} fontSize={10} fill="#8a7e6b">card</text>
      <rect x={4} y={20} width={28} height={32} fill="#241b15" stroke="#d4a857" strokeWidth={1.2} rx={2} />
      <text x={66} y={14} fontSize={10} fill="#8a7e6b">stone 1</text>
      <circle cx={80} cy={36} r={12} fill="#3a2e25" stroke="#d4a857" />
      <text x={138} y={14} fontSize={10} fill="#8a7e6b">stone 2 → haunt</text>
      <circle cx={158} cy={36} r={12} fill="#3a2e25" stroke="#c1392b" />
      <path d="M40 36 L65 36 M93 36 L142 36" stroke="#d4a857" strokeWidth={1.2} fill="none" />
      <path d="M65 36 L60 32 M65 36 L60 40 M142 36 L137 32 M142 36 L137 40" stroke="#d4a857" strokeWidth={1.2} fill="none" />
    </svg>
  )
}

function VillageGridDiagram() {
  // 3x3 grid + 4 boards on the sides.
  return (
    <svg viewBox="0 0 220 220" width={220} height={220} style={{ display: 'block', marginTop: 8 }}>
      {/* Red board (north) */}
      <rect x={70} y={4} width={80} height={20} fill="#c1392b22" stroke="#c1392b" />
      <text x={110} y={18} fontSize={10} fill="#c1392b" textAnchor="middle">RED</text>
      {/* Blue board (east) */}
      <rect x={196} y={70} width={20} height={80} fill="#2c69b822" stroke="#2c69b8" />
      <text x={206} y={114} fontSize={10} fill="#2c69b8" textAnchor="middle" transform="rotate(90 206 114)">BLUE</text>
      {/* Green board (south) */}
      <rect x={70} y={196} width={80} height={20} fill="#2f8f5d22" stroke="#2f8f5d" />
      <text x={110} y={210} fontSize={10} fill="#2f8f5d" textAnchor="middle">GREEN</text>
      {/* Yellow board (west) */}
      <rect x={4} y={70} width={20} height={80} fill="#d4a85722" stroke="#d4a857" />
      <text x={14} y={114} fontSize={10} fill="#d4a857" textAnchor="middle" transform="rotate(-90 14 114)">YELLOW</text>
      {/* 3×3 village */}
      {[0, 1, 2].map((c) =>
        [0, 1, 2].map((r) => (
          <rect
            key={`${c}-${r}`}
            x={32 + c * 52}
            y={32 + r * 52}
            width={48}
            height={48}
            fill="#241b15"
            stroke="#d4a857"
            strokeWidth={c === 1 && r === 1 ? 1.5 : 0.8}
          />
        )),
      )}
      <text x={32 + 52 + 24} y={32 + 52 + 26} fontSize={9} fill="#8a7e6b" textAnchor="middle">center</text>
    </svg>
  )
}

function DiceDiagram() {
  return (
    <svg viewBox="0 0 220 60" width={220} height={60} style={{ display: 'block', marginTop: 8 }}>
      {[
        { x: 8, c: '#c1392b' },
        { x: 50, c: '#2f8f5d' },
        { x: 92, c: '#2c69b8' },
        { x: 134, c: '#d4a857' },
        { x: 176, c: '#f4e9d6' }, // wild
      ].map(({ x, c }, i) => (
        <g key={i}>
          <rect x={x} y={10} width={36} height={36} fill="#f4e9d6" stroke="#241b15" rx={4} />
          <circle cx={x + 18} cy={28} r={11} fill={c} stroke="#241b15" strokeWidth={0.8} />
        </g>
      ))}
      <text x={26} y={56} fontSize={9} fill="#8a7e6b">red</text>
      <text x={66} y={56} fontSize={9} fill="#8a7e6b">green</text>
      <text x={108} y={56} fontSize={9} fill="#8a7e6b">blue</text>
      <text x={148} y={56} fontSize={9} fill="#8a7e6b">yellow</text>
      <text x={188} y={56} fontSize={9} fill="#8a7e6b">wild</text>
    </svg>
  )
}

// ---- Topic content ----------------------------------------------------

const COMMON_TEXT_STYLE: React.CSSProperties = {
  lineHeight: 1.55,
  color: 'var(--ink)',
}

const heading: React.CSSProperties = { marginTop: 16, marginBottom: 6 }

export const TOPICS: Topic[] = [
  // ─── Overview ────────────────────────────────────────────────
  {
    id: 'overview',
    title: 'Overview',
    category: 'overview',
    searchBlob: 'goal taoist wu-feng cooperative incarnation village haunting ghost',
    body: () => (
      <div style={COMMON_TEXT_STYLE}>
        <p>
          Ghost Stories is a fully cooperative game. 1–4 Taoist monks defend a Chinese village
          from the ghosts of <strong>Wu-Feng</strong>, who is trying to return to the realm of
          the living. You win or lose <em>together</em> — there's no winner among the players.
        </p>
        <h4 style={heading}>How to win</h4>
        <p>Exorcise the final incarnation of Wu-Feng before the game ends.</p>
        <h4 style={heading}>How to lose</h4>
        <ol>
          <li>All Taoists are dead (0 Qi each).</li>
          <li>A <strong>third</strong> village tile becomes haunted.</li>
          <li>The ghost deck is exhausted while a Wu-Feng incarnation is still in play or undrawn.</li>
        </ol>
        <p>If the final incarnation's death-curse triggers any of these, you still lose.</p>
      </div>
    ),
  },

  // ─── Setup ─────────────────────────────────────────────────
  {
    id: 'setup',
    title: 'Setup & components',
    category: 'overview',
    searchBlob: 'setup boards village deck tao buddha qi yin-yang difficulty',
    body: () => (
      <div style={COMMON_TEXT_STYLE}>
        <p>
          The village is a randomly-shuffled 3×3 grid of 9 location tiles (active-side up).
          The 4 colored player boards sit on the four sides of the village; each has 3 ghost
          spaces, a haunting-figure track, 3 Buddha spots, and a power stone.
        </p>
        <VillageGridDiagram />
        <p style={{ color: 'var(--ink-muted)', fontSize: 12 }}>
          Each board's "facing" side touches three village tiles in a line. Ghosts on a board
          haunt down that line toward the village center.
        </p>
        <h4 style={heading}>Per-player setup</h4>
        <ul>
          <li><strong>Qi (life):</strong> 4 on Initiation; 3 on Normal / Nightmare / Hell.</li>
          <li><strong>Tao tokens:</strong> 1 of your color (+ 1 black on Initiation only).</li>
          <li><strong>Yin-Yang token:</strong> 1 each (except on Hell, which removes it).</li>
          <li><strong>Power tokens:</strong> 1 each in 1–3 player games; 3 each in solo.</li>
          <li>Figure starts on the central village tile.</li>
        </ul>
        <h4 style={heading}>Ghost deck</h4>
        <p>
          Shuffle the ghost deck. In 1–3 player games, remove <strong>5 random cards per
          missing player</strong> without looking. Then insert the Wu-Feng incarnation(s) into
          the deck near the bottom (see <em>Difficulty</em>).
        </p>
      </div>
    ),
  },

  // ─── Turn structure ─────────────────────────────────────────
  {
    id: 'turn-yin',
    title: 'Yin phase (ghosts)',
    category: 'turn',
    searchBlob: 'yin phase ghosts haunter tormentor curse die arrival overrun',
    body: () => (
      <div style={COMMON_TEXT_STYLE}>
        <p>The Yin phase runs at the start of every turn, in three steps.</p>
        <h4 style={heading}>1. Ghost actions (active board)</h4>
        <p>
          For each ghost on the active player's board, resolve their center-stone abilities
          left to right.
        </p>
        <ul>
          <li>
            <strong>Haunter</strong> — advance the ghost's haunting figure. <em>Card → Stone 1
            → Stone 2.</em> Reaching Stone 2 haunts the first active tile in the ghost's line,
            then resets the figure to the card.
          </li>
        </ul>
        <HauntingTrackDiagram />
        <ul>
          <li>
            <strong>Tormentor</strong> — roll the curse die: no effect / haunt one tile /
            spawn one ghost / lose all Tao tokens / lose 1 Qi.
          </li>
          <li>
            <strong>Power blocker, Tao blocker, Die captor, Dice immune, Group effect</strong>
            — passive while in play; not "fired" this step.
          </li>
        </ul>
        <h4 style={heading}>2. Board overrun?</h4>
        <p>
          If all 3 ghost spaces on the active board are filled, the active player loses 1 Qi
          and <strong>skips step 3</strong>.
        </p>
        <h4 style={heading}>3. Arrival of a ghost</h4>
        <p>Draw the top card of the ghost deck and place it:</p>
        <ul>
          <li>Red, green, blue, yellow ghosts go on the matching color board.</li>
          <li>Black ghosts go on the <em>active player's</em> board.</li>
          <li>If the target board is full (3 ghosts), the active player chooses any other open space.</li>
          <li>If all 12 spaces are full: lose 1 Qi, discard the drawn ghost.</li>
        </ul>
        <p>Apply the ghost's left-stone (on-arrival) ability immediately.</p>
      </div>
    ),
  },

  {
    id: 'turn-yang',
    title: 'Yang phase (Taoist)',
    category: 'turn',
    searchBlob: 'yang phase move help exorcism buddha yin-yang taoist',
    body: () => (
      <div style={COMMON_TEXT_STYLE}>
        <p>
          The active Taoist plays 3 steps in order. The Yin-Yang token may be spent
          <em> before or after</em> any step.
        </p>
        <h4 style={heading}>1. Move (optional)</h4>
        <p>
          Move to an <strong>adjacent</strong> village tile. <em>Diagonal movement is
          allowed</em> (king's move). The red <em>Dance of the Spires</em> power flies to any
          tile.
        </p>
        <h4 style={heading}>2. Request help OR attempt exorcism</h4>
        <p>Pick exactly one (Blue's <em>Heavenly Gust</em> allows both, in either order).</p>
        <ul>
          <li>
            <strong>Request help:</strong> use the action of the village tile you're standing
            on. (Haunted tiles have no action.)
          </li>
          <li>
            <strong>Exorcise:</strong> target a ghost on a space adjacent to your tile. Roll 3
            Tao dice (minus any captured) and try to match the ghost's resistance.
          </li>
        </ul>
        <h4 style={heading}>3. Place a Buddha (optional)</h4>
        <p>
          If you hold a Buddha figurine, place it on a Buddha space facing your tile, provided
          that ghost space is empty.
        </p>
        <h4 style={heading}>Corner-tile bonus</h4>
        <p>
          Standing on one of the 4 corner village tiles, you may exorcise <strong>2 adjacent
          ghosts in one roll</strong> (combined resistance) or place 2 Buddhas at once.
        </p>
      </div>
    ),
  },

  {
    id: 'exorcism',
    title: 'Exorcism & Tao dice',
    category: 'mechanics',
    searchBlob: 'exorcism tao dice white wild black resistance circle prayer mantra',
    body: () => (
      <div style={COMMON_TEXT_STYLE}>
        <p>
          The Tao dice have six faces: red, green, blue, yellow, wild (white), and curse (black).
          The colored + wild faces are useful for exorcism; the black face is not.
        </p>
        <DiceDiagram />
        <h4 style={heading}>Process</h4>
        <ol>
          <li>Roll 3 Tao dice (minus any captured by ghosts).</li>
          <li>
            Match the ghost's resistance — e.g. <em>2 red + 1 green</em> needs 2 red faces and
            1 green among the dice. <strong>Wild faces substitute for any color.</strong>
          </li>
          <li>
            If you fall short, you may <strong>spend Tao tokens</strong> of the needed color.
            Tokens come from any Taoist <em>standing on the same village tile as you</em>.
          </li>
          <li>If you still can't match, the exorcism fails — nothing happens.</li>
        </ol>
        <h4 style={heading}>Discounts</h4>
        <ul>
          <li>
            A <strong>Tao token on the Circle of Prayer</strong> reduces the resistance of all
            ghosts of that color by 1 (anywhere on the board).
          </li>
          <li>
            The yellow Taoist's <em>Enfeeblement Mantra</em> reduces a single ghost's
            resistance by 1 (color of your choice).
          </li>
        </ul>
        <h4 style={heading}>On success</h4>
        <p>
          The ghost is discarded. Apply its right-stone abilities — <strong>curses before
          rewards.</strong> Common rewards: regain 1 Qi or a Yin-Yang token, take 1–2 Tao
          tokens of choice. Common curses: roll the curse die, lose 1 Tao.
        </p>
      </div>
    ),
  },

  // ─── Village tiles ─────────────────────────────────────────
  {
    id: 'village-tiles',
    title: 'Village tile actions',
    category: 'reference',
    searchBlob: 'village tiles circle prayer buddhist temple cemetery altar herbalist sorcerer night watchman pavilion tea house',
    body: () => (
      <div style={COMMON_TEXT_STYLE}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--rule)', textAlign: 'left' }}>
              <th style={{ padding: 4, width: 160 }}>Tile</th>
              <th style={{ padding: 4 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {[
              ['Circle of Prayer', 'Place a Tao token (or change the existing one) on the Circle. All ghosts of that color get -1 resistance everywhere.'],
              ['Buddhist Temple', 'Take a Buddha figurine. Place it on any future Buddha step.'],
              ['Cemetery', 'Revive a dead Taoist (+2 Qi), then roll the curse die.'],
              ['Taoist Altar', 'Unhaunt 1 village tile (flip it active), then bring a ghost into play.'],
              ["Herbalist's Shop", 'Roll 2 Tao dice and take Tao tokens of those colors. Wild = your choice.'],
              ["Sorcerer's Hut", 'Discard any 1 ghost in play (no curses, no rewards). Cost: 1 Qi.'],
              ["Night Watchman's Beat", 'Move all haunting figures on 1 board back 1 step.'],
              ['Pavilion of Heavenly Wind', 'Move any ghost to any empty space (even on a Buddha!), then move another Taoist normally.'],
              ['Tea House', 'Take 1 Tao token of your choice + gain 1 Qi. Then bring a ghost into play.'],
            ].map(([name, action]) => (
              <tr key={name} style={{ borderBottom: '1px solid var(--rule)' }}>
                <td style={{ padding: 6, verticalAlign: 'top' }}><strong>{name}</strong></td>
                <td style={{ padding: 6 }}>{action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ),
  },

  // ─── Powers ────────────────────────────────────────────────
  {
    id: 'powers',
    title: 'Taoist powers',
    category: 'reference',
    searchBlob: 'powers red blue green yellow dance spires twin winds heavenly gust second wind gods favorite strength mountain bottomless pockets enfeeblement mantra',
    body: () => (
      <div style={COMMON_TEXT_STYLE}>
        <p>Each board is double-sided; at setup each player picks (or is dealt) one side.</p>
        {[
          ['Red — Dance of the Spires', 'During your move, fly to any village tile.'],
          ['Red — Dance of the Twin Winds', 'Before your move, move 1 other Taoist 1 space.'],
          ['Blue — Heavenly Gust', 'Request help AND attempt an exorcism in either order this turn.'],
          ['Blue — Second Wind', 'Request help twice OR attempt 2 exorcisms (independent rolls).'],
          ["Green — The Gods' Favorite", 'Reroll any Tao dice (and may reroll the curse die). Keep the second result.'],
          ['Green — Strength of a Mountain', 'Roll a 4th gray Tao die on every exorcism; never roll the curse die.'],
          ['Yellow — Bottomless Pockets', 'Before your move, take 1 Tao token of any color from the supply.'],
          ['Yellow — Enfeeblement Mantra', 'Before your move, place a Mantra token on any ghost; its resistance is -1 (color chosen at roll time).'],
        ].map(([name, body]) => (
          <p key={name} style={{ marginTop: 8 }}>
            <strong>{name}</strong> — {body}
          </p>
        ))}
      </div>
    ),
  },

  // ─── Wu-Feng ───────────────────────────────────────────────
  {
    id: 'wu-feng',
    title: 'Wu-Feng incarnations',
    category: 'reference',
    searchBlob: 'wu-feng incarnation howling nightmare uncatchable death army forgotten ones bonecracker dark mistress creeping horror vampire lord hope killer nameless',
    body: () => (
      <div style={COMMON_TEXT_STYLE}>
        <p>
          Wu-Feng incarnations are shuffled into the deck near the bottom (10 cards apart).
          They're affected by color placement rules but <strong>not</strong> by the Sorcerer's
          Hut, and only Uncatchable interacts with Buddhas (in reverse).
        </p>
        {[
          ['Howling Nightmare', 'Exorcise only if the haunting stone facing it on the opposite board is empty.'],
          ['Uncatchable', 'Must be on a Buddha to be exorcised. The only incarnation Buddhas help against.'],
          ['Death Army', "Active player rolls the curse die each Yin phase, and again on this incarnation's death."],
          ['Forgotten Ones', 'While alive, all Taoist powers (including power tokens) are disabled.'],
          ['Bonecracker', "Every player discards 1 Tao on arrival; the harboring board's player discards 1 every Yin phase."],
          ['Dark Mistress', 'While alive, Tao tokens cannot be spent (Inactive Tao marker on the table).'],
          ['Creeping Horror', 'Captures 1 Tao die on arrival; exorcisms roll one fewer die until it dies.'],
          ['Vampire Lord', 'A Haunter with resistance 4.'],
          ['Hope Killer', 'Resistance 2 of each color (8 total). Roll the curse die on its death.'],
          ['Nameless', 'Resistance 1 of each color (5 total). Discards the Circle-of-Prayer token on arrival; white faces no longer count as wild while alive.'],
        ].map(([name, desc]) => (
          <p key={name} style={{ marginTop: 8 }}>
            <strong>{name}</strong> — {desc}
          </p>
        ))}
      </div>
    ),
  },

  // ─── Difficulty ─────────────────────────────────────────────
  {
    id: 'difficulty',
    title: 'Difficulty levels',
    category: 'modes',
    searchBlob: 'difficulty initiation normal nightmare hell qi incarnation yin-yang',
    body: () => (
      <div style={COMMON_TEXT_STYLE}>
        <p>The rulebook's four canonical levels:</p>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginTop: 8 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--rule)', textAlign: 'left' }}>
              <th style={{ padding: 4 }}>Level</th>
              <th style={{ padding: 4 }}>Starting Qi</th>
              <th style={{ padding: 4 }}>Starting Tao</th>
              <th style={{ padding: 4 }}>Yin-Yang</th>
              <th style={{ padding: 4 }}>Incarnations</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid var(--rule)' }}>
              <td style={{ padding: 6 }}><strong>Initiation</strong></td>
              <td>4</td>
              <td>1 of own color + 1 black</td>
              <td>Yes</td>
              <td>1</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--rule)' }}>
              <td style={{ padding: 6 }}><strong>Normal</strong></td>
              <td>3</td>
              <td>1 of own color</td>
              <td>Yes</td>
              <td>1</td>
            </tr>
            <tr style={{ borderBottom: '1px solid var(--rule)' }}>
              <td style={{ padding: 6 }}><strong>Nightmare</strong></td>
              <td>3</td>
              <td>1 of own color</td>
              <td>Yes</td>
              <td>4 (3 in 1–2 player games)</td>
            </tr>
            <tr>
              <td style={{ padding: 6 }}><strong>Hell</strong></td>
              <td>3</td>
              <td>1 of own color</td>
              <td><strong>No</strong></td>
              <td>4 (3 in 1–2 player games)</td>
            </tr>
          </tbody>
        </table>
        <p style={{ marginTop: 16 }}>
          Nightmare and Hell insert each incarnation 10 cards apart in the bottom of the
          deck. The final incarnation lands 10 cards from the bottom; the next is 10 cards
          earlier, and so on.
        </p>
      </div>
    ),
  },

  // ─── Neutral boards / small player counts ──────────────────
  {
    id: 'neutral-boards',
    title: '1–3 player rules',
    category: 'modes',
    searchBlob: 'solo neutral boards 1 2 3 player power tokens dance of the spires',
    body: () => (
      <div style={COMMON_TEXT_STYLE}>
        <p>
          Empty seats become <strong>neutral boards</strong>: 3 Qi each, no Yang phase, and a
          stripped-down Yin phase (Haunters advance, Tormentors roll the curse die for the
          neutral board, no ghost arrival on its turn).
        </p>
        <h4 style={heading}>Deck adjustment</h4>
        <p>Remove 5 random cards per missing player (without looking) before inserting incarnations.</p>
        <h4 style={heading}>Power tokens</h4>
        <p>
          In a 1–3 player game, each <em>real</em> Taoist starts with 1 power token (or 3 in
          solo). A power token can be spent during your Yang phase to use a neutral board's
          active power (one per power per turn).
        </p>
        <h4 style={heading}>Solo bonuses</h4>
        <ul>
          <li>The red board must use <em>Dance of the Spires</em>.</li>
          <li>Start with 1 Tao of every color (+ 1 black on Initiation).</li>
          <li>Start with 3 power tokens.</li>
          <li>No Cemetery action (only one Taoist).</li>
          <li>Pavilion of Heavenly Wind moves your own Taoist instead of another's.</li>
        </ul>
      </div>
    ),
  },

  {
    id: 'death-revival',
    title: 'Death & possessed boards',
    category: 'mechanics',
    searchBlob: 'death dead taoist cemetery revival possessed board qi',
    body: () => (
      <div style={COMMON_TEXT_STYLE}>
        <p>
          A Taoist at 0 Qi <strong>dies</strong>. All possessions (Tao tokens, Buddhas, Yin-Yang,
          power tokens) are lost. The figure is laid on the Cemetery tile; ghosts on their
          board stay in play.
        </p>
        <h4 style={heading}>Possessed board</h4>
        <p>
          The dead Taoist's board becomes <strong>possessed</strong>: its power deactivates,
          and the active player must absorb any Qi loss caused by ghost abilities on that
          board (except curse-die rolls — those are absorbed by the green Taoist's power
          carrying nothing).
        </p>
        <h4 style={heading}>Revival</h4>
        <p>
          Stand on the Cemetery and use its action. The dead Taoist returns with 2 Qi, then
          rolls the curse die (a haunt result haunts the Cemetery itself).
        </p>
      </div>
    ),
  },
]

// ─── Black Secret expansion ─────────────────────────────────────
TOPICS.push({
  id: 'black-secret',
  title: 'Black Secret expansion',
  category: 'modes',
  searchBlob: 'black secret expansion wu-feng enemy player asymmetric catacombs demon curse pyramid summon bloody mantra calligrapher skeleton shadow blood brother',
  body: () => (
    <div style={COMMON_TEXT_STYLE}>
      <p>
        Black Secret is an <strong>asymmetric</strong> expansion: one player takes the
        role of <strong>Wu-Feng</strong>, the antagonist. Toggle it from the New Game screen
        (you can run White Moon and Black Secret together).
      </p>

      <h4 style={heading}>The Wu-Feng player's intervention</h4>
      <p>
        At Yin step 3 of every turn, instead of the drawn ghost auto-placing on its color
        board, Wu-Feng gets to choose one of three actions on the drawn ghost card:
      </p>
      <ul>
        <li>
          <strong>① Place</strong> — place the ghost on a board normally (respecting color
          placement). The ghost's on-arrival ability fires as usual.
        </li>
        <li>
          <strong>② Summon a demon</strong> — discard the ghost (the card is its cost) and
          summon one of Wu-Feng's three demons (cost 2 / 3 / 4) into the catacombs.
          The ghost's total resistance must be ≥ the demon's cost. Demon enters at one of
          the two catacomb-board entrances (NW or SE corner).
        </li>
        <li>
          <strong>③ Throw a curse</strong> — discard the ghost and place a curse on the
          pyramid. The curse color must match the ghost color (black ghosts are wild
          jokers). Curses follow a pyramid: level <em>L</em> requires at least 2 prior
          curses at level <em>L-1</em>. In this implementation curses apply a simplified Qi
          tax (lvl 1-2: 1 Qi, lvl 3: 2 Qi, lvl 4: 3 Qi) to the active player.
        </li>
      </ul>
      <p style={{ color: 'var(--ink-muted)', fontSize: 13 }}>
        Incarnations of Wu-Feng are not eligible for intervention — they always place
        normally per base-game rules.
      </p>

      <h4 style={heading}>④ Place a skeleton</h4>
      <p>
        Wu-Feng has 3 skeleton tokens. Discard the drawn ghost to place a 1-resistance
        skeleton on any free ghost space (color matching the host board). Skeletons are
        not ghost cards — Sorcerer's Hut, Pavilion, Kung-Fu School don't affect them, but
        they exorcise normally (resistance 1 makes them cheap).
      </p>

      <h4 style={heading}>The Catacombs</h4>
      <p>
        Wu-Feng commands a 3×3 catacombs board with three demons in his reserve (cost 2 /
        3 / 4). Before every player Yin phase, each catacombs demon takes 1 action: move
        to an adjacent square OR <em>search</em> the current square. Searching reveals
        the top catacomb token. The engine defaults to searching for every demon; a full
        Wu-Feng UI for per-demon move/search choices is on the polish list.
      </p>

      <h4 style={heading}>Catacomb tokens</h4>
      <p>
        Tokens are revealed by demon searches. Each token type:
      </p>
      <ul style={{ fontSize: 13 }}>
        <li><strong>Dirt</strong> — no effect; token discarded.</li>
        <li><strong>Buddha</strong> — the searching demon returns to Wu-Feng's reserve.</li>
        <li><strong>Blood of the Just</strong> — places 1 Qi on a Bloody Mantra (engine picks the lowest-level open mantra).</li>
        <li><strong>Cursed Tablet</strong> — Wu-Feng throws a curse at the highest currently-legal level.</li>
        <li><strong>Bones</strong> — +1 skeleton to Wu-Feng's reserve (capped at 3).</li>
        <li><strong>Blood of Su-Ling</strong> — immediately resolves the most-filled Bloody Mantra.</li>
        <li><strong>Urn</strong> — increments Wu-Feng's urn count. On the <strong>3rd urn</strong>, the Shadow of Wu-Feng enters play on the first empty ghost space (canonical search order).</li>
      </ul>

      <h4 style={heading}>Bloody Mantras (Qi accumulation + resolution)</h4>
      <p>
        Wu-Feng's board starts with 6 Bloody Mantras (3× level 2, 2× level 3, 1× level
        4). Every Qi lost by any Taoist or board lands on the lowest-level open Mantra
        (engine choice — the rulebook lets the player choose). When a Mantra fills (Qi
        count = level), it resolves and is replaced with a fresh Mantra of the same
        level:
      </p>
      <ul style={{ fontSize: 13 }}>
        <li><strong>Level 2</strong> — every living Taoist gains 1 Qi.</li>
        <li><strong>Level 3</strong> — the Inactive Tao marker (if any) is removed globally.</li>
        <li><strong>Level 4</strong> — the highest-resistance non-incarnation ghost on every board is discarded.</li>
      </ul>

      <h4 style={heading}>Blood Brothers</h4>
      <p>
        A Taoist at <strong>1 Qi</strong> may also invoke the opposite board's power
        (red ↔ green, blue ↔ yellow). The opposite board's power must be active (not
        possessed and not blocked). Loses access automatically as soon as the Taoist
        gains another Qi.
      </p>

      <h4 style={heading}>Per-curse effects (representative)</h4>
      <ul style={{ fontSize: 13 }}>
        <li><strong>Level 1</strong> — Active player loses 1 Qi.</li>
        <li><strong>Level 2</strong> — Active player discards 1 Tao token.</li>
        <li><strong>Level 3</strong> — The first active village tile becomes haunted.</li>
        <li><strong>Level 4</strong> — Every living Taoist loses 1 Qi.</li>
      </ul>
      <p style={{ color: 'var(--ink-muted)', fontSize: 12 }}>
        These are representative — the rulebook's 14 distinct curses have unique effects.
        Each is the engine's default choice when Wu-Feng throws a curse at that level.
      </p>

      <h4 style={heading}>The Calligrapher tile</h4>
      <p>
        Black Secret swaps Night Watchman's Beat out for the Calligrapher. Acting Taoists
        may pick one or both of: <strong>swap a Bloody Mantra</strong> (discard a chosen
        Mantra and replace with a fresh one of the same level), or <strong>place 1 Qi from
        the reserve on a Mantra of choice</strong> (no Qi loss for any Taoist). This is the
        manual override for the engine's automatic Qi → lowest-level-Mantra placement.
      </p>

      <h4 style={heading}>Shadow of Wu-Feng — full mechanics</h4>
      <p>
        On the 3rd Urn token, the Shadow enters play on the first empty ghost space. Each
        Yin prelude Wu-Feng picks one Shadow action:
      </p>
      <ul>
        <li><strong>Pass</strong> — Shadow does nothing.</li>
        <li><strong>Move</strong> — Shadow may teleport to any village tile or any empty ghost-space slot. Moving onto the Circle of Prayer returns its Tao token to the supply.</li>
        <li><strong>Attack Taoists</strong> — Shadow must be on a village tile. Wu-Feng rolls 3 Tao dice; each black face = -1 Qi from a chosen Taoist on the same tile.</li>
        <li><strong>Attack tile</strong> — Shadow must be alone on a tile. Roll the curse die for haunt / Qi loss / Tao loss / no-effect.</li>
      </ul>
      <p>
        The Shadow is <strong>invincible</strong> — players cannot exorcise it (the
        exorcism handler throws). Its presence on a village tile blocks all
        <em> requestHelp</em> actions on that tile.
      </p>

      <h4 style={heading}>14 distinct curses</h4>
      <p>
        Wu-Feng picks from a per-level curse pool when throwing a curse (5 lvl-1, 4 lvl-2,
        3 lvl-3, 2 lvl-4 = 14 total). Examples:
      </p>
      <ul style={{ fontSize: 12 }}>
        <li><strong>Lvl 1</strong>: Qi loss, Tao discard, Yin-Yang loss, advance all haunting figures on the active board, return any Circle of Prayer token to supply.</li>
        <li><strong>Lvl 2</strong>: all players lose 1 Tao, all players lose 1 Qi (lvl 2), lock the active player's board power, set the Inactive Tao marker.</li>
        <li><strong>Lvl 3</strong>: haunt the first active tile, return inactive Taoists (placeholder Qi tax), all players lose 1 Qi.</li>
        <li><strong>Lvl 4</strong>: all players lose 1 Qi, haunt two tiles at once.</li>
      </ul>

      <h4 style={heading}>Online Wu-Feng identity</h4>
      <p>
        In online lobbies the host enables Black Secret and a player claims the Wu-Feng
        role. The Wu-Feng UUID is committed at game start, after which only that peer can
        dispatch <code>wuFengIntervene</code>, <code>wuFengDemonActions</code>, and{' '}
        <code>wuFengShadowAction</code> — incoming envelopes from any other UUID are
        dropped by the network layer.
      </p>
    </div>
  ),
})

// ─── White Moon expansion ───────────────────────────────────────
TOPICS.push({
  id: 'white-moon',
  title: 'White Moon expansion',
  category: 'modes',
  searchBlob: 'white moon expansion villager devourer moon crystal portal su-ling kung-fu school receptacle mystic barrier',
  body: () => (
    <div style={COMMON_TEXT_STYLE}>
      <p>
        The <strong>White Moon</strong> expansion drops villagers into the village. Toggle it
        from the New Game screen.
      </p>

      <h4 style={heading}>What's in the expansion</h4>
      <ul>
        <li>
          <strong>24 villagers across 12 families</strong> (4 families of 3, 4 of 2, 4 single
          villagers). They start in 8 stacks of 3 on every village tile except the central
          (Portal) tile. Only the top of each stack is visible.
        </li>
        <li>
          <strong>10 new ghost cards</strong> introduce the <em>Devourer</em> center-stone
          ability and Su-Ling interactions.
        </li>
        <li>
          <strong>Moon crystals</strong> — a new currency captured from the Herbalist's white
          face. Spend them like wild Tao tokens during exorcism.
        </li>
        <li>
          <strong>Portal</strong> — a marker on the village. Standing on it unlocks the
          <em> Save Villager</em> action.
        </li>
        <li>
          <strong>Kung-Fu School</strong> tile replaces Night Watchman's Beat. From it you can
          attempt a solitary exorcism against either all ghosts on your own board or all black
          ghosts on the table (4 dice, no rewards or curses).
        </li>
      </ul>

      <h4 style={heading}>Hauntings hit villagers first</h4>
      <p>
        When a haunting would flip a tile that has villagers on it, all villagers on that tile
        die instead and the tile stays active. The village stays standing; the human cost
        rises.
      </p>

      <h4 style={heading}>Devourer</h4>
      <p>
        Each Yin phase a Devourer ghost kills the top villager on the first of the 3 tiles in
        front of it that still has villagers. If those tiles are empty, any other villager
        dies. If none remain anywhere, the active player loses 1 Qi.
      </p>

      <h4 style={heading}>Moon crystals</h4>
      <ul>
        <li>
          Capture: a white face on the Herbalist's Shop gives you 1 moon crystal (instead of
          a free-choice Tao token).
        </li>
        <li>Spend: during exorcism, a moon crystal acts as a wild Tao token of any color you choose. Returns to the central reserve when spent.</li>
        <li>
          Not affected by the Inactive Tao marker. Black Widow ghosts don't block crystal
          spending.
        </li>
      </ul>

      <h4 style={heading}>Save villager</h4>
      <p>
        A Taoist on the Portal tile may save the top villager from that tile during their Yang
        phase — taken to the Shelter. (Move villagers onto the Portal tile by clearing tiles
        between them and the Portal; this implementation surfaces the basic save action.)
      </p>

      <h4 style={heading}>Loss condition</h4>
      <p>
        The 12th villager death is an immediate loss, even before all Taoists die or the third
        haunting lands.
      </p>

      <h4 style={heading}>Per-family death curses + save rewards</h4>
      <p>
        Each of the 12 families has a distinct effect when a member dies and a distinct
        reward when the full family is saved:
      </p>
      <ul style={{ fontSize: 13 }}>
        <li><strong>3-person families</strong> (Hua/Zhou/Li/Sun) — heaviest penalties (Qi loss, Tao discard, Tao to supply); save rewards are Tao or Qi gains, or restored Yin-Yang.</li>
        <li><strong>2-person families</strong> (Miao/Xiang/Sheng/Wu) — mid-tier penalties (Sheng's death actually haunts a village tile); save rewards include Tao, Yin-Yang, unhaunting a tile, or a power token.</li>
        <li><strong>1-person families</strong> (Chang/Teng/Long/Weng) — no death penalty, but the save rewards are top-tier (moon crystal, power token, Yin-Yang, Qi).</li>
      </ul>

      <h4 style={heading}>Su-Ling</h4>
      <p>
        Su-Ling enters play on the first event that triggers her (a villager dies, a curse
        die is rolled, or a tile is haunted). She sits on an empty Haunting icon facing
        the most-pressured board. <strong>The center-stone abilities of the ghost in front
        of her are cancelled</strong> — Haunters, Tormentors, and Devourers all sit idle
        while she stands there. Players may move her to a different empty haunting icon
        via the <em>Su-Ling</em> action.
      </p>

      <h4 style={heading}>Villager fleeing on first Haunter advance</h4>
      <p>
        When a Haunter advances from card → stone 1 (the first tick of the haunting
        cycle), the top villager on the first tile in front of the ghost flees one tile
        in the opposite direction. If the destination tile is haunted, off-board, or
        already at 3 villagers, the fleeing villager dies instead.
      </p>

      <h4 style={heading}>Villager moves with Taoist</h4>
      <p>
        A Taoist may bring a villager with them when they move to an adjacent tile — set
        the <em>carryVillager</em> flag on the move. The villager must be on the Taoist's
        tile both before and after the move, and the destination must have room (≤ 2
        existing villagers).
      </p>

      <h4 style={heading}>Receptacles + Mystic Barrier</h4>
      <p>
        Place moon crystals into the 4 corner Receptacles via the <em>placeMoonCrystal</em>
        action while standing on the matching corner tile. When the 4th Receptacle fills,
        the <strong>Mystic Barrier</strong> queues for the end of the current Yang phase:
        the engine discards the highest-resistance non-incarnation ghost on every
        non-neutral board (no rewards, no curses) and returns the 4 crystals to the central
        reserve. This is a simplified resolution of the per-board choice the full rulebook
        prescribes.
      </p>

      <h4 style={heading}>Portal placement variants</h4>
      <p>
        New Game's "Portal placement" picker controls the difficulty: <strong>center</strong>
        (easy, default), <strong>edge</strong> (4 cardinal-edge tiles, medium), or
        <strong>corner</strong> (4 corners, hard). The portal lands on a random tile from
        the chosen set; villager stacks fill every non-portal tile.
      </p>

      <h4 style={heading}>Mystic Barrier — per-board interactive resolution</h4>
      <p>
        When the 4th receptacle fills, the engine enters a dedicated{' '}
        <code>'mysticBarrier'</code> phase. Starting from the board left of the active
        player and proceeding counter-clockwise, each board picks one of three options:
      </p>
      <ul>
        <li><strong>Save villager</strong> — spend 1 crystal to save the top villager from the Portal tile (or any visible villager if the Portal is empty).</li>
        <li><strong>Exorcise</strong> — roll 4 Tao dice + spend up to 4 crystals as wild Tao to discard one non-incarnation ghost on the current board (no rewards/curses).</li>
        <li><strong>Skip</strong> — pass on this board.</li>
      </ul>
      <p>
        After all 4 boards have chosen, leftover crystals return to the central reserve,
        the four receptacles reset, and the turn advances.
      </p>

      <p style={{ color: 'var(--ink-muted)', fontSize: 13, marginTop: 12 }}>
        Tao-color sub-choices for death-curse / save-reward "discard 1 Tao of choice" are
        resolved deterministically by the engine (first non-empty color in black→yellow
        →green→blue→red order). The Calligrapher tile exposes manual Mantra Qi placement
        when Black Secret is also active.
      </p>
    </div>
  ),
})

export const CATEGORIES: Array<{ id: Topic['category']; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'turn', label: 'Turn structure' },
  { id: 'mechanics', label: 'Mechanics' },
  { id: 'reference', label: 'Reference' },
  { id: 'modes', label: 'Modes & difficulty' },
]
