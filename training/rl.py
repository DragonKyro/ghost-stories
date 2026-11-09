"""Self-play reinforcement learning (PPO) from a checkpoint — one run, or one segment of a long run.

    python rl.py --run training/runs/rl-v5 --init training/runs/rl-v4/step-50000.pt --total-updates 55000 \
        --rl-lr 7e-5 --ent 0.003 --beta-start 0.3 --beta-end 0.3 --kappa-start 0.15 --kappa-end 0.15

The network (architecture and encoder schema read from the checkpoint's weights
file next to the .pt) plays solo Normal on its own (every monk, no search,
moves sampled from its policy) in Node workers (scripts/nn/actor.ts); each
round's games train it with PPO:
  - mid-game rewards are the network's own estimates: each move is credited
    with how much it moved the expected result, blended with the real result
    (GAE, gamma = 1, lambda = 0.95). Over a game the credits add up to the
    result, so nothing can be farmed (and every round costs a card or a Qi);
  - the result is a win (1), plus optionally beta x the fraction of the deck
    the game got through (--beta-start .. --beta-end, linear), each with its
    own estimate: the value head (P(win)) and the progress head. A win
    (1 + beta) always beats the best loss (beta); beta shrinks so that late in
    training it's nearly all about winning;
  - optionally (--kappa-start/--kappa-end) danger hints (src/ai/nn/danger.ts:
    haunted tiles and haunters about to add one, low Qi, an overrun board,
    possessed boards, the deck running out with Wu-Feng in play): each move
    also earns kappa x how much it lowered the danger score (negative when it
    rose);
  - optionally (--starts, --start-frac-*) a share of the games begin from
    late positions of earlier games (scripts/nn/starts.ts) — endgame
    practice; the play-tests are always whole games;
  - clipped policy ratio, entropy bonus, fresh games every round.
A progress line every --log-every updates; a greedy play-test of the network
alone on the evaluation seeds (7001-7300) every --eval-every.
"""

from __future__ import annotations

import argparse
import json
import math
import shutil
import subprocess
import sys
import time
from pathlib import Path

import numpy as np
import torch
import torch.nn.functional as F

sys.path.insert(0, str(Path(__file__).parent))
from nn.dataset import Dataset  # noqa: E402
from nn.model import GhostNet, NetConfig, segment_logsumexp  # noqa: E402
from nn.weights import save as save_weights  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent


class Actors:
    """The Node self-play server: one JSON command per line in, one '@@' line per command out."""

    def __init__(self, workers: int, log: Path):
        self.p = subprocess.Popen(
            ['node', str(ROOT / 'scripts/nn/ts.mjs'), 'scripts/nn/actor.ts', '--workers', str(workers)],
            cwd=ROOT, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=open(log, 'w'), text=True, encoding='utf-8', bufsize=1,
        )

    def call(self, cmd: dict) -> dict:
        self.p.stdin.write(json.dumps(cmd) + '\n')
        self.p.stdin.flush()
        for line in self.p.stdout:
            if line.startswith('@@'):
                r = json.loads(line[2:])
                if 'error' in r:
                    raise RuntimeError(f'actor: {r["error"]}')
                return r
        raise RuntimeError('the actor server exited (see actor.log)')

    def close(self) -> None:
        try:
            self.p.stdin.write('{"cmd":"quit"}\n')
            self.p.stdin.flush()
            self.p.wait(timeout=30)
        except Exception:
            self.p.kill()


def policy_terms(model, b, B):
    """Value outputs, log-prob of the action taken, and policy entropy, per sample."""
    v, z = model.forward_packed(b['x'], b['present'], b['rel'], b['feat'], b['ptr'], b['seg'])
    seg = b['seg']
    logp_all = z - segment_logsumexp(z, seg, B)[seg]
    ent = -torch.zeros(B, device=z.device).index_add_(0, seg, logp_all.exp() * logp_all)
    return v, logp_all[b['tflat']], ent


