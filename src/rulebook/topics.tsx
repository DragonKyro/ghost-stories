// Rulebook content, following the rules summary in `ghost stories rules.pdf`
// (Esoteric Order of Gamers v3.3). Each topic is plain prose plus pictures
// drawn with the game's own art components.

import type { ReactElement, ReactNode } from 'react'
import { CURSE_DIE, POWERS_BY_COLOR, type AbilityKind, type TileKind } from '@/game/types'
import { POWER_NAME, POWER_TEXT, TILE_NAME } from '@/game/rules'
import { AbilityIcon, CurseDie, PowerIcon, TaoDie, TileArt } from '@/ui/art'
import { ABILITY_TEXT, CURSE_FACE_TEXT, TILE_HELP } from '@/ui/game/text'
import { CURSE_EFFECT_TEXT, MANTRA_TEXT, TOKEN_NAME, TOKEN_TEXT } from '@/game/blackSecret'
import { ARTIFACT_NAME, ARTIFACT_TEXT, DEATH_TEXT, FAMILIES, rewardText } from '@/game/whiteMoon'

export type Topic = {
  id: string
  title: string
  category: 'overview' | 'turn' | 'mechanics' | 'reference' | 'modes'
  /** Plain text the search box matches against. */
  searchBlob: string
  body: () => ReactElement
}

const P = ({ children }: { children: ReactNode }) => <p style={{ lineHeight: 1.55, margin: '8px 0' }}>{children}</p>
const H = ({ children }: { children: ReactNode }) => <h3 style={{ fontFamily: 'var(--serif)', color: 'var(--accent)', margin: '18px 0 6px' }}>{children}</h3>
const Li = ({ children }: { children: ReactNode }) => <li style={{ margin: '4px 0', lineHeight: 1.5 }}>{children}</li>
const Row = ({ children }: { children: ReactNode }) => <div style={{ display: 'flex', gap: 10, alignItems: 'center', margin: '6px 0' }}>{children}</div>

const ABILITY_GROUPS: Array<[string, AbilityKind[]]> = [
  ['Left stone — when the ghost comes into play', ['addGhost', 'hauntTile', 'loseQi', 'haunterDirect']],
  ['Centre stone — each Yin phase, or while it stays', ['haunter', 'tormentor', 'powerBlocker', 'taoBlocker', 'dieCaptor', 'diceImmune', 'devourer']],
  ['Right stone — when it is exorcised (curses before rewards)', ['curse', 'loseTao', 'rewardQiOrYinYang', 'rewardTao1', 'rewardTao2', 'rewardCrystal', 'incarnationReward']],
]

const BASE_TILE_KINDS: TileKind[] = ['circleOfPrayer', 'buddhistTemple', 'cemetery', 'taoistAltar', 'herbalistShop', 'sorcerersHut', 'nightWatchman', 'pavilion', 'teaHouse']

