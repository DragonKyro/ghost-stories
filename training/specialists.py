"""Train one specialist network per monk, in rounds: round 1 fine-tunes each from the shared
50k network, round 2 continues each round-1 specialist (on the current encoder, with its
dice-maths inputs), and so on.

    conda activate train
    python training/specialists.py --round 3               # all seven, weakest first
    python training/specialists.py --round 2 --monks blue/heavenlyGust,green/godsFavorite --updates 5000
    python training/specialists.py --round 2 --ship        # also install the ones that beat both references
    python training/specialists.py --round 2 --summary     # rewrite the dashboard and exit

Rounds (presets; any flag given explicitly overrides its preset):
  1: start every monk from --base (the 50k network); lr 5e-5, tether 0.05; play-tests on
     7001-7300, selection on 9001-9600, confirmation on 10001-10600; runs in training/runs/.
  2: start every monk from its round-1 selected checkpoint (--from-runs training/runs); lr 1.5e-4
     with a 300-update warm-up, tether 0.02; fresh seed sets (play-tests 11001-11300, selection
     12001-12600, confirmation 13001-13600; self-play from 20,000,000); runs in training/runs/r2/.
  3: start every monk from its best network so far (round 2's pick where it beat its start on the
     fresh seeds, else round 2's start); 20,000 updates, lr 1e-4 with a 1,000-update warm-up,
     tether 0.02; seeds: play-tests 14001-14300, selection 15001-15600, confirmation 16001-16600,
     self-play from 40,000,000; runs in training/runs/r3/.

For each monk (`seat/power`):
  0. start: its start network and the reference network (--ref, the 50k network) are brought to
     the current encoder schema by training/migrate.py (new input columns zero: same play) into
     <runs-dir>/start/, and both are play-tested as that monk on the play-test seeds
     (baseline.json in its run folder) so the play-tests during training have a fair baseline.
  1. train: training/rl.py from the start (or, after an interruption, from the run's latest
     checkpoint) for --updates PPO updates, every self-play game and play-test as that monk,
     tethered to the start network (--tether: a KL penalty). Run folder:
     <runs-dir>/spec-<seat>-<power>/ (progress.txt as for any run). A monk whose run already
     reached its final update is not trained again, so this can be stopped and restarted.
  2. select: its play-test checkpoints (300 games each) are noisy, so the best few and the
     last one are re-tested on the selection seeds; the best of those is the candidate.
  3. confirm: the candidate, the start network and the reference are tested on the fresh
     confirmation seeds — picking the best of several on one set flatters it, so the decision
     is made on another.
  4. ship (with --ship): if the candidate beats both the start and the reference there by
     --margin, its weights go to src/ai/nn/weights/<seat>-<power>.json, which the game loads
     for that monk (src/ui/game/aiNet.ts).
A line per monk goes to <runs-dir>/specialists.txt and the details to selection.json in its run
folder. <runs-dir>/specialists.md is the dashboard, rewritten every minute while training: each
monk's win rate (the reference, the start, its latest and best play-test, the final comparison)
and the overall win rate across the evaluation mix of monks.
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import migrate  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
# Weakest first (solo Normal, step-50000, sampled): the specialists that should gain the most.
MONKS = ['blue/heavenlyGust', 'green/godsFavorite', 'red/danceOfTheSpires', 'yellow/enfeeblementMantra',
         'green/strengthOfMountain', 'blue/secondWind', 'yellow/bottomlessPockets']

RUNS = ROOT / 'training/runs'
# The 50k shared network, kept as the game's weights file (its training checkpoints were deleted
# 2026-11-12, along with rounds 1-2's: a round now starts from a previous round's run folder).
REF = ROOT / 'src/ai/nn/weights/ghost-net-v1.json'

ROUNDS: dict[int, dict] = {
    1: {'from_runs': '', 'runs_dir': str(RUNS), 'rl_lr': 5e-5, 'warmup': 0, 'tether': 0.05, 'eval_seeds': '7001-7300',
        'select_seeds': '9001-9600', 'confirm_seeds': '10001-10600', 'seed_base': 2_000_000},
    2: {'from_runs': str(RUNS), 'runs_dir': str(RUNS / 'r2'), 'rl_lr': 1.5e-4, 'warmup': 300, 'tether': 0.02,
        'eval_seeds': '11001-11300', 'select_seeds': '12001-12600', 'confirm_seeds': '13001-13600', 'seed_base': 20_000_000},
    # Round 2's play-tests were still rising at 10k updates (most of the gain in the second half), after a
    # dip in the first 1k at 1.5e-4: longer, a little gentler, a longer warm-up.
    3: {'from_runs': str(RUNS / 'r2'), 'runs_dir': str(RUNS / 'r3'), 'rl_lr': 1e-4, 'warmup': 1000, 'tether': 0.02, 'updates': 20000,
        'eval_seeds': '14001-14300', 'select_seeds': '15001-15600', 'confirm_seeds': '16001-16600', 'seed_base': 40_000_000},
}
ROUNDS[1]['updates'] = ROUNDS[2]['updates'] = 10000

# Round 1 measured the 50k network as each monk on its play-test seeds before this script wrote
# baseline.json files (300 games, sampled at temperature 0.75; 2026-11-09).
ROUND1_BASELINE = {'blue/heavenlyGust': 39 / 300, 'green/godsFavorite': 86 / 300, 'red/danceOfTheSpires': 73 / 300,
                   'yellow/enfeeblementMantra': 94 / 300, 'green/strengthOfMountain': 97 / 300, 'blue/secondWind': 112 / 300,
                   'yellow/bottomlessPockets': 122 / 300}
# How often each monk comes up in the evaluation games (seat = seed % 4; red is always the Dance of
# the Spires solo, the other colours' two sides half each): the weights of the overall win rate.
MIX = {m: (0.25 if m.startswith('red/') else 0.125) for m in MONKS}
NAMES = {'blue/heavenlyGust': 'Blue / Heavenly Gust', 'green/godsFavorite': "Green / Gods' Favorite",
         'red/danceOfTheSpires': 'Red / Dance of the Spires', 'yellow/enfeeblementMantra': 'Yellow / Enfeeblement Mantra',
         'green/strengthOfMountain': 'Green / Strength of the Mountain', 'blue/secondWind': 'Blue / Second Wind',
         'yellow/bottomlessPockets': 'Yellow / Bottomless Pockets'}


def run_dir(runs: Path, monk: str) -> Path:
    seat, power = monk.split('/')
    return runs / f'spec-{seat}-{power}'


def read_json(p: Path) -> dict | None:
    return json.loads(p.read_text(encoding='utf-8')) if p.exists() else None


def pct(x: float | None) -> str:
    return '-' if x is None else f'{x:.1%}'


def n_seeds(r: str) -> int:
    lo, hi = (int(x) for x in r.split('-'))
    return hi - lo + 1


def margin(n: int, p: float = 0.3) -> str:
    return f'+-{100 * 1.96 * (p * (1 - p) / max(1, n)) ** 0.5:.1f} points'


def write_summary(runs: Path, current: str | None = None) -> None:
    """Rewrite <runs>/specialists.md from the run folders (stateless: safe to call any time)."""
    cfg = read_json(runs / 'round.json') or {'round': 1, **ROUNDS[1]}
    rnd = cfg['round']
    rows = []
    tot = {'ref': 0.0, 'start': 0.0, 'latest': 0.0, 'best': 0.0}
    for monk in MONKS:
        run = run_dir(runs, monk)
        info = read_json(run / 'start.json')
        base = read_json(run / 'baseline.json')
        sel = read_json(run / 'selection.json')
        start_step = info['startStep'] if info else 50000
        final = info['final'] if info else (sel['final'] if sel else None)
        tests = []
        log = run / 'log.jsonl'
        if log.exists():
            for line in log.read_text(encoding='utf-8').splitlines():
                if '"eval"' not in line:
                    continue
                r = json.loads(line)
                if 'eval' in r and r['step'] > start_step:
                    tests.append((r['step'], r['eval']['wins'] / max(1, r['eval']['games'])))
        ref = base['ref']['winRate'] if base else (ROUND1_BASELINE[monk] if rnd == 1 else None)
        start = base['start']['winRate'] if base else (ROUND1_BASELINE[monk] if rnd == 1 else None)
        latest = tests[-1] if tests else None
        best = max(tests, key=lambda t: t[1]) if tests else None
        if sel:
            c = sel['confirm']['candidate']
            s_ = sel['confirm'].get('start') or sel['confirm'].get('base')
            r_ = sel['confirm'].get('ref')
            status = 'shipped' if sel['shipped'] else 'better' if sel['better'] else 'not better: start stays'
            vs = f"start {s_['winRate']:.1%}" + (f", 50k {r_['winRate']:.1%}" if r_ else '')
            final_cell = f"{c['winRate']:.1%} vs {vs} ({c['games']} games) - {status}"
        else:
            final_cell = ''
        state = 'done' if sel else 'training' if monk == current else 'stopped' if tests else 'waiting'
        done = latest[0] - start_step if latest else 0
        upd = '-' if not latest else (f'{done:,} / {final - start_step:,}' if final else f'{done:,}')
        best_cell = f'{best[1]:.1%} (@{best[0]:,})' if best else '-'
        rows.append(f"| {NAMES[monk]} | {pct(ref)} | {pct(start)} | {state} | {upd} | {pct(latest[1] if latest else None)} | {best_cell} | {final_cell} |")
        fallback = start if start is not None else 0.0
        tot['ref'] += MIX[monk] * (ref or 0.0)
        tot['start'] += MIX[monk] * fallback
        tot['latest'] += MIX[monk] * (latest[1] if latest else fallback)
        tot['best'] += MIX[monk] * (max(fallback, best[1]) if best else fallback)
    start_name = ('the 50k network' if rnd == 1 else 'its round-1 specialist' if rnd == 2
                  else f'its best network so far (round {rnd - 1}, or its start there when that round did not beat it)')
    where = (runs.relative_to(ROOT) if runs.is_relative_to(ROOT) else runs).as_posix()
    text = f"""# Specialists, round {rnd} — progress

