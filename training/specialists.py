"""Train one specialist network per monk, each fine-tuned from the shared starting network.

    conda activate train
    python training/specialists.py                         # all seven, weakest first
    python training/specialists.py --monks blue/heavenlyGust,green/godsFavorite --updates 5000
    python training/specialists.py --ship                  # also install the ones that beat the start

For each monk (`seat/power`):
  1. train: training/rl.py from --base (default the 50k shared network) for --updates PPO
     updates, every self-play game and play-test as that monk, tethered to the base policy
     (--tether: a KL penalty, so it specialises where that helps and keeps the shared skills).
     Run folder: training/runs/spec-<seat>-<power>/ (progress.txt as for any run). A monk whose
     run already reached its final update is not trained again, so this can be stopped and
     restarted.
  2. select: its play-test checkpoints (300 games each, seeds 7001-7300) are noisy, so the best
     few and the last one are re-tested on held-out seeds (--select-seeds, as that monk); the
     best of those is the candidate.
  3. confirm: the candidate and the base are tested on fresh seeds (--confirm-seeds) — picking
     the best of several on one set flatters it, so the decision is made on another.
  4. ship (with --ship): if the candidate beats the base there by --margin, its weights go to
     src/ai/nn/weights/<seat>-<power>.json, which the game loads for that monk
     (src/ui/game/aiNet.ts); otherwise the shared network stays.
A line per monk goes to training/runs/specialists.txt and the details to selection.json in its
run folder.
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
# Weakest first (solo Normal, step-50000, sampled): the specialists that should gain the most.
MONKS = ['blue/heavenlyGust', 'green/godsFavorite', 'red/danceOfTheSpires', 'yellow/enfeeblementMantra',
         'green/strengthOfMountain', 'blue/secondWind', 'yellow/bottomlessPockets']


RUNS = ROOT / 'training/runs'


def say(msg: str) -> None:
    print(msg, flush=True)
    with (RUNS / 'specialists.txt').open('a', encoding='utf-8') as f:
        f.write(msg + '\n')


def evaluate(weights: Path, monk: str, seeds: str, workers: int, out: Path) -> dict:
    """The network alone as `monk` on `seeds` (sampled at temperature 0.75, as the game plays)."""
    cmd = ['node', str(ROOT / 'scripts/nn/ts.mjs'), 'scripts/nn/eval.ts', '--weights', str(weights), '--monk', monk,
           '--seeds', seeds, '--sample', '--temp', '0.75', '--workers', str(workers), '--json', str(out)]
    subprocess.run(cmd, cwd=ROOT, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
    r = json.loads(out.read_text(encoding='utf-8'))
    return {'weights': str(weights), 'wins': r['wins'], 'games': r['games'], 'winRate': r['winRate'], 'reasons': r['reasons']}


def ci(r: dict) -> str:
    p, n = r['winRate'], r['games']
    return f'{p:.1%} +-{1.96 * (p * (1 - p) / n) ** 0.5:.1%}'


def main() -> None:
    global RUNS
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    ap = argparse.ArgumentParser()
    ap.add_argument('--monks', default='all', help="'all' or a comma-separated list of seat/power")
    ap.add_argument('--base', default=str(ROOT / 'training/runs/rl-v4/step-50000.pt'), help='the shared network to start from (.pt with its .json)')
    ap.add_argument('--updates', type=int, default=10000, help='PPO updates per specialist')
    ap.add_argument('--tether', type=float, default=0.05)
    ap.add_argument('--start-frac', type=float, default=0.3, help='share of self-play games begun from a captured position')
    ap.add_argument('--rl-lr', type=float, default=5e-5)
    ap.add_argument('--eval-every', type=int, default=1000)
    ap.add_argument('--candidates', type=int, default=3, help='best play-test checkpoints re-tested at selection (plus the last)')
    ap.add_argument('--select-seeds', default='9001-9600')
    ap.add_argument('--confirm-seeds', default='10001-10600')
    ap.add_argument('--margin', type=float, default=0.01, help='ship only if the candidate wins by at least this much more than the base')
    ap.add_argument('--ship', action='store_true', help='install the specialists that beat the base into src/ai/nn/weights/')
    ap.add_argument('--workers', type=int, default=18)
    ap.add_argument('--python', default=sys.executable)
    ap.add_argument('--extra', default='', help='extra arguments for rl.py (quoted)')
    ap.add_argument('--runs-dir', default=str(RUNS), help='where the spec-* run folders and specialists.txt go')
    a = ap.parse_args()
    RUNS = Path(a.runs_dir)

    base = Path(a.base)
    base_json = base.with_suffix('.json')
    start = int(__import__('torch').load(base, map_location='cpu')['step'])
    final = start + a.updates
    monks = MONKS if a.monks == 'all' else [m.strip() for m in a.monks.split(',') if m.strip()]
    RUNS.mkdir(parents=True, exist_ok=True)
    say(f'# specialists from {base.name} (update {start}): {len(monks)} monks x {a.updates} updates, tether {a.tether}, '
        f'starts {a.start_frac:.0%}; select on {a.select_seeds}, confirm on {a.confirm_seeds}{", shipping" if a.ship else ""}')

    for i, monk in enumerate(monks):
        seat, power = monk.split('/')
        run = RUNS / f'spec-{seat}-{power}'
        run.mkdir(parents=True, exist_ok=True)
        t0 = time.time()
        if not (run / f'step-{final}.pt').exists():
            # Resume an interrupted specialist from its latest checkpoint.
            done = sorted(run.glob('step-*.pt'), key=lambda p: int(p.stem.split('-')[1]))
            init = done[-1] if done else base
            cmd = [a.python, str(ROOT / 'training/rl.py'), '--run', str(run), '--init', str(init), '--monk', monk,
                   '--total-updates', str(final), '--tether', str(a.tether), '--rl-lr', str(a.rl_lr),
                   '--sched-start', str(start), '--sched-end', str(final), '--ent', '0.003',
                   '--beta-start', '0.3', '--beta-end', '0.3', '--kappa-start', '0.15', '--kappa-end', '0.15',
                   '--start-frac', str(a.start_frac), '--eval-every', str(a.eval_every), '--eval-temp', '0.75',
                   '--seed-base', str(2_000_000 + 1_000_000 * MONKS.index(monk) if monk in MONKS else 9_000_000 + i * 1_000_000),
                   '--workers', str(a.workers), *a.extra.split()]
            if init != base and a.tether > 0:
                # The tether is always to the base network, not to the checkpoint we resume from.
                cmd += ['--tether-to', str(base)]
            say(f'{monk}: training {"from " + init.name + " " if init != base else ""}-> update {final} ({run}/progress.txt)')
            subprocess.run(cmd, cwd=ROOT, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
        # Select: the best play-tests and the last checkpoint, re-tested on held-out seeds.
        tests = [json.loads(line) for line in (run / 'log.jsonl').read_text(encoding='utf-8').splitlines() if '"eval"' in line]
        tests = [t for t in tests if 'eval' in t]
        ranked = sorted(tests, key=lambda t: -t['eval']['wins'] / max(1, t['eval']['games']))[: a.candidates]
        steps = sorted({t['step'] for t in ranked} | {final})
        sel_dir = run / 'selection'
        sel_dir.mkdir(exist_ok=True)
        picks = [evaluate(run / f'step-{s}.json', monk, a.select_seeds, a.workers, sel_dir / f'select-{s}.json') for s in steps]
        best = max(picks, key=lambda r: r['winRate'])
        # Confirm against the base on fresh seeds.
        cand = evaluate(Path(best['weights']), monk, a.confirm_seeds, a.workers, sel_dir / 'confirm-candidate.json')
        ref = evaluate(base_json, monk, a.confirm_seeds, a.workers, sel_dir / 'confirm-base.json')
        better = cand['winRate'] >= ref['winRate'] + a.margin
        shutil.copyfile(best['weights'], run / 'best.json')
        shipped = False
        if a.ship and better:
            dest = ROOT / f'src/ai/nn/weights/{seat}-{power}.json'
            shutil.copyfile(best['weights'], dest)
            shipped = True
        (run / 'selection.json').write_text(json.dumps({'monk': monk, 'final': final, 'selection': picks, 'best': best['weights'],
                                                        'confirm': {'candidate': cand, 'base': ref}, 'better': better, 'shipped': shipped},
                                                       indent=1), encoding='utf-8')
        say(f'{monk}: best {Path(best["weights"]).stem} ({ci(best)} on {a.select_seeds}); fresh seeds {a.confirm_seeds}: '
            f'specialist {ci(cand)} vs base {ci(ref)} -> {"SHIPPED" if shipped else "better" if better else "not better: base stays"} '
            f'({(time.time() - t0) / 60:.0f} min)')


if __name__ == '__main__':
    main()
