"""Smoke test: the full-size network trains on this machine's GPU.

    python smoke.py [samples.json] [--d 64 --heads 4 --layers 3 --ff 128 --batch 256]

Uses the parity samples (written by `npm run nn:parity`), repeated to a batch,
runs forward + backward + an optimiser step a few times and prints the
parameter count and samples per second.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

import torch
import torch.nn.functional as F

sys.path.insert(0, str(Path(__file__).parent))
from nn.data import batch  # noqa: E402
from nn.model import GhostNet, NetConfig  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('samples', nargs='?', default=str(ROOT / 'node_modules/.cache/nn/parity-samples.json'))
    ap.add_argument('--d', type=int, default=64)
    ap.add_argument('--heads', type=int, default=4)
    ap.add_argument('--layers', type=int, default=3)
    ap.add_argument('--ff', type=int, default=128)
    ap.add_argument('--batch', type=int, default=256)
    ap.add_argument('--steps', type=int, default=20)
    ap.add_argument('--all', action='store_true', help='include the expansion samples (default: base game only)')
    a = ap.parse_args()
    dev = 'cuda' if torch.cuda.is_available() else 'cpu'
    data = json.loads(Path(a.samples).read_text(encoding='utf-8'))
    schema = data['schema']
    fam = next(t for t in schema['tokens'] if t['type'] == 'family')
    cat = next(t for t in schema['tokens'] if t['type'] == 'catacomb')
    if not a.all:
        data['samples'] = [s for s in data['samples'] if not any(s['present'][fam['start'] : cat['start'] + cat['slots']])]
    reps = (a.batch + len(data['samples']) - 1) // len(data['samples'])
    b = batch(schema, (data['samples'] * reps)[: a.batch], dev)
    model = GhostNet(schema, NetConfig(a.d, a.heads, a.layers, a.ff)).to(dev)
    opt = torch.optim.AdamW(model.parameters(), lr=1e-3)
    n_params = sum(p.numel() for p in model.parameters())
    # Dummy targets: the first candidate, a coin-flip outcome.
    target = torch.zeros(a.batch, dtype=torch.long, device=dev)
    win = (torch.arange(a.batch, device=dev) % 2).float()
    for step in range(a.steps + 3):
        if step == 3:
            if dev == 'cuda':
                torch.cuda.synchronize()
            t0 = time.perf_counter()
        v, logits = model(b['x'], b['present'], b['rel'], b['feat'], b['ptr'], b['cmask'])
        loss = F.cross_entropy(logits, target) + F.binary_cross_entropy_with_logits(v[:, 0], win)
        opt.zero_grad()
        loss.backward()
        opt.step()
    if dev == 'cuda':
        torch.cuda.synchronize()
    dt = time.perf_counter() - t0
    C = b['feat'].shape[1]
    print(f'{dev}: {n_params} params, batch {a.batch} (candidates padded to {C}), loss {loss.item():.3f}, {a.steps * a.batch / dt:,.0f} samples/s')


if __name__ == '__main__':
    main()
