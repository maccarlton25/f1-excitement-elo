import Link from "next/link";
import type { RaceSummary } from "@/lib/types";

interface Props {
  races: RaceSummary[];
}

export function LatestHighlights({ races }: Props) {
  if (!races.length) {
    return null;
  }

  return (
    <section className="card mt-16">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold text-primary">
          Recent Highlights
        </h4>
        <Link href="/dashboard" className="text-sm text-slate-300 underline">
          View dashboard →
        </Link>
      </div>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {races.map((race) => (
          <article key={race.raceId} className="flex flex-col gap-3">
            <header>
              <p className="text-xs uppercase tracking-wide text-slate-400">
                {race.season} • Round {race.round}
              </p>
              <h5 className="text-lg font-medium text-slate-100">
                {race.raceName}
              </h5>
            </header>
            <p className="text-sm leading-snug text-slate-300">
              {race.summaryText}
            </p>
            <div className="flex flex-wrap gap-3 text-xs text-slate-400">
              <span>Unique strategy share: {(race.uniqueStrategyShare * 100).toFixed(0)}%</span>
              <span>Avg stops: {race.avgStopsPerDriver.toFixed(1)}</span>
              <span>Max regret: {race.maxRegretSeconds.toFixed(0)}s</span>
            </div>
            <Link
              href={race.youtubeHighlightsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary underline"
            >
              Watch highlights
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
