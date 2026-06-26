import { createServer } from "node:http";

import { google } from "googleapis";

import { requireEnv } from "../lib/env";

const redirectUri = "http://127.0.0.1:53682";
const scope = ["https://www.googleapis.com/auth/gmail.compose"];

async function main() {
  const oauth2 = new google.auth.OAuth2(
    requireEnv("GOOGLE_CLIENT_ID"),
    requireEnv("GOOGLE_CLIENT_SECRET"),
    redirectUri
  );

  const codePromise = waitForOAuthCode();
  const authUrl = oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope
  });

  console.log("Open this URL in the Google account you will use for Gmail drafts:");
  console.log(authUrl);

  const code = await codePromise;
  const { tokens } = await oauth2.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error("Google did not return a refresh token. Use prompt=consent and verify the consent app status.");
  }
  console.log("GOOGLE_REFRESH_TOKEN=");
  console.log(tokens.refresh_token);
}

function waitForOAuthCode() {
  return new Promise<string>((resolve, reject) => {
    const server = createServer((request, response) => {
      try {
        const url = new URL(request.url ?? "/", redirectUri);
        const code = url.searchParams.get("code");
        const error = url.searchParams.get("error");
        if (error) throw new Error(error);
        if (!code) throw new Error("OAuth redirect did not include a code.");
        response.writeHead(200, { "content-type": "text/plain" });
        response.end("Gmail consent captured. You can return to the terminal.");
        server.close();
        resolve(code);
      } catch (caught) {
        response.writeHead(400, { "content-type": "text/plain" });
        response.end(caught instanceof Error ? caught.message : String(caught));
        server.close();
        reject(caught);
      }
    });

    server.listen(53682, "127.0.0.1");
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
