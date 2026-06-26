import { google } from "googleapis";

import { requireEnv } from "@/lib/env";

export type GmailDraftInput = {
  to?: string;
  subject: string;
  body: string;
};

export async function createGmailDraft(input: GmailDraftInput) {
  const oauth2 = new google.auth.OAuth2(
    requireEnv("GOOGLE_CLIENT_ID"),
    requireEnv("GOOGLE_CLIENT_SECRET")
  );
  oauth2.setCredentials({ refresh_token: requireEnv("GOOGLE_REFRESH_TOKEN") });

  const gmail = google.gmail({ version: "v1", auth: oauth2 });
  const message = buildMimeMessage(input);
  const raw = Buffer.from(message).toString("base64url");
  const response = await gmail.users.drafts.create({
    userId: "me",
    requestBody: {
      message: { raw }
    }
  });

  const id = response.data.id;
  if (!id) {
    throw new Error("Gmail did not return a draft id.");
  }
  return id;
}

export function buildMimeMessage(input: GmailDraftInput) {
  const headers = [
    input.to ? `To: ${input.to}` : undefined,
    `Subject: ${sanitizeHeader(input.subject)}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 7bit"
  ].filter(Boolean);

  return `${headers.join("\r\n")}\r\n\r\n${input.body}`;
}

function sanitizeHeader(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}
