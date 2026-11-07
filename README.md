# ContextPocket

**A local-first study buddy that remembers what you struggle with.**

Upload your lecture notes, articles or docs. ContextPocket splits them into passages,
indexes them on your machine, lets you ask questions grounded in your own material,
turns your notes into quizzes and flashcards that always show their source, and (in
later milestones) tracks which concepts you keep getting wrong and schedules revision
around them. No paid APIs, nothing leaves your laptop.

> Built in four milestones. **Milestones 1 (knowledge library) and 2 (quiz & flashcard
> generator) are complete.**

## Features by milestone

| # | Milestone | Status | What you get |
| --- | --- | --- | --- |
| 1 | Knowledge library | ✅ done | Upload PDF / Markdown / text → parse → chunk → embed → FAISS. Semantic search and grounded Q&A with source passages. Subject "class" cards. |
| 2 | Quiz & flashcard generator | ✅ done | Multiple-choice, short-answer and flashcards generated from your notes (local LLM or offline rules), schema-validated, each linked to the exact passage. Study mode with instant MCQ feedback, explainable short-answer grading and flip cards. |
| 3 | Adaptive revision engine | ⏳ next | Attempts, accuracy and review history per concept; transparent spaced repetition; a daily queue that prioritises weak concepts. |
| 4 | Concept graph & evaluation | ⏳ | Knowledge map of related concepts; retrieval-quality metrics; checks that generated questions are supported by the source. |

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Frontend | Next.js 16 + TypeScript + Tailwind v4 | App-router pages, hand-drawn SVG illustrations, pastel subject cards |
| Backend | Python 3.12 + FastAPI | Typed request/response models, auto docs at `/docs` |
| Database | SQLite + SQLAlchemy 2 | Zero-setup, single file, WAL mode |
| Document parsing | PyMuPDF (PDF), custom Markdown/text parser | Page numbers and headings are kept as metadata |
| Embeddings | `fastembed` (ONNX) running `BAAI/bge-small-en-v1.5` | Runs everywhere without PyTorch, incl. Intel Macs. Swap to `sentence-transformers` with one env var |
| Vector search | FAISS `IndexIDMap2(IndexFlatIP)` | Exact cosine search keyed by chunk id, so chunks can be removed and the index rebuilt |
| Local LLM (optional) | Ollama | If a model is running it writes answers and quiz items from your passages; otherwise the API falls back to extractive answers and a rule-based question generator |
| Tests | pytest | Chunker, parser, full API round-trip, question generation and grading, all with a dependency-free hash embedder |

## Quick start

