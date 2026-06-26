import { corroborateDemand, discoverSuppliers } from "../../lib/adapters/tavily";
import { printJson } from "./_helpers";

export async function smokeTavily() {
  const evidence = await corroborateDemand(["walking pad desk trend demand"]);
  const suppliers = await discoverSuppliers("walking pad");
  printJson({
    evidenceCount: evidence[0]?.results.length ?? 0,
    firstEvidence: evidence[0]?.results[0],
    supplierResultCount: suppliers.searchResults.length
  });
}
