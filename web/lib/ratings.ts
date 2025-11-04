import fs from "node:fs/promises";
import path from "node:path";
import Papa from "papaparse";
import { supabase } from "./supabase";
import type { DuelSeed, RaceRating } from "./types";

const DATA_ROOT = process.env.RACE_DATA_DIR
  ? path.resolve(process.env.RACE_DATA_DIR)
  : path.resolve(process.cwd(), "..", "data", "processed");

const DUEL_SEED_CSV = path.join(DATA_ROOT, "race_duel_seed.csv");

interface DuelRow {
  raceId: string;
  season: string;
  round: string;
  race_name: string;
  prior_score: string;
  elo_seed: string;
  logit_seed: string;
}

const parseNumber = (value: string | null | undefined, fallback = 0) => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export async function loadDuelSeeds(): Promise<DuelSeed[]> {
  let csv: string | null = null;

  try {
    csv = await fs.readFile(DUEL_SEED_CSV, "utf8");
  } catch (error: any) {
    if (error?.code !== "ENOENT") {
      throw error;
    }
  }

  if (csv) {
    const parsed = Papa.parse<DuelRow>(csv, {
      header: true,
      skipEmptyLines: true,
    });

    if (parsed.errors.length) {
      throw new Error(
        `Failed to parse duel seed CSV: ${parsed.errors
          .map((err) => err.message)
          .join("; ")}`
      );
    }

    return parsed.data.map((row) => ({
      raceId: parseNumber(row.raceId, parseNumber(row.round) + parseNumber(row.season) * 1000),
      season: parseNumber(row.season),
      round: parseNumber(row.round),
      raceName: row.race_name,
      priorScore: parseNumber(row.prior_score),
      eloSeed: parseNumber(row.elo_seed),
      logitSeed: parseNumber(row.logit_seed),
    }));
  }

  if (!supabase) {
    throw new Error(
      "race_duel_seed.csv not found and Supabase is not configured. Provide processed duel seeds or Supabase credentials."
    );
  }

  const { data, error } = await supabase
    .from("race_ratings")
    .select("race_id, season, round, race_name, prior_score, elo, logit_seed")
    .order("season", { ascending: true })
    .order("round", { ascending: true });

  if (error) {
    throw new Error(`Supabase race_ratings query failed: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    raceId: Number(row.race_id),
    season: row.season,
    round: row.round,
    raceName: row.race_name,
    priorScore: Number(row.prior_score ?? 0),
    eloSeed: Number(row.elo ?? 1500),
    logitSeed: Number(row.logit_seed ?? 0),
  }));
}

export async function getRaceRatings(): Promise<RaceRating[]> {
  if (!supabase) {
    const seeds = await loadDuelSeeds();
    return seeds.map((seed) => ({
      ...seed,
      wins: 0,
      losses: 0,
      elo: seed.eloSeed,
      updatedAt: new Date().toISOString(),
    }));
  }

  const { data, error } = await supabase
    .from("race_ratings")
    .select("race_id, season, round, race_name, wins, losses, elo, prior_score, logit_seed, updated_at");

  if (error) {
    console.error("[Supabase] Failed to load race_ratings", error);
    // fall back to local duel seeds to keep the app functional
    return (await loadDuelSeeds()).map((seed) => ({
      ...seed,
      wins: 0,
      losses: 0,
      elo: seed.eloSeed,
      updatedAt: new Date().toISOString(),
    }));
  }

  if (!data || data.length === 0) {
    const seeds = await loadDuelSeeds();
    return seeds.map((seed) => ({
      ...seed,
      wins: 0,
      losses: 0,
      elo: seed.eloSeed,
      updatedAt: new Date().toISOString(),
    }));
  }

  return data.map((row) => ({
    raceId: row.race_id,
    season: row.season,
    round: row.round,
    raceName: row.race_name,
    wins: row.wins,
    losses: row.losses,
    elo: row.elo,
    updatedAt: row.updated_at,
    priorScore: row.prior_score ?? 0,
    eloSeed: row.elo ?? 1500,
    logitSeed: row.logit_seed ?? 0,
  }));
}
