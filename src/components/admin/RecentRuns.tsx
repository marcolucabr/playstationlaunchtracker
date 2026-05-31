import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listRecentRuns } from "@/lib/collector.functions";

function fmtDt(s?: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleString("pt-BR");
}

function statusVariant(s: string): "default" | "secondary" | "destructive" | "outline" {
  if (s === "success") return "default";
  if (s === "partial") return "secondary";
  if (s === "failed") return "destructive";
  return "outline";
}

export function RecentRuns() {
  const listFn = useServerFn(listRecentRuns);
  const { data: runs = [] } = useQuery({
    queryKey: ["recent-runs"],
    queryFn: () => listFn({}),
    refetchInterval: 10000,
  });

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Últimas execuções</CardTitle></CardHeader>
      <CardContent>
        {runs.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhuma execução ainda. Cadastre URLs e clique em "Coletar agora".</p>
        ) : (
          <div className="space-y-2">
            {runs.map((r) => {
              const dur = r.finished_at
                ? Math.round((new Date(r.finished_at).getTime() - new Date(r.started_at).getTime()) / 1000)
                : null;
              return (
                <div key={r.id} className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0 text-sm">
                  <div className="flex items-center gap-3">
                    <Badge variant={statusVariant(r.status)} className="capitalize">{r.status}</Badge>
                    <span className="text-xs text-slate-500">{r.trigger}</span>
                    <span className="text-xs text-slate-500">{fmtDt(r.started_at)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-600">
                    <span>{r.retailers_checked} URLs</span>
                    <span>{r.snapshots_inserted} snapshots</span>
                    {dur != null && <span>{dur}s</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
