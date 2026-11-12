"""Weights <-> the JSON file the TypeScript side loads (src/ai/nn/model.ts WeightsFile)."""

from __future__ import annotations

import base64
import json

import numpy as np
import torch

from .model import GhostNet, NetConfig


def to_weights_file(model: GhostNet) -> dict:
    tensors = {}
    for name, t in model.state_dict().items():
        a = t.detach().to('cpu', torch.float32).contiguous().numpy()
        tensors[name] = {'shape': list(a.shape), 'data': base64.b64encode(a.astype('<f4').tobytes()).decode('ascii')}
    c = model.cfg
    return {'schema': model.schema, 'config': {'d': c.d, 'heads': c.heads, 'layers': c.layers, 'ff': c.ff}, 'tensors': tensors}


def save(model: GhostNet, path: str) -> None:
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(to_weights_file(model), f)


def from_weights_file(w: dict) -> GhostNet:
    model = GhostNet(w['schema'], NetConfig(**w['config']))
    state = {}
    for name, t in w['tensors'].items():
        a = np.frombuffer(base64.b64decode(t['data']), dtype='<f4').reshape(t['shape'])
        state[name] = torch.from_numpy(a.copy())
    model.load_state_dict(state)
    return model
