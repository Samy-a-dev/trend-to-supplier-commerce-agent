# Sponsor Research for the Context Engineering Challenge

Research date: 2026-06-26

## Challenge Frame

The challenge asks for an autonomous agent that does real work on the open web, grounded in real sources, and publishes its output to `cited.md`. The judging criteria from the slides are:

- Autonomy: the agent acts on the web with real-time data and minimal manual intervention.
- Idea: the solution solves a meaningful problem or demonstrates real-world value.
- Technical implementation: the system is well built, reliable, and inspectable.
- Tool use: the solution effectively uses at least 3 sponsor tools.
- Presentation: the demo clearly shows the autonomous workflow and outcome.

Best thesis:

Build an autonomous, ontology-backed open-web evidence agent that turns live web sources into cited actions.

Best sponsor stack:

1. Tavily AI: live web search, extraction, crawling, mapping, and research.
2. ClickHouse: evidence warehouse, analytics, text/vector retrieval, and audit trail.
3. Prometheux: executable ontology, semantic rules, lineage, and explainable reasoning.
4. Cursor: agent development, orchestration, skills, MCP wiring, review, and automation.
5. Gensyn: optional machine-intelligence market layer, especially through Delphi.

Recommended project:

An Open-Web Opportunity and Risk Agent that monitors a fast-moving domain, finds fresh sources, extracts evidence, reasons over structured claims, stores observations, scores actionability, and publishes a cited report.

## Sponsor Fit Matrix

| Sponsor | Best role | Tool surfaces | Judging strength |
|---|---|---|---|
| Tavily AI | Open-web perception | Search, Extract, Crawl, Map, Research API, SDKs, MCP | Very high autonomy and source grounding |
| ClickHouse | Evidence and analytics | MergeTree, JSON, text indexes, vector search, QBit, MCP | Very high technical implementation |
| Prometheux | Semantic reasoning | Executable ontologies, Vadalog, lineage, graph analytics, SQL integration, MCP | Very high explainability and action logic |
| Cursor | Build/orchestration | Agent, Headless CLI, Cloud Agents, Skills, MCP, Bugbot | High implementation speed and repeatability |
| Gensyn | Market/intelligence layer | Delphi, testnet concepts, decentralized intelligence framing | High idea potential, higher integration risk |

## 1. Cursor

### What Cursor Does

Cursor is an AI-native code editor and agent platform. For this challenge, the strongest use is not "we coded with Cursor"; it is using Cursor as the operating environment for agentic development and automation.

Relevant surfaces:

- Headless CLI for non-interactive scripts and CI/CD-style automation.
- Agent Skills for packaging reusable workflows, domain instructions, scripts, and references.
- MCP support for connecting external tools such as ClickHouse, Tavily, and Prometheux.
- Cloud Agents for remote agent runs that can code, test, produce artifacts, and create PRs.
- Bugbot for automated PR review, rules, bug detection, and autofix through Cloud Agents.

Sources:

- Cursor Headless CLI: https://cursor.com/docs/cli/headless
- Cursor Skills: https://cursor.com/docs/skills
- Cursor MCP: https://cursor.com/docs/mcp
- Cursor Bugbot: https://cursor.com/docs/bugbot
- Cursor Cloud Agents: https://cursor.com/docs/cloud-agent

### Best Use Cases

#### Use Case A: Autonomous Build and Publish Agent

Cursor runs the full workflow:

1. Invoke Tavily search/extract/crawl.
2. Insert raw observations into ClickHouse.
3. Run Prometheux ontology logic.
4. Generate `cited.md`.
5. Run checks.
6. Review the diff with Bugbot or a Cursor review workflow.

Judging fit:

- Autonomy: strong if run from CLI or Cloud Agent.
- Technical implementation: strong because the pipeline is repeatable.
- Tool use: Cursor plus Tavily plus ClickHouse plus Prometheux gives 4 sponsor tools.
- Presentation: show one command producing the report and validation logs.

#### Use Case B: Context Engineering Skill Pack

Create a Cursor Skill that instructs the agent how to:

- Use Tavily Search vs Extract vs Crawl.
- Store evidence in ClickHouse.
- Run Prometheux concepts.
- Preserve citations.
- Reject uncited claims.
- Publish the final report.

Judging fit:

- Makes the agent behavior inspectable and repeatable.
- Shows context engineering directly, not just app coding.

#### Use Case C: Quality Gate with Bugbot

