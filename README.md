# Trend-to-Supplier Commerce Agent

Local Next.js + Google ADK implementation of the trend-to-supplier sourcing pipeline.

The app intentionally uses real services only. Missing credentials fail fast; there are no mocked integration paths.

## Run Order

1. Copy `.env.example` to `.env.local` and fill credentials.
2. Start the Prometheux sidecar:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r sidecar/requirements.txt
uvicorn sidecar.main:app --port 8000
```

3. Capture Gmail OAuth once:

```bash
pnpm tsx scripts/get-token.ts
```

4. Create ClickHouse tables:

```bash
pnpm db:migrate
```

5. Verify live contracts:

```bash
pnpm smoke
```

6. Start the dashboard:

```bash
pnpm dev
```

Open `http://localhost:3000`, start a run, and watch events stream into the run view and ClickHouse.

## Key Paths

- `app/api/runs/stream/route.ts` streams a local ADK run over SSE.
- `lib/agent/steps/` contains the nine deterministic ADK `BaseAgent` steps.
- `lib/adapters/` contains live integrations for Apify, Tavily, ClickHouse, Gemini, Prometheux, and Gmail.
- `sidecar/main.py` wraps `prometheux-chain==0.2.14`.
- `scripts/smoke/` contains one real-call smoke test per integration.
