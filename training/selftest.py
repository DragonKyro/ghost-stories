"""Checks the training input pipeline end to end.

    python selftest.py <data dir with dense-check.json> [parity samples json]

1. The packed policy forward equals the padded one (and so the TypeScript
   forward pass, through the parity fixture).
2. Batches assembled from the sparse shards equal the encoder's dense output
   (dense-check.json, written by `gen.ts --dump N` for the first samples of shard-00).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import torch

sys.path.insert(0, str(Path(__file__).parent))
from nn.data import batch  # noqa: E402
from nn.dataset import Dataset  # noqa: E402
from nn.model import GhostNet, NetConfig  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent


def packed_from_padded(b: dict):
    mask = b['cmask']
    seg = mask.nonzero()[:, 0]
    return b['feat'][mask], b['ptr'][mask], seg


def main() -> None:
    data_dir = Path(sys.argv[1])
    parity = Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / 'node_modules/.cache/nn/parity-samples.json'
    dev = 'cuda' if torch.cuda.is_available() else 'cpu'

    # 1. Packed == padded.
    pdata = json.loads(parity.read_text(encoding='utf-8'))
    schema = pdata['schema']
    torch.manual_seed(3)
    model = GhostNet(schema, NetConfig(32, 4, 2, 64)).to(dev).eval()
    b = batch(schema, pdata['samples'], dev)
    with torch.no_grad():
        v1, z1 = model(b['x'], b['present'], b['rel'], b['feat'], b['ptr'], b['cmask'])
        feat, ptr, seg = packed_from_padded(b)
        v2, z2 = model.forward_packed(b['x'], b['present'], b['rel'], feat, ptr, seg)
    assert torch.allclose(v1, v2, atol=1e-5), 'value differs packed vs padded'
    assert torch.allclose(z1[b['cmask']], z2, atol=1e-5), 'logits differ packed vs padded'
    print(f'packed == padded: {len(pdata["samples"])} samples, {z2.numel()} candidates')

    # 2. Shards == dense encoder output.
    dense = json.loads((data_dir / 'dense-check.json').read_text(encoding='utf-8'))
    ds = Dataset(data_dir, dense['schema'], dev)
    K = len(dense['samples'])
    got = ds.batch(torch.arange(K, device=dev))
    want = batch(dense['schema'], dense['samples'], dev)
    for t in dense['schema']['tokens']:
        a, e = got['x'][t['type']], want['x'][t['type']]
        assert torch.allclose(a, e, atol=2e-3, rtol=2e-3), f'state features differ ({t["type"]}): max {float((a - e).abs().max())}'
    assert torch.equal(got['present'], want['present']), 'presence differs'
    assert torch.equal(got['rel'], want['rel']), 'relations differ'
    feat, ptr, seg = packed_from_padded(want)
    assert torch.allclose(got['feat'], feat, atol=2e-3, rtol=2e-3), 'candidate features differ'
    assert torch.equal(got['ptr'], ptr), 'pointers differ'
    assert torch.equal(got['seg'], seg), 'candidate segments differ'
    targets = torch.tensor([s['target'] for s in dense['samples']], device=dev)
    starts = torch.tensor([0] + [s['n'] for s in dense['samples']][:-1], device=dev).cumsum(0)
    assert torch.equal(got['tflat'], starts + targets), 'targets differ'
    print(f'shards == encoder: {K} samples; dataset {ds.N} samples, {ds.Nc} candidates, {ds.nbytes() / 1e9:.2f} GB on {dev}')


if __name__ == '__main__':
    main()
