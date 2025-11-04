# F1 Strategy Regret Explorer — Web App

Next.js app that powers the duel experience, dashboard, and landing blog for the strategy regret project.

## Prerequisites

- Node.js 18+
- Supabase project (for persistence)
- Processed CSV exports under `../data/processed` (`race_summaries.csv`, `race_duel_seed.csv`)

## Getting Started

```bash
cd web
npm install
npm run dev
```

By default the app reads processed CSVs from `../data/processed`. Override with `RACE_DATA_DIR` if you store them elsewhere.

## Environment Variables

Configure the following (locally via `.env.local`, in Vercel via project settings):

```
SUPABASE_URL=<your supabase url>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
RACE_DATA_DIR=../data/processed   # optional override
```

⚠️ The service role key is required on the server (API routes & seed script) to write duel results. Never expose it to the browser.

## Supabase Schema

Run this SQL to create tables:

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

## Seeding Supabase

```bash
cd web
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run seed
```

This reads the processed CSV outputs and upserts them into Supabase.

## Deployment

1. Push the `web` directory to your repo.
2. Create a Vercel project, set `root` to `web`.
3. Add environment variables (matching `.env.local`).
4. Trigger deploy — Vercel builds the Next.js app and connects to Supabase for live duels.

## Project Structure

- `app/` — Next.js App Router pages & API routes
- `components/` — UI primitives (duel cards, highlights, etc.)
- `lib/` — Data loading, Supabase helpers, Elo utilities
- `scripts/` — Supabase seeding script

## Next Steps

- Add authentication to gate duel voting per user (Supabase Auth or Clerk).
- Enrich dashboards with trend charts (e.g., Recharts or Visx).
- Stream duel updates via Supabase Realtime for live leaderboards.
- Replace YouTube search URLs with curated highlight IDs.
