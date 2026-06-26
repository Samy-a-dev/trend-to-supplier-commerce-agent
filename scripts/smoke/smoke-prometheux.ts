import { deriveWithPrometheux } from "../../lib/adapters/prometheux";
import { printJson } from "./_helpers";

export async function smokePrometheux() {
  const program = [
    'trend("walking_pad", 0.82, 4).',
    'painPoint("walking_pad", "noise", 0.7).',
    'supplier("oem_a", 4.5, 12).',
    "risingTrend(T) :- trend(T, G, P), G > 0.7, P >= 3.",
    "strongPainPoint(T, Pa) :- painPoint(T, Pa, S), S >= 0.6.",
    "supplierFit(S) :- supplier(S, Rel, Lead), Rel >= 4.0, Lead =< 14.",
    '@output("risingTrend").',
    '@output("strongPainPoint").',
    '@output("supplierFit").'
  ].join("\n");
  const result = await deriveWithPrometheux({
    program,
    outputPredicates: ["risingTrend", "strongPainPoint", "supplierFit"]
  });
  printJson(result);
}
