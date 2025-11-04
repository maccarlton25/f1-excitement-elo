import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "F1 Strategy Duel",
  description:
    "Explore Formula 1 strategy regret and vote on the most exciting races from 2022-2024.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-12 px-6 py-10">
          <header className="flex flex-col gap-4">
            <h1 className="text-3xl font-semibold text-primary md:text-4xl">
              F1 Strategy Regret Explorer
            </h1>
            <p className="max-w-3xl text-base text-slate-300">
              Quantifying pit-stop brilliance and blunders across the last three
              Formula 1 seasons. Compare races head-to-head, inspect the live
              duel ladder, and deep dive into the data pipeline behind the
              experience.
            </p>
            <nav className="flex flex-wrap gap-4 text-sm uppercase tracking-wide text-slate-400">
              <Link href="/">Home</Link>
              <Link href="/duel">Race Duel</Link>
              <Link href="/dashboard">Dashboard</Link>
            </nav>
          </header>
          <main className="grow pb-12">{children}</main>
          <footer className="border-t border-slate-800 pt-4 text-xs text-slate-500">
            Built by Mac.
          </footer>
        </div>
      </body>
    </html>
  );
}
