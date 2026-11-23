// End-of-game (and mid-game) statistics: headline numbers, Qi over the game,
// ghosts and hauntings over time, who exorcised what, and how lucky the dice were.
// Labels are written in Ghost Stories terms and put into the game's words (say).

import { useMemo } from 'react'
import { lossText } from '@/game/ops'
import { COLOR_NAME, isBastion, tileName } from '@/game/rules'
import { say } from '@/game/vocab'
import type { Color, CurseFace, GameState } from '@/game/types'
import { useGameStore } from '@/store/gameStore'
import { useLogStore } from '@/store/logStore'
import { CurseDie, TaoDie } from '@/ui/art'
import { CURSE_FACE_TEXT } from '@/ui/game/text'
import { BarList, LineChart, StatTile, type Series } from './charts'
import { computeStats, formatDuration } from './stats'
import './stats.css'

/** Taoist colours for charts on the dark surface (yellow deepened into the dark-mode band). */
export const CHART_COLOR: Record<Color, string> = { red: '#c1392b', blue: '#2c69b8', green: '#2f8f5d', yellow: '#bb8c30' }
/** The single-series hue (ghosts, hauntings, dice): distinct from every Taoist. */
const SPIRIT = '#8f84c9'

const DIE_NAME: Record<string, string> = { red: 'Red', blue: 'Blue', green: 'Green', yellow: 'Yellow', black: 'Black', white: 'White (wild)' }

