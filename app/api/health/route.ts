import { getIntegrationReadiness } from "@/lib/integrations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const integrations = getIntegrationReadiness();
  return Response.json({
    ok: integrations.every((integration) => integration.ready),
    integrations
  });
}
