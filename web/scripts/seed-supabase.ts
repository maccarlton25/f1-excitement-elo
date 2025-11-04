import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";
import { createClient } from "@supabase/supabase-js";

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running the seed script."
  );
  process.exit(1);
}

const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const dataRoot = process.env.RACE_DATA_DIR
  ? path.resolve(process.env.RACE_DATA_DIR)
  : path.resolve(process.cwd(), "..", "data", "processed");

const summariesCsv = path.join(dataRoot, "race_summaries.csv");
const duelSeedCsv = path.join(dataRoot, "race_duel_seed.csv");

function parseCsv(filePath: string) {
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = Papa.parse<Record<string, string>>(raw, {
    header: true,
    skipEmptyLines: true,
  });
  if (parsed.errors.length) {
    throw new Error(
      `Failed to parse ${filePath}: ${parsed.errors
        .map((err) => err.message)
        .join("; ")}`
    );
  }
  return parsed.data;
}

async function main() {
  console.log("Seeding Supabase with race_summaries and race_ratings…");

  const rawDuelSeeds = parseCsv(duelSeedCsv);
  const duelIdIndex = new Map<string, number>();
  rawDuelSeeds.forEach((row) => {
    const season = Number(row.season);
    const round = Number(row.round);
    const parsedId = Number(row.raceId ?? row.race_id);
    if (Number.isFinite(season) && Number.isFinite(round) && Number.isFinite(parsedId)) {
      duelIdIndex.set(`${season}-${round}`, parsedId);
    }
  });

  const summaries = parseCsv(summariesCsv).map((row) => {
    const season = Number(row.season);
    const round = Number(row.round);
    const key = `${season}-${round}`;
    const parsedId = Number(row.raceId ?? row.race_id);
    const mappedId = duelIdIndex.get(key);
    const fallbackId = Number.isFinite(season) && Number.isFinite(round)
      ? season * 100 + round
      : undefined;
    const raceId = Number.isFinite(parsedId)
      ? parsedId
      : mappedId ?? fallbackId;
    if (!raceId) {
      throw new Error(`Missing race_id in summaries CSV for season=${row.season} round=${row.round}`);
    }
    return {
      race_id: raceId,
      season,
      round,
      race_name: row.race_name,
      summary_text: row.summary_text,
      youtube_highlights_url: row.youtube_highlights_search,
      unique_strategy_share: Number(row.unique_strategy_share ?? 0),
      avg_stops_per_driver: Number(row.avg_stops_per_driver ?? 0),
      dnf_count: Number(row.dnf_count ?? 0),
      max_regret_s: Number(row.max_regret_s ?? 0),
      top_mover: row.top_mover ?? null,
      top_mover_gain: row.top_mover_gain ? Number(row.top_mover_gain) : null,
    };
  });

  const duelSeeds = rawDuelSeeds.map((row) => {
    const season = Number(row.season);
    const round = Number(row.round);
    const key = `${season}-${round}`;
    const parsedId = Number(row.raceId ?? row.race_id);
    const mappedId = duelIdIndex.get(key);
    const fallbackId = Number.isFinite(season) && Number.isFinite(round)
      ? season * 100 + round
      : undefined;
    const raceId = Number.isFinite(parsedId)
      ? parsedId
      : mappedId ?? fallbackId;
    if (!raceId) {
      throw new Error(`Missing race_id in duel seed CSV for season=${row.season} round=${row.round}`);
    }
    return {
      race_id: raceId,
      season,
      round,
      race_name: row.race_name,
      prior_score: Number(row.prior_score ?? 0),
      elo: Number(row.elo_seed ?? 1500),
      logit_seed: Number(row.logit_seed ?? 0),
      wins: 0,
      losses: 0,
    };
  });

  const { error: summaryError } = await client
    .from("race_summaries")
    .upsert(summaries, { onConflict: "race_id" });

  if (summaryError) {
    throw summaryError;
  }

  const { error: ratingError } = await client
    .from("race_ratings")
    .upsert(duelSeeds, { onConflict: "race_id" });

  if (ratingError) {
    throw ratingError;
  }

  console.log("Supabase seed complete.");
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
