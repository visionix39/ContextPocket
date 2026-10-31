"""Application settings.

Everything is local-first: uploads, the SQLite database and the FAISS index all
live under ``DATA_DIR``.  Values can be overridden with environment variables
prefixed ``CP_`` (e.g. ``CP_EMBEDDING_MODEL=BAAI/bge-small-en-v1.5``).
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="CP_", env_file=".env", extra="ignore")

    app_name: str = "ContextPocket"
    data_dir: Path = BACKEND_DIR / "data"

    # Embeddings: "fastembed" (default, ONNX) | "sentence-transformers" (torch) | "hash" (tests)
    embedding_backend: str = "fastembed"
    embedding_model: str = "BAAI/bge-small-en-v1.5"

    # Chunking (characters). ~900 chars is roughly 200 tokens.
    chunk_size: int = 900
    chunk_overlap: int = 150

    # Optional local LLM via Ollama. Retrieval works without it.
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2:3b"
    ollama_timeout_s: float = 90.0

    cors_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    @property
    def uploads_dir(self) -> Path:
        return self.data_dir / "uploads"

    @property
    def models_dir(self) -> Path:
        return self.data_dir / "models"

    @property
    def sqlite_path(self) -> Path:
        return self.data_dir / "contextpocket.db"

    @property
    def faiss_index_path(self) -> Path:
        return self.data_dir / "index.faiss"

    def ensure_dirs(self) -> None:
        self.uploads_dir.mkdir(parents=True, exist_ok=True)


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.ensure_dirs()
    return settings
