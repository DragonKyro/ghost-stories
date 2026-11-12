"""Imitation training: learn the search AI's choices and the games' results.

    python train.py --data training/data/solo-normal-v1 --run training/runs/bc-v1 [--updates 5000 --batch 256]

Losses: policy cross-entropy on the teacher's action (over every legal action),
value BCE on the game's result, plus two auxiliaries that only shape the trunk
(deck progress, outcome class). Validation uses whole held-out games (seed % 25 == 0).
Every --log-every updates: a progress line; every --ckpt-every: weights for the
TypeScript side (step-NNNN.json) and, in the background, a play-test of the
network alone on the evaluation seeds (scripts/nn/eval.ts).
"""

from __future__ import annotations

import argparse
import json
import math
import os
import subprocess
import sys
import time
from pathlib import Path

import torch
import torch.nn.functional as F

sys.path.insert(0, str(Path(__file__).parent))
from nn.dataset import Dataset  # noqa: E402
from nn.model import GhostNet, NetConfig, segment_logsumexp, segment_max  # noqa: E402
from nn.weights import save as save_weights  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
YANG = 0
PLACE_GHOST = 1  # 1 + PROMPT_KIND.placeGhost
EXORCISM = 1 + 8


def auc(score: torch.Tensor, label: torch.Tensor) -> float:
    pos = label > 0.5
    npos, nneg = int(pos.sum()), int((~pos).sum())
    if npos == 0 or nneg == 0:
        return float('nan')
    ranks = torch.empty_like(score)
    ranks[score.argsort()] = torch.arange(1, score.numel() + 1, device=score.device, dtype=score.dtype)
    return float((ranks[pos].sum() - npos * (npos + 1) / 2) / (npos * nneg))


def losses(model, b, B):
    v, z = model.forward_packed(b['x'], b['present'], b['rel'], b['feat'], b['ptr'], b['seg'])
    lse = segment_logsumexp(z, b['seg'], B)
    zt = z[b['tflat']]
    pol = lse - zt
    correct = (zt >= segment_max(z, b['seg'], B) - 1e-6).float()
    val = F.binary_cross_entropy_with_logits(v[:, 0], b['win'], reduction='none')
    prog = F.binary_cross_entropy_with_logits(v[:, 1], b['prog'], reduction='none')
    outc = F.cross_entropy(v[:, 2:], b['outc'], reduction='none')
    return pol, correct, val, prog, outc, v


def evaluate_val(model, ds, idx, bs=2048):
    model.eval()
    out = {k: [] for k in ('pol', 'acc', 'val', 'prog', 'outc', 'p', 'win', 'kind', 'trivial', 'progp', 'progt', 'outcp', 'outct')}
    with torch.no_grad():
        for i in range(0, idx.numel(), bs):
            j = idx[i : i + bs]
            b = ds.batch(j)
            pol, acc, val, prog, outc, v = losses(model, b, j.numel())
            out['pol'].append(pol); out['acc'].append(acc); out['val'].append(val); out['prog'].append(prog); out['outc'].append(outc)
            out['p'].append(torch.sigmoid(v[:, 0])); out['win'].append(b['win']); out['kind'].append(b['kind']); out['trivial'].append(b['ncand'] <= 1)
            out['progp'].append(torch.sigmoid(v[:, 1])); out['progt'].append(b['prog'])
            out['outcp'].append(v[:, 2:].argmax(1)); out['outct'].append(b['outc'])
    model.train()
    o = {k: torch.cat(v) for k, v in out.items()}
    real = ~o['trivial']
    by = lambda m: float(o['acc'][m & real].mean()) if bool((m & real).any()) else float('nan')  # noqa: E731
    return {
        'pol': float(o['pol'][real].mean()),
        'acc': float(o['acc'][real].mean()),
        'accYang': by(o['kind'] == YANG),
        'accPlace': by(o['kind'] == PLACE_GHOST),
        'accExorcism': by(o['kind'] == EXORCISM),
        'val': float(o['val'].mean()),
        'brier': float(((o['p'] - o['win']) ** 2).mean()),
        'auc': auc(o['p'], o['win']),
        'pMean': float(o['p'].mean()),
        'winMean': float(o['win'].mean()),
        'progMae': float((o['progp'] - o['progt']).abs().mean()),
        'outcAcc': float((o['outcp'] == o['outct']).float().mean()),
    }


