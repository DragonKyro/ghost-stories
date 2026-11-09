"""Sparse training shards (scripts/nn/shard.ts) -> GPU-resident tensors and packed batches.

A batch is assembled on the device with vectorised range gathers: the dense
state features (B x all token features), the presence mask, the relation
matrix, and the candidates packed back to back (no padding) with the index of
the sample each belongs to.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import torch

COLS = {
    's_off': np.uint32, 's_idx': np.uint16, 's_val': np.float16, 'present': np.uint8,
    'rel_off': np.uint32, 'rel': np.uint8, 'c_off': np.uint32, 'cf_off': np.uint32,
    'cf_idx': np.uint8, 'cf_val': np.float16, 'ptr': np.int8, 'target': np.uint16,
    'game': np.uint32, 'kind': np.uint8,
}
EXT = {np.uint32: 'u32', np.uint16: 'u16', np.float16: 'f16', np.uint8: 'u8', np.int8: 'i8', np.float32: 'f32'}
# Optional columns (older shards don't have them).
OPTIONAL = {'blogp': np.float32, 'phi': np.float32}
OFFSETS = {'s_off': 's_idx', 'rel_off': 'rel', 'c_off': None, 'cf_off': 'cf_idx'}


def _read(d: Path, name: str, n: int = 0) -> np.ndarray:
    t = COLS.get(name) or OPTIONAL[name]
    f = d / f'{name}.{EXT[t]}'
    if name in OPTIONAL and not f.exists():
        return np.zeros(n, dtype=t)
    return np.fromfile(f, dtype=t)


def ranges(starts: torch.Tensor, lengths: torch.Tensor):
    """Concatenated aranges [s, s + l) for each (s, l); the segment of each; each segment's start in the output."""
    n = lengths.numel()
    total = int(lengths.sum())
    seg = torch.repeat_interleave(torch.arange(n, device=lengths.device), lengths, output_size=total)
    offs = torch.cumsum(lengths, 0) - lengths
    pos = torch.arange(total, device=lengths.device) - offs[seg]
    return starts[seg] + pos, seg, offs


