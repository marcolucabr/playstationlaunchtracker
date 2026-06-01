import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listRecentRuns } from "@/lib/collector.functions";
import {
  ShoppingCart, MessageSquare, Youtube, Newspaper, Twitter, Music2,
  Instagram, TrendingUp, Search, Tag, Brain, AlertCircle, CheckCircle2, Clock, XCircle,
} from "lucide-react";

type Breakdown = {
  price?: { ok: number; blocked: number; not_found: number; error: number; urls_checked: number };
  reddit?: number; youtube?: number; news?: number;
  twitter?: number; tiktok?: number; instagram?: number;
  trends?: number; keywords?: number; coupons?: number;
  sentiment_classified?: number;
};

const SOURCES: Array<{ key: keyof Breakdown; label: string; icon: React.ReactNode; color: string }> = [
  { key: "reddit", label: "Reddit", icon: <MessageSquare className="h-4 w-4" />, color: "text-orange-600" },
  { key: "youtube", label: "YouTube", icon: <Youtube className="h-4 w-4" />, color: "text-red-600" },
  { key: "news", label: "Notícias BR", icon: <Newspaper className="h-4 w-4" />, color: "text-blue-600" },
  { key: "twitter", label: "X / Twitter", icon: <Twitter className="h-4 w-4" />, color: "text-sky-600" },
  { key: "tiktok", label: "TikTok", icon: <Music2 className="h-4 w-4" />, color: "text-pink-600" },
  { key: "instagram", label: "Instagram", icon: <Instagram className="h-4 w-4" />, color: "text-fuchsia-600" },
  { key: "trends", label: "Google Trends", icon: <TrendingUp className="h-4 w-4" />, color: "text-emerald-600" },
  { key: "keywords", label: "Autocomplete", icon: <Search className="h-4 w-4" />, color: "text-indigo-600" },
  { key: "coupons", label: "Cupons", icon: <Tag className="h-4 w-4" />, color: "text-amber-600" },
  { key: "sentiment_classified", label: "Sentimento (AI)", icon: <Brain className="h-4 w-4" />, color: "text-violet-600" },
];

function fmt(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("pt-BR");
}

function statusBadge(s: string) {
  if (s === "success") return <Badge className="bg-emerald-600 hover:bg-emerald-700"><CheckCircle2 className="h-3 w-3 mr-1" />success</Badge>;
  if (s === "partial") return <Badge variant="secondary"><AlertCircle className="h-3 w-3 mr-1" />partial</Badge>;
  if (s === "failed") return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />failed</Badge>;
  if (s === "running") return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />running</Badge>;
  return <Badge variant="outline">{s}</Badge>;
}

