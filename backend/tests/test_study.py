import io
import re


def _ws(s: str) -> str:
    return re.sub(r"\s+", " ", s)

NOTES = """# Optimisation notes

## Gradient descent

Gradient descent updates every parameter in the direction that most reduces the loss.
The learning rate controls the size of each step. Momentum accumulates an exponentially
weighted average of past gradients to damp oscillation. Adam combines momentum with a
per-parameter adaptive learning rate and is the most common optimiser for deep networks.

## Loss functions

The loss function measures how far predictions are from targets. Mean squared error is
used for regression. Cross-entropy loss is used for classification and is derived from
maximum likelihood. Softmax converts raw logits into a probability distribution.

## Regularisation

Dropout randomly zeroes activations during training so the network cannot rely on any
single neuron. Weight decay penalises large weights. Early stopping halts training when
validation loss stops improving. Dropout is switched off at test time.

## Backpropagation

Backpropagation is the algorithm that computes the gradient of the loss with respect to
every weight by applying the chain rule backwards through the network. Vanishing gradients
happen when many small derivatives are multiplied together. Exploding gradients are the
opposite problem and gradient clipping caps their norm.
"""


def _upload(client, name="optimisation.md", subject="Deep Learning"):
    return client.post(
        "/documents",
        files={"file": (name, io.BytesIO(NOTES.encode()), "text/markdown")},
        data={"subject": subject},
    )


def test_generate_set_offline_is_grounded(client):
    doc = _upload(client).json()
    r = client.post("/study/sets", json={"count": 9, "subject": "Deep Learning"})
    assert r.status_code == 201, r.text
    s = r.json()
    assert s["generator"] == "rules"  # no Ollama in tests
    assert s["model"] is None
    assert s["title"] == "Deep Learning practice"
    assert s["question_count"] == len(s["questions"]) >= 6
    assert set(s["counts"]) <= {"mcq", "short", "flashcard"}
    assert len(set(s["counts"])) == 3, "all three kinds should be represented"

    chunks = {c["id"]: c for c in client.get(f"/documents/{doc['id']}/chunks").json()}
    for q in s["questions"]:
        assert q["chunk_id"] in chunks, "every question links to a real chunk"
        assert q["evidence"] and _ws(q["evidence"]) in _ws(chunks[q["chunk_id"]]["text"]), "evidence is verbatim"
        assert q["source"]["document_title"] == doc["title"]
        assert q["concept"]
        if q["kind"] == "mcq":
            assert len(q["options"]) == 4
            assert len(set(o.lower() for o in q["options"])) == 4
            assert q["answer"] in q["options"]
            assert "______" in q["prompt"]
        else:
            assert q["options"] == []
            assert q["answer"].endswith(".")

    # listing + detail + delete
    listed = client.get("/study/sets").json()
    assert [x["id"] for x in listed] == [s["id"]]
    assert listed[0]["question_count"] == s["question_count"]
    assert client.get(f"/study/sets/{s['id']}").json()["questions"][0]["id"] == s["questions"][0]["id"]
    assert client.delete(f"/study/sets/{s['id']}").status_code == 204
    assert client.get(f"/study/sets/{s['id']}").status_code == 404


def test_generate_by_topic_and_single_kind(client):
    doc = _upload(client).json()
    r = client.post("/study/sets", json={"count": 4, "kinds": ["flashcard"], "topic": "dropout", "document_ids": [doc["id"]]})
    assert r.status_code == 201, r.text
    s = r.json()
    assert s["title"] == "Dropout practice"
    assert s["document_id"] == doc["id"]
    assert all(q["kind"] == "flashcard" for q in s["questions"])
    assert all(q["prompt"].startswith("What ") for q in s["questions"])
    assert any("ropout" in q["concept"] for q in s["questions"])


def test_generate_errors(client):
    r = client.post("/study/sets", json={"count": 5})
    assert r.status_code == 422  # empty library
    r = client.post("/study/sets", json={"count": 5, "document_ids": [999]})
    assert r.status_code == 404
    r = client.post("/study/sets", json={"count": 5, "kinds": ["essay"]})
    assert r.status_code == 422


def test_grading(client):
    _upload(client)
    s = client.post("/study/sets", json={"count": 12, "subject": "Deep Learning"}).json()
    mcq = next(q for q in s["questions"] if q["kind"] == "mcq")
    short = next(q for q in s["questions"] if q["kind"] == "short")

    ok = client.post("/study/grade", json={"question_id": mcq["id"], "answer": mcq["answer"]}).json()
    assert ok["verdict"] == "correct" and ok["score"] == 1.0
    wrong_opt = next(o for o in mcq["options"] if o != mcq["answer"])
    bad = client.post("/study/grade", json={"question_id": mcq["id"], "answer": wrong_opt}).json()
    assert bad["verdict"] == "missed" and bad["missing_terms"] == [mcq["answer"]]

    # paraphrase of the reference -> correct, with the reference echoed back
    good = client.post("/study/grade", json={"question_id": short["id"], "answer": short["answer"]}).json()
    assert good["verdict"] == "correct"
    assert good["reference"] == short["answer"]
    assert good["missing_terms"] == []

    off = client.post("/study/grade", json={"question_id": short["id"], "answer": "bananas are yellow fruit"}).json()
    assert off["verdict"] == "missed"
    assert off["missing_terms"], "tells the student what they left out"
    assert 0 <= off["coverage"] <= 1 and 0 <= off["similarity"] <= 1

    empty = client.post("/study/grade", json={"question_id": short["id"], "answer": "   "}).json()
    assert empty["verdict"] == "missed" and empty["score"] == 0.0
    assert client.post("/study/grade", json={"question_id": 99999, "answer": "x"}).status_code == 404


def test_deleting_document_removes_its_questions(client):
    doc = _upload(client).json()
    s = client.post("/study/sets", json={"count": 6}).json()
    assert s["question_count"] > 0
    assert client.delete(f"/documents/{doc['id']}").status_code == 204
    left = client.get(f"/study/sets/{s['id']}").json()
    assert left["question_count"] == 0 and left["questions"] == []
    assert client.get("/health").json()["questions"] == 0
