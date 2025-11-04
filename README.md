# F1 Strategy Regret Explorer

Motorsport analytics sandbox that mines historical Formula 1 data to surface must-watch races and re-rank drivers with a custom Elo model. Exploratory notebooks, lightweight pipelines, and a Next.js dashboard take you from raw Ergast dumps to story-worthy insights in one workflow.

## Highlights

- Quantifies pit-stop “regret”, attrition, and unique strategy share across 2022–2024 grands prix.
- Generates watch lists and feature blurbs that feed a web dashboard and duel interface.
- Runs head-to-head race matchups with live Elo updates so fans can champion their favorite weekends.
- Ships with Supabase-backed APIs plus seed scripts to persist summaries, ratings, and duel history.

## Project Structure

- `notebooks/` — Jupyter notebooks that ingest Ergast CSV exports, engineer race-level metrics, and emit processed datasets.
- `data/` — Raw Ergast CSV dumps plus `processed/` outputs (`race_summaries.csv`, `race_duel_seed.csv`, Elo snapshots).
- `web/` — Next.js + Tailwind app that powers:
  - Landing page detailing metrics and methodology.
  - Dashboard summarizing highlights, ratings, and trendlines.
  - Duel arena where races battle via Elo updates.
  - API routes for Supabase reads/writes and CSV fallbacks.

## Data Preparation Pipeline

1. **Source data**  
   Export season data from the [Ergast API](https://ergast.com/mrd/) or reuse the provided CSVs under `data/`.

2. **Run feature engineering notebooks**  
   Launch `notebooks/race_summaries.ipynb`. The workflow:
   - Cleans qualifying, race, and pit stop data.
   - Computes regret metrics (time lost vs. optimal pit window), pit strategy diversity, attrition counts, and movers.
   - Produces narrative-ready blurbs and highlight links.

3. **Persist outputs**  
   The notebook writes curated CSVs to `data/processed/`:
   - `race_summaries.csv` — one row per grand prix with headline metrics.
   - `race_duel_seed.csv` — initial Elo seeds and matchups for duel seeding.
   - Additional exports (when enabled) for driver-level analyses.

4. **Optional: customize metrics**  
   Adjust thresholds (e.g., regret window, Elo K-factor) directly in the notebook cells to experiment with different excitement definitions.

## Web Application

The `web/` directory houses a Next.js App Router project with server actions for Supabase writes.

### Local development

```bash
cd web
npm install
npm run dev
```

The app reads processed CSVs from `../data/processed` by default. Override with the `RACE_DATA_DIR` environment variable if you keep data elsewhere.

### Environment variables

| Variable | Purpose |
| --- | --- |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for server-side API routes / seed script (never expose client-side) |
| `RACE_DATA_DIR` | Optional path override for processed CSV location (defaults to `../data/processed`) |

⚠️ The service role key is required on the server (API routes and seed script) to write duel results. Never ship it to the browser.

### Supabase schema

Create required tables with:

```sql
create table if not exists public.race_summaries (
  race_id bigint primary key,
  season int not null,
  round int not null,
  race_name text not null,
  summary_text text,
  youtube_highlights_url text,
  unique_strategy_share double precision,
  avg_stops_per_driver double precision,
  dnf_count int,
  max_regret_s double precision,
  top_mover text,
  top_mover_gain double precision,
  inserted_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.race_ratings (
  race_id bigint primary key references race_summaries(race_id),
  season int not null,
  round int not null,
  race_name text not null,
  prior_score double precision default 0,
  elo double precision default 1500,
  logit_seed double precision default 0,
  wins int default 0,
  losses int default 0,
  inserted_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.duels (
  id bigserial primary key,
  winner_race_id bigint references race_summaries(race_id),
  loser_race_id bigint references race_summaries(race_id),
  winner_expected double precision,
  inserted_at timestamptz default now()
);
```

### Seeding Supabase and static data

```bash
cd web
cp .env.local.example .env.local  # populate SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
npm run seed
```

The script reads `data/processed/*.csv` and upserts summaries, ratings, and initial duel states into Supabase for the web app to consume.

### Deployment

1. Push the repository (or just `web/`) to your Git host.
2. Create a Vercel project with `root` set to `web/`.
3. Add the environment variables above in Vercel.
4. Deploy — Vercel builds the Next.js app, connects to Supabase, and serves the duel endpoints.

## Tech Stack

- Python + Jupyter notebooks for data wrangling and feature engineering.
- Next.js 14 App Router with Tailwind CSS for the frontend and API routes.
- Supabase Postgres for persistence and edge functions for duel state.
- CSV exports as a lightweight interchange layer between notebooks and the web app.

## Extending the Project

- Introduce driver-level Elo or team form metrics to enrich duel context.
- Add Supabase Auth to gate duel voting per user.
- Stream updates via Supabase Realtime websockets to power live leaderboards.
- Enrich dashboards with charts (e.g., Recharts or Visx) and embed curated YouTube highlight IDs.

## License

Personal project. Adapt freely for internal use; attribution appreciated if you publish derivative work.
