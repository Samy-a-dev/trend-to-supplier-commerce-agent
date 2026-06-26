import { getIntegrationReadiness } from "../lib/integrations";

const readiness = getIntegrationReadiness();
for (const integration of readiness) {
  const status = integration.ready ? "ready" : "missing";
  console.log(`${integration.name}: ${status}`);
  if (integration.missing.length > 0) {
    console.log(`  required: ${integration.missing.join(", ")}`);
  }
  if (integration.optionalMissing.length > 0) {
    console.log(`  optional: ${integration.optionalMissing.join(", ")}`);
  }
}

if (readiness.some((integration) => !integration.ready)) {
  process.exitCode = 1;
}
