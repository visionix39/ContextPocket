import io

NOTES = """# Backpropagation

Backpropagation computes the gradient of the loss with respect to every weight by
applying the chain rule backwards through the network, one layer at a time.

# Convolutional Neural Networks

A CNN uses convolutional filters that slide over the input image to detect local
patterns such as edges and textures, followed by pooling layers that downsample.

# Regularization

Dropout randomly zeroes activations during training so the network cannot rely on
any single neuron, which reduces overfitting. L2 weight decay penalises large weights.
"""


def _upload(client, name="dl_notes.md", subject="Deep Learning", content=NOTES):
    return client.post(
        "/documents",
        files={"file": (name, io.BytesIO(content.encode()), "text/markdown")},
        data={"subject": subject},
    )


def test_health_empty(client):
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["documents"] == 0
    assert body["embedding_backend"] == "hash"
    assert body["ollama_available"] is False


def test_upload_search_ask_delete_roundtrip(client):
    r = _upload(client)
    assert r.status_code == 201, r.text
    doc = r.json()
    assert doc["status"] == "ready"
    assert doc["chunk_count"] >= 3
    assert doc["subject"] == "Deep Learning"
    assert doc["title"] == "Dl notes"

    subjects = client.get("/documents/subjects").json()
    assert subjects == [
        {"subject": "Deep Learning", "color": doc["color"], "document_count": 1, "chunk_count": doc["chunk_count"]}
    ]

    r = client.post("/search", json={"query": "how does dropout reduce overfitting", "k": 2})
    assert r.status_code == 200
    hits = r.json()["hits"]
    assert hits and "Dropout" in hits[0]["text"]
    assert hits[0]["heading"] == "Regularization"
    assert hits[0]["document_title"] == "Dl notes"

    r = client.post("/ask", json={"query": "what does backpropagation compute?"})
    body = r.json()
    assert body["mode"] == "extractive"
    assert "[1]" in body["answer"]
    assert "chain rule" in body["answer"]
    assert body["sources"][0]["heading"] == "Backpropagation"

    # subject filter excludes everything when no doc matches
    r = client.post("/search", json={"query": "dropout", "subject": "History"})
    assert r.json()["hits"] == []

    r = client.delete(f"/documents/{doc['id']}")
    assert r.status_code == 204
    assert client.get("/health").json()["index_size"] == 0
    assert client.post("/search", json={"query": "dropout"}).json()["hits"] == []


def test_rejects_unsupported_and_empty_files(client):
    r = client.post("/documents", files={"file": ("x.exe", io.BytesIO(b"abc"), "application/octet-stream")})
    assert r.status_code == 415
    r = client.post("/documents", files={"file": ("x.md", io.BytesIO(b""), "text/markdown")})
    assert r.status_code == 400
    r = client.post("/documents", files={"file": ("blank.md", io.BytesIO(b"   \n"), "text/markdown")})
    assert r.status_code == 422
    assert client.get("/documents").json() == []


def test_pdf_upload_records_pages(client):
    import fitz

    pdf = fitz.open()
    for i in range(2):
        page = pdf.new_page()
        page.insert_text((72, 72), f"Page {i + 1}: gradient descent updates weights using the gradient.")
    data = pdf.tobytes()
    r = client.post("/documents", files={"file": ("gd.pdf", io.BytesIO(data), "application/pdf")})
    assert r.status_code == 201, r.text
    assert r.json()["page_count"] == 2
    chunks = client.get(f"/documents/{r.json()['id']}/chunks").json()
    assert {c["page"] for c in chunks} == {1, 2}
