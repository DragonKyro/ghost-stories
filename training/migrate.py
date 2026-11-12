"""Bring a network to the current encoder schema without changing how it plays.

    conda activate train
    python training/migrate.py training/runs/r3/spec-blue-secondWind/step-89000.pt training/runs/r4/start/blue-secondWind.pt
    python training/migrate.py --weights src/ai/nn/weights/ghost-net-v1.json src/ai/nn/weights/ghost-net-v1.json

When the encoder gains input features (schema.ts: new fields in a token layout or the
candidate layout), the input layers that read them (`embed.<type>.weight`, `policy.cand.weight`)
get new columns, set to zero: the network's output is exactly what it was, whatever the new
features say, and training then learns what to make of them. Every other tensor is copied.

Old columns are matched to new ones by field name when the old schema lists its fields
(schema version 2 on); version 1 lists none, so its columns are taken to be the first ones
of each layout (fields are only ever appended: checked against the new field list). Token
types, slot counts, relations and pointers must be unchanged.

A checkpoint (.pt) also has its weights file (.json) written beside it and its curriculum
state copied; its AdamW moments are widened the same way (zeros for the new columns) so
training carries on smoothly. The result is checked: the old and new networks give the same
outputs (to 1e-5) on random inputs with random values in the new features.
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

import torch

sys.path.insert(0, str(Path(__file__).parent))
from nn.model import GhostNet, NetConfig  # noqa: E402
from nn.weights import from_weights_file, to_weights_file  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent


def current_schema() -> dict:
    out = subprocess.run(['node', str(ROOT / 'scripts/nn/ts.mjs'), 'scripts/nn/schema.ts'], cwd=ROOT, check=True,
                         capture_output=True, text=True, encoding='utf-8').stdout
    return json.loads(out.strip().splitlines()[-1])


def column_map(old: dict, new: dict, key: str, n_old: int, n_new: int) -> list[tuple[int, int]]:
    """(old column, new column) pairs for one layout ('cand' or a token type)."""
    new_fields = new['fields'][key]
    old_fields = (old.get('fields') or {}).get(key)
    if old_fields is not None:
        by_name = {name: (off, n) for name, off, n in old_fields}
        pairs = []
        for name, off, n in new_fields:
            if name in by_name:
                o_off, o_n = by_name[name]
                if o_n != n:
                    raise SystemExit(f'{key}.{name}: {o_n} columns before, {n} now (only new fields can be added)')
                pairs += [(o_off + j, off + j) for j in range(n)]
        missing = {name for name, _, _ in old_fields} - {name for name, _, _ in new_fields}
        if missing:
            raise SystemExit(f'{key}: fields {sorted(missing)} are gone (only new fields can be added)')
        return pairs
    # Version 1 (no field list): the old columns are the first n_old, and a field must end there.
    if n_old > n_new or (n_old < n_new and not any(off == n_old for _, off, _ in new_fields)):
        raise SystemExit(f'{key}: {n_old} old columns do not end on a field boundary of the new layout')
    return [(j, j) for j in range(n_old)]


def check_compatible(old: dict, new: dict) -> None:
    for k in ('nTokens', 'nRel', 'nPtr', 'nOutcome'):
        if old[k] != new[k]:
            raise SystemExit(f'schema {k}: {old[k]} -> {new[k]}; only new input features can be migrated')
    for a, b in zip(old['tokens'], new['tokens']):
        if (a['type'], a['slots'], a['start']) != (b['type'], b['slots'], b['start']):
            raise SystemExit(f'token layout changed ({a["type"]}); only new input features can be migrated')
    if len(old['tokens']) != len(new['tokens']):
        raise SystemExit('token types changed; only new input features can be migrated')


def widened(t: torch.Tensor, pairs: list[tuple[int, int]], n_new: int) -> torch.Tensor:
    out = torch.zeros(t.shape[0], n_new, dtype=t.dtype, device=t.device)
    if pairs:
        o = torch.tensor([p[0] for p in pairs], device=t.device)
        n = torch.tensor([p[1] for p in pairs], device=t.device)
        out[:, n] = t[:, o]
    return out


def plan(old: dict, new: dict) -> dict[str, tuple[list[tuple[int, int]], int]]:
    """Tensor name -> (column pairs, new width) for every input layer that changes."""
    check_compatible(old, new)
    out = {}
    for a, b in zip(old['tokens'], new['tokens']):
        if a['features'] != b['features'] or old.get('fields') is not None:
            out[f'embed.{b["type"]}.weight'] = (column_map(old, new, b['type'], a['features'], b['features']), b['features'])
    out['policy.cand.weight'] = (column_map(old, new, 'cand', old['candFeatures'], new['candFeatures']), new['candFeatures'])
    return out


def migrate_state(state: dict, p: dict) -> dict:
    return {k: (widened(v, *p[k]) if k in p else v.clone()) for k, v in state.items()}


def opt_param_names(model: GhostNet) -> list[str]:
    """Parameter names in the order rl.py's AdamW groups list them (decayed matrices, then the rest)."""
    named = list(model.named_parameters())
    decay = [n for n, q in named if q.dim() >= 2 and n != 'slot']
    rest = [n for n, q in named if not (q.dim() >= 2 and n != 'slot')]
    return decay + rest


def migrate_opt(opt: dict | None, model: GhostNet, p: dict) -> dict | None:
    if not opt:
        return opt
    names = opt_param_names(model)
    state = {}
    for i, st in opt['state'].items():
        name = names[int(i)]
        st = dict(st)
        if name in p:
            for k in ('exp_avg', 'exp_avg_sq'):
                if k in st:
                    st[k] = widened(st[k], *p[name])
        state[i] = st
    return {**opt, 'state': state}


