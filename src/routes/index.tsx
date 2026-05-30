import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  TrendingUp,
  Clock,
  Tag,
} from "lucide-react";

import { fetchDashboard, type DashboardData } from "@/lib/dashboard-data";
import {
  brl,
  dotClass,
  pct,
  statusLabel,
  statusTone,
  toneClass,
  type PriceStatus,
} from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Painel Wolverine PS5 — Monitoramento de Preço & Mídia" },
      {
        name: "description",
        content:
          "Visibilidade completa do título Marvel's Wolverine para PS5: preço, parcelamento, sellers autorizados e menções sociais.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["wolverine-dashboard"],
    queryFn: fetchDashboard,
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Carregando painel…</p>
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center text-destructive">
        Erro ao carregar dados.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header data={data} />
      <main className="container mx-auto max-w-7xl space-y-6 px-4 py-6">
        <KpiRow data={data} />
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 md:w-auto md:grid-cols-5">
            <TabsTrigger value="overview">Visão geral</TabsTrigger>
            <TabsTrigger value="violations">Violações</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
            <TabsTrigger value="social">Social</TabsTrigger>
            <TabsTrigger value="sellers">Sellers</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
            <RetailerGrid data={data} />
          </TabsContent>
          <TabsContent value="violations">
            <ViolationsTable data={data} />
          </TabsContent>
          <TabsContent value="history">
            <HistoryChart data={data} />
          </TabsContent>
          <TabsContent value="social">
            <SocialFeed data={data} />
          </TabsContent>
          <TabsContent value="sellers">
            <SellersPanel data={data} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function Header({ data }: { data: DashboardData }) {
  const { product } = data;
  const minAvista = Math.round(product.srp_cents * (1 - product.max_discount_avista_pct / 100));
  return (
    <header className="border-b bg-card">
      <div className="container mx-auto max-w-7xl px-4 py-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <Tag className="h-3.5 w-3.5" /> Monitoramento de Lançamento
            </div>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              {product.name} <span className="text-muted-foreground">({product.platform})</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              EAN <span className="font-mono">{product.ean}</span> · SRP{" "}
              <strong>{brl(product.srp_cents)}</strong> · Piso à vista{" "}
              <strong>{brl(minAvista)}</strong> ({pct(product.max_discount_avista_pct)} máx)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={product.presale_allowed ? "default" : "destructive"}>
              {product.presale_allowed ? "Pré-venda autorizada" : "Pré-venda NÃO autorizada"}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Clock className="h-3 w-3" /> Coleta 08h30 & 13h00
            </Badge>
          </div>
        </div>
        {product.notes ? (
          <p className="mt-3 max-w-3xl text-sm text-muted-foreground">{product.notes}</p>
        ) : null}
      </div>
    </header>
  );
}

function KpiRow({ data }: { data: DashboardData }) {
  const latestByListing = useLatestPerListing(data);
  const total = latestByListing.length;
  const counts = latestByListing.reduce(
    (acc, s) => {
      const tone = statusTone[s.status as PriceStatus];
      acc[tone]++;
      return acc;
    },
    { green: 0, yellow: 0, red: 0 } as Record<"green" | "yellow" | "red", number>,
  );
  const avgAvista =
    latestByListing
      .map((s) => s.price_avista_cents)
      .filter((v): v is number => v != null)
      .reduce((a, b, _i, arr) => a + b / arr.length, 0) || 0;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <KpiCard
        icon={<TrendingUp className="h-4 w-4" />}
        label="Listagens monitoradas"
        value={String(total)}
        hint="varejistas + sellers"
      />
      <KpiCard
        icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
        label="Conformes"
        value={String(counts.green)}
        hint={`${total ? Math.round((counts.green / total) * 100) : 0}% do total`}
      />
      <KpiCard
        icon={<AlertTriangle className="h-4 w-4 text-rose-500" />}
        label="Violações críticas"
        value={String(counts.red)}
        hint="abaixo do piso ou seller não autorizado"
      />
      <KpiCard
        icon={<Tag className="h-4 w-4" />}
        label="Preço médio à vista"
        value={brl(Math.round(avgAvista))}
        hint="média ponderada das listagens ativas"
      />
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {icon}
          {label}
        </div>
        <div className="mt-2 text-2xl font-semibold">{value}</div>
        {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
      </CardContent>
    </Card>
  );
}

function useLatestPerListing(data: DashboardData) {
  return useMemo(() => {
    const byKey = new Map<string, DashboardData["snapshots"][number]>();
    for (const s of data.snapshots) {
      const key = `${s.retailer_id}|${s.is_first_party ? "1p" : `3p:${s.seller_name ?? ""}`}`;
      if (!byKey.has(key)) byKey.set(key, s);
    }
    return Array.from(byKey.values());
  }, [data.snapshots]);
}

function RetailerGrid({ data }: { data: DashboardData }) {
  const latest = useLatestPerListing(data);
  const byRetailer = new Map<string, typeof latest>();
  for (const s of latest) {
    const arr = byRetailer.get(s.retailer_id) ?? [];
    arr.push(s);
    byRetailer.set(s.retailer_id, arr);
  }
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {data.retailers.map((r) => {
        const listings = byRetailer.get(r.id) ?? [];
        return (
          <Card key={r.id}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-base">
                <span>{r.name}</span>
                <Badge variant="outline" className="uppercase text-[10px]">
                  {r.kind === "both" ? "1P + 3P" : r.kind}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {listings.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem coletas ainda.</p>
              ) : (
                listings
                  .sort((a, b) => Number(b.is_first_party) - Number(a.is_first_party))
                  .map((s) => <ListingRow key={s.id} s={s} />)
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function ListingRow({ s }: { s: DashboardData["snapshots"][number] }) {
  const tone = statusTone[s.status as PriceStatus];
  return (
    <div className="rounded-md border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className={`h-2 w-2 rounded-full ${dotClass[tone]}`} />
            {s.is_first_party ? "1P (varejista)" : `3P · ${s.seller_name ?? "seller?"}`}
          </div>
          <div className="mt-1 text-xl font-semibold tabular-nums">{brl(s.price_avista_cents)}</div>
          <div className="text-xs text-muted-foreground">
            à prazo:{" "}
            {s.installment_count && s.installment_value_cents
              ? `${s.installment_count}x de ${brl(s.installment_value_cents)} (total ${brl(s.installment_total_cents)})`
              : "—"}
          </div>
        </div>
        {s.product_url ? (
          <a
            href={s.product_url}
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground hover:text-foreground"
            aria-label="Abrir página do produto"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        ) : null}
      </div>
      <div className="mt-2">
        <span className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] ${toneClass[tone]}`}>
          {statusLabel[s.status as PriceStatus]}
        </span>
      </div>
    </div>
  );
}

function ViolationsTable({ data }: { data: DashboardData }) {
  const latest = useLatestPerListing(data);
  const rows = latest
    .filter((s) => statusTone[s.status as PriceStatus] !== "green")
    .sort(
      (a, b) =>
        Number(statusTone[b.status as PriceStatus] === "red") -
        Number(statusTone[a.status as PriceStatus] === "red"),
    );
  const retailerName = (id: string) => data.retailers.find((r) => r.id === id)?.name ?? "?";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Listagens fora de conformidade</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Tudo conforme. 🟢</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3">Varejista</th>
                  <th className="py-2 pr-3">Tipo</th>
                  <th className="py-2 pr-3">Seller</th>
                  <th className="py-2 pr-3">À vista</th>
                  <th className="py-2 pr-3">À prazo</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => {
                  const tone = statusTone[s.status as PriceStatus];
                  return (
                    <tr key={s.id} className="border-t">
                      <td className="py-2 pr-3 font-medium">{retailerName(s.retailer_id)}</td>
                      <td className="py-2 pr-3">{s.is_first_party ? "1P" : "3P"}</td>
                      <td className="py-2 pr-3 text-muted-foreground">
                        {s.seller_name ?? "—"}
                      </td>
                      <td className="py-2 pr-3 tabular-nums">{brl(s.price_avista_cents)}</td>
                      <td className="py-2 pr-3 tabular-nums text-muted-foreground">
                        {s.installment_count
                          ? `${s.installment_count}x ${brl(s.installment_value_cents)}`
                          : "—"}
                      </td>
                      <td className="py-2 pr-3">
                        <span
                          className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] ${toneClass[tone]}`}
                        >
                          {statusLabel[s.status as PriceStatus]}
                        </span>
                      </td>
                      <td className="py-2 pr-3">
                        {s.product_url ? (
                          <a
                            href={s.product_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function HistoryChart({ data }: { data: DashboardData }) {
  // Aggregate avg avista per day across retailers
  const byDay = new Map<string, { sum: number; n: number }>();
  for (const s of data.snapshots) {
    if (s.price_avista_cents == null) continue;
    const day = s.captured_at.slice(0, 10);
    const cur = byDay.get(day) ?? { sum: 0, n: 0 };
    cur.sum += s.price_avista_cents;
    cur.n += 1;
    byDay.set(day, cur);
  }
  const series = Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, v]) => ({ day, avista: Math.round(v.sum / v.n / 100) }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preço médio à vista (R$) — todos os varejistas</CardTitle>
      </CardHeader>
      <CardContent className="h-80">
        {series.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem histórico suficiente ainda.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="day" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="avista"
                name="Média à vista"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function SocialFeed({ data }: { data: DashboardData }) {
  const [filter, setFilter] = useState<string>("all");
  const sources = Array.from(new Set(data.mentions.map((m) => m.source)));
  const list = data.mentions.filter((m) => filter === "all" || m.source === filter);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" /> Menções nas redes & fóruns
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
          >
            Todas
          </Button>
          {sources.map((s) => (
            <Button
              key={s}
              size="sm"
              variant={filter === s ? "default" : "outline"}
              onClick={() => setFilter(s)}
            >
              {s}
            </Button>
          ))}
        </div>
        <div className="space-y-2">
          {list.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem menções ainda.</p>
          ) : (
            list.map((m) => (
              <div key={m.id} className="rounded-md border bg-card p-3">
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>
                    {m.source_name ?? m.source} · {m.author ?? "—"}
                  </span>
                  <span className="flex items-center gap-2">
                    {m.sentiment ? (
                      <SentimentBadge sentiment={m.sentiment} />
                    ) : null}
                    {m.engagement != null ? <span>{m.engagement.toLocaleString("pt-BR")} eng.</span> : null}
                  </span>
                </div>
                <div className="mt-1 font-medium">{m.title ?? "(sem título)"}</div>
                {m.excerpt ? (
                  <p className="mt-1 text-sm text-muted-foreground">{m.excerpt}</p>
                ) : null}
                {m.url ? (
                  <a
                    href={m.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    abrir <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SentimentBadge({ sentiment }: { sentiment: "positive" | "neutral" | "negative" }) {
  const map = {
    positive: { label: "positivo", tone: "green" as const },
    neutral: { label: "neutro", tone: "yellow" as const },
    negative: { label: "negativo", tone: "red" as const },
  };
  const { label, tone } = map[sentiment];
  return (
    <span className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] ${toneClass[tone]}`}>
      {label}
    </span>
  );
}

function SellersPanel({ data }: { data: DashboardData }) {
  const byRetailer = new Map<string, DashboardData["authorizedSellers"]>();
  for (const s of data.authorizedSellers) {
    const arr = byRetailer.get(s.retailer_id) ?? [];
    arr.push(s);
    byRetailer.set(s.retailer_id, arr);
  }
  const has3p = data.retailers.filter((r) => r.kind === "3p" || r.kind === "both");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" /> Sellers 3P autorizados
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-sm text-muted-foreground">
          Qualquer seller 3P fora desta lista é marcado como{" "}
          <span className={`rounded-md border px-1.5 ${toneClass.red}`}>não autorizado</span> nas
          coletas.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {has3p.map((r) => {
            const sellers = byRetailer.get(r.id) ?? [];
            return (
              <div key={r.id} className="rounded-md border p-3">
                <div className="font-medium">{r.name}</div>
                {sellers.length === 0 ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Nenhum seller cadastrado ainda.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-1 text-sm">
                    {sellers.map((s) => (
                      <li key={s.id} className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        {s.seller_name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
