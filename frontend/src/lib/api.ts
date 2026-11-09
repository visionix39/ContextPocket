export type Document = {
  id: number;
  title: string;
  filename: string;
  file_type: "pdf" | "md" | "txt";
  subject: string;
  color: string;
  status: "processing" | "ready" | "failed";
  error: string | null;
  page_count: number;
  char_count: number;
  chunk_count: number;
  created_at: string;
};

export type Chunk = {
  id: number;
  document_id: number;
  index: number;
  text: string;
  page: number | null;
  heading: string | null;
};

export type SearchHit = {
  chunk_id: number;
  document_id: number;
  document_title: string;
  subject: string;
  color: string;
  page: number | null;
  heading: string | null;
  text: string;
  score: number;
};

export type AskResponse = {
  query: string;
  answer: string;
  mode: "llm" | "extractive";
  model: string | null;
  sources: SearchHit[];
};

export type SubjectSummary = {
  subject: string;
  color: string;
  document_count: number;
  chunk_count: number;
};

export type Health = {
  status: string;
  embedding_backend: string;
  embedding_model: string;
  embedding_dim: number | null;
  ollama_available: boolean;
  ollama_model: string;
  documents: number;
  chunks: number;
  index_size: number;
  question_sets: number;
  questions: number;
};

export type QuestionKind = "mcq" | "short" | "flashcard";

export type SourceRef = {
  document_id: number;
  document_title: string;
  subject: string;
  color: string;
  page: number | null;
  heading: string | null;
};

export type Question = {
  id: number;
  set_id: number;
  chunk_id: number;
  kind: QuestionKind;
  prompt: string;
  options: string[];
  answer: string;
  explanation: string | null;
  concept: string;
  difficulty: number;
  evidence: string;
  generator: "llm" | "rules";
  source: SourceRef;
};

export type QuestionSetSummary = {
  id: number;
  title: string;
  subject: string | null;
  document_id: number | null;
  topic: string | null;
  kinds: QuestionKind[];
  generator: "llm" | "rules" | "mixed";
  model: string | null;
  created_at: string;
  question_count: number;
  counts: Partial<Record<QuestionKind, number>>;
  color: string;
};

export type QuestionSet = QuestionSetSummary & { questions: Question[] };

export type GenerateRequest = {
  kinds: QuestionKind[];
  count: number;
  subject?: string;
  document_ids?: number[];
  topic?: string;
  title?: string;
};

export type GradeResponse = {
  question_id: number;
  verdict: "correct" | "partial" | "missed";
  score: number;
  similarity: number;
  coverage: number;
  missing_terms: string[];
  reference: string;
  explanation: string | null;
};

const BASE = "/api";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail ?? body);
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, detail);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const fetcher = <T,>(path: string) => fetch(`${BASE}${path}`).then((r) => handle<T>(r));

const postJson = <T,>(path: string, body: unknown, method = "POST") =>
  fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((r) => handle<T>(r));

export const api = {
  health: () => fetcher<Health>("/health"),
  documents: (subject?: string) =>
    fetcher<Document[]>(`/documents${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`),
  document: (id: number) => fetcher<Document>(`/documents/${id}`),
  chunks: (id: number) => fetcher<Chunk[]>(`/documents/${id}/chunks`),
  subjects: () => fetcher<SubjectSummary[]>("/documents/subjects"),
  upload: (file: File, subject?: string, title?: string) => {
    const form = new FormData();
    form.append("file", file);
    if (subject) form.append("subject", subject);
    if (title) form.append("title", title);
    return fetch(`${BASE}/documents`, { method: "POST", body: form }).then((r) => handle<Document>(r));
  },
  deleteDocument: (id: number) => fetch(`${BASE}/documents/${id}`, { method: "DELETE" }).then((r) => handle<void>(r)),
  updateDocument: (id: number, body: Partial<Pick<Document, "title" | "subject" | "color">>) =>
    fetch(`${BASE}/documents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => handle<Document>(r)),
  search: (query: string, opts: { k?: number; subject?: string; document_ids?: number[] } = {}) =>
    fetch(`${BASE}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, ...opts }),
    }).then((r) => handle<{ query: string; hits: SearchHit[] }>(r)),
  ask: (query: string, opts: { k?: number; subject?: string; document_ids?: number[] } = {}) =>
    fetch(`${BASE}/ask`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, ...opts }),
    }).then((r) => handle<AskResponse>(r)),
  studySets: (subject?: string) =>
    fetcher<QuestionSetSummary[]>(`/study/sets${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`),
  studySet: (id: number) => fetcher<QuestionSet>(`/study/sets/${id}`),
  generateSet: (body: GenerateRequest) => postJson<QuestionSet>("/study/sets", body),
  deleteSet: (id: number) => fetch(`${BASE}/study/sets/${id}`, { method: "DELETE" }).then((r) => handle<void>(r)),
  grade: (question_id: number, answer: string) => postJson<GradeResponse>("/study/grade", { question_id, answer }),
};
