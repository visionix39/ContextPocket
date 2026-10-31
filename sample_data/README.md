# Sample data

Small, hand-written study notes used for demos, tests and the evaluation set.

| File | Subject | What it covers |
| --- | --- | --- |
| `notes/deep_learning_fundamentals.md` | Deep Learning | neurons, loss, gradient descent, backpropagation, init, batch norm |
| `notes/cnn_and_regularization.md` | Deep Learning | convolutions, pooling, ResNet, overfitting, dropout, weight decay, transfer learning |
| `notes/ai_agents_course.md` | AI Agents | agent loop, tools, memory/RAG, planning, evaluation, guardrails |
| `notes/deep_learning_fundamentals.pdf` | Deep Learning | PDF rendering of the first file, to exercise the PDF path |

Load them into a running backend with:

```bash
cd backend && .venv/bin/python scripts/seed.py
```

Later milestones add `eval/` with a question-answer set for measuring retrieval quality.
