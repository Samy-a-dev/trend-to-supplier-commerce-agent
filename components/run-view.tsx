"use client";

import { Check, Mail, Play, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  PipelineStepName,
  RunEventRow,
  SourcingReport,
  pipelineSteps,
  stepLabels
} from "@/lib/types";

type ClientEvent = RunEventRow & {
  ts?: string;
};

type RunViewProps = {
  runId: string;
  vertical: string;
  region: string;
  autostart: boolean;
  initialEvents: ClientEvent[];
  initialReport: SourcingReport | null;
};

export function RunView({
  runId,
  vertical,
  region,
  autostart,
  initialEvents,
  initialReport
}: RunViewProps) {
  const [events, setEvents] = useState<ClientEvent[]>(initialEvents);
  const [report, setReport] = useState<SourcingReport | null>(initialReport);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState<Record<string, boolean>>({});
  const started = useRef(false);

  const stepStatus = useMemo(() => {
    const status: Record<PipelineStepName, "idle" | "running" | "completed" | "failed"> =
      Object.fromEntries(pipelineSteps.map((step) => [step, "idle"])) as Record<
        PipelineStepName,
        "idle" | "running" | "completed" | "failed"
      >;

    for (const event of events) {
      if (!pipelineSteps.includes(event.step as PipelineStepName)) continue;
      const step = event.step as PipelineStepName;
      if (event.kind === "error") status[step] = "failed";
      else if (event.kind === "complete" || event.kind === "state") status[step] = "completed";
      else if (event.kind === "progress" && status[step] === "idle") status[step] = "running";
    }
    return status;
  }, [events]);

  async function startRun() {
    setRunning(true);
    setError(null);
    setEvents((current) => (current.length ? current : []));

    try {
      const response = await fetch("/api/runs/stream", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ runId, vertical, region })
      });

      if (!response.ok || !response.body) {
        throw new Error(await response.text());
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";

        for (const chunk of chunks) {
          const line = chunk
            .split("\n")
            .find((entry) => entry.startsWith("data:"));
          if (!line) continue;
          const payload = JSON.parse(line.slice(5).trim()) as ClientEvent | { report: SourcingReport };
          if ("report" in payload) {
            setReport(payload.report);
          } else {
            setEvents((current) => [...current, payload]);
            if (payload.step === "report" && payload.kind === "state" && payload.data) {
              const maybeReport = (payload.data as { report?: SourcingReport }).report;
              if (maybeReport) setReport(maybeReport);
            }
          }
        }
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setRunning(false);
    }
  }

  useEffect(() => {
    if (!autostart || started.current) return;
    started.current = true;
    void startRun();
  }, [autostart]);

  return (
    <div className="stack">
      <section className="panel">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div>
            <h2 style={{ marginBottom: 4 }}>{vertical || "Persisted run"}</h2>
            <p className="fine" style={{ margin: 0 }}>
              Run {runId} · {region}
            </p>
          </div>
          <button className="button" disabled={running || !vertical} onClick={startRun} type="button">
            {running ? <RefreshCw size={16} /> : <Play size={16} />}
            {running ? "Running" : "Run again"}
          </button>
        </div>
        {error ? (
          <p className="fine" style={{ color: "var(--danger)", marginBottom: 0 }}>
            {error}
          </p>
        ) : null}
      </section>

      <section className="step-grid">
        {pipelineSteps.map((step) => (
          <article className="card step-card" key={step}>
            <header>
              <h3>{stepLabels[step]}</h3>
              <span className={`status-dot ${stepStatus[step]}`} />
            </header>
            <p>{latestMessage(events, step)}</p>
          </article>
        ))}
      </section>

      <section className="report-grid">
        <div className="stack">
          <h2 className="section-title">Event stream</h2>
          <div className="console">
            {events.length === 0 ? (
              <div className="console-line">
                <span>--:--:--</span>
                <span>idle</span>
                <span>Waiting for a live run.</span>
              </div>
            ) : (
              events.map((event, index) => (
                <div className="console-line" key={`${event.step}-${index}`}>
                  <span>{event.ts ? new Date(event.ts).toLocaleTimeString() : new Date().toLocaleTimeString()}</span>
                  <span>{event.step}</span>
                  <span>{event.message}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <ReportPanel
          approving={approving}
          onApprove={async (emailId) => {
            setApproving((current) => ({ ...current, [emailId]: true }));
            try {
              const response = await fetch("/api/outreach/approve", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ emailId })
              });
              if (!response.ok) throw new Error(await response.text());
              setReport((current) =>
                current
                  ? {
                      ...current,
                      emails: current.emails.map((email) =>
                        email.emailId === emailId
                          ? { ...email, status: "drafted_in_gmail" as const }
                          : email
                      )
                    }
                  : current
              );
            } finally {
              setApproving((current) => ({ ...current, [emailId]: false }));
            }
          }}
          report={report}
        />
      </section>
    </div>
  );
}

function latestMessage(events: ClientEvent[], step: PipelineStepName) {
  const latest = [...events].reverse().find((event) => event.step === step);
  return latest?.message ?? "Not started";
}

function ReportPanel({
  approving,
  onApprove,
  report
}: {
  approving: Record<string, boolean>;
  onApprove: (emailId: string) => Promise<void>;
  report: SourcingReport | null;
}) {
  if (!report) {
    return (
      <section className="panel">
        <h2>Report</h2>
        <p className="muted">The final report appears here after step 8 completes.</p>
      </section>
    );
  }

  return (
    <section className="stack">
      <div className="panel">
        <h2>Report</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          {report.summary}
        </p>
        <div className="data-list">
          <div className="data-item">
            <h4>{report.opportunity.productName}</h4>
            <p>{report.opportunity.rationale}</p>
          </div>
          {report.scores ? (
            <div className="data-item">
              <h4>Scores</h4>
              <p>
                Trend {pct(report.scores.scores.trendStrength)} · Pain{" "}
                {pct(report.scores.scores.painIntensity)} · Differentiation{" "}
                {pct(report.scores.scores.differentiation)} · Risk {pct(report.scores.scores.risk)}
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {report.variant?.imagePaths.length ? (
        <div className="panel">
          <h2>Concept images</h2>
          <div className="image-strip">
            {report.variant.imagePaths.map((path) => (
              <img alt={report.variant?.productName ?? "Generated concept"} key={path} src={path} />
            ))}
          </div>
        </div>
      ) : null}

      <div className="panel">
        <h2>Supplier RFQs</h2>
        <div className="data-list">
          {report.emails.map((email) => (
            <div className="data-item" key={`${email.supplierName}-${email.subject}`}>
              <h4>{email.supplierName}</h4>
              <p>{email.subject}</p>
              <button
                className="button secondary"
                disabled={!email.emailId || email.status === "drafted_in_gmail" || approving[email.emailId]}
                onClick={() => {
                  if (email.emailId) void onApprove(email.emailId);
                }}
                style={{ marginTop: 10 }}
                type="button"
              >
                <Mail size={15} />
                {email.status === "drafted_in_gmail" ? "Drafted in Gmail" : "Approve draft"}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <h2>Next step</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          <Check size={15} style={{ verticalAlign: "-2px" }} /> {report.nextStep}
        </p>
      </div>
    </section>
  );
}

function pct(value: number) {
  return `${Math.round(value * 100)}%`;
}
