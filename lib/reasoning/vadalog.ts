import type { Evidence, Opportunity, Supplier } from "@/lib/types";

export function buildVadalogProgram(input: {
  opportunity: Opportunity;
  evidence: Evidence[];
  suppliers?: Supplier[];
}) {
  const product = atom(input.opportunity.normalizedName || input.opportunity.productName);
  const lines: string[] = [];

  const platformCount = new Set(
    input.opportunity.productMentions.flatMap((mention) => mention.platforms)
  ).size;
  const growthScore = Math.max(
    ...input.opportunity.productMentions.map((mention) => mention.growthScore),
    0
  );
  lines.push(`trend("${product}", ${num(growthScore)}, ${Math.max(platformCount, 1)}).`);

  for (const theme of input.opportunity.reviewThemes) {
    lines.push(`painPoint("${product}", "${atom(theme.theme)}", ${num(theme.severity)}).`);
  }

  for (const competitor of input.opportunity.competitors) {
    for (const weakness of competitor.weaknesses) {
      lines.push(`competitor("${product}", "${atom(weakness)}").`);
    }
    lines.push(
      `listing("${product}", ${Math.max(competitor.priceCents ?? 0, 0)}, ${num(
        competitor.rating ?? 0
      )}, ${Math.max(competitor.reviewCount ?? 0, 0)}).`
    );
  }

  for (const evidence of input.evidence) {
    const sourceCount = evidence.results.length;
    lines.push(`evidence("${product}", "${atom(evidence.query)}", ${sourceCount}).`);
  }

  for (const supplier of input.suppliers ?? []) {
    const leadDays = Number.parseInt(supplier.leadTime ?? "14", 10);
    lines.push(
      `supplier("${atom(supplier.name)}", ${num(supplier.fitScore * 5)}, ${
        Number.isFinite(leadDays) ? leadDays : 14
      }).`
    );
  }

  lines.push("");
  lines.push("risingTrend(T) :- trend(T, G, P), G > 0.7, P >= 3.");
  lines.push("strongPainPoint(T, Pa) :- painPoint(T, Pa, S), S >= 0.6.");
  lines.push("differentiationOpportunity(T, Pa) :- strongPainPoint(T, Pa), not competitor(T, Pa).");
  lines.push("supplierFit(S) :- supplier(S, Rel, Lead), Rel >= 4.0, Lead =< 14.");
  lines.push("stockCandidate(T) :- risingTrend(T), differentiationOpportunity(T, _), supplierFit(_).");
  lines.push('trendScore(T, S) :- trend(T, S, _).');
  lines.push('painScore(T, M) :- msum((S), painPoint(T, _, S), M).');
  lines.push('@output("stockCandidate").');
  lines.push('@output("differentiationOpportunity").');
  lines.push('@output("supplierFit").');
  lines.push('@output("trendScore").');
  lines.push('@output("painScore").');

  return lines.join("\n");
}

function atom(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120);
}

function num(value: number) {
  if (!Number.isFinite(value)) return "0";
  return Math.max(0, Math.min(value, 999999)).toFixed(4);
}
