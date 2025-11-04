# F1 Strategy Regret Explorer

Tooling to quantify Formula 1 pit-stop strategy “regret” and surface the most dramatic race weekends from the 2022–2024 seasons. The repo contains:

- `notebooks/` — Python notebooks that ingest Ergast CSV exports, engineer race-level metrics (unique strategy share, regret, attrition, top movers), and emit processed CSVs.
- `data/` — Raw Ergast CSV dumps plus a `processed/` folder for generated summaries and duel seeds.
- `web/` — Next.js + Tailwind app that powers:
  - Landing page explaining the pipeline and metrics
  - Head-to-head duel interface with Elo updates
  - Dashboard summarising live ratings and strategy insights
  - API routes that read/write to Supabase

## Workflow

1. Generate processed data  
   Run `notebooks/race_summaries.ipynb` to produce `data/processed/race_summaries.csv` and `race_duel_seed.csv`.

2. Seed Supabase  
   ```bash
   cd web
   cp .env.local.example .env.local  # create and fill in SUPABASE_URL + SERVICE_ROLE
   npm install
   npm run seed
   ```

3. Develop or deploy the web app  
   ```bash
   npm run dev      # local
   npm run build    # production build
   ```
   Deploy via Vercel by pointing the project root to `web/` and copying the env vars.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for server-side API routes / seed script |
| `RACE_DATA_DIR` | Optional override for processed CSV location (defaults to `../data/processed`) |

## Supabase schema

Create tables using the SQL snippet in `web/README.md` (race summaries, ratings, duels). The duel API stores Elo updates and match history there.

## License

Personal project. Adapt freely for internal use; attribution appreciated if you publish derivative work.
