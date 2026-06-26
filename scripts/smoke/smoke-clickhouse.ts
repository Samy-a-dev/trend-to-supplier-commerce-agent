import { randomUUID } from "node:crypto";

import { insertJSON, queryJSON } from "../../lib/adapters/clickhouse";
import { migrate } from "../../lib/db/migrate";
import { printJson } from "./_helpers";

export async function smokeClickHouse() {
  await migrate();
  const runId = `smoke-${randomUUID()}`;
  await insertJSON("run_events", [
    {
      run_id: runId,
      step: "smoke",
      kind: "progress",
      message: "ClickHouse smoke insert",
      data: JSON.stringify({ ok: true })
    }
  ]);
  const rows = await queryJSON(
    `
      SELECT run_id, step, kind, message
      FROM run_events
      WHERE run_id = {runId:String}
      LIMIT 1
    `,
    { runId }
  );
  printJson(rows);
}
