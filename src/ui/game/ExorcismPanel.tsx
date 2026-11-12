// An exorcism on the table: the dice, the Gods' Favorite reroll, which Tao
// tokens / moon crystals to spend, which targets are exorcised.

import { useEffect, useMemo, useState } from 'react'
import type { CrystalSpend, TaoSpend } from '@/game/actions'
import { DEMONS } from '@/game/blackSecret'
import { bestCommit, covers, requirementsFor, spendersFor, spendVec } from '@/game/exorcism'
import { refKey } from '@/game/geometry'
import { cardAt, COLOR_NAME, taoBlocked, whiteIsWild } from '@/game/rules'
import { TAO_COLORS, type DemonId, type ExorcismRoll, type GameState, type GhostRef, type Seat, type TaoColor } from '@/game/types'
import { useGameStore } from '@/store/gameStore'
import { GhostCardArt, MoonCrystal, TaoDie, TaoToken } from '@/ui/art'
import { useInBar } from './placement'

export function ExorcismPanel({ game, roll, owner, mine }: { game: GameState; roll: ExorcismRoll; owner: Seat; mine: boolean }) {
  const dispatch = useGameStore((g) => g.dispatch)
  const rollKey = roll.dice.join(',') + roll.canReroll
  const best = useMemo(() => bestCommit(game, roll), [game, roll])
  const [chosen, setChosen] = useState<string[]>([])
  const [demons, setDemons] = useState<string[]>([])
  const [spend, setSpend] = useState<TaoSpend[]>([])
  const [crystals, setCrystals] = useState<CrystalSpend[]>([])
  const [marked, setMarked] = useState<number[]>([])
  const [fresh, setFresh] = useState(true)

  // A new roll (or reroll): start from the best suggestion.
  useEffect(() => {
    setChosen(best.exorcise.map(refKey))
    setDemons(best.demons)
    setSpend(best.plan.spend)
    setCrystals(best.plan.crystals)
    setMarked([])
    setFresh(true)
    const t = setTimeout(() => setFresh(false), 600)
    return () => clearTimeout(t)
  }, [rollKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const targets = roll.targets.filter((r) => chosen.includes(refKey(r)))
  const reqs = requirementsFor(game, roll, targets, demons)
  const ok = targets.length + demons.length > 0 && covers(reqs, roll.dice, whiteIsWild(game), spendVec(spend), crystals.length)
  const spenders = spendersFor(game, roll)
  const blocked = taoBlocked(game) || roll.mode === 'barrier'
  const canSpendTao = !blocked && spenders.some((c) => TAO_COLORS.some((col) => game.taoists[c].tao[col] > 0))
  const inBar = useInBar()

  const toggleTarget = (r: GhostRef) => {
    const k = refKey(r)
    setChosen(chosen.includes(k) ? chosen.filter((x) => x !== k) : [...chosen, k])
  }
  const countSpent = (from: string, color: TaoColor) => spend.filter((x) => x.from === from && x.color === color).length
  const bump = (from: TaoSpend['from'], color: TaoColor) => {
    const have = game.taoists[from].tao[color]
    const n = countSpent(from, color)
    if (n >= have) setSpend(spend.filter((x) => !(x.from === from && x.color === color)))
    else setSpend([...spend, { from, color }])
  }
  const crystalPool: Array<{ from: CrystalSpend['from']; n: number }> = game.whiteMoon
    ? roll.mode === 'barrier'
      ? [{ from: 'barrier', n: game.whiteMoon.barrier?.crystals ?? 0 }]
      : spenders.map((c) => ({ from: c, n: game.taoists[c].crystals }))
    : []
  const bumpCrystal = (from: CrystalSpend['from'], n: number) => {
    const used = crystals.filter((x) => x.from === from).length
    if (used >= n) setCrystals(crystals.filter((x) => x.from !== from))
    else setCrystals([...crystals, { from, as: firstColor(reqs) }])
  }

  const commit = (fail: boolean) =>
    dispatch({
      type: 'respond',
      by: owner,
      r: fail
        ? { kind: 'commit', spend: [], crystals: [], exorcise: [], demons: [] }
        : { kind: 'commit', spend, crystals, exorcise: targets, demons: demons as DemonId[] },
    })

  const title =
    roll.mode === 'kungFu' ? 'Kung-Fu School' : roll.mode === 'barrier' ? `Mystic Barrier — ${roll.barrierBoard} board` : roll.mode === 'demon' ? 'Fighting demons' : 'Exorcism'
  return (
    <div className="gs-card">
      <h3>
        {title} — {COLOR_NAME[roll.actor]}
      </h3>
      <div className="gs-cols gs-exo-cols">
        <div className="gs-col">
          <div className="gs-dice" style={{ marginBottom: 6 }}>
            {roll.dice.map((d, i) => (
              <span
                key={`${i}-${d}-${rollKey}`}
                className={`gs-die ${fresh ? 'gs-rolling' : ''} ${mine && roll.canReroll ? 'pick' : ''} ${marked.includes(i) ? 'marked' : ''}`}
                onClick={() => mine && roll.canReroll && setMarked(marked.includes(i) ? marked.filter((x) => x !== i) : [...marked, i])}
              >
                <TaoDie face={d} size={inBar ? 34 : 40} />
              </span>
            ))}
            {roll.dice.length === 0 && <span className="gs-mini">No dice (all captured) — only tokens can help.</span>}
          </div>
          {mine && roll.canReroll && (
            <div className="gs-btnrow" style={{ marginBottom: 6 }}>
              <button className="gs-btn small" disabled={marked.length === 0} onClick={() => dispatch({ type: 'respond', by: owner, r: { kind: 'reroll', dice: marked } })}>
                The Gods’ Favorite: reroll {marked.length || ''} marked
              </button>
              <span className="gs-mini">Click dice to mark them. You must keep the second result.</span>
            </div>
          )}
        </div>

        <div className="gs-col">
          <h4>Targets</h4>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {roll.targets.map((r) => {
              const card = cardAt(game, r)
              if (!card) return null
              const on = chosen.includes(refKey(r))
              return (
                <div key={refKey(r)} onClick={() => mine && toggleTarget(r)} style={{ cursor: mine ? 'pointer' : 'default', opacity: on ? 1 : 0.45, outline: on ? '2px solid #f2c14e' : 'none', borderRadius: 6 }}>
                  <GhostCardArt card={card} width={inBar ? 52 : roll.targets.length > 3 ? 56 : 74} compact />
                </div>
              )
            })}
            {roll.demons.map((d) => {
              const on = demons.includes(d)
              return (
                <button key={d} className={`gs-btn small ${on ? 'on' : ''}`} onClick={() => mine && setDemons(on ? demons.filter((x) => x !== d) : [...demons, d])}>
                  {DEMONS[d].name} ({DEMONS[d].resistance})
                </button>
              )
            })}
          </div>
        </div>

        {(canSpendTao || taoBlocked(game) || crystalPool.some((p) => p.n > 0)) && (
          <div className="gs-col">
            {canSpendTao && (
              <>
                <h4>Spend Tao tokens{spenders.length > 1 ? ' (anyone on this tile)' : ''}</h4>
                {spenders.map((c) => (
                  <div key={c} className="gs-chips" style={{ marginBottom: 3 }}>
                    <span className="gs-mini" style={{ width: 46 }}>
                      {COLOR_NAME[c]}
                    </span>
                    {TAO_COLORS.filter((col) => game.taoists[c].tao[col] > 0).map((col) => {
                      const n = countSpent(c, col)
                      return (
                        <button key={col} className={`gs-chip ${n ? 'on' : ''}`} disabled={!mine} onClick={() => bump(c, col)}>
                          <TaoToken color={col} size={15} /> {n}/{game.taoists[c].tao[col]}
                        </button>
                      )
                    })}
                  </div>
                ))}
              </>
            )}
            {taoBlocked(game) && roll.mode !== 'barrier' && <div className="gs-why">A Tao blocker is in play: Tao tokens can't be spent (moon crystals still can).</div>}
            {crystalPool.some((p) => p.n > 0) && (
              <>
                <h4>Moon crystals (any colour)</h4>
                <div className="gs-chips">
                  {crystalPool
                    .filter((p) => p.n > 0)
                    .map((p) => {
                      const used = crystals.filter((x) => x.from === p.from).length
                      return (
                        <button key={p.from} className={`gs-chip ${used ? 'on' : ''}`} disabled={!mine} onClick={() => bumpCrystal(p.from, p.n)}>
                          <MoonCrystal size={15} /> {p.from === 'barrier' ? 'barrier' : COLOR_NAME[p.from]} {used}/{p.n}
                        </button>
                      )
                    })}
                </div>
              </>
            )}
          </div>
        )}

        <div className="gs-col gs-col-end">
          <div className="gs-hint" style={{ marginTop: inBar ? 0 : 8 }}>
            {targets.length + demons.length === 0 ? 'Nothing selected.' : ok ? 'Covered — the exorcism succeeds.' : 'Not enough: spend more, or give up.'}
            {best.exorcise.length + best.demons.length === 0 && ' (No spend can cover it.)'}
          </div>
          {mine ? (
            <div className="gs-btnrow" style={{ marginTop: 6 }}>
              <button className="gs-btn primary" disabled={!ok} onClick={() => commit(false)} style={{ flex: 1 }}>
                {roll.mode === 'barrier' || roll.mode === 'kungFu' ? 'Exorcise them' : 'Exorcise!'}
              </button>
              <button
                className="gs-btn"
                onClick={() => {
                  setSpend(best.plan.spend)
                  setCrystals(best.plan.crystals)
                  setChosen(best.exorcise.map(refKey))
                  setDemons(best.demons)
                }}
              >
                Cheapest
              </button>
              <button className="gs-btn" onClick={() => commit(true)} title="Spend nothing: the exorcism fails (not allowed when the dice alone succeed).">
                Give up
              </button>
            </div>
          ) : (
            <p className="gs-mini">Waiting for {COLOR_NAME[roll.actor]}…</p>
          )}
        </div>
      </div>
    </div>
  )
}

function firstColor(reqs: ReturnType<typeof requirementsFor>): TaoColor {
  for (const r of reqs) for (const c of TAO_COLORS) if ((r.base[c] ?? 0) > 0) return c
  return 'red'
}
