import { z } from "zod";

import { getOutreachEmail, markOutreachEmailDrafted } from "@/lib/adapters/clickhouse";
import { createGmailDraft } from "@/lib/adapters/gmail";

export const runtime = "nodejs";

const ApproveSchema = z.object({
  emailId: z.uuid()
});

export async function POST(request: Request) {
  const { emailId } = ApproveSchema.parse(await request.json());
  const email = await getOutreachEmail(emailId);
  if (!email) {
    return Response.json({ error: "Email not found" }, { status: 404 });
  }

  const gmailDraftId = await createGmailDraft({
    to: email.recipient || undefined,
    subject: email.subject,
    body: email.body
  });
  await markOutreachEmailDrafted({ emailId, gmailDraftId });

  return Response.json({ emailId, gmailDraftId, status: "drafted_in_gmail" });
}
