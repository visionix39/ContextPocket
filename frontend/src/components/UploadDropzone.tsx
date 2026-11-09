"use client";

import { useCallback, useRef, useState } from "react";
import { CheckCircle2, FileUp, Loader2, Sparkles, XCircle } from "lucide-react";
import { useSWRConfig } from "swr";
import { ApiError, api, type Document } from "@/lib/api";
import { colorForSubject, styleFor } from "@/lib/colors";

type Status =
  | { kind: "idle" }
  | { kind: "uploading"; name: string }
  | { kind: "done"; doc: Document }
  | { kind: "error"; message: string };

export function UploadDropzone({
  subjects,
  defaultSubject,
  onUploaded,
}: {
  subjects: string[];
  defaultSubject?: string;
  onUploaded?: (doc: Document) => void;
}) {
  const [subject, setSubject] = useState(defaultSubject ?? "");
  const [drag, setDrag] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const inputRef = useRef<HTMLInputElement>(null);
  const { mutate } = useSWRConfig();

  const upload = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      for (const file of list) {
        setStatus({ kind: "uploading", name: file.name });
        try {
          const doc = await api.upload(file, subject.trim() || undefined);
          setStatus({ kind: "done", doc });
          onUploaded?.(doc);
          await Promise.all([mutate("documents"), mutate("subjects"), mutate("health")]);
        } catch (e) {
          setStatus({ kind: "error", message: e instanceof ApiError ? e.message : "Upload failed" });
          return;
        }
      }
    },
    [subject, onUploaded, mutate],
  );

  const previewColor = styleFor(colorForSubject(subject.trim() || "General"));

  return (
    <div className="cp-card p-5">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="text-sm font-semibold text-ink" htmlFor="subject">
          Class / subject
        </label>
        <div className="flex flex-1 items-center gap-2">
          <span className={`h-3 w-3 rounded-full ${previewColor.dot}`} aria-hidden />
          <input
            id="subject"
            list="subject-options"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Deep Learning"
            className="w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm outline-none ring-grape/30 focus:ring-2"
          />
          <datalist id="subject-options">
            {subjects.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          if (e.dataTransfer.files.length) void upload(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
          drag ? "border-grape bg-grape-soft" : "border-lavender bg-canvas hover:border-grape/60"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.md,.markdown,.txt"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && void upload(e.target.files)}
        />
        {status.kind === "uploading" ? (
          <>
            <Loader2 className="h-9 w-9 animate-spin text-grape" />
            <p className="text-sm font-semibold text-ink">Reading {status.name}…</p>
            <p className="text-xs text-ink-soft">Splitting into passages and embedding them locally</p>
          </>
        ) : (
          <>
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-soft">
              <FileUp className="h-6 w-6 text-grape animate-wiggle" />
            </span>
            <p className="text-sm font-semibold text-ink">Drop your notes here, or click to browse</p>
            <p className="text-xs text-ink-soft">PDF · Markdown · plain text · up to 50 MB</p>
          </>
        )}
      </div>

      {status.kind === "done" && (
        <div className="animate-pop mt-4 flex items-start gap-3 rounded-2xl bg-mint/25 p-3 text-sm">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
          <div>
            <p className="font-semibold text-ink">
              Added “{status.doc.title}” to {status.doc.subject}
            </p>
            <p className="text-ink-soft">
              {status.doc.chunk_count} passages
              {status.doc.page_count ? ` across ${status.doc.page_count} pages` : ""} are now searchable.
              <Sparkles className="ml-1 inline h-3.5 w-3.5 text-amber-500" />
            </p>
          </div>
        </div>
      )}
      {status.kind === "error" && (
        <div className="animate-pop mt-4 flex items-start gap-3 rounded-2xl bg-coral/20 p-3 text-sm">
          <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-700" />
          <p className="text-ink">{status.message}</p>
        </div>
      )}
    </div>
  );
}
