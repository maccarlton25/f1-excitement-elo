"use client";

import useSWR from "swr";
import { useState } from "react";
import type { DuelMatch } from "@/lib/types";

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) {
      throw new Error(`Failed to fetch ${url}`);
    }
    return res.json();
  });

export function DuelArena() {
  const { data, error, mutate, isLoading } = useSWR<DuelMatch>(
    "/api/duel",
    fetcher
  );
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const vote = async (winnerId: number, loserId: number) => {
    try {
      setSubmitting(true);
      setFeedback(null);
      const res = await fetch("/api/duel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          winnerRaceId: winnerId,
          loserRaceId: loserId,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || "Vote failed");
      }

      setFeedback("Vote recorded! Loading a new pairing...");
      await mutate();
    } catch (err) {
      setFeedback((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (error) {
    return (
      <p className="text-sm text-red-400">
        Failed to load duel: {error.message}
      </p>
    );
  }

  if (isLoading || !data) {
    return <p className="text-sm text-slate-400">Loading duel...</p>;
  }

  const { raceA, raceB } = data;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {[raceA, raceB].map((race, idx) => (
        <article key={race.raceId} className="card flex flex-col gap-4">
          <header>
            <p className="text-xs uppercase tracking-wide text-slate-400">
              {race.season} • Round {race.round}
            </p>
            <h3 className="text-lg font-semibold text-slate-100">
              {race.raceName}
            </h3>
          </header>
          <p className="text-sm text-slate-300 leading-snug">
            {race.summaryText}
          </p>
          <dl className="grid gap-2 text-xs text-slate-400">
            <div className="flex justify-between">
              <dt>Unique strategy share</dt>
              <dd>{(race.uniqueStrategyShare * 100).toFixed(0)}%</dd>
            </div>
            <div className="flex justify-between">
              <dt>Avg stops</dt>
              <dd>{race.avgStopsPerDriver.toFixed(1)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Max regret</dt>
              <dd>{race.maxRegretSeconds.toFixed(0)} s</dd>
            </div>
            <div className="flex justify-between">
              <dt>Elo rating</dt>
              <dd>{race.elo.toFixed(0)}</dd>
            </div>
          </dl>
          <button
            type="button"
            disabled={submitting}
            onClick={() =>
              vote(
                race.raceId,
                idx === 0 ? raceB.raceId : raceA.raceId
              )
            }
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-slate-600"
          >
            Vote {idx === 0 ? "Race A" : "Race B"} as hotter strategy weekend
          </button>
          <a
            className="text-xs text-primary underline"
            href={race.youtubeHighlightsUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Watch highlights →
          </a>
        </article>
      ))}
      {feedback && (
        <p className="md:col-span-2 text-xs text-slate-400">{feedback}</p>
      )}
    </div>
  );
}
