"""The self-play curriculum: which monk each game is played as, where it starts, and how the
danger hint is split — all adapted from how the network has been losing.

- Monks: each monk's win rate in recent whole games (an exponential moving average). A game's
  monk is drawn with weight (1 - win rate) ** gamma, with a floor, so the weakest monks get the
  most practice.
- Phases: where recent whole games were lost (early / mid / late, src/ai/nn/phase.ts). A share
  of the games (`start_frac`) begins from a position in a phase drawn with weight equal to its
  share of the losses (with a floor), taken from a bank of positions the actors capture from the
  network's own recent games, by monk and phase.
- Danger split: the danger hint's Qi and haunting parts are weighted by the shares of the
  recent losses to running out of Qi and to the third haunted tile.

The state (moving averages) is saved beside each checkpoint so a later run carries on.
"""

from __future__ import annotations

import json
import random
from collections import deque
from dataclasses import asdict, dataclass, field
from pathlib import Path

MONKS: list[tuple[str, str]] = [
    ('red', 'danceOfTheSpires'),
    ('blue', 'heavenlyGust'),
    ('blue', 'secondWind'),
    ('green', 'godsFavorite'),
    ('green', 'strengthOfMountain'),
    ('yellow', 'bottomlessPockets'),
    ('yellow', 'enfeeblementMantra'),
]
PHASES = ['early', 'mid', 'late']


def monk_key(seat: str, power: str) -> str:
    return f'{seat}/{power}'


@dataclass
class CurriculumConfig:
    start_frac: float = 0.5
    monk_gamma: float = 3.0
    monk_floor: float = 0.06
    phase_floor: float = 0.15
    bank_size: int = 400
    ema: float = 0.02
    kappa_floor: float = 0.3
    # A specialist plays only this monk ('seat/power'); None = all seven.
    only_monk: str | None = None
    # 'fixed': the Qi and haunting parts of the danger hint get kappa each; 'adaptive': by loss share.
    danger_split: str = 'fixed'


@dataclass
class CurriculumState:
    win: dict[str, float] = field(default_factory=lambda: {monk_key(*m): 0.28 for m in MONKS})
    loss_phase: dict[str, float] = field(default_factory=lambda: {p: 1 / 3 for p in PHASES})
    loss_cause: dict[str, float] = field(default_factory=lambda: {'allDead': 0.65, 'thirdHaunting': 0.35})
    games_seen: int = 0