def main() -> None:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    ap = argparse.ArgumentParser()
    ap.add_argument('--data', default=str(ROOT / 'training/data/solo-normal-v1'))
    ap.add_argument('--run', default=str(ROOT / 'training/runs/bc-v1'))
    ap.add_argument('--updates', type=int, default=5000)
    ap.add_argument('--batch', type=int, default=256)
    ap.add_argument('--lr', type=float, default=1e-3)
    ap.add_argument('--warmup', type=int, default=150)
    ap.add_argument('--wd', type=float, default=0.01)
    ap.add_argument('--d', type=int, default=64)
    ap.add_argument('--heads', type=int, default=4)
    ap.add_argument('--layers', type=int, default=3)
    ap.add_argument('--ff', type=int, default=128)
    ap.add_argument('--w-value', type=float, default=1.0)
    ap.add_argument('--w-aux', type=float, default=0.25)
    ap.add_argument('--log-every', type=int, default=100)
    ap.add_argument('--ckpt-every', type=int, default=1000)
    ap.add_argument('--val-games-mod', type=int, default=25)
    ap.add_argument('--val-samples', type=int, default=16384)
    ap.add_argument('--eval-seeds', default='7001-7300')
    ap.add_argument('--eval-workers', type=int, default=10)
    ap.add_argument('--no-eval', action='store_true')
    ap.add_argument('--seed', type=int, default=0)
    a = ap.parse_args()

    torch.manual_seed(a.seed)
    torch.backends.cuda.matmul.allow_tf32 = True
    torch.backends.cudnn.allow_tf32 = True
    dev = 'cuda' if torch.cuda.is_available() else 'cpu'
    run = Path(a.run)
    run.mkdir(parents=True, exist_ok=True)
    meta = json.loads((Path(a.data) / 'meta.json').read_text())
    schema = meta['schema']
    t0 = time.time()
    ds = Dataset(a.data, schema, dev)
    is_val = (ds.seed % a.val_games_mod) == 0
    train_idx = (~is_val).nonzero()[:, 0]
    val_all = is_val.nonzero()[:, 0]
    g = torch.Generator(device=dev).manual_seed(a.seed + 1)
    val_idx = val_all[torch.randperm(val_all.numel(), generator=g, device=dev)[: a.val_samples]]
    logf = open(run / 'log.jsonl', 'a', encoding='utf-8')

    def say(msg: str) -> None:
        print(msg, flush=True)
        (run / 'progress.txt').open('a', encoding='utf-8').write(msg + '\n')

    say(f'data: {ds.N} samples ({train_idx.numel()} train / {val_all.numel()} val, {len(ds.games)} games), {ds.Nc} candidates, '
        f'{ds.nbytes() / 1e9:.2f} GB on {dev}, loaded in {time.time() - t0:.0f}s; teacher wins {meta["wins"] / meta["games"]:.1%}')

    cfg = NetConfig(a.d, a.heads, a.layers, a.ff)
    model = GhostNet(schema, cfg).to(dev)
    decay = [p for n, p in model.named_parameters() if p.dim() >= 2 and n != 'slot']
    no_decay = [p for n, p in model.named_parameters() if not (p.dim() >= 2 and n != 'slot')]
    opt = torch.optim.AdamW([{'params': decay, 'weight_decay': a.wd}, {'params': no_decay, 'weight_decay': 0.0}], lr=a.lr, betas=(0.9, 0.99))

    def lr_at(step: int) -> float:
        if step < a.warmup:
            return a.lr * (step + 1) / a.warmup
        p = (step - a.warmup) / max(1, a.updates - a.warmup)
        return a.lr * (0.1 + 0.9 * 0.5 * (1 + math.cos(math.pi * p)))

    n_params = sum(p.numel() for p in model.parameters())
    epoch_size = train_idx.numel() // a.batch
    say(f'model: d={a.d} heads={a.heads} layers={a.layers} ff={a.ff}, {n_params} params; {a.updates} updates x {a.batch} '
        f'= {a.updates * a.batch / train_idx.numel():.2f} epochs; lr {a.lr} (warmup {a.warmup}, cosine to {a.lr / 10})')

    evals: list[tuple[int, subprocess.Popen, Path]] = []

    def launch_eval(step: int, weights: Path) -> None:
        if a.no_eval:
            return
        out = run / f'eval-{step:04d}.json'
        cmd = ['node', str(ROOT / 'scripts/nn/ts.mjs'), 'scripts/nn/eval.ts', '--weights', str(weights), '--seeds', a.eval_seeds,
               '--workers', str(a.eval_workers), '--json', str(out)]
        p = subprocess.Popen(cmd, cwd=ROOT, stdout=open(run / f'eval-{step:04d}.log', 'w'), stderr=subprocess.STDOUT)
        evals.append((step, p, out))

    def poll_evals(wait: bool = False) -> None:
        for e in list(evals):
            step, p, out = e
            if wait:
                p.wait()
            if p.poll() is None:
                continue
            evals.remove(e)
            if out.exists():
                r = json.loads(out.read_text())
                monks = ', '.join(f'{k} {v}' for k, v in r['byMonk'].items())
                say(f'  play-test @ {step}: network alone wins {r["wins"]}/{r["games"]} ({r["winRate"]:.1%}), {r["turns"]:.1f} turns, '
                    f'deck {r["progress"]:.0%}, losses {r["reasons"]} | {monks}')
            else:
                say(f'  play-test @ {step}: failed (see eval-{step:04d}.log)')

    def log_line(step: int, window: dict, sps: float) -> None:
        vm = evaluate_val(model, ds, val_idx)
        rec = {'step': step, 'lr': lr_at(step), 'sps': sps, **{f'train_{k}': v for k, v in window.items()}, **{f'val_{k}': v for k, v in vm.items()}}
        logf.write(json.dumps(rec) + '\n')
        logf.flush()
        tr = (f'train pol {window["pol"]:.3f} acc {window["acc"]:.1%} val {window["val"]:.3f}' if window else 'train -')
        say(f'[{step:5d}/{a.updates}] {tr} | held-out: pol {vm["pol"]:.3f} acc {vm["acc"]:.1%} (yang {vm["accYang"]:.1%}, '
            f'place {vm["accPlace"]:.1%}, exorcism {vm["accExorcism"]:.1%}) | value bce {vm["val"]:.3f} brier {vm["brier"]:.4f} '
            f'auc {vm["auc"]:.3f} mean p {vm["pMean"]:.3f} vs {vm["winMean"]:.3f} | deck mae {vm["progMae"]:.3f} | lr {lr_at(step):.2e} | '
            f'{sps:,.0f} samples/s | {time.time() - t_start:.0f}s')

    t_start = time.time()
    log_line(0, {}, 0.0)
    perm = train_idx[torch.randperm(train_idx.numel(), generator=g, device=dev)]
    cursor = 0
    acc_sum = {k: torch.zeros((), device=dev) for k in ('pol', 'acc', 'val', 'prog', 'outc')}
    acc_n = 0
    t_win = time.time()
    model.train()
    for step in range(1, a.updates + 1):
        if cursor + a.batch > perm.numel():
            perm = train_idx[torch.randperm(train_idx.numel(), generator=g, device=dev)]
            cursor = 0
        idx = perm[cursor : cursor + a.batch]
        cursor += a.batch
        for group in opt.param_groups:
            group['lr'] = lr_at(step - 1)
        b = ds.batch(idx)
        pol, correct, val, prog, outc, _ = losses(model, b, a.batch)
        real = (b['ncand'] > 1).float()
        pol_loss = (pol * real).sum() / real.sum().clamp(min=1)
        loss = pol_loss + a.w_value * val.mean() + a.w_aux * (prog.mean() + outc.mean())
        opt.zero_grad(set_to_none=True)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        opt.step()
        with torch.no_grad():
            acc_sum['pol'] += pol_loss
            acc_sum['acc'] += (correct * real).sum() / real.sum().clamp(min=1)
            acc_sum['val'] += val.mean()
            acc_sum['prog'] += prog.mean()
            acc_sum['outc'] += outc.mean()
            acc_n += 1
        if step % a.log_every == 0 or step == a.updates:
            if dev == 'cuda':
                torch.cuda.synchronize()
            sps = acc_n * a.batch / (time.time() - t_win)
            window = {k: float(v) / acc_n for k, v in acc_sum.items()}
            log_line(step, window, sps)
            poll_evals()
            for v in acc_sum.values():
                v.zero_()
            acc_n = 0
            t_win = time.time()
        if step % a.ckpt_every == 0 or step == a.updates:
            w = run / f'step-{step:04d}.json'
            save_weights(model, str(w))
            torch.save({'model': model.state_dict(), 'opt': opt.state_dict(), 'step': step, 'cfg': vars(a)}, run / f'step-{step:04d}.pt')
            launch_eval(step, w)
    say(f'training done: {a.updates} updates in {time.time() - t_start:.0f}s; waiting for play-tests...')
    poll_evals(wait=True)
    say('all done')


if __name__ == '__main__':
    main()