export function CollectionStatus() {
  const listFn = useServerFn(listRecentRuns);
  const { data: runs = [], isLoading } = useQuery({
    queryKey: ["recent-runs"],
    queryFn: () => listFn({}),
    refetchInterval: 10000,
  });

  const last = runs[0];
  const lastBreakdown = (last?.sources_breakdown ?? {}) as Breakdown;
  const lastPrice = lastBreakdown.price;

  // Aggregate totals from last 7 runs
  const totals: Record<string, number> = {};
  runs.slice(0, 7).forEach((r) => {
    const b = (r.sources_breakdown ?? {}) as Breakdown;
    SOURCES.forEach((s) => {
      const v = b[s.key];
      if (typeof v === "number") totals[s.key as string] = (totals[s.key as string] ?? 0) + v;
    });
  });

  return (
    <div className="space-y-4">
      {/* Last run summary */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-base">Última coleta</CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Iniciada {fmt(last?.started_at)} · Finalizada {fmt(last?.finished_at)}
                {last?.trigger ? ` · trigger: ${last.trigger}` : ""}
              </p>
            </div>
            {last ? statusBadge(last.status) : <Badge variant="outline">Sem execuções ainda</Badge>}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-slate-400">Carregando…</p>
          ) : !last ? (
            <p className="text-sm text-slate-400">Nenhuma execução registrada. Clique em "Coletar agora".</p>
          ) : (
            <>
              {/* Price section */}
              <div className="mb-4">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <ShoppingCart className="h-3.5 w-3.5" /> Preços por varejista
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <Stat label="URLs checadas" value={lastPrice?.urls_checked ?? last.retailers_checked ?? 0} />
                  <Stat label="OK" value={lastPrice?.ok ?? 0} accent="text-emerald-600" />
                  <Stat label="Bloqueados" value={lastPrice?.blocked ?? 0} accent="text-amber-600" />
                  <Stat label="Sem preço" value={lastPrice?.not_found ?? 0} accent="text-slate-600" />
                  <Stat label="Erros" value={lastPrice?.error ?? 0} accent="text-red-600" />
                </div>
              </div>

              {/* Qualitative sources */}
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Fontes pesquisadas — resultados retornados
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                  {SOURCES.map((s) => (
                    <div key={s.key as string} className="rounded-lg border border-slate-200 p-3">
                      <div className={`flex items-center gap-1.5 text-xs ${s.color}`}>
                        {s.icon}<span className="font-medium">{s.label}</span>
                      </div>
                      <div className="text-xl font-bold mt-1">
                        {(lastBreakdown[s.key] as number | undefined) ?? 0}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Errors */}
              {Array.isArray(last.errors) && last.errors.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5" /> Erros ({last.errors.length})
                  </h4>
                  <div className="max-h-40 overflow-y-auto space-y-1 text-xs">
                    {(last.errors as Array<{ url: string; error: string }>).slice(0, 10).map((e, i) => (
                      <div key={i} className="border-l-2 border-red-300 pl-2 py-0.5">
                        <div className="font-mono text-slate-700 truncate">{e.url}</div>
                        <div className="text-red-600 truncate">{e.error}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Totals last 7 runs */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Total acumulado nas últimas 7 execuções</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {SOURCES.map((s) => (
              <div key={s.key as string} className="rounded-lg border border-slate-200 p-3">
                <div className={`flex items-center gap-1.5 text-xs ${s.color}`}>
                  {s.icon}<span className="font-medium">{s.label}</span>
                </div>
                <div className="text-xl font-bold mt-1">{totals[s.key as string] ?? 0}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Histórico de execuções</CardTitle></CardHeader>
        <CardContent>
          {runs.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhuma execução ainda.</p>
          ) : (
            <div className="space-y-2">
              {runs.map((r) => {
                const dur = r.finished_at
                  ? Math.round((new Date(r.finished_at).getTime() - new Date(r.started_at).getTime()) / 1000)
                  : null;
                const b = (r.sources_breakdown ?? {}) as Breakdown;
                const mentionsTotal =
                  (b.reddit ?? 0) + (b.youtube ?? 0) + (b.news ?? 0) +
                  (b.twitter ?? 0) + (b.tiktok ?? 0) + (b.instagram ?? 0);
                return (
                  <div key={r.id} className="border border-slate-100 rounded-lg p-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
                      <div className="flex items-center gap-2 text-sm">
                        {statusBadge(r.status)}
                        <span className="text-xs text-slate-500">{r.trigger}</span>
                        <span className="text-xs text-slate-500">{fmt(r.started_at)}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-600">
                        <span>{r.retailers_checked} URLs</span>
                        <span>{r.snapshots_inserted} snapshots</span>
                        <span>{mentionsTotal} menções</span>
                        <span>{r.coupons_inserted ?? 0} cupons</span>
                        {dur != null && <span className="text-slate-400">{dur}s</span>}
                      </div>
                    </div>
                    {Object.keys(b).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {SOURCES.map((s) => {
                          const v = b[s.key] as number | undefined;
                          if (!v) return null;
                          return (
                            <Badge key={s.key as string} variant="outline" className={`text-xs ${s.color}`}>
                              {s.label}: {v}
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-xl font-bold mt-0.5 ${accent ?? "text-slate-900"}`}>{value}</div>
    </div>
  );
}