def random_batch(schema: dict, B: int = 3, C: int = 7, seed: int = 0):
    g = torch.Generator().manual_seed(seed)
    T = schema['nTokens']
    x = {t['type']: torch.randn(B, t['slots'], t['features'], generator=g) for t in schema['tokens']}
    present = torch.rand(B, T, generator=g) < 0.7
    present[:, 0] = True
    rel = torch.randint(0, schema['nRel'], (B, T, T), generator=g)
    feat = torch.randn(B, C, schema['candFeatures'], generator=g)
    ptr = torch.randint(-1, T, (B, C, schema['nPtr']), generator=g)
    cmask = torch.ones(B, C, dtype=torch.bool)
    return x, present, rel, feat, ptr, cmask


def verify(old_model: GhostNet, new_model: GhostNet, old: dict, new: dict, p: dict) -> float:
    """Max output difference: the old net on random inputs vs the new net on the same inputs plus random new features."""
    old_model.eval()
    new_model.eval()
    x, present, rel, feat, ptr, cmask = random_batch(old)
    _, _, _, feat_n, _, _ = random_batch(new, seed=1)
    x_n = {}
    for a, b in zip(old['tokens'], new['tokens']):
        key = f'embed.{b["type"]}.weight'
        pairs = p[key][0] if key in p else [(j, j) for j in range(a['features'])]
        t = torch.randn(x[a['type']].shape[0], b['slots'], b['features'], generator=torch.Generator().manual_seed(2))
        for o, n in pairs:
            t[..., n] = x[a['type']][..., o]
        x_n[b['type']] = t
    for o, n in p['policy.cand.weight'][0]:
        feat_n[..., n] = feat[..., o]
    with torch.no_grad():
        v0, z0 = old_model(x, present, rel, feat, ptr, cmask)
        v1, z1 = new_model(x_n, present, rel, feat_n, ptr, cmask)
    return max(float((v0 - v1).abs().max()), float((z0 - z1).abs().max()))


def migrate_file(src: Path, dst: Path, new: dict, weights_only: bool = False) -> str:
    """Migrate a checkpoint (.pt + its .json) or, with weights_only, a weights file; returns a one-line report."""
    w = json.loads((src if weights_only else src.with_suffix('.json')).read_text(encoding='utf-8'))
    old = w['schema']
    dst.parent.mkdir(parents=True, exist_ok=True)
    if old['hash'] == new['hash'] and old.get('fields') == new.get('fields'):
        if src.resolve() != dst.resolve():
            shutil.copyfile(src, dst)
            if not weights_only:
                shutil.copyfile(src.with_suffix('.json'), dst.with_suffix('.json'))
                cur = src.with_suffix('.curriculum.json')
                if cur.exists():
                    shutil.copyfile(cur, dst.with_suffix('.curriculum.json'))
        return f'{src}: already on schema {new["hash"]} (copied to {dst})'
    p = plan(old, new)
    cfg = NetConfig(**w['config'])
    old_model = from_weights_file(w)
    new_model = GhostNet(new, cfg)
    ck = None
    if weights_only:
        state = old_model.state_dict()
    else:
        ck = torch.load(src, map_location='cpu')
        state = ck['model']
        old_model.load_state_dict(state)
    new_model.load_state_dict(migrate_state(state, p))
    err = verify(old_model, new_model, old, new, p)
    if err > 1e-5:
        raise SystemExit(f'migration check failed: outputs differ by {err:.2e}')
    if weights_only:
        dst.write_text(json.dumps(to_weights_file(new_model)), encoding='utf-8')
    else:
        torch.save({**ck, 'model': new_model.state_dict(), 'opt': migrate_opt(ck.get('opt'), new_model, p),
                    'migrated_from': str(src)}, dst)
        dst.with_suffix('.json').write_text(json.dumps(to_weights_file(new_model)), encoding='utf-8')
        cur = src.with_suffix('.curriculum.json')
        if cur.exists():
            shutil.copyfile(cur, dst.with_suffix('.curriculum.json'))
    grown = ', '.join(f'{k.split(".")[1] if k.startswith("embed") else "candidates"} +{n - len(pairs)}'
                      for k, (pairs, n) in p.items() if n > len(pairs))
    return (f'{src} (schema {old["hash"]}) -> {dst} (schema {new["hash"]}): new input columns {grown or "none"}; '
            f'same outputs (max difference {err:.1e})')


def migrate_checkpoint(src: Path, dst: Path, new: dict | None = None) -> str:
    return migrate_file(Path(src), Path(dst), new or current_schema())


def main() -> None:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    ap = argparse.ArgumentParser()
    ap.add_argument('src', help='a checkpoint (.pt with its .json beside it), or with --weights a weights file')
    ap.add_argument('dst', help='where the migrated checkpoint (.pt, plus .json) or weights file goes')
    ap.add_argument('--weights', action='store_true', help='src and dst are weights files (.json), not checkpoints')
    ap.add_argument('--schema', default='', help='the target schema JSON (default: the current encoder, from scripts/nn/schema.ts)')
    a = ap.parse_args()
    new = json.loads(Path(a.schema).read_text(encoding='utf-8')) if a.schema else current_schema()
    print(migrate_file(Path(a.src), Path(a.dst), new, a.weights))


if __name__ == '__main__':
    main()