Updated {time.strftime('%Y-%m-%d %H:%M')}. Win rates of the network alone, solo Normal, sampled at
temperature 0.75 (how the game plays). Each monk starts from {start_name}
(lr {cfg['rl_lr']:g}, tether {cfg['tether']:g}). Play-tests: {n_seeds(cfg['eval_seeds'])} games of that monk every
{cfg.get('eval_every', 1000):,} updates (seeds {cfg['eval_seeds']}, about {margin(n_seeds(cfg['eval_seeds']))} each); "50k network" and
"Start" are those networks on the same seeds. Final: the selected checkpoint against the start and
the 50k network on {n_seeds(cfg['confirm_seeds'])} fresh games ({cfg['confirm_seeds']}, about {margin(n_seeds(cfg['confirm_seeds']))}).
Details: each monk's `{where}/spec-<seat>-<power>/progress.txt`.

| Monk | 50k network | Start | Status | Updates | Latest play-test | Best play-test | Final (fresh seeds) |
|---|---|---|---|---|---|---|---|
""" + '\n'.join(rows) + f"""

**Overall** (the evaluation mix: red 1/4 of games, each other monk 1/8; play-test seeds):

| | Win rate |
|---|---|
| 50k network | {tot['ref']:.1%} |
| Start networks | {tot['start']:.1%} |
| Specialists, latest play-tests (start where not trained yet) | {tot['latest']:.1%} |
| Specialists, best play-tests (each monk's best of its own and its start) | {tot['best']:.1%} |

The "best play-test" picks the highest of many noisy tests, so it flatters; the final column is
the one to trust.
"""
    (runs / 'specialists.md').write_text(text, encoding='utf-8')


def say(runs: Path, msg: str) -> None:
    print(msg, flush=True)
    with (runs / 'specialists.txt').open('a', encoding='utf-8') as f:
        f.write(msg + '\n')


def evaluate(weights: Path, monk: str, seeds: str, workers: int, out: Path) -> dict:
    """The network alone as `monk` on `seeds` (sampled at temperature 0.75, as the game plays); kept in `out`."""
    prev = read_json(out)
    if prev and prev.get('weights') == str(weights) and prev.get('seeds') == seeds:
        return prev
    raw = Path(str(out) + '.raw')
    cmd = ['node', str(ROOT / 'scripts/nn/ts.mjs'), 'scripts/nn/eval.ts', '--weights', str(weights), '--monk', monk,
           '--seeds', seeds, '--sample', '--temp', '0.75', '--workers', str(workers), '--json', str(raw)]
    subprocess.run(cmd, cwd=ROOT, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT)
    r = json.loads(raw.read_text(encoding='utf-8'))
    res = {'weights': str(weights), 'seeds': seeds, 'wins': r['wins'], 'games': r['games'], 'winRate': r['winRate'], 'reasons': r['reasons']}
    out.write_text(json.dumps(res, indent=1), encoding='utf-8')
    raw.unlink()
    return res


def ci(r: dict) -> str:
    p, n = r['winRate'], r['games']
    return f'{p:.1%} +-{1.96 * (p * (1 - p) / n) ** 0.5:.1%}'


def checkpoint_of(weights_json: str) -> Path:
    """The .pt beside a run's step-N.json."""
    pt = Path(weights_json).with_suffix('.pt')
    if not pt.exists():
        raise SystemExit(f'{pt} is missing (the checkpoint of {weights_json})')
    return pt


def step_of(pt: Path) -> int:
    import torch
    return int(torch.load(pt, map_location='cpu')['step'])


def main() -> None:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    ap = argparse.ArgumentParser()
    ap.add_argument('--round', type=int, default=1, choices=sorted(ROUNDS), help='preset for the flags below (see the docstring)')
    ap.add_argument('--monks', default='all', help="'all' or a comma-separated list of seat/power")
    ap.add_argument('--from-runs', default=None, help="start each monk from its selected checkpoint in this earlier round's runs folder ('' = from --base)")
    ap.add_argument('--base', default='', help='without --from-runs: the checkpoint every monk starts from (.pt with its .json)')
    ap.add_argument('--ref', default=str(REF), help='the reference network the results are also compared with (the 50k network): a weights .json or a checkpoint .pt')
    ap.add_argument('--updates', type=int, default=None, help='PPO updates per specialist')
    ap.add_argument('--tether', type=float, default=None, help='KL penalty toward the start network')
    ap.add_argument('--start-frac', type=float, default=0.3, help='share of self-play games begun from a captured position')
    ap.add_argument('--rl-lr', type=float, default=None)
    ap.add_argument('--warmup', type=int, default=None, help='learning-rate warm-up (updates)')
    ap.add_argument('--eval-every', type=int, default=1000)
    ap.add_argument('--eval-seeds', default=None, help='play-test seeds (rl.py) and the baselines')
    ap.add_argument('--candidates', type=int, default=3, help='best play-test checkpoints re-tested at selection (plus the last)')
    ap.add_argument('--select-seeds', default=None)
    ap.add_argument('--confirm-seeds', default=None)
    ap.add_argument('--seed-base', type=int, default=None, help='self-play seeds: this + 1,000,000 x the monk index')
    ap.add_argument('--margin', type=float, default=0.01, help='ship only if the candidate wins by at least this much more than the start and the reference')
    ap.add_argument('--ship', action='store_true', help='install the specialists that beat both into src/ai/nn/weights/')
    ap.add_argument('--workers', type=int, default=18)
    ap.add_argument('--python', default=sys.executable)
    ap.add_argument('--extra', default='', help='extra arguments for rl.py (quoted)')
    ap.add_argument('--runs-dir', default=None, help='where the spec-* run folders, specialists.txt and the dashboard go')
    ap.add_argument('--summary', action='store_true', help='rewrite the dashboard (specialists.md) and exit')
    a = ap.parse_args()
    for k, v in ROUNDS[a.round].items():
        if getattr(a, k) is None:
            setattr(a, k, v)
    runs = Path(a.runs_dir).resolve()
    runs.mkdir(parents=True, exist_ok=True)
    if a.summary:
        write_summary(runs)
        print(f'wrote {runs / "specialists.md"}')
        return

    keys = ('rl_lr', 'warmup', 'tether', 'eval_seeds', 'eval_every', 'select_seeds', 'confirm_seeds', 'seed_base', 'from_runs', 'updates', 'start_frac')
    (runs / 'round.json').write_text(json.dumps({'round': a.round, **{k: getattr(a, k) for k in keys}}, indent=1), encoding='utf-8')
    monks = MONKS if a.monks == 'all' else [m.strip() for m in a.monks.split(',') if m.strip()]
    write_summary(runs)
    say(runs, f'# specialists round {a.round}: {len(monks)} monks x {a.updates} updates, lr {a.rl_lr:g} (warm-up {a.warmup}), '
              f'tether {a.tether} to each start, starts {a.start_frac:.0%}; play-tests {a.eval_seeds}, select on {a.select_seeds}, '
              f'confirm on {a.confirm_seeds}{", shipping" if a.ship else ""}')

    schema = migrate.current_schema()
    start_dir = runs / 'start'
    # The reference only plays (its weights file is enough); a checkpoint's .json is used.
    ref_src = Path(a.ref)
    ref = start_dir / 'ref.json'
    if not ref.exists():
        say(runs, migrate.migrate_file(ref_src if ref_src.suffix == '.json' else ref_src.with_suffix('.json'), ref, schema, weights_only=True))

    for i, monk in enumerate(monks):
        seat, power = monk.split('/')
        run = run_dir(runs, monk)
        run.mkdir(parents=True, exist_ok=True)
        t0 = time.time()
        # 0. The start network on the current schema, and both baselines.
        start = start_dir / f'{seat}-{power}.pt'
        if not start.exists():
            if a.from_runs:
                prev = run_dir(Path(a.from_runs), monk)
                sel = read_json(prev / 'selection.json')
                if not sel:
                    raise SystemExit(f'{monk}: no selection.json in {prev} (has its previous round finished?)')
                # The previous round's pick if it beat its start on the fresh seeds, else that start.
                src = checkpoint_of(sel['best'] if sel['better'] else (sel['confirm'].get('start') or sel['confirm']['base'])['weights'])
            else:
                if not a.base:
                    raise SystemExit('give --from-runs (a previous round) or --base (a checkpoint to start every monk from)')
                src = Path(a.base)
            say(runs, f'{monk}: starts from ' + migrate.migrate_checkpoint(src, start, schema))
        start_step = step_of(start)
        final = start_step + a.updates
        (run / 'start.json').write_text(json.dumps({'start': str(start), 'startStep': start_step, 'final': final, 'ref': str(ref)}, indent=1),
                                        encoding='utf-8')
        if not (run / 'baseline.json').exists():
            b_start = evaluate(start.with_suffix('.json'), monk, a.eval_seeds, a.workers, run / 'baseline-start.json')
            b_ref = evaluate(ref, monk, a.eval_seeds, a.workers, run / 'baseline-ref.json')
            (run / 'baseline.json').write_text(json.dumps({'start': b_start, 'ref': b_ref}, indent=1), encoding='utf-8')
            say(runs, f'{monk}: on {a.eval_seeds} the start wins {ci(b_start)}, the 50k network {ci(b_ref)}')
        write_summary(runs, monk)
        # 1. Train.
        if not (run / f'step-{final}.pt').exists():
            # Resume an interrupted specialist from its latest checkpoint.
            done = sorted((p for p in run.glob('step-*.pt') if int(p.stem.split('-')[1]) > start_step), key=lambda p: int(p.stem.split('-')[1]))
            init = done[-1] if done else start
            seed_base = a.seed_base + 1_000_000 * (MONKS.index(monk) if monk in MONKS else 10 + i)
            cmd = [a.python, str(ROOT / 'training/rl.py'), '--run', str(run), '--init', str(init), '--monk', monk,
                   '--total-updates', str(final), '--tether', str(a.tether), '--rl-lr', str(a.rl_lr), '--warmup', str(a.warmup),
                   '--sched-start', str(start_step), '--sched-end', str(final), '--ent', '0.003',
                   '--beta-start', '0.3', '--beta-end', '0.3', '--kappa-start', '0.15', '--kappa-end', '0.15',
                   '--start-frac', str(a.start_frac), '--eval-every', str(a.eval_every), '--eval-temp', '0.75',
                   '--eval-seeds', a.eval_seeds, '--seed-base', str(seed_base), '--workers', str(a.workers), *a.extra.split()]
            if init != start and a.tether > 0:
                cmd += ['--tether-to', str(start)]  # the tether is always to the start, not the checkpoint resumed from
            say(runs, f'{monk}: training {"from " + init.name + " " if init != start else ""}-> update {final} ({run}/progress.txt)')
            # rl.py's own output (errors included) goes to rl.log in the run folder.
            rl_log = open(run / 'rl.log', 'a', encoding='utf-8')
            proc = subprocess.Popen(cmd, cwd=ROOT, stdout=rl_log, stderr=subprocess.STDOUT)
            while proc.poll() is None:
                write_summary(runs, monk)
                time.sleep(60)
            rl_log.close()
            if proc.returncode != 0:
                write_summary(runs)
                raise SystemExit(f'{monk}: rl.py failed (exit {proc.returncode}); see {run}/rl.log')
            write_summary(runs, monk)
        # 2. Select: the best play-tests and the last checkpoint, re-tested on the selection seeds.
        tests = [json.loads(line) for line in (run / 'log.jsonl').read_text(encoding='utf-8').splitlines() if '"eval"' in line]
        tests = [t for t in tests if 'eval' in t and start_step < t['step'] <= final]
        ranked = sorted(tests, key=lambda t: -t['eval']['wins'] / max(1, t['eval']['games']))[: a.candidates]
        steps = sorted({t['step'] for t in ranked} | {final})
        sel_dir = run / 'selection'
        sel_dir.mkdir(exist_ok=True)
        picks = [evaluate(run / f'step-{s}.json', monk, a.select_seeds, a.workers, sel_dir / f'select-{s}.json') for s in steps]
        best = max(picks, key=lambda r: r['winRate'])
        # 3. Confirm against the start and the reference on fresh seeds.
        cand = evaluate(Path(best['weights']), monk, a.confirm_seeds, a.workers, sel_dir / 'confirm-candidate.json')
        vs_start = evaluate(start.with_suffix('.json'), monk, a.confirm_seeds, a.workers, sel_dir / 'confirm-start.json')
        vs_ref = evaluate(ref, monk, a.confirm_seeds, a.workers, sel_dir / 'confirm-ref.json')
        better = cand['winRate'] >= max(vs_start['winRate'], vs_ref['winRate']) + a.margin
        shutil.copyfile(best['weights'], run / 'best.json')
        shipped = False
        if a.ship and better:
            shutil.copyfile(best['weights'], ROOT / f'src/ai/nn/weights/{seat}-{power}.json')
            shipped = True
        (run / 'selection.json').write_text(json.dumps({'monk': monk, 'final': final, 'selection': picks, 'best': best['weights'],
                                                        'confirm': {'candidate': cand, 'start': vs_start, 'ref': vs_ref},
                                                        'better': better, 'shipped': shipped}, indent=1), encoding='utf-8')
        write_summary(runs)
        say(runs, f'{monk}: best {Path(best["weights"]).stem} ({ci(best)} on {a.select_seeds}); fresh seeds {a.confirm_seeds}: '
                  f'specialist {ci(cand)} vs start {ci(vs_start)} vs 50k {ci(vs_ref)} -> '
                  f'{"SHIPPED" if shipped else "better" if better else "not better: start stays"} ({(time.time() - t0) / 60:.0f} min)')


if __name__ == '__main__':
    main()