Bugbot checks:

- Missing tests.
- Unhandled API errors.
- API key leaks.
- Claims without citations.
- Sponsor-tool count.
- Failure to update `cited.md`.

Outcome:

Cursor becomes the engineering control plane.

### Risks

- Cursor should not be counted only as "we used an editor." Use the CLI, Skills, MCP, Cloud Agents, or Bugbot so it is a real tool integration.
- Cloud Agent/Bugbot features may require account access. Fallback to local Headless CLI/scripts.

## 2. ClickHouse

### What ClickHouse Does

ClickHouse is a high-performance real-time analytical database. In this project, it should be the evidence memory of the agent.

Relevant capabilities:

- MergeTree tables for high-ingest analytical workloads.
- JSON support for raw API payloads.
- Text indexes for searching extracted documents and source fields.
- Vector similarity indexes for semantic search where supported.
- QBit for compact vector representation and approximate search.
- URL/S3 ingestion functions.
- MCP support so agents can inspect schemas and run scoped queries.
- AI functions exist but should be treated as experimental/bonus.

Sources:

- MergeTree: https://clickhouse.com/docs/engines/table-engines/mergetree-family/mergetree
- AI Functions: https://clickhouse.com/docs/sql-reference/functions/ai-functions
- MCP guide: https://clickhouse.com/docs/use-cases/AI/MCP
- Remote MCP: https://clickhouse.com/docs/cloud/features/ai-ml/remote-mcp
- Vector indexes: https://clickhouse.com/docs/engines/table-engines/mergetree-family/annindexes
- Text indexes: https://clickhouse.com/docs/engines/table-engines/mergetree-family/textindexes
- URL table function: https://clickhouse.com/docs/sql-reference/table-functions/url
- QBit: https://clickhouse.com/docs/sql-reference/data-types/qbit

### Best Use Cases

#### Use Case A: Evidence Warehouse

Store:

- Source URL.
- Title.
- Retrieved timestamp.
- Published timestamp.
- Raw extracted text.
- Content hash.
- Tavily payload.
- Source type.
- Topic.

Example table:

```sql
CREATE TABLE web_observations
(
  observed_at DateTime,
  topic String,
  source_url String,
  title String,
  published_at Nullable(DateTime),
  source_type LowCardinality(String),
  raw_content String,
  content_hash String,
  tavily_payload JSON
)
ENGINE = MergeTree
ORDER BY (topic, observed_at, source_url);
```

Why it scores:

- Judges can inspect the evidence trail.
- The agent can rerun, compare, and monitor changes over time.

#### Use Case B: Freshness and Trend Analytics

Queries:

- New sources per topic today.
- Latest evidence timestamp.
- Which claims have multiple independent sources.
- Which topics are accelerating.
- Which claims have contradictions.

Example:

```sql
SELECT topic, count(), max(observed_at)
FROM web_observations
GROUP BY topic
ORDER BY max(observed_at) DESC;
```

#### Use Case C: Hybrid Search

Use:

- Full-text search for exact terms.
- JSON queries for structured source metadata.
- Vector search for semantically similar claims.

Outcome:

ClickHouse makes the agent look like a real monitoring/data product, not a one-off scraper.

### Risks

- Vector indexes depend on ClickHouse version/support.
- AI functions are experimental; do not make the demo depend on them.
- Seed enough observations for the analytics to look meaningful.

## 3. Gensyn

### What Gensyn Does

Gensyn is the network for machine intelligence. Its current strongest hackathon angle is machine-intelligence markets and decentralized coordination, especially Delphi.

Important finding:

The official Gensyn docs indicate older flows like RL Swarm, BlockAssist, and CodeAssist are deprecated or paused, while the current focus is Delphi. So do not build the core demo around deprecated swarm infrastructure unless the sponsor explicitly confirms a live path.

Sources:

- Gensyn Testnet: https://docs.gensyn.ai/testnet
- RL Swarm: https://docs.gensyn.ai/testnet/rl-swarm
- BlockAssist: https://docs.gensyn.ai/testnet/blockassist
- Litepaper: https://docs.gensyn.ai/litepaper
- Gensyn homepage: https://www.gensyn.ai/
- Introducing Delphi: https://blog.gensyn.ai/introducing-delphi/
- Delphi: https://delphi.gensyn.ai/

### Best Use Cases

#### Use Case A: AI Model Market Intelligence Agent