def gae(values: np.ndarray, seeds: np.ndarray, final: np.ndarray, lam: float):
    """Advantages and value targets per decision; `final` (the game's result) is the only reward (gamma = 1)."""
    n = len(values)
    adv = np.zeros(n, dtype=np.float32)
    last = 0.0
    for t in range(n - 1, -1, -1):
        if t == n - 1 or seeds[t + 1] != seeds[t]:
            last = final[t] - values[t]
        else:
            last = values[t + 1] - values[t] + lam * last
        adv[t] = last
    return adv, adv + values


def hint_advantage(phi: np.ndarray, seeds: np.ndarray, lam: float) -> np.ndarray:
    """The board-score hints as a reward stream: each step earns the change in score to the next decision
    (0 after the last one), summed forward with lambda like the advantages."""
    n = len(phi)
    out = np.zeros(n, dtype=np.float32)
    last = 0.0
    for t in range(n - 1, -1, -1):
        if t == n - 1 or seeds[t + 1] != seeds[t]:
            last = 0.0
        else:
            last = (phi[t + 1] - phi[t]) + lam * last
        out[t] = last
    return out


class Run:
    def __init__(self, a):
        self.a = a
        self.dev = 'cuda' if torch.cuda.is_available() else 'cpu'
        self.dir = Path(a.run)
        self.dir.mkdir(parents=True, exist_ok=True)
        self.logf = open(self.dir / 'log.jsonl', 'a', encoding='utf-8')
        self.t0 = time.time()
        lo, hi = (int(x) for x in a.eval_seeds.split('-'))
        self.eval_seeds = list(range(lo, hi + 1))
        weights = json.loads(Path(a.init).with_suffix('.json').read_text(encoding='utf-8'))
        self.schema = weights['schema']
        self.model = GhostNet(self.schema, NetConfig(**weights['config'])).to(self.dev)
        self.actors = Actors(a.workers, self.dir / 'actor.log')
        self.opt_state = None

    def say(self, msg: str) -> None:
        print(msg, flush=True)
        with (self.dir / 'progress.txt').open('a', encoding='utf-8') as f:
            f.write(msg + '\n')

    def log(self, rec: dict) -> None:
        self.logf.write(json.dumps(rec) + '\n')
        self.logf.flush()

    def optimizer(self, lr: float):
        named = list(self.model.named_parameters())
        decay = [p for n, p in named if p.dim() >= 2 and n != 'slot']
        rest = [p for n, p in named if not (p.dim() >= 2 and n != 'slot')]
        return torch.optim.AdamW([{'params': decay, 'weight_decay': 0.01}, {'params': rest, 'weight_decay': 0.0}], lr=lr, betas=(0.9, 0.99))

    def checkpoint(self, step: int) -> Path:
        w = self.dir / f'step-{step:04d}.json'
        save_weights(self.model, str(w))
        opt = getattr(self, 'opt', None)
        torch.save({'model': self.model.state_dict(), 'opt': opt.state_dict() if opt is not None else None, 'step': step, 'args': vars(self.a)},
                   self.dir / f'step-{step:04d}.pt')
        return w

    def play_test(self, step: int) -> None:
        w = self.checkpoint(step)
        r = self.actors.call({'cmd': 'eval', 'weights': str(w), 'seeds': self.eval_seeds})
        monks = ', '.join(f'{k} {v}' for k, v in r['byMonk'].items())
        self.say(f'  play-test @ {step}: network alone wins {r["wins"]}/{r["games"]} ({r["wins"] / r["games"]:.1%}), {r["turns"]:.1f} turns, '
                 f'deck {r["progress"]:.0%}, losses {r["reasons"]} | {monks}')
        self.log({'step': step, 'eval': r})
        if self.a.eval_temp > 0:
            r2 = self.actors.call({'cmd': 'eval', 'weights': str(w), 'seeds': self.eval_seeds, 'temp': self.a.eval_temp, 'iter': step})
            self.say(f'  play-test @ {step} (sampled, temperature {self.a.eval_temp}): network alone wins {r2["wins"]}/{r2["games"]} '
                     f'({r2["wins"] / r2["games"]:.1%}), {r2["turns"]:.1f} turns, deck {r2["progress"]:.0%}, losses {r2["reasons"]}')
            self.log({'step': step, 'evalSampled': r2})

    # ------------------------------------------------------------------
    def self_play(self, start: int) -> None:
        a, dev, model = self.a, self.dev, self.model
        opt = self.optimizer(a.rl_lr)
        total = a.total_updates - start

        def frac(step: int) -> float:
            return (step - start) / max(1, total)

        s0 = a.sched_start if a.sched_start >= 0 else start
        s1 = a.sched_end if a.sched_end >= 0 else a.total_updates

        def lr_at(step: int) -> float:
            return a.rl_lr * (1 - 0.7 * min(1.0, max(0.0, (step - s0) / max(1, s1 - s0))))

        if self.opt_state is not None:
            try:
                opt.load_state_dict(self.opt_state)
                self.say('  (optimizer state carried over from the checkpoint)')
            except Exception as e:  # noqa: BLE001
                self.say(f'  (optimizer state not reusable: {e})')
        self.opt = opt
        danger_w = json.loads(a.danger) if a.danger else None

        def beta_at(step: int) -> float:
            return a.beta_start + (a.beta_end - a.beta_start) * frac(step)

        def kappa_at(step: int) -> float:
            return a.kappa_start + (a.kappa_end - a.kappa_start) * frac(step)

        step = start
        it = 0
        stats: dict[str, torch.Tensor] = {}
        n_stats = 0
        last: dict = {}
        while step < a.total_updates:
            it += 1
            w = self.dir / 'actor-weights.json'
            save_weights(model, str(w))
            seeds = [a.seed_base + (it - 1) * a.games_per_iter + i for i in range(a.games_per_iter)]
            out = self.dir / f'iter-{it:04d}'
            if out.exists():
                shutil.rmtree(out)
            t_play = time.time()
            cmd = {'cmd': 'play', 'weights': str(w), 'seeds': seeds, 'out': str(out), 'iter': it}
            if danger_w:
                cmd['danger'] = danger_w
            if a.starts:
                cmd['starts'] = a.starts
                cmd['startFrac'] = a.start_frac_start + (a.start_frac_end - a.start_frac_start) * frac(step)
            r = self.actors.call(cmd)
            play_s = time.time() - t_play
            ds = Dataset(out, self.schema, dev)
            shutil.rmtree(out)
            N = ds.N
            # The acting policy's log-probs and estimates, recomputed here (TypeScript agrees to ~1e-4).
            model.eval()
            old_logp = torch.empty(N, device=dev)
            Vw = torch.empty(N, device=dev)
            Vp = torch.empty(N, device=dev)
            with torch.no_grad():
                for i in range(0, N, 2048):
                    j = torch.arange(i, min(N, i + 2048), device=dev)
                    b = ds.batch(j)
                    v, lp, _ = policy_terms(model, b, j.numel())
                    old_logp[j] = lp
                    Vw[j] = torch.sigmoid(v[:, 0])
                    Vp[j] = torch.sigmoid(v[:, 1])
            model.train()
            beta = beta_at(step)
            kappa = kappa_at(step)
            seeds_np = ds.seed.cpu().numpy()
            adv_w, ret_w = gae(Vw.cpu().numpy(), seeds_np, ds.win.cpu().numpy(), a.lam)
            adv_p, ret_p = gae(Vp.cpu().numpy(), seeds_np, ds.prog.cpu().numpy(), a.lam)
            adv_h = hint_advantage(ds.phi.cpu().numpy() / a.phi_scale, seeds_np, a.lam)
            ret_w = torch.from_numpy(ret_w).to(dev).clamp(0, 1)
            ret_p = torch.from_numpy(ret_p).to(dev).clamp(0, 1)
            adv = torch.from_numpy(adv_w + beta * adv_p + kappa * adv_h).to(dev)
            real_all = ds.ncand > 1
            adv_n = (adv - adv[real_all].mean()) / adv[real_all].std().clamp(min=1e-6)
            ev_w = 1 - float(torch.var(ret_w - Vw) / torch.var(ret_w).clamp(min=1e-8))
            ev_p = 1 - float(torch.var(ret_p - Vp) / torch.var(ret_p).clamp(min=1e-8))
            last = {**r, 'iter': it, 'decisions': N, 'drift': float((old_logp - ds.blogp).abs().mean()), 'vWin': float(Vw.mean()),
                    'vProg': float(Vp.mean()), 'evWin': ev_w, 'evProg': ev_p, 'beta': beta, 'kappa': kappa,
                    'hint': float(np.abs(adv_h).mean()), 'danger': float(-ds.phi.mean()), 'playSeconds': play_s}
            self.log({'step': step, 'phase': 'rl', 'selfplay': last})
            for _epoch in range(a.ppo_epochs):
                order = torch.randperm(N, device=dev)
                for k in range(0, N - a.batch + 1, a.batch):
                    if step >= a.total_updates:
                        break
                    step += 1
                    idx = order[k : k + a.batch]
                    for grp in opt.param_groups:
                        grp['lr'] = lr_at(step - 1)
                    b = ds.batch(idx)
                    v, logp, ent = policy_terms(model, b, a.batch)
                    real = (b['ncand'] > 1).float()
                    nreal = real.sum().clamp(min=1)
                    ratio = torch.exp(logp - old_logp[idx])
                    A = adv_n[idx]
                    pol_loss = -(torch.min(ratio * A, ratio.clamp(1 - a.clip, 1 + a.clip) * A) * real).sum() / nreal
                    ent_mean = (ent * real).sum() / nreal
                    v_loss = F.binary_cross_entropy_with_logits(v[:, 0], ret_w[idx]) + F.binary_cross_entropy_with_logits(v[:, 1], ret_p[idx])
                    aux = F.cross_entropy(v[:, 2:], b['outc'])
                    loss = pol_loss + a.w_value * v_loss + a.w_aux * aux - a.ent * ent_mean
                    opt.zero_grad(set_to_none=True)
                    loss.backward()
                    torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
                    opt.step()
                    with torch.no_grad():
                        kl = (((ratio - 1) - (logp - old_logp[idx])) * real).sum() / nreal
                        clipped = (((ratio - 1).abs() > a.clip).float() * real).sum() / nreal
                        for key, val in (('pol', pol_loss), ('val', v_loss), ('ent', ent_mean), ('kl', kl), ('clip', clipped)):
                            stats[key] = stats.get(key, torch.zeros((), device=dev)) + val.detach()
                    n_stats += 1
                    if step % a.log_every == 0:
                        s_ = {k: float(v) / n_stats for k, v in stats.items()}
                        lp = last
                        mid = (f' [full games {lp["winsFull"]}/{lp["games"] - lp["gamesStarted"]}, from mid-game {lp["winsStarted"]}/{lp["gamesStarted"]}]'
                               if lp.get('gamesStarted') else '')
                        self.say(f'[{step:5d}/{a.total_updates}] self-play | round {lp["iter"]}: wins {lp["wins"]}/{lp["games"]} ({lp["wins"] / lp["games"]:.1%}){mid}, '
                                 f'{lp["turns"]:.1f} turns, deck {lp["progress"]:.0%} | est. win {lp["vWin"]:.3f} (fit {lp["evWin"]:.2f}), est. deck {lp["vProg"]:.0%} '
                                 f'(fit {lp["evProg"]:.2f}), danger {lp["danger"]:.2f} | beta {lp["beta"]:.2f} kappa {lp["kappa"]:.2f} | policy {s_["pol"]:+.3f} value {s_["val"]:.3f} entropy {s_["ent"]:.3f} '
                                 f'kl {s_["kl"]:.4f} clip {s_["clip"]:.1%} | logp gap {lp["drift"]:.0e} | play {lp["playSeconds"]:.0f}s/round | '
                                 f'lr {lr_at(step):.1e} | {time.time() - self.t0:.0f}s')
                        self.log({'step': step, 'phase': 'rl', **s_})
                        stats = {}
                        n_stats = 0
                    if step % a.eval_every == 0 or step == a.total_updates:
                        self.play_test(step)
            del ds


