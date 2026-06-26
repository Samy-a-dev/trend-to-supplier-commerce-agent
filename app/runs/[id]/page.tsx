import { RunView } from "@/components/run-view";
import { getRunEvents, getRunReport } from "@/lib/adapters/clickhouse";

type RunPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    autostart?: string;
    vertical?: string;
    region?: string;
  }>;
};

export default async function RunPage({ params, searchParams }: RunPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const [eventsResult, reportResult] = await Promise.all([
    getRunEvents(id).catch(() => []),
    getRunReport(id).catch(() => null)
  ]);

  return (
    <RunView
      autostart={query.autostart === "1"}
      initialEvents={eventsResult}
      initialReport={reportResult}
      region={query.region ?? "United States"}
      runId={id}
      vertical={query.vertical ?? reportResult?.opportunity?.productName ?? ""}
    />
  );
}
