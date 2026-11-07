"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import useSWR from "swr";
import { api } from "@/lib/api";
import { useProfile } from "@/lib/useProfile";
import { Pocket } from "./illustrations/Pocket";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/library", label: "Library" },
  { href: "/study", label: "Study" },
  { href: "/ask", label: "Ask" },
];

export function Nav() {
  const pathname = usePathname();
  const { name } = useProfile();
  const { data: health, error } = useSWR("health", api.health, { refreshInterval: 15000 });

  const backendOk = !!health && !error;
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-20 border-b border-line/70 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-5">
        <Link href="/" className="flex items-center gap-2.5" aria-label="ContextPocket home">
          <Pocket className="h-9 w-9 drop-shadow-sm" />
          <span className="hidden text-base font-bold tracking-tight text-ink sm:block">
            Context<span className="text-grape">Pocket</span>
          </span>
        </Link>
        <nav className="flex items-center gap-6">
          {LINKS.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`text-[13px] font-semibold uppercase tracking-[0.18em] transition-colors ${
                  active ? "text-ink" : "text-ink-soft hover:text-grape"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <span
            className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold sm:inline-flex ${
              backendOk ? "bg-mint/30 text-emerald-800" : "bg-coral/20 text-rose-800"
            }`}
            title={
              backendOk
                ? `Backend online · ${health.embedding_model}${health.ollama_available ? ` · Ollama (${health.ollama_model})` : " · extractive answers"}`
                : "Backend offline — start the FastAPI server"
            }
          >
            <span className={`h-1.5 w-1.5 rounded-full ${backendOk ? "bg-emerald-500" : "bg-rose-500"}`} />
            {backendOk ? (health.ollama_available ? "Local LLM" : "Local search") : "Offline"}
          </span>
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-grape to-aqua text-xs font-bold text-white shadow-soft"
            title={name}
          >
            {initials || "CP"}
          </div>
        </div>
      </div>
    </header>
  );
}