def main() -> None:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    ap = argparse.ArgumentParser()
    ap.add_argument('--run', default=str(ROOT / 'training/runs/rl-v1'))
    ap.add_argument('--init', required=True, help='the checkpoint (.pt, with its weights .json beside it) to continue from')
    ap.add_argument('--total-updates', type=int, required=True, help='stop at this update number (counting the checkpoint number it starts from)')
    ap.add_argument('--batch', type=int, default=256)
    ap.add_argument('--rl-lr', type=float, default=3e-4)
    ap.add_argument('--games-per-iter', type=int, default=180)
    ap.add_argument('--ppo-epochs', type=int, default=2)
    ap.add_argument('--clip', type=float, default=0.2)
    ap.add_argument('--ent', type=float, default=0.01)
    ap.add_argument('--w-value', type=float, default=1.0)
    ap.add_argument('--w-aux', type=float, default=0.25)
    ap.add_argument('--lam', type=float, default=0.95)
    ap.add_argument('--beta-start', type=float, default=0.0, help='weight of the deck-progress reward at the start of self-play')
    ap.add_argument('--beta-end', type=float, default=0.0, help='... and at the end (linear)')
    ap.add_argument('--kappa-start', type=float, default=0.0, help='weight of the danger hints (ai/nn/danger.ts) at the start of self-play')
    ap.add_argument('--kappa-end', type=float, default=0.0, help='... and at the end (linear)')
    ap.add_argument('--phi-scale', type=float, default=1.0, help='danger units per unit of reward')
    ap.add_argument('--danger', default='', help='danger-hint weights as JSON (src/ai/nn/danger.ts DangerWeights; missing keys keep defaults)')
    ap.add_argument('--starts', default='', help='mid-game start bank (scripts/nn/starts.ts); a share of self-play games begin there')
    ap.add_argument('--start-frac-start', type=float, default=0.0, help='share of self-play games from the start bank, at the start of this run')
    ap.add_argument('--start-frac-end', type=float, default=0.0, help='... and at the end (linear)')
    ap.add_argument('--sched-start', type=int, default=-1, help='learning-rate schedule span (default: this run); for runs in segments')
    ap.add_argument('--sched-end', type=int, default=-1)
    ap.add_argument('--log-every', type=int, default=100)
    ap.add_argument('--eval-every', type=int, default=500)
    ap.add_argument('--eval-seeds', default='7001-7300')
    ap.add_argument('--eval-temp', type=float, default=0.0, help='also play-test sampling moves at this temperature (0 = top choice only)')
    ap.add_argument('--workers', type=int, default=18)
    ap.add_argument('--seed-base', type=int, default=300000)
    ap.add_argument('--seed', type=int, default=0)
    a = ap.parse_args()
    torch.manual_seed(a.seed)
    torch.backends.cuda.matmul.allow_tf32 = True
    run = Run(a)
    m = run.model
    run.say(f'model: {m.cfg}, {sum(p.numel() for p in m.parameters())} params')
    ck = torch.load(a.init, map_location=run.dev)
    m.load_state_dict(ck['model'])
    run.opt_state = ck.get('opt')
    start = int(ck['step'])
    run.say(f'self-play from {a.init} (update {start}); {a.total_updates - start} PPO updates, lr {a.rl_lr}, '
            f'entropy {a.ent}, beta {a.beta_start} -> {a.beta_end}, kappa {a.kappa_start} -> {a.kappa_end}'
            + (f', danger weights {a.danger}' if a.danger else ''))
    run.self_play(start)
    run.actors.close()
    run.say(f'done: {a.total_updates} updates in {time.time() - run.t0:.0f}s')


if __name__ == '__main__':
    main()
