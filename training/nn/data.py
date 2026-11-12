"""Encoded samples (written by the TypeScript encoder) -> batched tensors for GhostNet."""

from __future__ import annotations

import torch


def batch(schema: dict, samples: list[dict], device: str = 'cpu') -> dict:
    """Samples as written by scripts/nn/parity-samples.ts: x[type] flat, present, rel, feat, ptr, n."""
    B = len(samples)
    T = schema['nTokens']
    A = schema['candFeatures']
    K = schema['nPtr']
    C = max(1, max(s['n'] for s in samples))
    x = {}
    for t in schema['tokens']:
        x[t['type']] = torch.tensor([s['x'][t['type']] for s in samples], dtype=torch.float32, device=device).view(B, t['slots'], t['features'])
    present = torch.tensor([s['present'] for s in samples], dtype=torch.bool, device=device).view(B, T)
    rel = torch.tensor([s['rel'] for s in samples], dtype=torch.long, device=device).view(B, T, T)
    feat = torch.zeros(B, C, A, device=device)
    ptr = torch.full((B, C, K), -1, dtype=torch.long, device=device)
    cmask = torch.zeros(B, C, dtype=torch.bool, device=device)
    for i, s in enumerate(samples):
        n = s['n']
        if n == 0:
            continue
        feat[i, :n] = torch.tensor(s['feat'], dtype=torch.float32, device=device).view(n, A)
        ptr[i, :n] = torch.tensor(s['ptr'], dtype=torch.long, device=device).view(n, K)
        cmask[i, :n] = True
    return {'x': x, 'present': present, 'rel': rel, 'feat': feat, 'ptr': ptr, 'cmask': cmask}
