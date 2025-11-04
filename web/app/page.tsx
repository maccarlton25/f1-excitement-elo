import { getRaceSummaries } from "@/lib/races";

export default async function LandingPage() {
  const races = await getRaceSummaries();
  const totalRaces = races.length;
  const averageUnique =
    races.reduce((sum, race) => sum + race.uniqueStrategyShare, 0) /
    (totalRaces || 1);
  const averageStops =
    races.reduce((sum, race) => sum + race.avgStopsPerDriver, 0) /
    (totalRaces || 1);
  const averageRegret =
    races.reduce((sum, race) => sum + race.maxRegretSeconds, 0) /
    (totalRaces || 1);
  const sampleSummaries = races.slice(0, 3);

  return (
    <div className="flex flex-col gap-10">
      <section className="card space-y-4">
        <h2 className="text-2xl font-semibold text-primary">Strategy Regret, Quantified</h2>
        <p className="text-sm text-slate-300">
          Formula 1 weekends hinge on tire timing. This project distils the 2022–2024 seasons into
          strategy features, summarises every race, and lets fans vote on which weekend delivered the
          wildest storyline. Votes feed an Elo ladder persisted in Supabase so the excitement table
          improves over time.
        </p>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-100">Key Numbers at a Glance</h3>
        <div className="grid gap-4 text-sm md:grid-cols-4">
          <MetricCard
            title="Races analysed"
            value={totalRaces.toString()}
            description="Seasons 2022–2024 with per-race summaries, regret statistics, and duel seeds."
          />
          <MetricCard
            title="Unique strategy share"
            value={`${(averageUnique * 100).toFixed(1)}%`}
            description="Average portion of the grid running one-of-one pit plans."
          />
          <MetricCard
            title="Average stops"
            value={averageStops.toFixed(1)}
            description="Mean pit frequency per classified driver, highlighting tyre wear."
          />
          <MetricCard
            title="Max regret window"
            value={`${averageRegret.toFixed(0)}s`}
            description="Mean size of the weekend’s largest strategic miss."
          />
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <ConceptCard
          title="Unique Strategy Share"
          body="Measures how many drivers chose a pit-stop lap pattern no one else followed. Useful for spotting chaotic stops triggered by safety cars or compound fall-off."
          code={`# Notebook snippet
pit_stop_distribution = (
    pit_stops_with_meta
    .groupby(["raceId", "driverId"]).size().rename("stop_count")
    .reset_index()
)
unique_share = (
    pit_stop_distribution
    .groupby("raceId")["stop_count"]
    .transform(lambda s: (s == s.value_counts().index).mean())
)`}
        />
        <ConceptCard
          title="Max Regret (s)"
          body="Largest gap between a finisher’s race time and the best time recorded for the same lap count, effectively the weekend’s biggest strategic blunder."
          code={`# From regret_finishers dataframe
regret_finishers["race_best_ms"] = regret_finishers.groupby("raceId")["milliseconds"].transform("min")
regret_finishers["regret_vs_winner_ms"] = regret_finishers["milliseconds"] - regret_finishers["race_best_ms"]
max_regret = regret_finishers.groupby("raceId")["regret_vs_winner_ms"].max() / 1000`}
        />
        <ConceptCard
          title="Elo Update"
          body="Every vote acts like a match: the chosen race gains rating, the other loses. We use a K-factor of 24."
          code={`// lib/elo.ts
export function updateElo(rating: number, opponent: number, score: 0 | 1) {
  const expected = 1 / (1 + 10 ** ((opponent - rating) / 400));
  return rating + 24 * (score - expected);
}`}
        />
        <ConceptCard
          title="Top Mover"
          body="Tracks the driver who made the largest net gain from grid to finish. Helpful context alongside DNFs and safety-car chaos."
          code={`position_df["position_gain"] = position_df["grid_num"] - position_df["positionOrder"]
top_mover = (
    position_df.groupby("raceId")["position_gain"]
    .idxmax()
    .map(position_df["driver_name"].__getitem__)
)`}
        />
      </section>

      <section className="card space-y-4">
        <h3 className="text-lg font-semibold text-slate-100">Sample Summaries</h3>
        <p className="text-sm text-slate-300">
          Summaries are stitched together in the notebook by combining feature thresholds with
          templated sentences. Tweak the logic and regenerate the CSV to experiment with different
          tones.
        </p>
        <div className="space-y-4 text-xs text-slate-300">
          {sampleSummaries.map((race) => (
            <div key={race.raceId} className="rounded-lg bg-[#101620] p-4">
              <p className="uppercase tracking-wide text-slate-500">
                {race.season} • Round {race.round} — {race.raceName}
              </p>
              <p className="mt-2 leading-relaxed">{race.summaryText}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card space-y-4">
        <h3 className="text-lg font-semibold text-slate-100">Elo-style Excitement Model</h3>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-300">
          <li>
            <strong>Seeding.</strong> Weighted blend of unique-strategy share, pit intensity,
            attrition, peak regret, and top-mover gain sets the initial Elo at roughly 1500 &plusmn;120.
          </li>
          <li>
            <strong>Expected score.</strong> For races A vs B, we compute the standard Elo
            probability curve; the underdog gets more credit if voters pick it.
          </li>
          <li>
            <strong>Update.</strong> Winners gain Elo, losers drop. Supabase stores the duel record
            so we can replay or audit the ladder later.
          </li>
        </ol>
      </section>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  description: string;
}

function MetricCard({ title, value, description }: MetricCardProps) {
  return (
    <div className="card">
      <p className="text-xs uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-semibold text-primary">{value}</p>
      <p className="subtle mt-2">{description}</p>
    </div>
  );
}

interface ConceptCardProps {
  title: string;
  body: string;
  code: string;
}

function ConceptCard({ title, body, code }: ConceptCardProps) {
  return (
    <div className="card flex flex-col gap-4">
      <div>
        <h4 className="text-base font-semibold text-slate-100">{title}</h4>
        <p className="mt-2 text-sm text-slate-300">{body}</p>
      </div>
      <pre className="overflow-x-auto rounded-lg bg-[#0f131a] p-4 text-xs text-slate-200">
        <code>{code}</code>
      </pre>
    </div>
  );
}