class Dataset:
    def __init__(self, root: str | Path, schema: dict, device: str = 'cuda'):
        root = Path(root)
        shards = sorted(p for p in root.iterdir() if p.is_dir() and p.name.startswith('shard-'))
        if not shards:
            raise FileNotFoundError(f'no shards in {root}')
        self.schema = schema
        self.device = device
        self.T = schema['nTokens']
        self.A = schema['candFeatures']
        self.K = schema['nPtr']
        self.F = sum(t['slots'] * t['features'] for t in schema['tokens'])
        parts: dict[str, list[np.ndarray]] = {k: [] for k in [*COLS, *OPTIONAL]}
        base = {'s_off': 0, 'rel_off': 0, 'c_off': 0, 'cf_off': 0}
        games: dict[int, dict] = {}
        for d in shards:
            meta = json.loads((d / 'meta.json').read_text())
            if meta['schema'] != schema['hash']:
                raise ValueError(f'{d} was encoded with schema {meta["schema"]}, not {schema["hash"]}')
            cols = {k: _read(d, k) for k in COLS}
            for k in OPTIONAL:
                cols[k] = _read(d, k, len(cols['target']))
            for k in [*COLS, *OPTIONAL]:
                a = cols[k]
                if k in OFFSETS:
                    a = a.astype(np.int64) + base[k]
                    # Drop the leading 0 except for the first shard.
                    a = a if not parts[k] else a[1:]
                parts[k].append(a)
            base['s_off'] += len(cols['s_idx'])
            base['rel_off'] += len(cols['rel'])
            base['c_off'] += int(cols['c_off'][-1])
            base['cf_off'] += len(cols['cf_idx'])
            for g in json.loads((d / 'games.json').read_text()):
                games[g['seed']] = g
        cat = {k: np.concatenate(v) for k, v in parts.items()}
        self.N = len(cat['target'])
        self.Nc = int(cat['c_off'][-1])
        dev = device
        self.s_off = torch.from_numpy(cat['s_off']).to(dev)
        self.s_idx = torch.from_numpy(cat['s_idx'].astype(np.int16)).to(dev)
        self.s_val = torch.from_numpy(cat['s_val']).to(dev)
        self.present = torch.from_numpy(cat['present'].astype(bool).reshape(self.N, self.T)).to(dev)
        self.rel_off = torch.from_numpy(cat['rel_off']).to(dev)
        self.rel = torch.from_numpy(cat['rel']).to(dev)
        self.c_off = torch.from_numpy(cat['c_off']).to(dev)
        self.cf_off = torch.from_numpy(cat['cf_off']).to(dev)
        self.cf_idx = torch.from_numpy(cat['cf_idx']).to(dev)
        self.cf_val = torch.from_numpy(cat['cf_val']).to(dev)
        self.ptr = torch.from_numpy(cat['ptr'].reshape(self.Nc, self.K)).to(dev)
        self.target = torch.from_numpy(cat['target'].astype(np.int64)).to(dev)
        self.kind = torch.from_numpy(cat['kind'].astype(np.int64)).to(dev)
        self.blogp = torch.from_numpy(cat['blogp']).to(dev)
        self.phi = torch.from_numpy(cat['phi']).to(dev)
        seeds = cat['game'].astype(np.int64)
        self.seed = torch.from_numpy(seeds).to(dev)
        win = np.array([games[s]['win'] for s in seeds], dtype=np.float32)
        prog = np.array([1.0 if games[s]['win'] else (games[s]['deck0'] - games[s]['left']) / games[s]['deck0'] for s in seeds], dtype=np.float32)
        reasons = {None: 0, 'allDead': 1, 'thirdHaunting': 2, 'deckExhausted': 3, 'villagers': 4}
        outc = np.array([reasons[games[s]['reason']] for s in seeds], dtype=np.int64)
        self.win = torch.from_numpy(win).to(dev)
        self.prog = torch.from_numpy(prog).to(dev)
        self.outc = torch.from_numpy(outc).to(dev)
        self.games = games
        self.ncand = (self.c_off[1:] - self.c_off[:-1])

    def nbytes(self) -> int:
        return sum(t.element_size() * t.numel() for t in vars(self).values() if isinstance(t, torch.Tensor))

    def batch(self, idx: torch.Tensor) -> dict:
        dev = self.device
        B = idx.numel()
        # Dense state features.
        st = self.s_off[idx]
        ent, seg, _ = ranges(st, self.s_off[idx + 1] - st)
        X = torch.zeros(B, self.F, device=dev)
        X[seg, self.s_idx[ent].long()] = self.s_val[ent].float()
        x = {}
        o = 0
        for t in self.schema['tokens']:
            n = t['slots'] * t['features']
            x[t['type']] = X[:, o : o + n].reshape(B, t['slots'], t['features'])
            o += n
        P = self.present[idx]
        # Relations among the present tokens (stored n x n in slot order).
        n = P.sum(1)
        rst = self.rel_off[idx]
        ent, seg, _ = ranges(rst, self.rel_off[idx + 1] - rst)
        pos = P.nonzero()[:, 1]
        po = torch.cumsum(n, 0) - n
        local = torch.arange(ent.numel(), device=dev) - (torch.cumsum(n * n, 0) - n * n)[seg]
        ns = n[seg]
        a = pos[po[seg] + local // ns]
        b = pos[po[seg] + local % ns]
        R = torch.zeros(B, self.T, self.T, dtype=torch.long, device=dev)
        R[seg, a, b] = self.rel[ent].long()
        # Candidates, packed.
        cst = self.c_off[idx]
        cid, cseg, coffs = ranges(cst, self.c_off[idx + 1] - cst)
        fst = self.cf_off[cid]
        fe, fseg, _ = ranges(fst, self.cf_off[cid + 1] - fst)
        Fc = torch.zeros(cid.numel(), self.A, device=dev)
        Fc[fseg, self.cf_idx[fe].long()] = self.cf_val[fe].float()
        return {
            'x': x, 'present': P, 'rel': R, 'feat': Fc, 'ptr': self.ptr[cid].long(), 'seg': cseg,
            'tflat': coffs + self.target[idx], 'win': self.win[idx], 'prog': self.prog[idx], 'outc': self.outc[idx],
            'kind': self.kind[idx], 'ncand': self.ncand[idx],
        }