export const TOPICS: Topic[] = [
  {
    id: 'overview',
    title: 'The game',
    category: 'overview',
    searchBlob: 'overview goal win lose cooperative wu-feng incarnation village haunted',
    body: () => (
      <>
        <P>
          1–4 Taoist monks defend a village from the ghosts of Wu-Feng. The village is 3×3 tiles, each with a villager who can help. Around it sit four player boards
          (red north, blue east, green south, yellow west); ghosts arrive on them, three spaces per board, each space facing a row or column of the village.
        </P>
        <P>
          <strong>Win</strong> by exorcising the last incarnation of Wu-Feng, hidden 10 cards from the bottom of the ghost deck. Even then, its curse is applied
          first: you win only if that doesn't defeat you.
        </P>
        <P>
          <strong>Lose</strong> when all the Taoists are dead, when a 3rd village tile is haunted, or when the ghost deck runs out while an incarnation is still in
          play. (White Moon adds: the 12th villager killed.)
        </P>
        <P>Everything is cooperative and open: talk it over, but only the active player decides their own moves.</P>
      </>
    ),
  },
  {
    id: 'setup',
    title: 'Setup',
    category: 'overview',
    searchBlob: 'setup qi tao yin-yang buddha deck incarnation power side board neutral power token solo',
    body: () => (
      <>
        <P>The 9 village tiles are laid out at random, all active. Each board shows one of its two powers (random, or chosen when you set up).</P>
        <ul>
          <Li>Each player: Qi (4 on Initiation, 3 otherwise), a Yin-Yang (none on Hell), a Tao token of their colour, plus a black one on Initiation. Taoists start on the central tile.</Li>
          <Li>The two Buddhas wait on the Buddhist Temple.</Li>
          <Li>The ghost deck: 45 ghosts; an incarnation goes exactly 10 cards from the bottom (Nightmare / Hell: 10 cards, an incarnation, repeated — 4 incarnations, 3 with 1–2 players).</Li>
          <Li>
            <strong>1–3 players:</strong> empty boards are neutral boards with 3 Qi. Remove 5 ghost cards per missing player, unseen. Each player gets a power
            token. 2 players must sit facing each other.
          </Li>
          <Li>
            <strong>Solo:</strong> the red board shows the Dance of the Spires; take one Tao token of each colour (plus black on Initiation) and 3 power tokens. No
            help from the Cemetery; the Pavilion moves your own Taoist.
          </Li>
        </ul>
      </>
    ),
  },
  {
    id: 'yin',
    title: 'Yin phase (the ghosts)',
    category: 'turn',
    searchBlob: 'yin phase haunter tormentor curse die board overrun arrival ghost placement black ghost',
    body: () => (
      <>
        <P>Turns go clockwise; neutral boards take turns too. Each turn starts with the ghosts on the active board.</P>
        <H>1. Ghosts' actions</H>
        <P>
          <strong>a. Haunters</strong> advance their haunting figure: from the card onto the board; from the board to the edge, haunting the first active tile in
          front of the ghost (if that one is already haunted, the next one on the line). The figure then returns to the card.
        </P>
        <P>
          <strong>b. Tormentors</strong> each roll the curse die for the active player:
        </P>
        {(['blank', 'haunt', 'ghost', 'loseTao', 'loseQi'] as const).map((f) => (
          <Row key={f}>
            <CurseDie face={f} size={34} /> {CURSE_FACE_TEXT[f]}
          </Row>
        ))}
        <P>The die has two blank faces ({CURSE_DIE.length} faces in all).</P>
        <H>2. Board overrun?</H>
        <P>If all 3 ghost spaces of the board are occupied: lose 1 Qi, and the Yin phase ends at once (no step 3).</P>
        <H>3. A ghost arrives</H>
        <P>
          Draw the top card. Red, green, blue and yellow ghosts go on their own board, black ghosts on the active player's board; you choose the space. If that
          board is full, choose any free space. If all 12 spaces are full, lose 1 Qi instead. Its left-stone ability applies at once. Neutral and possessed boards
          skip this step and have no Yang phase.
        </P>
      </>
    ),
  },
  {
    id: 'yang',
    title: 'Yang phase (the Taoist)',
    category: 'turn',
    searchBlob: 'yang phase move adjacent diagonal request help exorcism buddha yin-yang step order',
    body: () => (
      <>
        <P>Three steps, in order. The Yin-Yang power can be used before or after any of them.</P>
        <H>1. Move (optional)</H>
        <P>To an adjacent tile; diagonals allowed. (Dance of the Spires: anywhere.) Powers used “before your move” come first.</P>
        <H>2. Request help OR attempt an exorcism</H>
        <P>
          Only one of the two: ask the villager on your tile for its action (a haunted tile has none), or exorcise a ghost on a space your tile faces. A corner tile
          faces two spaces; the centre faces none. (Heavenly Gust allows one of each; Second Wind two of the same.)
        </P>
        <H>3. Place a Buddha (optional)</H>
        <P>
          A Buddha taken on an earlier turn can go on an empty ghost space you face (two from a corner tile). A ghost placed or moved onto it is destroyed at once —
          no abilities, no curse, no reward — and the Buddha goes back to the Temple.
        </P>
        <H>Yin-Yang</H>
        <P>Spend it to get help from any villager without standing there, or to flip a haunted tile back. Some ghosts give it back.</P>
      </>
    ),
  },
  {
    id: 'exorcism',
    title: 'Exorcism',
    category: 'mechanics',
    searchBlob: 'exorcism dice white wild black resistance tao tokens spend share corner two ghosts must circle mantra dice immune',
    body: () => (
      <>
        <P>Roll the 3 Tao dice and roll as many faces of the ghost's colour as its resistance. White faces are wild (any colour, black too).</P>
        <Row>
          {(['red', 'blue', 'green', 'yellow', 'black', 'white'] as const).map((f) => (
            <TaoDie key={f} face={f} size={34} />
          ))}
        </Row>
        <ul>
          <Li>Short? Spend Tao tokens of the colours you need. Taoists on the same tile can pool their tokens; otherwise tokens can't be given or traded.</Li>
          <Li>You never have to spend tokens, but if the dice alone are enough, you must exorcise.</Li>
          <Li>From a corner tile, one roll can exorcise both ghosts you face: it must cover both resistances.</Li>
          <Li>The Circle of Prayer's token and the Enfeeblement Mantra each lower a ghost's resistance by 1 (the Circle counts each colour a multicolour incarnation needs; the Mantra's colour is chosen after the roll).</Li>
          <Li>Failure: nothing happens (the action is spent).</Li>
          <Li>Success: the ghost is discarded; its right stone applies — curses first, then rewards.</Li>
        </ul>
      </>
    ),
  },
  {
    id: 'tiles',
    title: 'Village tiles',
    category: 'reference',
    searchBlob: `village tiles ${BASE_TILE_KINDS.map((k) => TILE_NAME[k] + ' ' + TILE_HELP[k]).join(' ')}`,
    body: () => (
      <>
        {BASE_TILE_KINDS.map((k) => (
          <Row key={k}>
            <TileArt kind={k} haunted={false} size={84} />
            <div>
              <strong>{TILE_NAME[k]}</strong>
              <div style={{ fontSize: 13.5, color: '#d9ccb5' }}>{TILE_HELP[k]}</div>
            </div>
          </Row>
        ))}
      </>
    ),
  },
  {
    id: 'abilities',
    title: 'Ghost abilities',
    category: 'reference',
    searchBlob: `ghost abilities icons ${Object.values(ABILITY_TEXT).join(' ')} group`,
    body: () => (
      <>
        {ABILITY_GROUPS.map(([title, kinds]) => (
          <div key={title}>
            <H>{title}</H>
            {kinds.map((k) => (
              <Row key={k}>
                <AbilityIcon kind={k} size={30} /> <span>{ABILITY_TEXT[k]}</span>
              </Row>
            ))}
          </div>
        ))}
        <Row>
          <AbilityIcon kind="loseQi" group size={30} /> The group mark: the ability applies to every player and board.
        </Row>
        <P>A ghost discarded by a Buddha or the Sorcerer never applies its curses or rewards.</P>
      </>
    ),
  },
  {
    id: 'powers',
    title: 'Taoist powers',
    category: 'reference',
    searchBlob: `powers ${Object.values(POWER_NAME).join(' ')} ${Object.values(POWER_TEXT).join(' ')} power token`,
    body: () => (
      <>
        {(['red', 'blue', 'green', 'yellow'] as const).map((c) => (
          <div key={c}>
            <H>{c[0]!.toUpperCase() + c.slice(1)} Taoist</H>
            {POWERS_BY_COLOR[c].map((p) => (
              <Row key={p}>
                <PowerIcon power={p} size={36} />
                <div>
                  <strong>{POWER_NAME[p]}</strong> — {POWER_TEXT[p]}
                </div>
              </Row>
            ))}
          </div>
        ))}
        <H>Power tokens</H>
        <P>
          A power token lets the active player use a neutral, unpossessed board's active power during their Yang phase — several tokens a turn, but not twice for
          the same power. Spent tokens (and a dead Taoist's) wait on the central tile; ending your turn there reclaims them.
        </P>
        <P>If the Enfeeblement Mantra's board loses its power, the Mantra token is removed from the game.</P>
      </>
    ),
  },
  {
    id: 'incarnations',
    title: 'Incarnations of Wu-Feng',
    category: 'reference',
    searchBlob: 'incarnations howling nightmare uncatchable death army forgotten ones bonecracker dark mistress creeping horror vampire lord hope killer nameless buddha sorcerer',
    body: () => (
      <>
        <P>
          Incarnations follow the normal placement rules. They ignore the Sorcerer's Hut and Buddhas: one arriving on a Buddha stays, and the Buddha goes back to the
          Temple. Each returns 1 Qi and 1 Yin-Yang to the group when exorcised (the players choose who gets them).
        </P>
        <ul>
          <Li><strong>Howling Nightmare</strong> — can only be exorcised while the ghost space facing it on the opposite board is empty.</Li>
          <Li><strong>Uncatchable</strong> — must stand on a Buddha to be exorcised (move it onto one, or it arrives on one). The only incarnation affected by Buddhas.</Li>
          <Li><strong>Death Army</strong> — while it is in play, the active player rolls the curse die every turn (whichever board is active; a haunt strikes in front of Death Army), and once more when it is destroyed.</Li>
          <Li><strong>Forgotten Ones</strong> — while in play no Taoist can use a power, power tokens included.</Li>
          <Li><strong>Bonecracker</strong> — every Taoist discards a Tao token when it arrives; its host discards another at the start of each of its Yin phases.</Li>
          <Li><strong>Dark Mistress</strong> — while in play nobody can use Tao tokens (the Circle of Prayer still works).</Li>
          <Li><strong>Creeping Horror</strong> — holds a Tao die captive: exorcisms roll one die fewer.</Li>
          <Li><strong>Vampire Lord</strong> — a Haunter with a resistance of 4.</Li>
          <Li><strong>Hope Killer</strong> — resistance 8: 2 red, 2 blue, 2 green, 2 yellow. Roll the curse die when it is destroyed.</Li>
          <Li><strong>Nameless</strong> — 1 of each colour, black included. Discards the Circle of Prayer's token on arrival; white faces are not wild while it lives.</Li>
        </ul>
      </>
    ),
  },
  {
    id: 'death',
    title: 'Death, neutral and possessed boards',
    category: 'mechanics',
    searchBlob: 'death dead qi zero possessed neutral board cemetery revive qi loss player of your choice',
    body: () => (
      <>
        <P>
          A Taoist with no Qi is dead: their Tao, Buddhas, Yin-Yang and power tokens are lost (power tokens go to the central tile), the figure lies on the Cemetery,
          and the ghosts on their board stay. The board is possessed: its power is inactive, and on its turns it still runs Yin steps 1 and 2.
        </P>
        <P>
          A neutral board has only a short Yin phase (no ghost arrives, no Yang phase). Its Tormentors are rolled for it (no green power helps), losing Tao means
          nothing, and Qi it loses comes off its own 3 Qi — it can never gain Qi. At 0 Qi it becomes possessed.
        </P>
        <P>Qi lost by a possessed board is taken by a Taoist of the players' choice.</P>
        <P>The Cemetery brings a dead Taoist back with 2 Qi on the Cemetery (then roll the curse die). The dead keep playing along and can still win.</P>
      </>
    ),
  },
  {
    id: 'white-moon',
    title: 'White Moon',
    category: 'modes',
    searchBlob: `white moon villagers families su-ling moon crystal receptacle mystic barrier portal kung-fu school devourer fleeing ${Object.values(FAMILIES).map((f) => f.name).join(' ')}`,
    body: () => (
      <>
        <P>
          The Night Watchman's Beat is replaced by the Kung-Fu School (or draw 9 tiles at random). 24 villagers in 12 families stand in stacks of 3 on the 8 tiles
          around the Portal. 10 new ghosts join the deck, then 10 random cards leave it. The 12th villager killed loses the game.
        </P>
        <ul>
          <Li><strong>Haunting a tile</strong> with villagers on it kills them all instead; the tile stays active.</Li>
          <Li><strong>Fleeing:</strong> when a haunting figure steps onto the board, the top villager of the first stack in front of the ghost flees one tile further along the line — and dies if that's off the village, haunted, or full (3).</Li>
          <Li><strong>Devourers</strong> kill the top villager in front of them each Yin phase (else any visible one; else lose 1 Qi). With several centre-stone ghosts, apply them right to left.</Li>
          <Li><strong>Escort</strong> one villager when you move (never through a haunted tile); <strong>save</strong> villagers on the Portal tile as your step-2 action.</Li>
          <Li><strong>Su-Ling:</strong> after a villager dies, a curse die is rolled or a tile is haunted, she may be placed (once per turn, at the end of it) in front of any non-incarnation ghost space, cancelling that ghost's centre stone. Next to an empty receptacle, she may fill it from the reserve.</Li>
          <Li><strong>Moon crystals</strong> (Herbalist's white faces, some rewards) count as a Tao token of any colour in exorcisms; Tao blockers and the curse die can't touch them. From a corner tile, in step 3, put one gained on an earlier turn in the receptacle there.</Li>
          <Li><strong>The Mystic Barrier:</strong> the 4th crystal raises it at the end of that turn. Starting left of the active player, each board spends a barrier crystal to save a villager, or rolls 4 dice against its ghosts (crystals as wild tokens; no curses or rewards; not incarnations).</Li>
          <Li><strong>Kung-Fu School:</strong> one roll against every ghost of your board's colour, or every black ghost; only your own tokens and crystals; no curses or rewards.</Li>
        </ul>
        <H>The families (our designs — the summary doesn't print their tiles)</H>
        {Object.values(FAMILIES).map((f) => (
          <P key={f.id}>
            <strong>{f.name}</strong> ({f.size}) — on death: {DEATH_TEXT[f.death]}. Whole family saved: {rewardText(f.reward)}.
          </P>
        ))}
        {(Object.keys(ARTIFACT_NAME) as Array<keyof typeof ARTIFACT_NAME>).map((a) => (
          <P key={a}>
            <strong>{ARTIFACT_NAME[a]}</strong> — {ARTIFACT_TEXT[a]}
          </P>
        ))}
      </>
    ),
  },
  {
    id: 'black-secret',
    title: 'Black Secret',
    category: 'modes',
    searchBlob: 'black secret wu-feng player catacombs ladder demon curse pyramid bloody mantra blood brother shadow urn skeleton summon calligrapher',
    body: () => (
      <>
        <P>One more player is Wu-Feng (or the AI). The ghost deck keeps 35 / 40 / 45 / 50 cards for 1–4 Taoists, with summon cards instead of incarnations.</P>
        <ul>
          <Li><strong>Every ghost drawn is Wu-Feng's:</strong> place it (normal placement rules), discard it to summon a demon costing at most its resistance, or discard it to throw a curse of its colour (black: any) on the pyramid — each higher curse rests on two below.</Li>
          <Li><strong>Summon cards:</strong> Wu-Feng draws an incarnation and puts one from his hand into play.</Li>
          <Li><strong>Demons</strong> act before each player's Yin phase, weakest first: move one space or search their catacomb space (not while a Taoist is there).</Li>
          <Li><strong>Ladders:</strong> after your move, climb down or up where a ladder stands (also after being moved by the Twin Winds or the Pavilion; the Dance of the Peaks moves twice, with a level change after each). In the catacombs your only action is exorcising demons (colour = their space); the Mantra can go on a demon.</Li>
          <Li><strong>Bloody Mantras:</strong> every lost Qi goes on a Mantra of your choice; a full one awakens.</Li>
          <Li><strong>Blood brothers:</strong> at 1 Qi you can also use the opposite board's power.</Li>
          <Li><strong>The Shadow of Wu-Feng</strong> rises with the third urn: invincible, it moves anywhere, attacks Taoists (3 dice, black = −1 Qi) or a tile (curse die), and blocks the tile it stands on.</Li>
          <Li><strong>Win:</strong> exorcise every incarnation in play once the deck holds no summon card.</Li>
        </ul>
        <H>Catacomb tokens</H>
        {(Object.keys(TOKEN_NAME) as Array<keyof typeof TOKEN_NAME>).map((k) => (
          <P key={k}>
            <strong>{TOKEN_NAME[k]}</strong> — {TOKEN_TEXT[k]}
          </P>
        ))}
        <H>Curses and Mantras (our designs)</H>
        {Object.entries(CURSE_EFFECT_TEXT).map(([k, v]) => (
          <P key={k}>• {v}</P>
        ))}
        {Object.entries(MANTRA_TEXT).map(([k, v]) => (
          <P key={k}>◦ {v}</P>
        ))}
      </>
    ),
  },
  {
    id: 'this-version',
    title: 'About this version',
    category: 'modes',
    searchBlob: 'version interpretation qi limit deck exhausted card list differences',
    body: () => (
      <>
        <P>The rules follow the Esoteric Order of Gamers summary (v3.3). Where it is silent, this version decides as follows:</P>
        <ul>
          <Li>The ghost cards are an original deck with the real structure: 9 per colour, resistance in the ghost's own colour, every ability from the reference sheet.</Li>
          <Li>There is no Qi maximum (none is given); neutral boards can't gain Qi.</Li>
          <Li>The deck is “exhausted” the moment its last card is drawn while an incarnation is in play.</Li>
          <Li>A ghost arriving on a Buddha is destroyed before its arrival ability applies.</Li>
          <Li>The Mantra comes back when its ghost leaves play, usable again from the next turn; it is removed from the game when its board loses its power (possessed, or a power blocker on it).</Li>
          <Li>A corner exorcism can take one ghost or both; any ghost the dice alone beat must be exorcised.</Li>
          <Li>All 12 ghost spaces full: no card is drawn, and the active player loses 1 Qi.</Li>
          <Li>Tao supply: 10 tokens of each colour.</Li>
          <Li>White Moon family effects, artifacts, and Black Secret curse tokens, Bloody Mantras and catacomb colours are our own designs on the summary's rules.</Li>
        </ul>
      </>
    ),
  },
]

export const CATEGORIES: Array<{ id: Topic['category']; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'turn', label: 'Turn structure' },
  { id: 'mechanics', label: 'Mechanics' },
  { id: 'reference', label: 'Reference' },
  { id: 'modes', label: 'Expansions & notes' },
]
