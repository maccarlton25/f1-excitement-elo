import { getRaceSummaries } from "@/lib/races";
import { getRaceRatings } from "@/lib/ratings";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [summaries, ratings] = await Promise.all([
    getRaceSummaries(),
    getRaceRatings(),
  ]);

  const ratingIndex = new Map(ratings.map((rating) => [rating.raceId, rating]));

  const merged = summaries
    .map((summary) => {
      const rating = ratingIndex.get(summary.raceId);
      if (!rating) return null;
      return {
        ...summary,
        rating,
      };
    })
    .filter(Boolean) as Array<
    typeof summaries[number] & { rating: (typeof ratings)[number] }
  >;

  if (merged.length === 0) {
    return (
      <section className="card">
        <h2 className="text-xl font-semibold text-slate-100">
          Dashboard pending data
        </h2>
        <p className="text-sm text-slate-400">
          Unable to load race ratings. Configure Supabase or ensure duel seed
          CSVs exist at build time.
        </p>
      </section>
    );
  }

  const topRated = [...merged]
    .sort((a, b) => b.rating.elo - a.rating.elo)
    .slice(0, 10);
  const upsetLeaders = [...merged]
    .sort((a, b) => b.uniqueStrategyShare - a.uniqueStrategyShare)
    .slice(0, 10);
  const highestRegret = [...merged]
    .sort((a, b) => b.maxRegretSeconds - a.maxRegretSeconds)
    .slice(0, 10);
  const attritionKings = [...merged]
    .sort((a, b) => b.dnfCount - a.dnfCount)
    .slice(0, 5);

  return (
    <section className="flex flex-col gap-10">
      <header>
        <h2 className="text-2xl font-semibold text-slate-100">
          Live Strategy Excitement Dashboard
        </h2>
        <p className="text-sm text-slate-400">
          Aggregated from race ratings.
        </p>
      </header>
      <div className="grid gap-6 md:grid-cols-2">
        <article className="card">
          <h3 className="text-lg font-semibold text-primary">
            🔥 Top Rated Weekends
          </h3>
          <table className="mt-4 w-full table-auto text-sm text-slate-300">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2 text-left">Race</th>
                <th className="py-2 text-right">Elo</th>
                <th className="py-2 text-right">Wins</th>
              </tr>
            </thead>
            <tbody>
              {topRated.map((race) => (
                <tr key={race.raceId} className="border-t border-slate-800">
                  <td className="py-2">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-100">
                        {race.raceName}
                      </span>
                      <span className="text-xs text-slate-500">
                        {race.season} • Round {race.round}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 text-right">{race.rating.elo.toFixed(0)}</td>
                  <td className="py-2 text-right">{race.rating.wins}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
        <article className="card">
          <h3 className="text-lg font-semibold text-primary">
            🎯 Unique Strategy Leaders
          </h3>
          <table className="mt-4 w-full table-auto text-sm text-slate-300">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2 text-left">Race</th>
                <th className="py-2 text-right">Unique %</th>
                <th className="py-2 text-right">Max Regret</th>
              </tr>
            </thead>
            <tbody>
              {upsetLeaders.map((race) => (
                <tr key={race.raceId} className="border-t border-slate-800">
                  <td className="py-2">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-100">
                        {race.raceName}
                      </span>
                      <span className="text-xs text-slate-500">
                        {race.season} • Round {race.round}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 text-right">
                    {(race.uniqueStrategyShare * 100).toFixed(0)}%
                  </td>
                  <td className="py-2 text-right">
                    {race.maxRegretSeconds.toFixed(0)} s
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <article className="card lg:col-span-2">
          <h3 className="text-lg font-semibold text-primary">
            ⚡ Biggest Regret Shocks
          </h3>
          <table className="mt-4 w-full table-auto text-sm text-slate-300">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2 text-left">Race</th>
                <th className="py-2 text-right">Max Regret</th>
                <th className="py-2 text-right">Unique %</th>
                <th className="py-2 text-right">Elo</th>
              </tr>
            </thead>
            <tbody>
              {highestRegret.map((race) => (
                <tr key={race.raceId} className="border-t border-slate-800">
                  <td className="py-2">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-100">
                        {race.raceName}
                      </span>
                      <span className="text-xs text-slate-500">
                        {race.season} • Round {race.round}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 text-right">
                    {race.maxRegretSeconds.toFixed(0)} s
                  </td>
                  <td className="py-2 text-right">
                    {(race.uniqueStrategyShare * 100).toFixed(0)}%
                  </td>
                  <td className="py-2 text-right">
                    {race.rating.elo.toFixed(0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
        <article className="card lg:col-span-1">
          <h3 className="text-lg font-semibold text-primary">
            🚨 Attrition Alerts
          </h3>
          <ul className="mt-4 space-y-3 text-sm text-slate-300">
            {attritionKings.map((race) => (
              <li key={race.raceId} className="border-b border-slate-800 pb-3 last:border-0 last:pb-0">
                <p className="font-medium text-slate-100">
                  {race.raceName}
                </p>
                <p className="text-xs text-slate-500">
                  {race.season} • Round {race.round}
                </p>
                {(() => {
                  const moverGain =
                    typeof race.topMoverGain === "number"
                      ? race.topMoverGain.toFixed(0)
                      : "—";
                  return (
                    <p className="mt-1 text-xs text-slate-400">
                      DNFs: {race.dnfCount} — Top mover:{" "}
                      {race.topMover ?? "n/a"} ({moverGain} spots)
                    </p>
                  );
                })()}
              </li>
            ))}
          </ul>
        </article>
      </div>
      <article className="card">
        <h3 className="text-lg font-semibold text-primary">
          📊 Data Quality Snapshot
        </h3>
        <dl className="mt-4 grid gap-4 md:grid-cols-3">
          <div>
            <dt className="text-xs uppercase text-slate-500">
              Races Tracked
            </dt>
            <dd className="text-2xl font-semibold text-slate-100">
              {merged.length}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">
              Average Elo
            </dt>
            <dd className="text-2xl font-semibold text-slate-100">
              {(
                merged.reduce((acc, race) => acc + race.rating.elo, 0) /
                merged.length
              ).toFixed(0)}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">
              Average Unique Strategy %
            </dt>
            <dd className="text-2xl font-semibold text-slate-100">
              {(
                (merged.reduce(
                  (acc, race) => acc + race.uniqueStrategyShare,
                  0
                ) /
                  merged.length) *
                100
              ).toFixed(1)}
              %
            </dd>
          </div>
        </dl>
      </article>
    </section>
  );
}
