import { cache } from "react";
import fs from "node:fs/promises";
import path from "node:path";
import Papa from "papaparse";
import type { RaceSummary } from "./types";
import { loadDuelSeeds } from "./ratings";
import { supabase } from "./supabase";

const DATA_ROOT = process.env.RACE_DATA_DIR
  ? path.resolve(process.env.RACE_DATA_DIR)
  : path.resolve(process.cwd(), "..", "data", "processed");

const RACE_SUMMARIES_CSV = path.join(DATA_ROOT, "race_summaries.csv");

interface RaceCsvRow {
  season: string;
  round: string;
  race_name: string;
  summary_text: string;
  youtube_highlights_search: string;
  unique_strategy_share: string;
  avg_stops_per_driver: string;
  dnf_count: string;
  max_regret_s: string;
  top_mover: string;
  top_mover_gain: string;
  raceId?: string;
  race_id?: string;
}

const normaliseNumber = (value: string | null | undefined, fallback = 0): number => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const getRaceSummaries = cache(async (): Promise<RaceSummary[]> => {
  let csvContent: string | null = null;

  try {
    csvContent = await fs.readFile(RACE_SUMMARIES_CSV, "utf8");
  } catch (error: any) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }

  if (csvContent) {
    const parsed = Papa.parse<RaceCsvRow>(csvContent, {
      header: true,
      skipEmptyLines: true,
    });

    if (parsed.errors.length) {
      throw new Error(
        `Failed to parse race summaries CSV: ${parsed.errors
          .map((err) => err.message)
          .join("; ")}`
      );
    }

    let seedIndex = new Map<string, number>();
    try {
      const seeds = await loadDuelSeeds();
      seedIndex = new Map(
        seeds.map((seed) => [`${seed.season}-${seed.round}`, seed.raceId])
      );
    } catch (err) {
      console.warn("[Race summaries] Unable to load duel seeds for id mapping", err);
    }

    return parsed.data.map((row) => {
      const key = `${row.season}-${row.round}`;
      const seedRaceId = seedIndex.get(key);
      const raceId =
        normaliseNumber(row.raceId ?? row.race_id, 0) ||
        seedRaceId ||
        normaliseNumber(row.round, 0) * 100 + normaliseNumber(row.season, 0);

      const topMoverGain = row.top_mover_gain
        ? normaliseNumber(row.top_mover_gain, 0)
        : null;

      return {
        raceId,
        season: normaliseNumber(row.season, 0),
        round: normaliseNumber(row.round, 0),
        raceName: row.race_name,
        summaryText: row.summary_text,
        youtubeHighlightsUrl: row.youtube_highlights_search,
        uniqueStrategyShare: normaliseNumber(row.unique_strategy_share, 0),
        avgStopsPerDriver: normaliseNumber(row.avg_stops_per_driver, 0),
        dnfCount: normaliseNumber(row.dnf_count, 0),
        maxRegretSeconds: normaliseNumber(row.max_regret_s, 0),
        topMover: row.top_mover || null,
        topMoverGain,
      };
    });
  }

  if (!supabase) {
    throw new Error(
      "race_summaries.csv not found and Supabase is not configured. Provide processed data or Supabase credentials."
    );
  }

  const { data, error } = await supabase
    .from("race_summaries")
    .select(
      "race_id, season, round, race_name, summary_text, youtube_highlights_url, unique_strategy_share, avg_stops_per_driver, dnf_count, max_regret_s, top_mover, top_mover_gain"
    )
    .order("season", { ascending: true })
    .order("round", { ascending: true });

  if (error) {
    throw new Error(`Supabase race_summaries query failed: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    raceId: Number(row.race_id),
    season: row.season,
    round: row.round,
    raceName: row.race_name,
    summaryText: row.summary_text ?? "",
    youtubeHighlightsUrl: row.youtube_highlights_url ?? "",
    uniqueStrategyShare: Number(row.unique_strategy_share ?? 0),
    avgStopsPerDriver: Number(row.avg_stops_per_driver ?? 0),
    dnfCount: Number(row.dnf_count ?? 0),
    maxRegretSeconds: Number(row.max_regret_s ?? 0),
    topMover: row.top_mover ?? null,
    topMoverGain:
      row.top_mover_gain === null || row.top_mover_gain === undefined
        ? null
        : Number(row.top_mover_gain),
  }));
});