Prerequisites: Python 3.11/3.12, Node 20+, [`uv`](https://docs.astral.sh/uv/) (or plain `pip`).

```bash
# backend
cd backend
uv venv --python 3.12 .venv
uv pip install --python .venv/bin/python -e ".[dev]"
.venv/bin/python -m uvicorn app.main:app --reload --port 8000
```

```bash
# frontend (second terminal)
cd frontend
npm install
npm run dev
```

Open <http://localhost:3000>. The first upload downloads the embedding model (~130 MB)
into `backend/data/models/` once.

Load the demo notes (deep learning + AI agents) with:

```bash
cd backend && .venv/bin/python scripts/seed.py
```

### Optional: local LLM answers

Install [Ollama](https://ollama.com) (on macOS: `brew install --cask ollama-app`, which ships the
prebuilt app plus the `ollama` CLI), open it once so the server is running on port 11434, then:

```bash
ollama pull llama3.2:3b
```

`llama3.2:3b` is a 2 GB download and runs comfortably on CPU (about 13 tokens/s on an
Intel i9; a 6-question set takes around a minute, an answer about 15 s).

The backend detects it automatically (`GET /health` → `ollama_available: true`) and
switches from extractive answers to generated ones, still citing passages by number.
Quiz generation also switches to the LLM (JSON mode, strictly validated, see below).
Change the model with `CP_OLLAMA_MODEL`.

## Configuration

All settings are environment variables prefixed `CP_` (or a `backend/.env` file):

| Variable | Default | Notes |
| --- | --- | --- |
| `CP_DATA_DIR` | `backend/data` | uploads, SQLite db, FAISS index, model cache |
| `CP_EMBEDDING_BACKEND` | `fastembed` | `fastembed` \| `sentence-transformers` \| `hash` |
| `CP_EMBEDDING_MODEL` | `BAAI/bge-small-en-v1.5` | any model the backend supports |
| `CP_CHUNK_SIZE` / `CP_CHUNK_OVERLAP` | `900` / `150` | characters |
| `CP_OLLAMA_BASE_URL` / `CP_OLLAMA_MODEL` | `http://localhost:11434` / `llama3.2:3b` | |

Frontend: `BACKEND_URL` (default `http://127.0.0.1:8000`) is proxied under `/api`.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/documents` | multipart upload (`file`, optional `subject`, `title`) |
| `GET` | `/documents`, `/documents/{id}`, `/documents/{id}/chunks` | browse the library |
| `PATCH` / `DELETE` | `/documents/{id}` | rename / re-file / remove (index updated) |
| `GET` | `/documents/subjects` | class cards: subject, colour, counts |
| `POST` | `/search` | `{query, k, subject?, document_ids?}` → ranked passages with scores |
| `POST` | `/ask` | same input → answer + numbered sources (`mode`: `llm` or `extractive`) |
| `POST` | `/documents/reindex` | re-embed everything (after changing the model) |
| `POST` | `/study/sets` | `{kinds, count, subject?, document_ids?, topic?, title?}` → a new practice set with its questions |
| `GET` | `/study/sets`, `/study/sets/{id}` | list sets (with per-kind counts) / fetch one with questions and sources |
| `DELETE` | `/study/sets/{id}` | remove a set |
| `POST` | `/study/grade` | `{question_id, answer}` → verdict, similarity, key-term coverage, missing terms, reference |
| `GET` | `/health` | model, index size, Ollama status, question counts |

## How ingestion works

1. **Parse.** PDFs via PyMuPDF, one block per page. Markdown is split per heading, and
   each block remembers its heading; code fences are kept intact.
2. **Chunk.** Paragraph-aware packing to ~900 characters with a 150-character overlap so
   facts on a boundary are still retrievable. Tiny trailing chunks merge upward.
3. **Embed.** Heading + text is embedded (heading context helps retrieval). Queries use
   the model's query mode (BGE adds its instruction prefix automatically).
4. **Index.** Vectors are added to FAISS under their SQLite chunk ids, persisted after
   each write. Deleting a document removes its ids from the index.
5. **Answer.** `/ask` retrieves top-k passages, then either prompts the local LLM to
   answer *only* from them with `[n]` citations, or falls back to picking the
   highest-overlap sentences from the passages.

## How questions are generated (Milestone 2)

Every question is tied to one chunk and carries a verbatim `evidence` sentence from it,
so the UI can always show *where* a question came from.

1. **Pick passages.** With a topic, the most relevant chunks are retrieved; otherwise
   picks are spread evenly across every file in scope so a set covers the whole material.
2. **Write items.** If Ollama is running, each passage is sent with a JSON-mode prompt
   asking for MCQ / short-answer / flashcard items. Output is validated strictly: it must
   parse, an MCQ needs exactly four distinct options with the answer among them, and the
   quoted evidence must actually occur in the passage (or match a passage sentence
   closely). Anything that fails is dropped, never shown.
3. **Offline fallback.** Without an LLM, a transparent rule-based generator finds
   *definitional sentences* ("Backpropagation is the algorithm that…", "ReLU (rectified
   linear unit) outputs…") and turns them into flashcards, short-answer prompts and
   cloze-style MCQs. Distractors are other concepts from the same file, then the same
   class, and concepts only count if they recur in the notes or are explicitly defined.
   The same generator tops up a set when the LLM returns too few valid items.
4. **Grade.** MCQs are checked exactly. Free-text answers are scored with two visible
   signals: cosine similarity to the reference (same local embedding model as search) and
   coverage of the reference's key terms. The missing terms are returned so the student
   sees *what* they left out, not just a number.

Milestone 3 will persist attempts and use repeated results, not single grades, to flag
weak concepts.

## Tests

```bash
cd backend && .venv/bin/python -m pytest
```

## Project layout

```
backend/
  app/            FastAPI app: config, db, models, schemas, routers/ (documents, search, study),
                  services/ (parsing, chunking, embeddings, vectorstore, search, llm, questions, grading)
  scripts/        seed.py (load sample notes), make_sample_pdf.py
  tests/          pytest suite (uses the hash embedder, no model download)
frontend/
  src/app/        dashboard, library, library/[id], study, study/[id], ask, subjects/[name]
  src/components/ Nav, SubjectCard, UploadDropzone, AskPanel, SourceCard, GeneratorPanel, SetCard,
                  study/ (McqCard, ShortAnswerCard, Flashcard, SessionSummary, SourcePeek), illustrations/
sample_data/      demo notes used by seed.py and the evaluation set
```