The agent monitors:

- Delphi markets.
- AI model launch announcements.
- Benchmark results.
- Research reports.
- Model performance claims.

Pipeline:

1. Tavily finds live web evidence.
2. ClickHouse stores model/benchmark/market observations.
3. Prometheux maps entities: model, lab, benchmark, score, market, outcome.
4. The agent publishes a cited market intelligence report.
5. Optional: if testnet action is safe and available, the agent can watch or interact with a Delphi market.

Judging fit:

- Idea: very strong and sponsor-aligned.
- Autonomy: strong if monitoring is live.
- Technical implementation: good if read-only; higher risk if trying to trade/interact.

#### Use Case B: Decentralized Intelligence Evidence Tracker

Use Gensyn as the framing layer for AI contribution/market outcomes:

- Claims are backed by citations.
- Outcomes are monitored over time.
- Market or prediction state is included.
- Evidence is stored and reasoned over.

### Risks

- Wallet/testnet setup can consume time.
- Do not rely on deprecated RL Swarm for the main demo.
- Use Gensyn as optional fourth/fifth sponsor unless live Delphi access is confirmed.

## 4. Prometheux

### What Prometheux Does

Prometheux provides ontology-native data and AI infrastructure. Its key idea is an executable ontology: not just a schema or documentation layer, but runnable semantic logic over entities, relationships, constraints, and concepts.

For this challenge, Prometheux is the reasoning and explainability layer.

Sources:

- Getting Started: https://docs.prometheux.ai/getting-started
- Prometheux website: https://www.prometheux.ai/
- Technology: https://www.prometheux.ai/technology.html
- Local MCP: https://docs.prometheux.ai/api/mcp/local
- Vadalog: https://docs.prometheux.ai/learn/vadalog
- Graph analytics: https://docs.prometheux.ai/learn/vadalog/graph-analytics
- SQL integration: https://docs.prometheux.ai/learn/vadalog/sql-integration

### Best Use Cases

#### Use Case A: Evidence Ontology

Model:

```text
Source(url, publisher, retrieved_at, trust_tier)
Claim(id, source_url, subject, predicate, object, claim_time, confidence)
Entity(name, type)
Event(entity, event_type, event_time, source_url)
Opportunity(id, entity, score, action, reason)
Citation(claim_id, source_url, excerpt_hash)
Contradiction(claim_a, claim_b, reason)
StaleClaim(claim_id, reason)
```

Why it scores:

- Makes the system explainable.
- Converts web pages into structured claims.
- Gives judges something deeper than summarization.

#### Use Case B: Actionability Rules

Example rules:

```text
FreshSource(S) <- Source(S), retrieved_within(S, "7d").
CorroboratedClaim(C) <- Claim(C), supported_by_independent_sources(C, 2).
ActionableOpportunity(O) <- Opportunity(O), CorroboratedClaim(claim(O)), has_next_step(O).
Contradiction(A, B) <- Claim(A), Claim(B), same_subject(A, B), conflicts(A, B).
```

The agent can answer:

- Is this claim fresh?
- Is it corroborated?
- Is there a contradiction?
- What action should be taken?
- Which sources support the action?

#### Use Case C: Citation Lineage

Each output recommendation maps to:

- A source.
- A claim.
- A rule.
- A timestamp.
- A final action.

Judging fit:

- Autonomy: high because the agent makes decisions through rules.
- Technical implementation: very high.
- Presentation: strong source → claim → rule → recommendation demo.

### Risks

- Keep the ontology narrow. Do not overbuild.
- If Prometheux credentials are unavailable, build a lightweight local fallback but still frame the intended integration clearly.

## 5. Tavily AI

### What Tavily Does

Tavily is the strongest direct match for the open-web requirement. It gives agents real-time web search and retrieval.

Relevant tools:

- Search API.
- Extract API.
- Crawl API.
- Map API.
- Research API.
- SDKs.
- LangChain integration.
- MCP server.

Sources:

- Tavily docs: https://docs.tavily.com/welcome
- Search: https://docs.tavily.com/documentation/api-reference/endpoint/search
- Extract: https://docs.tavily.com/documentation/api-reference/endpoint/extract
- Crawl: https://docs.tavily.com/documentation/api-reference/endpoint/crawl
- Map: https://docs.tavily.com/documentation/api-reference/endpoint/map
- Research: https://docs.tavily.com/documentation/api-reference/endpoint/research
- Tavily GitHub: https://github.com/tavily-ai

