import { NextRequest, NextResponse } from "next/server";
import { expectedScore, updateElo } from "@/lib/elo";
import { getRaceSummaries } from "@/lib/races";
import { getRaceRatings } from "@/lib/ratings";
import { supabase } from "@/lib/supabase";
import type { DuelSeed, RaceSummary } from "@/lib/types";

interface VotePayload {
  winnerRaceId: number;
  loserRaceId: number;
}

function pickTwo(
  races: Array<RaceSummary & { elo: number }>
): [RaceSummary & { elo: number }, RaceSummary & { elo: number }] {
  if (races.length < 2) {
    throw new Error("Not enough races to run a duel");
  }
  const shuffled = [...races].sort(() => Math.random() - 0.5);
  return [shuffled[0], shuffled[1]];
}

export async function GET() {
  const [summaries, ratings] = await Promise.all([
    getRaceSummaries(),
    getRaceRatings(),
  ]);

  const ratingIndex = new Map<number, (typeof ratings)[number]>();
  ratings.forEach((rating) => ratingIndex.set(rating.raceId, rating));

  const merged = summaries.map((summary) => {
    const rating = ratingIndex.get(summary.raceId);
    return {
      ...summary,
      elo: rating?.elo ?? rating?.eloSeed ?? 1500,
    };
  });

  const [raceA, raceB] = pickTwo(merged);

  return NextResponse.json({
    raceA,
    raceB,
  });
}

export async function POST(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase must be configured to record duels." },
      { status: 501 }
    );
  }

  const body = (await request.json()) as VotePayload;
  if (!body?.winnerRaceId || !body?.loserRaceId) {
    return NextResponse.json(
      { error: "winnerRaceId and loserRaceId are required." },
      { status: 400 }
    );
  }

  const { winnerRaceId, loserRaceId } = body;

  const { data: ratings, error } = await supabase
    .from("race_ratings")
    .select(
      "race_id, elo, wins, losses, season, round, race_name, prior_score, logit_seed"
    )
    .in("race_id", [winnerRaceId, loserRaceId]);

  if (error) {
    console.error("[Supabase] Failed to load race ratings", error);
    return NextResponse.json(
      { error: "Failed to load race ratings." },
      { status: 500 }
    );
  }

  if (!ratings || ratings.length !== 2) {
    return NextResponse.json(
      { error: "Expected to find two race ratings for the duel." },
      { status: 400 }
    );
  }

  const winner = ratings.find((r) => r.race_id === winnerRaceId)!;
  const loser = ratings.find((r) => r.race_id === loserRaceId)!;

  const winnerElo = updateElo(winner.elo, loser.elo, 1);
  const loserElo = updateElo(loser.elo, winner.elo, 0);

  const updates = [
    {
      race_id: winnerRaceId,
      season: winner.season,
      round: winner.round,
      race_name: winner.race_name,
      elo: Math.round(winnerElo),
      wins: winner.wins + 1,
      losses: winner.losses,
      prior_score: winner.prior_score,
      logit_seed: winner.logit_seed,
    },
    {
      race_id: loserRaceId,
      season: loser.season,
      round: loser.round,
      race_name: loser.race_name,
      elo: Math.round(loserElo),
      wins: loser.wins,
      losses: loser.losses + 1,
      prior_score: loser.prior_score,
      logit_seed: loser.logit_seed,
    },
  ];

  const { error: updateError } = await supabase
    .from("race_ratings")
    .upsert(updates, { onConflict: "race_id" });

  if (updateError) {
    console.error("[Supabase] Failed to update ratings", updateError);
    return NextResponse.json(
      { error: "Failed to update ratings" },
      { status: 500 }
    );
  }

  const { error: duelInsertError } = await supabase.from("duels").insert({
    winner_race_id: winnerRaceId,
    loser_race_id: loserRaceId,
    winner_expected: expectedScore(winner.elo, loser.elo),
  });

  if (duelInsertError) {
    console.error("[Supabase] Failed to record duel", duelInsertError);
  }

  return NextResponse.json({ success: true });
}
