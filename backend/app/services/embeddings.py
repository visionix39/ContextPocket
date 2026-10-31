"""Embedding backends.

* ``FastEmbedEmbedder`` (default): ONNX-runtime models via *fastembed*. No PyTorch
  needed, so it works on every platform including Intel macOS where recent torch
  wheels are unavailable.  Supports BGE / MiniLM / E5 families from Hugging Face.
* ``SentenceTransformerEmbedder``: the classic torch-based backend
  (``pip install -e ".[torch]"`` then ``CP_EMBEDDING_BACKEND=sentence-transformers``).
* ``HashEmbedder``: tiny deterministic bag-of-words projection used in tests and
  as an emergency fallback so the API never hard-fails because a model is missing.

All return L2-normalised float32 vectors so inner product == cosine similarity.
Passages and queries are embedded through different methods because some models
(BGE) expect an instruction prefix on the query side only.
"""
from __future__ import annotations

import hashlib
import re
import threading
from typing import Protocol

import numpy as np

from ..config import get_settings


class Embedder(Protocol):
    name: str
    dim: int

    def encode(self, texts: list[str]) -> np.ndarray: ...
    def encode_query(self, text: str) -> np.ndarray: ...


def _normalise(vecs: np.ndarray) -> np.ndarray:
    vecs = np.asarray(vecs, dtype="float32")
    norms = np.linalg.norm(vecs, axis=1, keepdims=True)
    norms[norms == 0] = 1.0
    return vecs / norms


class HashEmbedder:
    name = "hash-bow"

    def __init__(self, dim: int = 256):
        self.dim = dim

    def encode(self, texts: list[str]) -> np.ndarray:
        out = np.zeros((len(texts), self.dim), dtype="float32")
        for i, t in enumerate(texts):
            for tok in re.findall(r"[a-z0-9]+", t.lower()):
                h = int(hashlib.md5(tok.encode()).hexdigest(), 16)
                out[i, h % self.dim] += 1.0 if (h >> 8) % 2 else -1.0
        return _normalise(out)

    def encode_query(self, text: str) -> np.ndarray:
        return self.encode([text])[0]


class FastEmbedEmbedder:
    def __init__(self, model_name: str, cache_dir: str):
        from fastembed import TextEmbedding

        self.name = model_name
        self._model = TextEmbedding(model_name=model_name, cache_dir=cache_dir)
        # infer dimension from the model's registry entry, fall back to a probe
        dim = None
        for info in TextEmbedding.list_supported_models():
            if info.get("model") == model_name:
                dim = info.get("dim")
                break
        self.dim = int(dim or len(next(iter(self._model.embed(["probe"])))))

    def encode(self, texts: list[str]) -> np.ndarray:
        return _normalise(np.stack(list(self._model.embed(texts, batch_size=32))))

    def encode_query(self, text: str) -> np.ndarray:
        return _normalise(np.stack(list(self._model.query_embed([text]))))[0]


class SentenceTransformerEmbedder:
    def __init__(self, model_name: str):
        from sentence_transformers import SentenceTransformer

        self.name = model_name
        self._model = SentenceTransformer(model_name, device="cpu")
        self.dim = int(self._model.get_sentence_embedding_dimension())

    def encode(self, texts: list[str]) -> np.ndarray:
        vecs = self._model.encode(
            texts, batch_size=32, convert_to_numpy=True, normalize_embeddings=True, show_progress_bar=False
        )
        return _normalise(vecs)

    def encode_query(self, text: str) -> np.ndarray:
        return self.encode([text])[0]


_lock = threading.Lock()
_embedder: Embedder | None = None


def get_embedder() -> Embedder:
    global _embedder
    if _embedder is not None:
        return _embedder
    with _lock:
        if _embedder is None:
            s = get_settings()
            if s.embedding_backend == "hash":
                _embedder = HashEmbedder()
            elif s.embedding_backend == "sentence-transformers":
                _embedder = SentenceTransformerEmbedder(s.embedding_model)
            else:
                _embedder = FastEmbedEmbedder(s.embedding_model, str(s.models_dir))
    return _embedder


def reset_embedder() -> None:  # for tests
    global _embedder
    _embedder = None
