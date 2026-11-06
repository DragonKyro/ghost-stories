"""Make the TS <-> PyTorch parity fixture.

    python parity.py <samples.json> <fixture.json> [--d 16 --heads 2 --layers 2 --ff 32 --seed 7]

Builds a small GhostNet with random weights (LayerNorm and relation biases
randomised too, so every parameter matters), runs it on the samples the
TypeScript encoder wrote, and saves the weights + outputs. src/ai/nn/model.test.ts
re-encodes the same positions and checks the TypeScript forward pass agrees.
Run through `npm run nn:parity`.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import torch

sys.path.insert(0, str(Path(__file__).parent))
from nn.data import batch  # noqa: E402
from nn.model import GhostNet, NetConfig  # noqa: E402
from nn.weights import to_weights_file  # noqa: E402


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('samples')
    ap.add_argument('out')
    ap.add_argument('--d', type=int, default=16)
    ap.add_argument('--heads', type=int, default=2)
    ap.add_argument('--layers', type=int, default=2)
    ap.add_argument('--ff', type=int, default=32)
    ap.add_argument('--seed', type=int, default=7)
    a = ap.parse_args()
    data = json.loads(Path(a.samples).read_text(encoding='utf-8'))
    schema = data['schema']
    torch.manual_seed(a.seed)
    model = GhostNet(schema, NetConfig(a.d, a.heads, a.layers, a.ff))
    with torch.no_grad():
        for name, p in model.named_parameters():
            if name.endswith('.rel'):
                p.normal_(0, 0.5)
            elif 'ln' in name:
                p.add_(torch.randn_like(p) * 0.1)
    model.eval()
    b = batch(schema, data['samples'])
    with torch.no_grad():
        v, logits = model(b['x'], b['present'], b['rel'], b['feat'], b['ptr'], b['cmask'])
    expected = []
    for i, s in enumerate(data['samples']):
        expected.append({'v': v[i].tolist(), 'logits': logits[i, : s['n']].tolist()})
    fixture = {'recipe': data['recipe'], 'weights': to_weights_file(model), 'expected': expected}
    Path(a.out).write_text(json.dumps(fixture), encoding='utf-8')
    n_params = sum(p.numel() for p in model.parameters())
    print(f'parity fixture: {len(expected)} samples, schema {schema["hash"]}, {n_params} params -> {a.out}')


if __name__ == '__main__':
    main()
