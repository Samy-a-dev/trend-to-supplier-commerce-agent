import { createClient, type ClickHouseClient } from "@clickhouse/client";
import { randomUUID } from "node:crypto";

import { requireEnv } from "@/lib/env";
import type { AgentRunRow, RfqEmail, RunEventRow, SourcingReport } from "@/lib/types";
import { parseJson, safeJson } from "@/lib/utils";

let client: ClickHouseClient | undefined;

export function getClickHouseClient() {
  if (client) return client;
  client = createClient({
    url: requireEnv("CLICKHOUSE_URL"),
    username: requireEnv("CLICKHOUSE_USER"),
    password: requireEnv("CLICKHOUSE_PASSWORD"),
    clickhouse_settings: {
      async_insert: 1,
      wait_for_async_insert: 1
    }
  });
  return client;
}

export async function insertJSON(table: string, values: Record<string, unknown>[]) {
  if (!/^[a-z_]+$/.test(table)) {
    throw new Error(`Unsafe ClickHouse table name: ${table}`);
  }
  if (values.length === 0) return;
  await getClickHouseClient().insert({
    table,
    format: "JSONEachRow",
    values
  });
}

export async function queryJSON<T>(
  query: string,
  queryParams: Record<string, unknown> = {}
) {
  const resultSet = await getClickHouseClient().query({
    query,
    query_params: queryParams,
    format: "JSONEachRow"
  });
  return (await resultSet.json()) as T[];
}

export async function createAgentRun(input: {
  runId: string;
  vertical: string;
  region: string;
  startedAt?: string;
}) {
  await insertJSON("agent_runs", [
    {
      run_id: input.runId,
      vertical: input.vertical,
      region: input.region,
      status: "running",
      started_at: input.startedAt ?? new Date().toISOString(),
      completed_at: null,
      updated_at: new Date().toISOString(),
      summary: "",
      payload: ""
    }
  ]);
}

export async function finishAgentRun(input: {
  runId: string;
  vertical: string;
  region: string;
  startedAt?: string;
  status: "completed" | "failed";
  summary: string;
  payload?: unknown;
}) {
  await insertJSON("agent_runs", [
    {
      run_id: input.runId,
      vertical: input.vertical,
      region: input.region,
      status: input.status,
      started_at: input.startedAt ?? new Date().toISOString(),
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      summary: input.summary,
      payload: safeJson(input.payload ?? {})
    }
  ]);
}

export async function persistRunEvent(row: RunEventRow) {
  await insertJSON("run_events", [
    {
      run_id: row.run_id,
      step: row.step,
      kind: row.kind,
      message: row.message,
      data: safeJson(row.data ?? {})
    }
  ]);
}

export async function listRecentRuns(limit = 20) {
  const rows = await queryJSON<AgentRunRow>(
    `
      SELECT
        run_id,
        argMax(vertical, updated_at) AS vertical,
        argMax(region, updated_at) AS region,
        argMax(status, updated_at) AS status,
        toString(max(started_at)) AS started_at,
        toString(max(completed_at)) AS completed_at,
        argMax(summary, updated_at) AS summary,
        argMax(payload, updated_at) AS payload
      FROM agent_runs
      GROUP BY run_id
      ORDER BY max(updated_at) DESC
      LIMIT {limit:UInt32}
    `,
    { limit }
  );
  return { rows };
}

export async function getRunEvents(runId: string) {
  const rows = await queryJSON<{
    ts: string;
    step: string;
    kind: RunEventRow["kind"];
    message: string;
    data: string;
  }>(
    `
      SELECT toString(ts) AS ts, step, kind, message, data
      FROM run_events
      WHERE run_id = {runId:String}
      ORDER BY ts ASC
    `,
    { runId }
  );

  return rows.map((row) => ({
    run_id: runId,
    ts: row.ts,
    step: row.step,
    kind: row.kind,
    message: row.message,
    data: parseJson(row.data, {})
  }));
}

export async function getRunReport(runId: string) {
  const rows = await queryJSON<{ payload: string }>(
    `
      SELECT payload
      FROM agent_runs
      WHERE run_id = {runId:String} AND payload != ''
      ORDER BY updated_at DESC
      LIMIT 1
    `,
    { runId }
  );

  return parseJson<SourcingReport | null>(rows[0]?.payload, null);
}

export async function insertOutreachEmails(input: {
  runId: string;
  emails: RfqEmail[];
}) {
  const rows = input.emails.map((email) => ({
    id: randomUUID(),
    run_id: input.runId,
    source: "gemini",
    supplier_name: email.supplierName,
    supplier_url: email.supplierUrl ?? "",
    recipient: email.to ?? "",
    subject: email.subject,
    body: email.body,
    status: email.status,
    payload: safeJson(email)
  }));
  await insertJSON("outreach_emails", rows);
  return rows.map((row, index) => ({ ...input.emails[index], emailId: row.id }));
}

export async function getOutreachEmail(emailId: string) {
  const rows = await queryJSON<{
    id: string;
    run_id: string;
    supplier_name: string;
    supplier_url: string;
    recipient: string;
    subject: string;
    body: string;
    status: string;
  }>(
    `
      SELECT toString(id) AS id, run_id, supplier_name, supplier_url, recipient, subject, body, status
      FROM outreach_emails
      WHERE id = {emailId:UUID}
      LIMIT 1
    `,
    { emailId }
  );

  return rows[0] ?? null;
}

export async function markOutreachEmailDrafted(input: {
  emailId: string;
  gmailDraftId: string;
}) {
  await getClickHouseClient().command({
    query: `
      ALTER TABLE outreach_emails
      UPDATE status = 'drafted_in_gmail', gmail_draft_id = {gmailDraftId:String}
      WHERE id = {emailId:UUID}
    `,
    query_params: input
  });
}

export function sourcePayloadRow(input: {
  runId: string;
  source: string;
  url?: string;
  title?: string;
  productName?: string;
  payload: unknown;
  extra?: Record<string, unknown>;
}) {
  return {
    run_id: input.runId,
    source: input.source,
    url: input.url ?? "",
    title: input.title ?? "",
    product_name: input.productName ?? "",
    payload: safeJson(input.payload),
    ...(input.extra ?? {})
  };
}