### Best Use Cases

#### Use Case A: Real-Time Source Discovery

The agent searches with:

- Topic filters.
- Recency windows.
- Included/excluded domains.
- News/finance/general mode where appropriate.

Why it scores:

- Directly satisfies "act on the open web."
- Judges can see real sources were discovered live.

#### Use Case B: Evidence Extraction

For each result:

1. Extract full content.
2. Normalize text/markdown.
3. Hash content.
4. Store raw evidence in ClickHouse.
5. Extract claims.
6. Attach citations to final output.

#### Use Case C: Site Monitoring

Use Map/Crawl for:

- Sponsor docs.
- Regulatory sites.
- Grant portals.
- Product changelogs.
- Market pages.

Outcome:

Tavily becomes the agent's sensory layer.

### Risks

- Search results can be noisy. Use domain filters and dedupe.
- Dynamic/paywalled pages may not extract fully.
- Cache observations in ClickHouse so the demo is reproducible.

## Best Final Build

Build the Open-Web Opportunity and Risk Agent.

Workflow:

1. User provides a topic/objective.
2. Tavily searches live web sources.
3. Tavily extracts and crawls high-value URLs.
4. ClickHouse stores observations, raw content, hashes, and metadata.
5. Claims are extracted and stored.
6. Prometheux evaluates claims through ontology rules.
7. ClickHouse stores derived scores and recommendations.
8. Cursor runs and validates the pipeline.
9. Optional Gensyn/Delphi layer adds machine-intelligence market monitoring.
10. The system publishes a cited action report.

## Best Demo Concepts

### Concept 1: Sponsor Docs Drift Agent

Monitors Cursor, ClickHouse, Tavily, Prometheux, and Gensyn docs for new capabilities, deprecations, pricing changes, and API changes.

Why strong:

- Directly relevant to hackathon builders.
- Uses all sponsor tools naturally.
- Easy to demo with source URLs and diffs.

### Concept 2: Grant/RFP Opportunity Agent

Finds fresh grants, RFPs, hackathons, funding opportunities, and deadlines.

Outcome:

"Apply to these 3 opportunities this week; here are deadlines, eligibility constraints, and citations."

### Concept 3: AI Model Market Intelligence Agent

Monitors model launches, benchmarks, and Gensyn/Delphi market signals.

Outcome:

"This market/model outlook changed because these new benchmark/source events occurred."

### Concept 4: Regulatory Watch Agent

Monitors official regulatory sites and news for obligations, deadlines, and risks.

Outcome:

"These rules changed; these actions are due; here are source citations."

## Three-Minute Demo Script

0:00-0:20

"We built an autonomous open-web evidence agent. It finds live sources, extracts facts, reasons over them, stores an audit trail, and publishes cited actions."

0:20-0:50

Show one command or UI run:

```bash
agent-monitor --topic "AI model evaluation markets" --objective "find actionable changes since yesterday"
```

0:50-1:20

Show Tavily logs:

- Search queries.
- URLs found.
- Pages extracted.
- Crawl/map result.

1:20-1:50

Show ClickHouse:

```sql
SELECT topic, count(), max(observed_at)
FROM web_observations
GROUP BY topic;
```

1:50-2:20

Show Prometheux:

- Source became Claim.
- Claim matched rule.
- Rule produced action.

2:20-2:45

Show the final report:

- Recommendations.
- Citations.
- Contradictions.
- Metrics.

2:45-3:00

Close:

"This uses Tavily for open-web retrieval, ClickHouse for evidence analytics, Prometheux for ontology reasoning, Cursor for orchestration, and optionally Gensyn for machine-intelligence market context."

## What Counts As Real Action

Minimum:

- Publish/update `cited.md`.
- Store evidence in ClickHouse.
- Include source URLs, timestamps, and hashes.

Better:

- Open a GitHub issue or PR.
- Send an alert.
- Update a dashboard.
- Create a task/calendar item.

Best:

- Run on a schedule, detect a real change, evaluate it, publish the update, and notify someone automatically.

## Final Recommendation

Use Tavily + ClickHouse + Prometheux as the core. Use Cursor as the build/orchestration/review layer. Add Gensyn if your chosen demo domain is machine intelligence markets or Delphi.

The strongest project framing:

"An autonomous, ontology-backed open-web evidence agent that turns live sources into cited actions."

