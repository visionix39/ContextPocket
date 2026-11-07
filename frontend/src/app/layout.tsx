import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "ContextPocket",
  description: "A local-first study buddy that learns what you struggle with.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="cp-backdrop flex min-h-full flex-col">
        <Suspense fallback={<div className="h-16 border-b border-line/70 bg-white/80" />}>
          <Nav />
        </Suspense>
        <main className="mx-auto w-full max-w-6xl flex-1 px-5 pb-16 pt-8">{children}</main>
        <footer className="pb-6 text-center text-xs text-ink-soft">
          ContextPocket · local-first · your notes never leave this machine
        </footer>
      </body>
    </html>
  );
}
