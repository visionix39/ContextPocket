"""FAISS-backed vector store keyed by chunk id.

Uses an ``IndexIDMap2`` over an inner-product flat index, so vectors can be
added/removed by our own ids (the SQLite chunk ids) and the index can be
rebuilt from the database at any time.  Persisted to disk after each write.
"""
from __future__ import annotations

import threading
from pathlib import Path

import faiss
import numpy as np


class VectorStore:
    def __init__(self, path: Path, dim: int):
        self.path = path
        self.dim = dim
        self._lock = threading.RLock()
        self.index = self._load_or_create()

    # -- persistence -------------------------------------------------------
    def _load_or_create(self) -> faiss.IndexIDMap2:
        if self.path.exists():
            idx = faiss.read_index(str(self.path))
            if idx.d == self.dim:
                return idx  # type: ignore[return-value]
            # dimension changed (new embedding model) -> start fresh
            self.path.unlink()
        return faiss.IndexIDMap2(faiss.IndexFlatIP(self.dim))

    def save(self) -> None:
        with self._lock:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            faiss.write_index(self.index, str(self.path))

    # -- operations --------------------------------------------------------
    def add(self, ids: list[int], vectors: np.ndarray) -> None:
        if not ids:
            return
        vecs = np.ascontiguousarray(vectors.astype("float32"))
        with self._lock:
            self.index.add_with_ids(vecs, np.asarray(ids, dtype="int64"))
            self.save()

    def remove(self, ids: list[int]) -> None:
        if not ids:
            return
        with self._lock:
            self.index.remove_ids(np.asarray(ids, dtype="int64"))
            self.save()

    def search(self, query: np.ndarray, k: int) -> list[tuple[int, float]]:
        with self._lock:
            if self.index.ntotal == 0:
                return []
            k = min(k, self.index.ntotal)
            q = np.ascontiguousarray(query.astype("float32").reshape(1, -1))
            scores, ids = self.index.search(q, k)
        return [(int(i), float(s)) for i, s in zip(ids[0], scores[0]) if i != -1]

    def reset(self) -> None:
        with self._lock:
            self.index = faiss.IndexIDMap2(faiss.IndexFlatIP(self.dim))
            self.save()

    @property
    def size(self) -> int:
        return int(self.index.ntotal)


_store: VectorStore | None = None
_store_lock = threading.Lock()


def get_vector_store() -> VectorStore:
    from ..config import get_settings
    from .embeddings import get_embedder

    global _store
    if _store is None:
        with _store_lock:
            if _store is None:
                _store = VectorStore(get_settings().faiss_index_path, get_embedder().dim)
    return _store


def reset_vector_store() -> None:  # for tests
    global _store
    _store = None
