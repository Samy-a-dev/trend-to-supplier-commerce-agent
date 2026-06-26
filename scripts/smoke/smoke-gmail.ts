import { createGmailDraft } from "../../lib/adapters/gmail";
import { optionalEnv } from "../../lib/env";
import { printJson } from "./_helpers";

export async function smokeGmail() {
  const id = await createGmailDraft({
    to: optionalEnv("SMOKE_GMAIL_TO") || undefined,
    subject: "Smoke test RFQ draft",
    body: "This is a local smoke-test draft created by the trend-to-supplier agent. It was not sent."
  });
  printJson({ gmailDraftId: id });
}
