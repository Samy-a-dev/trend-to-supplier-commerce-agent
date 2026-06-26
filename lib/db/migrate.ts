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
