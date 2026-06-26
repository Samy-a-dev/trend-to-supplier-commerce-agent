import { getRunEvents, getRunReport } from "@/lib/adapters/clickhouse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [events, report] = await Promise.all([getRunEvents(id), getRunReport(id)]);
  return Response.json({ runId: id, events, report });
}
