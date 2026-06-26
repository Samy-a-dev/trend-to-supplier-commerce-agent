import { AlertCircle, ExternalLink } from "lucide-react";
import Link from "next/link";

import { RunLauncher } from "@/components/run-launcher";
import { listRecentRuns } from "@/lib/adapters/clickhouse";
import { getIntegrationReadiness } from "@/lib/integrations";

export default async function HomePage() {
  const readiness = getIntegrationReadiness();
  const runsResult = await listRecentRuns().catch((error: unknown) => ({
    error: error instanceof Error ? error.message : String(error),
    rows: []
  }));

  const runs = "rows" in runsResult ? runsResult.rows : [];
  const dbError = "error" in runsResult ? runsResult.error : undefined;

  return (
    <div className="grid">
      <section className="panel">
        <h2>New run</h2>
        <RunLauncher />
        <p className="fine" style={{ marginTop: 14 }}>
          Runs use live Apify, Tavily, Gemini, Prometheux, ClickHouse, and Gmail
          integrations. Missing credentials fail fast during execution.
        </p>
      </section>

      <section className="stack">
        <div>
          <h2 className="section-title">Integration readiness</h2>
          <div className="run-list">
            {readiness.map((integration) => (
              <div className="card run-row" key={integration.name}>
                <span>
                  <strong>{integration.name}</strong>
                  <span className="fine">
                    {integration.ready
                      ? integration.purpose
                      : `Missing ${integration.missing.join(", ")}`}
                  </span>
                </span>
                <span className={`badge ${integration.ready ? "completed" : "failed"}`}>
                  {integration.ready ? "ready" : "missing"}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h2 className="section-title">Recent runs</h2>
          {dbError ? (
            <div className="panel" style={{ display: "flex", gap: 12 }}>
              <AlertCircle size={18} />
              <p className="fine" style={{ margin: 0 }}>
                ClickHouse is not readable yet: {dbError}
              </p>
            </div>
          ) : runs.length === 0 ? (
            <div className="panel">
              <p className="muted" style={{ margin: 0 }}>
                No persisted runs found.
              </p>
            </div>
          ) : (
            <div className="run-list">
              {runs.map((run) => (
                <Link className="card run-row" href={`/runs/${run.run_id}`} key={run.run_id}>
                  <span>
                    <strong>{run.vertical}</strong>
                    <span className="fine">
                      {run.region} · {new Date(run.started_at).toLocaleString()}
                    </span>
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className={`badge ${run.status}`}>{run.status}</span>
                    <ExternalLink size={16} />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
