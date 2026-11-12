// White Moon (Shelter, Graveyard, receptacles, Su-Ling) and Black Secret
// (Wu-Feng's board: curse pyramid, demons, Bloody Mantras, the catacombs).

import { CURSE_EFFECT_TEXT, DEMONS, MANTRA_TEXT, TOKEN_NAME } from '@/game/blackSecret'
import { COLOR_NAME, TILE_NAME } from '@/game/rules'
import { familyName, FAMILIES, rewardText } from '@/game/whiteMoon'
import { COLORS, type Corner, type GameState } from '@/game/types'
import { COLOR_HEX, CurseTokenArt, DemonFigure, MoonCrystal, ReceptacleIcon, ShadowFigure, SkeletonToken, SuLingFigure, TaoistFigure, VillagerToken } from '@/ui/art'
import { useInteraction } from './interaction'

export function ExpansionPanel({ game }: { game: GameState }) {
  return (
    <div style={{ overflowY: 'auto', padding: 8, fontSize: 12 }}>
      {game.whiteMoon && <WhiteMoonStatus game={game} />}
      {game.blackSecret && <BlackSecretStatus game={game} />}
    </div>
  )
}

function WhiteMoonStatus({ game }: { game: GameState }) {
  const wm = game.whiteMoon!
  const families = Object.values(FAMILIES)
  return (
    <div>
      <h4 style={{ margin: '0 0 4px' }}>White Moon</h4>
      <div className="gs-row" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span>
          <MoonCrystal size={14} /> reserve {wm.crystalReserve}
        </span>
        {(['nw', 'ne', 'sw', 'se'] as Corner[]).map((k) => (
          <span key={k} title={`${k.toUpperCase()} receptacle`}>
            <ReceptacleIcon filled={wm.receptacles[k]} size={18} /> {k.toUpperCase()}
          </span>
        ))}
        <span>
          <SuLingFigure size={16} /> {wm.suLing ? `${COLOR_NAME[wm.suLing.board]} space ${wm.suLing.space + 1}` : 'in reserve'}
        </span>
      </div>
      <h4>Families (saved · dead / size)</h4>
      <div className="gs-grid2">
        {families.map((f) => {
          const saved = wm.saved.filter((v) => v.family === f.id).length
          const dead = wm.dead.filter((v) => v.family === f.id).length
          return (
            <div key={f.id} title={`Saving the whole family: ${rewardText(f.reward)}`} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <VillagerToken family={f.id} size={18} />
              <span>
                {f.name} {saved}·{dead}/{f.size}
              </span>
            </div>
          )
        })}
      </div>
      <p className="gs-mini">
        Shelter: {wm.saved.length ? wm.saved.map(familyName).join(', ') : 'empty'} · Graveyard {wm.dead.length}/12
      </p>
      {wm.barrier && <p>Mystic Barrier: {wm.barrier.crystals} crystals; to come: {wm.barrier.order.join(', ')}.</p>}
    </div>
  )
}

function BlackSecretStatus({ game }: { game: GameState }) {
  const bs = game.blackSecret!
  const ia = useInteraction(game)
  return (
    <div>
      <h4 style={{ margin: '6px 0 4px' }}>Wu-Feng</h4>
      <p className="gs-mini">
        Incarnations in hand {bs.incarnationHand.length} · in the pile {bs.incarnationPile.length} · urns {bs.urns}/3 ·{' '}
        <SkeletonToken size={12} /> skeletons {bs.skeletonsLeft}
      </p>
      <div className="gs-pyramid">
        {([1, 2, 3, 4] as const).map((level) => (
          <div key={level} className="gs-prow">
            {bs.pyramid[level].map((tok, i) => (
              <div key={i} className="gs-pslot" title={tok ? CURSE_EFFECT_TEXT[tok.effect] : `Level ${level}`}>
                {tok && <CurseTokenArt level={tok.level} color={tok.color} size={26} />}
              </div>
            ))}
          </div>
        ))}
      </div>
      <h4>Curses in Wu-Feng's hand</h4>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {bs.curseHand.map((t) =>
          t.revealed ? (
            <span key={t.id} title={`L${t.level} ${t.color}: ${CURSE_EFFECT_TEXT[t.effect]}`}>
              <CurseTokenArt level={t.level} color={t.color} size={22} />
            </span>
          ) : (
            <span key={t.id} className="gs-pslot" style={{ width: 22, height: 22, fontSize: 9 }} title={`Face-down level ${t.level} curse`}>
              L{t.level}
            </span>
          ),
        )}
      </div>
      <h4>Bloody Mantras</h4>
      {bs.mantras.map((m) => (
        <div key={m.id} style={{ display: 'flex', gap: 6, alignItems: 'center', margin: '2px 0' }}>
          <span style={{ color: '#e0563f', fontWeight: 700, width: 38 }}>
            {m.qi}/{m.level}
          </span>
          <span>{MANTRA_TEXT[m.effect]}</span>
        </div>
      ))}
      <h4>Demons</h4>
      <div style={{ display: 'flex', gap: 8 }}>
        {bs.demons.map((d) => (
          <span key={d.id} title={`Cost ${d.cost}, resistance ${d.resistance}`} style={{ opacity: d.space === null ? 0.5 : 1 }}>
            <DemonFigure id={d.id} size={22} /> {DEMONS[d.id].name} {d.space === null ? (d.banished ? '(banished)' : '(reserve)') : `(space ${d.space + 1})`}
          </span>
        ))}
      </div>
      <h4>The catacombs</h4>
      <div className="gs-catacombs">
        {bs.catacombColors.map((color, i) => {
          const target = ia.catacombs.has(i)
          const taoists = COLORS.filter((c) => game.taoists[c].alive && game.taoists[c].underground && game.taoists[c].tile === i)
          return (
            <div
              key={i}
              className={`gs-cat ${target ? 'gs-target' : ''}`}
              style={{ background: `${COLOR_HEX[color]}44`, borderColor: COLOR_HEX[color] }}
              onClick={() => target && ia.onCatacomb(i)}
              title={`Below the ${TILE_NAME[game.village[i]!.kind]} · ${bs.catacombs[i]!.length} tokens${game.village[i]!.ladder ? ' · ladder' : ''}`}
            >
              <span className="gs-mini">
                {bs.catacombs[i]!.length} tok{game.village[i]!.ladder ? ' · ⇅' : ''}
              </span>
              <div style={{ display: 'flex', gap: 1 }}>
                {bs.demons.filter((d) => d.space === i).map((d) => (
                  <DemonFigure key={d.id} id={d.id} size={20} />
                ))}
                {taoists.map((c) => (
                  <TaoistFigure key={c} color={c} size={20} />
                ))}
                {bs.shadow?.where === 'catacombs' && bs.shadow.tile === i && <ShadowFigure size={22} />}
              </div>
            </div>
          )
        })}
      </div>
      <p className="gs-mini">Searched tokens are revealed in the log ({Object.values(TOKEN_NAME).join(', ')}).</p>
    </div>
  )
}
