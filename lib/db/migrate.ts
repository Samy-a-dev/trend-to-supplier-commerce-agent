import { readFile } from "node:fs/promises";

import { getClickHouseClient } from "@/lib/adapters/clickhouse";

export async function migrate() {
  const client = getClickHouseClient();
  const schema = await readFile(new URL("./schema.sql", import.meta.url), "utf8");
  const statements = schema
    .split(/;\s*$/m)
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await client.command({ query: statement });
  }

  await client.command({
    query:
      "ALTER TABLE agent_runs ADD COLUMN IF NOT EXISTS updated_at DateTime64(3, 'UTC') DEFAULT now64(3)"
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  migrate()
    .then(() => {
      console.log("ClickHouse migration complete.");
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
