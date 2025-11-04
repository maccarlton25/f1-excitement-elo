export interface RaceSummary {
  raceId: number;
  season: number;
  round: number;
  raceName: string;
  summaryText: string;
  youtubeHighlightsUrl: string;
  uniqueStrategyShare: number;
  avgStopsPerDriver: number;
  dnfCount: number;
  maxRegretSeconds: number;
  topMover?: string | null;
  topMoverGain?: number | null;
}

export interface DuelSeed {
  raceId: number;
  season: number;
  round: number;
  raceName: string;
  priorScore: number;
  eloSeed: number;
  logitSeed: number;
}

export interface RaceRating extends DuelSeed {
  wins: number;
  losses: number;
  elo: number;
  updatedAt: string;
}

export interface DuelMatch {
  raceA: RaceSummary & { elo: number };
  raceB: RaceSummary & { elo: number };
}
