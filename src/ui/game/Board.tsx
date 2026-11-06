// The table: the 3×3 village, the four player boards on its sides (each ghost
// space lined up with the row / column it faces), and each player's plate in
// a corner.

import type { CSSProperties } from 'react'
import { cardOnBoard } from '@/game/catalogue'
import { refKey } from '@/game/geometry'
import { boardPowerActive, COLOR_NAME, POWER_NAME, POWER_TEXT, powersSuppressed, suLingAt, TILE_NAME } from '@/game/rules'
import { BOARD_SIDE, COLORS, TAO_COLORS, type Color, type GameState, type GhostRef, type SpaceIdx, type TileIdx } from '@/game/types'
import {
  BuddhaFigure,
  COLOR_DARK,
  COLOR_HEX,
  COLOR_LIGHT,
  GhostCardArt,
  HauntingFigure,
  InactiveMarker,
  LadderIcon,
  MantraToken,
  MoonCrystal,
  PortalIcon,
  PowerIcon,
  PowerToken,
  QiToken,
  ShadowFigure,
  SuLingFigure,
  TaoistFigure,
  TaoToken,
  TileArt,
  VillagerToken,
  YinYangToken,
} from '@/ui/art'
import { useUiStore } from '@/store/uiStore'
import { seatName, useNetworkStore } from '@/store/networkStore'
import type { Interaction } from './interaction'
import { familyName, ARTIFACT_NAME } from '@/game/whiteMoon'

export function colorVars(c: Color): CSSProperties {
  return {
    ['--pc' as string]: COLOR_HEX[c],
    ['--pc-dark' as string]: COLOR_DARK[c],
    ['--pc-light' as string]: COLOR_LIGHT[c],
    ['--pc-glow' as string]: `${COLOR_HEX[c]}88`,
  }
}

const PLATE_CELL: Record<Color, { col: number; row: number }> = {
  red: { col: 1, row: 1 },
  blue: { col: 5, row: 1 },
  green: { col: 5, row: 5 },
  yellow: { col: 1, row: 5 },
}

const BOARD_CELL: Record<Color, CSSProperties> = {
  red: { gridColumn: '2 / 5', gridRow: 1 },
  green: { gridColumn: '2 / 5', gridRow: 5 },
  yellow: { gridColumn: 1, gridRow: '2 / 5' },
  blue: { gridColumn: 5, gridRow: '2 / 5' },
}

