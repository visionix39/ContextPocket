import os
import sys
from pathlib import Path

import pytest

# Point the app at a throw-away data dir and the dependency-free embedder
# *before* anything imports app.config.
_TMP = Path(__file__).resolve().parent / "_tmpdata"
os.environ["CP_DATA_DIR"] = str(_TMP)
os.environ["CP_EMBEDDING_BACKEND"] = "hash"
os.environ["CP_OLLAMA_BASE_URL"] = "http://127.0.0.1:9"  # nothing listens here

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


@pytest.fixture(scope="session", autouse=True)
def _clean_data_dir():
    import shutil

    shutil.rmtree(_TMP, ignore_errors=True)
    _TMP.mkdir(parents=True)
    yield
    shutil.rmtree(_TMP, ignore_errors=True)


@pytest.fixture()
def client():
    from fastapi.testclient import TestClient

    from app.db import Base, engine, init_db
    from app.main import app
    from app.services.embeddings import reset_embedder
    from app.services.vectorstore import reset_vector_store

    Base.metadata.drop_all(bind=engine)
    init_db()
    reset_embedder()
    reset_vector_store()
    from app.config import get_settings

    idx = get_settings().faiss_index_path
    if idx.exists():
        idx.unlink()
    with TestClient(app) as c:
        yield c