export function StatsView({ game, onClose }: { game: GameState; onClose: () => void }) {
  const entries = useLogStore((l) => l.entries)
  const timeline = useLogStore((l) => l.timeline)
  const startedAt = useGameStore((g) => g.startedAt)
  const st = useMemo(() => computeStats(game, entries, timeline, startedAt), [game, entries, timeline, startedAt])
  const x = st.timeline.map((p) => p.turn)
  const qiSeries: Series[] = st.players.map((c) => ({ id: c, label: COLOR_NAME[c], color: CHART_COLOR[c], values: st.timeline.map((p) => p.qi[c]) }))
  const w = (text: string) => say(game, text)
  const bastion = isBastion(game)
  const result = game.phase !== 'gameOver' ? 'In progress' : game.outcome?.result === 'win' ? 'Victory' : 'Defeat'
  const reason = game.outcome?.result === 'loss' ? lossText(game, game.outcome.reason) : game.outcome?.result === 'win' ? w('the last incarnation was exorcised.') : ''
  const tileRows = st.tiles.map((t) => ({ id: t.kind, name: tileName(game, t.kind), label: tileName(game, t.kind), value: t.uses, color: SPIRIT }))

  return (
    <div className="st-screen">
      <div className="st-top">
        <h2>
          {result}
          {reason && <span className="st-reason"> — {reason}</span>}
        </h2>
        <button className="gs-btn" onClick={onClose}>
          Close
        </button>
      </div>

      <div className="st-tiles">
        <StatTile label="Turns" value={st.turns} />
        <StatTile label="Time" value={formatDuration(st.durationMs)} />
        <StatTile label={w('Ghosts exorcised')} value={st.exorcised} sub={`of ${st.arrivals} that came into play`} />
        <StatTile label={w('Qi lost')} value={st.qiLost} />
        <StatTile label={bastion ? 'Most tiles in the Grasp of Evil' : 'Most tiles haunted'} value={`${st.maxHaunted}/3`} />
        {game.whiteMoon && <StatTile label="Villagers saved" value={game.whiteMoon.saved.length} sub={`${game.whiteMoon.dead.length} killed`} />}
      </div>

      <div className="st-grid">
        <LineChart
          title={w('Qi over the game')}
          x={x}
          series={qiSeries}
          height={330}
          yMax={Math.max(4, ...qiSeries.flatMap((s) => s.values.map((v) => v ?? 0)))}
          caption={bastion ? 'At the end of each turn. A Hero at 0 is taken out.' : 'At the end of each turn. A Taoist at 0 is dead.'}
        />
        <div className="st-pair">
          <LineChart title={w('Ghosts on the boards')} x={x} series={[{ id: 'g', label: w('Ghosts'), color: SPIRIT, values: st.timeline.map((p) => p.ghosts) }]} height={150} yMax={12} />
          <LineChart
            title={bastion ? 'Tiles in the Grasp of Evil' : 'Haunted tiles'}
            x={x}
            series={[{ id: 'h', label: bastion ? 'Grasp of Evil' : 'Haunted', color: SPIRIT, values: st.timeline.map((p) => p.haunted) }]}
            height={150}
            yMax={3}
            caption={w('A 3rd haunted tile loses the game.')}
          />
        </div>

        <BarList
          title={w('Ghosts exorcised')}
          valueLabel={w('Ghosts')}
          rows={[...st.perTaoist]
            .sort((a, b) => b.exorcised - a.exorcised)
            .map((t) => ({
              id: t.color,
              name: COLOR_NAME[t.color],
              label: <span>{COLOR_NAME[t.color]}</span>,
              value: t.exorcised,
              color: CHART_COLOR[t.color],
              note: `${t.attempts} attempt${t.attempts === 1 ? '' : 's'}, ${t.attempts - t.failures} successful`,
            }))}
        />

        <div className="st-chart">
          <div className="st-chart-head">
            <h3>{w('Each Taoist')}</h3>
          </div>
          <div className="st-tablewrap">
            <table className="st-table">
              <thead>
                <tr>
                  <th />
                  <th>{w('Exorcisms')}</th>
                  <th>Success</th>
                  <th>{w('Ghosts')}</th>
                  <th>{w('Qi lost')}</th>
                  <th>{w('Qi gained')}</th>
                  <th>{bastion ? 'Tiles activated' : 'Help asked'}</th>
                  <th>{w('Yin-Yang')}</th>
                </tr>
              </thead>
              <tbody>
                {st.perTaoist.map((t) => (
                  <tr key={t.color}>
                    <td>
                      <span className="st-key" style={{ background: CHART_COLOR[t.color] }} />
                      {COLOR_NAME[t.color]}
                    </td>
                    <td>{t.attempts}</td>
                    <td>{t.attempts ? `${Math.round(((t.attempts - t.failures) / t.attempts) * 100)}%` : '—'}</td>
                    <td>{t.exorcised}</td>
                    <td>{t.qiLost}</td>
                    <td>{t.qiGained}</td>
                    <td>{t.helps}</td>
                    <td>{t.yinYang}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <BarList
          title={w(`Tao dice (${st.taoDiceTotal} rolled)`)}
          rows={st.taoDice.map((f) => ({
            id: f.face,
            name: DIE_NAME[f.face]!,
            label: (
              <span className="st-facelabel">
                <TaoDie face={f.face} size={18} /> {DIE_NAME[f.face]}
              </span>
            ),
            value: f.count,
            expected: f.expected,
            color: SPIRIT,
          }))}
        />
        <BarList
          title={bastion ? `Corruption die (${st.curseTotal} rolled)` : `Curse die (${st.curseTotal} rolled)`}
          rows={st.curse.map((f) => ({
            id: f.face,
            name: w(CURSE_FACE_TEXT[f.face as CurseFace]),
            label: (
              <span className="st-facelabel" title={w(CURSE_FACE_TEXT[f.face as CurseFace])}>
                <CurseDie face={f.face} size={18} /> {w(SHORT_CURSE[f.face])}
              </span>
            ),
            value: f.count,
            expected: f.expected,
            color: SPIRIT,
          }))}
          caption="The die has two blank faces."
          labelW={bastion ? 140 : undefined}
        />
        {tileRows.length > 0 && <BarList title={bastion ? 'Bastion tiles activated' : 'Villagers asked for help'} valueLabel="Times" rows={tileRows} labelW={150} />}
      </div>
    </div>
  )
}

const SHORT_CURSE: Record<CurseFace, string> = { blank: 'Blank', haunt: 'Haunt', ghost: 'Ghost', loseTao: 'Lose Tao', loseQi: 'Lose Qi' }
