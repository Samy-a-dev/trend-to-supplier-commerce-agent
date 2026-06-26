CREATE TABLE IF NOT EXISTS trend_observations
(
  id UUID DEFAULT generateUUIDv4(),
  run_id String,
  source LowCardinality(String),
  url String,
  title String,
  product_name String,
  score Float32 DEFAULT 0,
  captured_at DateTime64(3, 'UTC') DEFAULT now64(3),
  payload String
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(captured_at)
ORDER BY (run_id, source, captured_at);

CREATE TABLE IF NOT EXISTS marketplace_listings
(
  id UUID DEFAULT generateUUIDv4(),
  run_id String,
  source LowCardinality(String),
  url String,
  title String,
  product_name String,
  price_cents UInt32 DEFAULT 0,
  rating Float32 DEFAULT 0,
  review_count UInt32 DEFAULT 0,
  captured_at DateTime64(3, 'UTC') DEFAULT now64(3),
  payload String
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(captured_at)
ORDER BY (run_id, source, captured_at);

CREATE TABLE IF NOT EXISTS review_insights
(
  id UUID DEFAULT generateUUIDv4(),
  run_id String,
  source LowCardinality(String),
  url String,
  product_name String,
  theme String,
  severity Float32,
  evidence_count UInt32,
  captured_at DateTime64(3, 'UTC') DEFAULT now64(3),
  payload String
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(captured_at)
ORDER BY (run_id, source, captured_at);

CREATE TABLE IF NOT EXISTS customer_pain_points
(
  id UUID DEFAULT generateUUIDv4(),
  run_id String,
  source LowCardinality(String),
  url String,
  product_name String,
  pain String,
  severity Float32,
  captured_at DateTime64(3, 'UTC') DEFAULT now64(3),
  payload String
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(captured_at)
ORDER BY (run_id, source, captured_at);

CREATE TABLE IF NOT EXISTS competitor_products
(
  id UUID DEFAULT generateUUIDv4(),
  run_id String,
  source LowCardinality(String),
  url String,
  product_name String,
  competitor_name String,
  price_cents UInt32 DEFAULT 0,
  rating Float32 DEFAULT 0,
  review_count UInt32 DEFAULT 0,
  captured_at DateTime64(3, 'UTC') DEFAULT now64(3),
  payload String
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(captured_at)
ORDER BY (run_id, source, captured_at);

CREATE TABLE IF NOT EXISTS supplier_candidates
(
  id UUID DEFAULT generateUUIDv4(),
  run_id String,
  source LowCardinality(String),
  url String,
  supplier_name String,
  country String,
  fit_score Float32,
  captured_at DateTime64(3, 'UTC') DEFAULT now64(3),
  payload String
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(captured_at)
ORDER BY (run_id, source, captured_at);

CREATE TABLE IF NOT EXISTS product_opportunities
(
  id UUID DEFAULT generateUUIDv4(),
  run_id String,
  source LowCardinality(String),
  url String,
  product_name String,
  trend_strength Float32 DEFAULT 0,
  demand_quality Float32 DEFAULT 0,
  pain_intensity Float32 DEFAULT 0,
  saturation Float32 DEFAULT 0,
  differentiation Float32 DEFAULT 0,
  supplier_fit Float32 DEFAULT 0,
  margin Float32 DEFAULT 0,
  risk Float32 DEFAULT 0,
  captured_at DateTime64(3, 'UTC') DEFAULT now64(3),
  payload String
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(captured_at)
ORDER BY (run_id, source, captured_at);

CREATE TABLE IF NOT EXISTS outreach_emails
(
  id UUID DEFAULT generateUUIDv4(),
  run_id String,
  source LowCardinality(String),
  supplier_name String,
  supplier_url String,
  recipient String,
  subject String,
  body String,
  status LowCardinality(String),
  gmail_draft_id String DEFAULT '',
  captured_at DateTime64(3, 'UTC') DEFAULT now64(3),
  payload String
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(captured_at)
ORDER BY (run_id, source, captured_at);

CREATE TABLE IF NOT EXISTS agent_runs
(
  run_id String,
  vertical String,
  region String,
  status LowCardinality(String),
  started_at DateTime64(3, 'UTC') DEFAULT now64(3),
  completed_at Nullable(DateTime64(3, 'UTC')),
  updated_at DateTime64(3, 'UTC') DEFAULT now64(3),
  summary String DEFAULT '',
  payload String DEFAULT ''
)
ENGINE = ReplacingMergeTree(updated_at)
ORDER BY run_id;

CREATE TABLE IF NOT EXISTS run_events
(
  id UUID DEFAULT generateUUIDv4(),
  run_id String,
  ts DateTime64(3, 'UTC') DEFAULT now64(3),
  step LowCardinality(String),
  kind LowCardinality(String),
  message String,
  data String
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(ts)
ORDER BY (run_id, ts, step);