export function Board({ game, ia, tile }: { game: GameState; ia: Interaction; tile: number }) {
  return (
    <div className="gs-board">
      {game.village.map((t) => (
        <TileView key={t.idx} game={game} idx={t.idx} ia={ia} size={tile} />
      ))}
      {COLORS.map((c) => (
        <PlayerBoardView key={c} game={game} color={c} ia={ia} tile={tile} />
      ))}
      {COLORS.map((c) => (
        <div key={`p-${c}`} style={{ gridColumn: PLATE_CELL[c].col, gridRow: PLATE_CELL[c].row, display: 'flex' }}>
          <PlayerPlate game={game} color={c} />
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------

function TileView({ game, idx, ia, size }: { game: GameState; idx: TileIdx; ia: Interaction; size: number }) {
  const t = game.village[idx]!
  const setInspect = useUiStore((u) => u.setInspect)
  const col = (idx % 3) + 2
  const row = Math.floor(idx / 3) + 2
  const target = ia.tiles.has(idx)
  const standing = COLORS.filter((c) => game.taoists[c].alive && game.taoists[c].tile === idx && !game.taoists[c].underground)
  const lying = t.kind === 'cemetery' ? COLORS.filter((c) => !game.boards[c].neutral && !game.taoists[c].alive) : []
  const fig = Math.round(size * 0.24)
  const sh = game.blackSecret?.shadow
  const shadowHere = sh?.where === 'village' && sh.tile === idx
  const top = t.villagers[t.villagers.length - 1]
  return (
    <div
      className={`gs-tile ${t.haunted ? 'haunted' : ''} ${target ? `gs-target ${ia.soft ? 'gs-soft' : ''}` : ''}`}
      style={{ gridColumn: col, gridRow: row }}
      onClick={() => target && ia.onTile(idx)}
      onMouseEnter={() => setInspect({ kind: 'tile', tile: idx })}
      onMouseLeave={() => setInspect(null)}
    >
      <TileArt kind={t.kind} haunted={t.haunted} size={size} className="gs-tileart" />
      <div className="gs-tilename">{TILE_NAME[t.kind]}</div>
      <div className="gs-corner-tl">
        {t.kind === 'circleOfPrayer' && t.circleToken && <TaoToken color={t.circleToken} size={Math.round(size * 0.17)} />}
        {t.kind === 'buddhistTemple' && Array.from({ length: game.templeBuddhas }, (_, i) => <BuddhaFigure key={i} size={Math.round(size * 0.17)} />)}
        {idx === 4 && Array.from({ length: game.centerPowerTokens }, (_, i) => <PowerToken key={i} color="yellow" size={Math.round(size * 0.13)} title="Power token waiting on the central tile" />)}
        {t.portal && <PortalIcon size={Math.round(size * 0.2)} title="The Portal: save villagers here" />}
      </div>
      <div className="gs-corner-tr">
        {top && (
          <div style={{ position: 'relative' }} title={t.villagers.map((v) => familyName(v)).reverse().join(' / ')}>
            <VillagerToken family={top.family} size={Math.round(size * 0.2)} />
            <span style={{ position: 'absolute', right: -3, bottom: -3, fontSize: 10, background: '#1d1611', borderRadius: 6, padding: '0 3px' }}>{t.villagers.length}</span>
          </div>
        )}
        {t.ladder && <LadderIcon size={Math.round(size * 0.15)} title="Ladder down to the catacombs" />}
      </div>
      <div className="gs-figures">
        {standing.map((c) => (
          <TaoistFigure key={c} color={c} size={fig} style={{ filter: game.active === c ? `drop-shadow(0 0 6px ${COLOR_HEX[c]})` : undefined }} />
        ))}
        {lying.map((c) => (
          <TaoistFigure key={`d-${c}`} color={c} size={fig} lying title={`${COLOR_NAME[c]} lies dead on the Cemetery`} />
        ))}
        {shadowHere && <ShadowFigure size={Math.round(size * 0.32)} title="The Shadow of Wu-Feng" />}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

function PlayerBoardView({ game, color, ia, tile }: { game: GameState; color: Color; ia: Interaction; tile: number }) {
  const side = BOARD_SIDE[color]
  const active = game.active === color
  return (
    <div className={`gs-pboard ${side} ${active ? 'active' : ''}`} style={{ ...BOARD_CELL[color], ...colorVars(color) }}>
      {([0, 1, 2] as SpaceIdx[]).map((space) => (
        <SpaceView key={space} game={game} ghostRef={{ board: color, space }} ia={ia} tile={tile} />
      ))}
    </div>
  )
}

function SpaceView({ game, ghostRef, ia, tile }: { game: GameState; ghostRef: GhostRef; ia: Interaction; tile: number }) {
  const setInspect = useUiStore((u) => u.setInspect)
  const b = game.boards[ghostRef.board]
  const g = b.spaces[ghostRef.space]
  const key = refKey(ghostRef)
  const target = ia.spaces.has(key)
  const picked = ia.picked.has(key)
  const cardW = Math.round(tile * 0.6)
  const card = g ? cardOnBoard(g.card, ghostRef.board) : null
  const fig = Math.round(tile * 0.17)
  const suLing = suLingAt(game, ghostRef)
  return (
    <div
      className={`gs-space ${target ? `gs-target ${ia.soft ? 'gs-soft' : ''}` : ''} ${picked ? 'gs-picked' : ''}`}
      onClick={() => target && ia.onSpace(ghostRef)}
      onMouseEnter={() => g && setInspect({ kind: 'ghost', ref: ghostRef })}
      onMouseLeave={() => setInspect(null)}
    >
      <div className={`gs-cardslot ${card ? 'filled' : ''}`}>
        {card ? <GhostCardArt card={card} width={cardW} compact /> : <span>{ghostRef.space + 1}</span>}
        {g?.figure === 'card' && (
          <div className="gs-onCard" style={{ right: -4, top: -6 }}>
            <HauntingFigure size={fig} title="Haunting figure on the card" />
          </div>
        )}
        {g?.mantra && (
          <div className="gs-onCard" style={{ left: -4, top: -6 }}>
            <MantraToken size={fig} title="Enfeeblement Mantra: resistance −1" />
          </div>
        )}
      </div>
      <div className="gs-track">
        <div className="gs-buddha-spot" title="Buddha space">
          {b.buddhas[ghostRef.space] && <BuddhaFigure size={Math.round(tile * 0.18)} />}
        </div>
        <div className="gs-stone" title="Haunting stone">
          {g?.figure === 'stone' && <HauntingFigure size={fig} title="Haunting figure: it haunts on this board's next Yin phase" />}
          {suLing && <SuLingFigure size={fig} title="Su-Ling cancels the centre stone of this ghost" />}
        </div>
        <div className="gs-stone edge" title="Haunting stone (the village edge)" />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

export function PlayerPlate({ game, color }: { game: GameState; color: Color }) {
  const b = game.boards[color]
  const t = game.taoists[color]
  const online = useNetworkStore((n) => n.connection === 'in-game')
  const who = online ? seatName(color) : t.kind === 'ai' ? 'AI' : null
  const powerOn = boardPowerActive(game, color) && !powersSuppressed(game)
  const s = 16
  return (
    <div className={`gs-plate ${game.active === color ? 'active' : ''} ${!t.alive && !b.neutral ? 'dead' : ''}`} style={{ ...colorVars(color), flex: 1 }}>
      <div className="gs-plate-head">
        <span>{COLOR_NAME[color]}</span>
        <span className="gs-who">{b.neutral ? (b.possessed ? 'neutral · possessed' : 'neutral board') : !t.alive ? 'dead' : who ?? ''}</span>
      </div>
      <div className={`gs-power ${powerOn ? '' : 'off'}`} title={`${POWER_NAME[b.power]}: ${POWER_TEXT[b.power]}`}>
        <PowerIcon power={b.power} size={22} />
        <span>{POWER_NAME[b.power]}</span>
        {!powerOn && <InactiveMarker size={14} title="Power inactive" />}
      </div>
      {b.neutral ? (
        <div className="gs-row">
          {Array.from({ length: b.qi }, (_, i) => <QiToken key={i} size={s} />)}
          {b.qi === 0 && <span className="gs-count">no Qi</span>}
        </div>
      ) : t.alive ? (
        <>
          <div className="gs-row" title={`${t.qi} Qi`}>
            {Array.from({ length: Math.min(t.qi, 7) }, (_, i) => <QiToken key={i} size={s} />)}
            {t.qi > 7 && <span className="gs-count">×{t.qi}</span>}
            {t.yinYang && <YinYangToken size={s} title="Yin-Yang ready" />}
          </div>
          <div className="gs-row">
            {TAO_COLORS.filter((x) => t.tao[x] > 0).map((x) => (
              <span key={x} style={{ display: 'inline-flex', alignItems: 'center' }}>
                <TaoToken color={x} size={s} />
                {t.tao[x] > 1 && <span className="gs-count">{t.tao[x]}</span>}
              </span>
            ))}
            {Object.values(t.tao).every((n) => n === 0) && <span className="gs-count">no Tao</span>}
          </div>
          <div className="gs-row">
            {Array.from({ length: t.buddhas }, (_, i) => <BuddhaFigure key={i} size={s} title="Buddha in hand" />)}
            {Array.from({ length: t.powerTokens }, (_, i) => <PowerToken key={i} color={color} size={s - 2} title="Power token" />)}
            {Array.from({ length: t.crystals }, (_, i) => <MoonCrystal key={i} size={s} title="Moon crystal" />)}
            {t.artifacts.map((a) => (
              <span key={a} className="gs-count" title={ARTIFACT_NAME[a]}>
                ✦{ARTIFACT_NAME[a]}
              </span>
            ))}
            {t.underground && <span className="gs-count">in the catacombs</span>}
          </div>
        </>
      ) : (
        <div className="gs-row gs-count">Lies on the Cemetery. Their board is possessed.</div>
      )}
    </div>
  )
}