class Curriculum:
    def __init__(self, cfg: CurriculumConfig, seed: int = 0, state: CurriculumState | None = None):
        self.cfg = cfg
        self.st = state or CurriculumState()
        self.rng = random.Random(seed)
        self.bank: dict[tuple[str, str], deque] = {(monk_key(*m), p): deque(maxlen=cfg.bank_size) for m in MONKS for p in PHASES}

    # -- weights ------------------------------------------------------------------------------
    @staticmethod
    def _floored(raw: dict[str, float], floor: float) -> dict[str, float]:
        total = sum(raw.values()) or 1.0
        w = {k: v / total for k, v in raw.items()}
        for _ in range(10):  # raise anything under the floor, take the excess from the rest
            low = {k for k, v in w.items() if v < floor}
            if not low:
                break
            spare = 1 - floor * len(low)
            rest = sum(v for k, v in w.items() if k not in low) or 1.0
            w = {k: floor if k in low else v / rest * spare for k, v in w.items()}
        return w

    def monk_weights(self) -> dict[str, float]:
        if self.cfg.only_monk:
            return {self.cfg.only_monk: 1.0}
        return self._floored({k: (1 - v) ** self.cfg.monk_gamma for k, v in self.st.win.items()}, self.cfg.monk_floor)

    def phase_weights(self) -> dict[str, float]:
        return self._floored(dict(self.st.loss_phase), self.cfg.phase_floor)

    def danger_split(self, kappa: float) -> tuple[float, float, float]:
        """Weights of the danger hint's Qi, haunting and deck-clock parts."""
        if self.cfg.danger_split == 'fixed':
            return kappa, kappa, kappa
        d = self.st.loss_cause.get('allDead', 0.5)
        h = self.st.loss_cause.get('thirdHaunting', 0.5)
        s = (d + h) or 1.0
        f = self.cfg.kappa_floor
        return kappa * max(f, 2 * d / s), kappa * max(f, 2 * h / s), kappa

    # -- games --------------------------------------------------------------------------------
    def _draw(self, weights: dict[str, float]) -> str:
        r = self.rng.random()
        acc = 0.0
        for k, v in weights.items():
            acc += v
            if r <= acc:
                return k
        return next(reversed(weights))

    def assign(self, seeds: list[int]) -> list[dict]:
        """One game spec per seed for the actors (scripts/nn/actor.ts): monk, and maybe a start position."""
        mw = self.monk_weights()
        pw = self.phase_weights()
        out = []
        for seed in seeds:
            mk = self._draw(mw)
            seat, power = mk.split('/')
            spec: dict = {'seed': seed, 'seat': seat, 'power': power}
            if self.rng.random() < self.cfg.start_frac:
                order = [self._draw(pw)] + sorted(PHASES, key=lambda p: -pw[p])
                for ph in order:
                    bucket = self.bank[(mk, ph)]
                    if bucket:
                        e = bucket[self.rng.randrange(len(bucket))]
                        spec.update({'state': e['state'], 'deck0': e['deck0'], 'phase': ph})
                        break
            out.append(spec)
        return out

    def observe(self, games, captures) -> None:
        """Learn from a round: whole games update the moving averages; captures go to the bank."""
        a = self.cfg.ema
        for g in games:
            if g.get('started'):
                continue
            mk = monk_key(g['seat'], g['power'])
            if mk in self.st.win:
                self.st.win[mk] += a * ((1.0 if g['win'] else 0.0) - self.st.win[mk])
            self.st.games_seen += 1
            if g['win']:
                continue
            for p in PHASES:
                self.st.loss_phase[p] += a * ((1.0 if g.get('endPhase') == p else 0.0) - self.st.loss_phase[p])
            for c in ('allDead', 'thirdHaunting'):
                self.st.loss_cause[c] += a * ((1.0 if g.get('reason') == c else 0.0) - self.st.loss_cause[c])
        for c in captures:
            key = (monk_key(c['seat'], c['power']), c['phase'])
            if key in self.bank:
                self.bank[key].append({'state': c['state'], 'deck0': c['deck0']})

    # -- reporting / saving -------------------------------------------------------------------
    def describe(self, kappa: float) -> str:
        mw = self.monk_weights()
        pw = self.phase_weights()
        kq, kh, _ = self.danger_split(kappa)
        monks = ', '.join(f'{k.split("/")[1]} {self.st.win[k]:.0%}->{mw.get(k, 0):.0%}' for k in sorted(self.st.win, key=lambda k: self.st.win[k]))
        phases = ', '.join(f'{p} {self.st.loss_phase[p]:.0%}->{pw[p]:.0%}' for p in PHASES)
        bank = sum(len(b) for b in self.bank.values())
        return (f'curriculum | monks (recent win rate -> share of games): {monks} | phases (share of losses -> share of starts): '
                f'{phases}; starts {self.cfg.start_frac:.0%} of games, bank {bank} positions | losses: Qi '
                f'{self.st.loss_cause["allDead"]:.0%} / haunting {self.st.loss_cause["thirdHaunting"]:.0%} -> danger weights Qi {kq:.3f}, haunting {kh:.3f}')

    def save(self, path: Path) -> None:
        path.write_text(json.dumps({'config': asdict(self.cfg), 'state': asdict(self.st)}, indent=1), encoding='utf-8')

    @staticmethod
    def load_state(path: Path) -> CurriculumState | None:
        if not path.exists():
            return None
        return CurriculumState(**json.loads(path.read_text(encoding='utf-8'))['state'])
