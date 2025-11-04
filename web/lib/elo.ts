export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
}

export function updateElo(
  rating: number,
  opponentRating: number,
  score: 0 | 0.5 | 1,
  kFactor = 24
): number {
  const expected = expectedScore(rating, opponentRating);
  return rating + kFactor * (score - expected);
}
