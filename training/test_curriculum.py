"""Checks for the self-play curriculum (training/nn/curriculum.py).

    python training/test_curriculum.py
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from nn.curriculum import MONKS, PHASES, Curriculum, CurriculumConfig, monk_key  # noqa: E402


def check(cond: bool, msg: str) -> None:
    if not cond:
        raise AssertionError(msg)


def main() -> None:
    cur = Curriculum(CurriculumConfig(), seed=1)
    # Starts uniform: all monks equal, all phases equal.
    mw = cur.monk_weights()
    check(abs(sum(mw.values()) - 1) < 1e-9, 'monk weights sum to 1')
    check(max(mw.values()) - min(mw.values()) < 1e-9, 'equal monks get equal weights')

    # A weak monk gets more games; floors hold.
    games = []
    for i in range(400):
        for seat, power in MONKS:
            weak = power == 'heavenlyGust'
            win = (i % 10) < (1 if weak else 4)
            games.append({'seat': seat, 'power': power, 'win': win, 'started': False, 'reason': None if win else ('allDead' if i % 3 else 'thirdHaunting'), 'endPhase': 'mid' if i % 4 else 'late'})
    cur.observe(games, [])
    mw = cur.monk_weights()
    hg = mw[monk_key('blue', 'heavenlyGust')]
    others = [v for k, v in mw.items() if k != monk_key('blue', 'heavenlyGust')]
    check(hg > 2 * max(others), f'the weakest monk gets the most games ({hg:.2f} vs {max(others):.2f})')
    check(min(mw.values()) >= cur.cfg.monk_floor - 1e-9, 'monk floor holds')
    check(abs(cur.st.win[monk_key('blue', 'heavenlyGust')] - 0.1) < 0.03, 'win rate average tracks the results')

    # Phases follow the losses (mid 75%, late 25%, early 0% -> floored).
    pw = cur.phase_weights()
    check(pw['mid'] > pw['late'] > pw['early'] - 1e-9, f'phase weights follow the losses: {pw}')
    check(pw['early'] >= cur.cfg.phase_floor - 1e-9, 'phase floor holds')

    # Danger split: fixed by default (kappa each); adaptive follows the causes (2 in 3 losses to Qi).
    check(cur.danger_split(0.15) == (0.15, 0.15, 0.15), 'the fixed split gives kappa to each part')
    cur.cfg.danger_split = 'adaptive'
    kq, kh, kc = cur.danger_split(0.15)
    check(kq > kh and abs(kq + kh - 0.3) < 0.02 and kc == 0.15, f'the adaptive split follows the causes: {kq:.3f} {kh:.3f}')
    cur.cfg.danger_split = 'fixed'

    # A specialist plays only its monk.
    spec = Curriculum(CurriculumConfig(only_monk='blue/heavenlyGust'), seed=4)
    check(spec.monk_weights() == {'blue/heavenlyGust': 1.0}, 'a specialist has one monk')
    check(all((s['seat'], s['power']) == ('blue', 'heavenlyGust') for s in spec.assign(list(range(100)))), 'every specialist game is its monk')

    # Starts come from the bank, matching the monk; whole games when the bank is empty.
    specs = Curriculum(CurriculumConfig(start_frac=1.0), seed=2).assign(list(range(50)))
    check(all('state' not in s for s in specs), 'no starts from an empty bank')
    caps = [{'seat': seat, 'power': power, 'deck0': 30, 'phase': ph, 'state': {'tag': f'{seat}/{power}/{ph}'}} for seat, power in MONKS for ph in PHASES]
    cur.observe([], caps)
    cur.cfg.start_frac = 1.0
    specs = cur.assign(list(range(400)))
    check(all('state' in s for s in specs), 'every game starts from the bank when it can')
    check(all(s['state']['tag'].startswith(f"{s['seat']}/{s['power']}/") and s['state']['tag'].endswith(s['phase']) for s in specs), 'the start matches the monk and phase')
    share = {p: sum(1 for s in specs if s['phase'] == p) / len(specs) for p in PHASES}
    check(share['mid'] > share['late'] > share['early'], f'more starts where it loses more: {share}')
    print('curriculum checks passed:', {k: round(v, 2) for k, v in share.items()}, f'heavenlyGust share {hg:.2f}')


if __name__ == '__main__':
    main()
