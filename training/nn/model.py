"""The Ghost Stories network (PyTorch). Mirrors src/ai/nn/model.ts tensor for tensor.

    tokens --embed (per type) + slot embedding--> h
    L x [ h += Attn(LN(h), relation bias, key mask) ; h += FFN(LN(h)) ]
    hf = LN(h);  g = [hf_global, mean over present tokens]
    value head:  MLP(g) -> [win logit, progress logit, outcome logits]
    policy head: per candidate MLP([W.feat + sum_k P_k.hf[ptr_k], g]) -> logit

Inputs (a batch, see data.py):
    x[type]  float [B, slots, features]   per token type, in schema order
    present  bool  [B, T]                 token slots in use
    rel      long  [B, T, T]              relation ids
    feat     float [B, C, A]              candidate features (padded)
    ptr      long  [B, C, K]              token slot per pointer role, -1 = none
    cmask    bool  [B, C]                 real candidates
"""

from __future__ import annotations

import math
from dataclasses import dataclass

import torch
from torch import nn
import torch.nn.functional as F


@dataclass
class NetConfig:
    d: int = 64
    heads: int = 4
    layers: int = 3
    ff: int = 128


class Block(nn.Module):
    def __init__(self, d: int, heads: int, ff: int, n_rel: int):
        super().__init__()
        self.heads = heads
        self.ln1 = nn.LayerNorm(d)
        self.qkv = nn.Linear(d, 3 * d)
        self.out = nn.Linear(d, d)
        self.rel = nn.Parameter(torch.zeros(heads, n_rel))
        self.ln2 = nn.LayerNorm(d)
        self.ff1 = nn.Linear(d, ff)
        self.ff2 = nn.Linear(ff, d)

    def forward(self, h: torch.Tensor, present: torch.Tensor, rel: torch.Tensor) -> torch.Tensor:
        B, T, d = h.shape
        H = self.heads
        dh = d // H
        a = self.ln1(h)
        q, k, v = self.qkv(a).split(d, dim=-1)
        q = q.view(B, T, H, dh).transpose(1, 2)  # [B, H, T, dh]
        k = k.view(B, T, H, dh).transpose(1, 2)
        v = v.view(B, T, H, dh).transpose(1, 2)
        scores = (q @ k.transpose(-1, -2)) / math.sqrt(dh)
        scores = scores + self.rel[:, rel].permute(1, 0, 2, 3)  # [H, B, T, T] -> [B, H, T, T]
        scores = scores.masked_fill(~present[:, None, None, :], float('-inf'))
        o = torch.softmax(scores, dim=-1) @ v  # [B, H, T, dh]
        h = h + self.out(o.transpose(1, 2).reshape(B, T, d))
        return h + self.ff2(F.relu(self.ff1(self.ln2(h))))


class ValueHead(nn.Module):
    def __init__(self, d: int, n_out: int):
        super().__init__()
        self.fc1 = nn.Linear(2 * d, d)
        self.fc2 = nn.Linear(d, n_out)

    def forward(self, g: torch.Tensor) -> torch.Tensor:
        return self.fc2(F.relu(self.fc1(g)))


class PolicyHead(nn.Module):
    def __init__(self, d: int, cand_features: int, n_ptr: int):
        super().__init__()
        self.cand = nn.Linear(cand_features, d)
        self.ptr = nn.Parameter(torch.randn(n_ptr, d, d) / math.sqrt(d))
        self.fc1 = nn.Linear(3 * d, d)
        self.fc2 = nn.Linear(d, 1)

    def forward(self, hf, present, g, feat, ptr, cmask):
        B, T, d = hf.shape
        C = feat.shape[1]
        K = self.ptr.shape[0]
        e = self.cand(feat)  # [B, C, d]
        if C > 0:
            proj = torch.einsum('btd,kod->bkto', hf, self.ptr).reshape(B, K * T, d)  # role k, token t at k*T + t
            idx = ptr.clamp(min=0)  # [B, C, K]
            valid = (ptr >= 0) & torch.gather(present, 1, idx.reshape(B, C * K)).reshape(B, C, K)
            flat = idx + torch.arange(K, device=hf.device) * T  # [B, C, K]
            picked = torch.gather(proj, 1, flat.reshape(B, C * K, 1).expand(-1, -1, d)).view(B, C, K, d)
            e = e + (picked * valid[..., None]).sum(2)
        u = F.relu(self.fc1(torch.cat([e, g[:, None, :].expand(-1, C, -1)], dim=-1)))
        logits = self.fc2(u).squeeze(-1)
        return logits.masked_fill(~cmask, float('-inf'))


class GhostNet(nn.Module):
    def __init__(self, schema: dict, cfg: NetConfig):
        super().__init__()
        self.schema = schema
        self.cfg = cfg
        d = cfg.d
        self.types = [t['type'] for t in schema['tokens']]
        self.embed = nn.ModuleDict({t['type']: nn.Linear(t['features'], d) for t in schema['tokens']})
        self.slot = nn.Parameter(torch.randn(schema['nTokens'], d) * 0.02)
        self.layers = nn.ModuleList([Block(d, cfg.heads, cfg.ff, schema['nRel']) for _ in range(cfg.layers)])
        self.ln_f = nn.LayerNorm(d)
        self.value = ValueHead(d, 2 + schema['nOutcome'])
        self.policy = PolicyHead(d, schema['candFeatures'], schema['nPtr'])

    def trunk(self, x: dict, present: torch.Tensor, rel: torch.Tensor):
        """Token types no position in the batch uses are dropped (they'd be masked anyway).

        Returns the final token states, the pooled state, the kept-slot mask and a map
        from full slot index to kept index (-1 for dropped slots).
        """
        parts, idx = [], []
        for t in self.schema['tokens']:
            a, n = t['start'], t['slots']
            if t['start'] != 0 and not present[:, a : a + n].any():
                continue
            parts.append(self.embed[t['type']](x[t['type']]))
            idx.append(torch.arange(a, a + n, device=present.device))
        keep = torch.cat(idx)
        h = torch.cat(parts, dim=1) + self.slot[keep]
        pk = present[:, keep]
        rk = rel[:, keep][:, :, keep]
        for blk in self.layers:
            h = blk(h, pk, rk)
        hf = self.ln_f(h)
        m = pk.to(hf.dtype)[..., None]
        g = torch.cat([hf[:, 0], (hf * m).sum(1) / m.sum(1)], dim=-1)
        remap = torch.full((present.shape[1],), -1, dtype=torch.long, device=present.device)
        remap[keep] = torch.arange(keep.numel(), device=present.device)
        return hf, g, pk, remap

    def forward(self, x, present, rel, feat, ptr, cmask):
        hf, g, pk, remap = self.trunk(x, present, rel)
        v = self.value(g)  # [B, 2 + outcomes]: win logit, progress logit, outcome logits
        kp = torch.where(ptr >= 0, remap[ptr.clamp(min=0)], ptr)
        logits = self.policy(hf, pk, g, feat, kp, cmask)
        return v, logits
