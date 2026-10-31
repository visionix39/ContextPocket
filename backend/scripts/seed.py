"""Upload the sample notes to a running ContextPocket backend.

Usage: .venv/bin/python scripts/seed.py [--api http://127.0.0.1:8000] [--reset]
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[2]
NOTES = ROOT / "sample_data" / "notes"

# filename -> (subject, title or None for auto)
SUBJECTS = {
    "deep_learning_fundamentals.md": ("Deep Learning", "Deep Learning Fundamentals"),
    "deep_learning_fundamentals.pdf": ("Deep Learning", "Deep Learning Fundamentals (lecture PDF)"),
    "cnn_and_regularization.md": ("Deep Learning", "CNNs & Regularisation"),
    "ai_agents_course.md": ("AI Agents", "AI Agents Course Notes"),
}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--api", default="http://127.0.0.1:8000")
    ap.add_argument("--reset", action="store_true", help="delete existing documents first")
    args = ap.parse_args()

    with httpx.Client(base_url=args.api, timeout=300) as c:
        try:
            c.get("/health").raise_for_status()
        except httpx.HTTPError as e:
            print(f"Backend not reachable at {args.api}: {e}", file=sys.stderr)
            return 1
        if args.reset:
            for d in c.get("/documents").json():
                c.delete(f"/documents/{d['id']}")
                print(f"deleted {d['title']}")
        existing = {d["filename"] for d in c.get("/documents").json()}
        for path in sorted(NOTES.iterdir()):
            if path.name not in SUBJECTS:
                continue
            if path.name in existing:
                print(f"skip   {path.name} (already uploaded)")
                continue
            subject, title = SUBJECTS[path.name]
            data = {"subject": subject}
            if title:
                data["title"] = title
            r = c.post("/documents", files={"file": (path.name, path.read_bytes())}, data=data)
            r.raise_for_status()
            d = r.json()
            print(f"added  {d['title']:<32} {d['subject']:<14} {d['chunk_count']} chunks")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
