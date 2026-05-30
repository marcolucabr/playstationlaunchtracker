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
  Trophy,
  Ticket,
  Flame,
  Store,
  XCircle,
} from "lucide-react";

import { fetchDashboard, type DashboardData } from "@/lib/dashboard-data";
import {
  marketplaceMock,
  couponsMock,
  trendsMock,
  PRESALE_START_ISO,
  type MarketplaceSeller,
} from "@/lib/mock-extra";
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
import { useEffect } from "react";

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
    <ThemeProvider>
      <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
        <ThemeBackdrop />
        <Header data={data} />
        <main className="container relative mx-auto max-w-7xl space-y-6 px-4 py-6">
          <PresaleCountdown />
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 md:w-auto md:grid-cols-7">
              <TabsTrigger value="overview">Visão geral</TabsTrigger>
              <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
              <TabsTrigger value="coupons">Cupom</TabsTrigger>
              <TabsTrigger value="trends">Tendências</TabsTrigger>
              <TabsTrigger value="violations">Violações</TabsTrigger>
              <TabsTrigger value="history">Histórico</TabsTrigger>
              <TabsTrigger value="social">Social</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <OverviewSummary data={data} />
            </TabsContent>
            <TabsContent value="marketplace">
              <MarketplacePanel />
            </TabsContent>
            <TabsContent value="coupons">
              <CouponsPanel />
            </TabsContent>
            <TabsContent value="trends">
              <TrendsPanel />
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
          </Tabs>
        </main>
      </div>
    </ThemeProvider>
  );
}

// ===================== Theming =====================
type ThemeName = "corporate" | "wolverine";
const ThemeCtx = createContext<{ theme: ThemeName; setTheme: (t: ThemeName) => void }>({
  theme: "corporate",
  setTheme: () => {},
});

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeName>(() => {
    if (typeof window === "undefined") return "corporate";
    return (localStorage.getItem("wlv-theme") as ThemeName) || "corporate";
  });
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("theme-corporate", "theme-wolverine");
    root.classList.add(`theme-${theme}`);
    localStorage.setItem("wlv-theme", theme);
  }, [theme]);
  return <ThemeCtx.Provider value={{ theme, setTheme }}>{children}</ThemeCtx.Provider>;
}

function ThemeToggle() {
  const { theme, setTheme } = useContext(ThemeCtx);
  return (
    <div className="inline-flex rounded-md border bg-card p-0.5 text-xs">
      <button
        onClick={() => setTheme("corporate")}
        className={`rounded px-2.5 py-1 font-medium transition ${
          theme === "corporate" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
        }`}
      >
        Corporate
      </button>
      <button
        onClick={() => setTheme("wolverine")}
        className={`rounded px-2.5 py-1 font-medium transition ${
          theme === "wolverine" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
        }`}
      >
        Wolverine
      </button>
    </div>
  );
}

function ThemeBackdrop() {
  const { theme } = useContext(ThemeCtx);
  if (theme !== "wolverine") return null;
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{ background: "var(--hero-noise)" }}
      />
      <svg
        className="pointer-events-none absolute -right-32 top-32 h-[520px] w-[520px] opacity-[0.07]"
        viewBox="0 0 200 200"
        fill="none"
      >
        <g stroke="oklch(0.86 0.19 95)" strokeWidth="3" strokeLinecap="round">
          <path d="M30 20 Q 100 90 60 180" />
          <path d="M70 10 Q 130 90 100 190" />
          <path d="M110 15 Q 170 95 140 185" />
        </g>
      </svg>
    </>
  );
}

function PresaleCountdown() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const target = new Date(PRESALE_START_ISO).getTime();
  const diff = target - now;
  const past = diff <= 0;
  const abs = Math.abs(diff);
  const d = Math.floor(abs / 86_400_000);
  const h = Math.floor((abs % 86_400_000) / 3_600_000);
  const m = Math.floor((abs % 3_600_000) / 60_000);
  const s = Math.floor((abs % 60_000) / 1000);

  return (
    <Card className={past ? "border-emerald-500/40" : "border-rose-500/40"}>
      <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-md ${
              past ? "bg-emerald-500/15 text-emerald-600" : "bg-rose-500/15 text-rose-600"
            }`}
          >
            {past ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Pré-venda oficial
            </div>
            <div className="text-sm font-medium">
              {past
                ? "Pré-venda LIBERADA — apenas sellers autorizados podem listar"
                : "Qualquer listing ativo agora = violação de embargo"}
            </div>
            <div className="text-xs text-muted-foreground">
              Início: terça 02/06 às 19h00 (BRT)
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 font-mono text-xl tabular-nums">
          <CountBox v={d} l="d" />
          <CountBox v={h} l="h" />
          <CountBox v={m} l="m" />
          <CountBox v={s} l="s" />
        </div>
      </CardContent>
    </Card>
  );
}

function CountBox({ v, l }: { v: number; l: string }) {
  return (
    <div className="rounded-md border bg-muted/40 px-3 py-1.5 text-center">
      <div className="text-lg font-semibold leading-tight">{String(v).padStart(2, "0")}</div>
      <div className="text-[10px] uppercase text-muted-foreground">{l}</div>
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
                stroke="var(--primary)"
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

// ===================== Marketplace =====================
function MarketplacePanel() {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 p-4 text-sm">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            <span>
              <strong>BuyBox</strong> = vendedor que aparece por padrão no botão "Comprar"
            </span>
          </div>
          <div className="text-muted-foreground">
            Dados mockados — Sprint 1 conecta o robô para coleta real 2x/dia.
          </div>
        </CardContent>
      </Card>
      {marketplaceMock.map((r) => (
        <MarketplaceRetailerCard key={r.retailer_id} r={r} />
      ))}
    </div>
  );
}

function MarketplaceRetailerCard({
  r,
}: {
  r: (typeof marketplaceMock)[number];
}) {
  const buybox = r.sellers.find((s) => s.is_buybox);
  const sorted = [...r.sellers].sort((a, b) => a.price_avista_cents - b.price_avista_cents);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Store className="h-4 w-4" />
            {r.retailer_name}
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="outline">{r.total_sellers} sellers ativos</Badge>
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
              {r.authorized_count} autorizados
            </Badge>
            <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30">
              {r.unauthorized_count} não autorizados
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {buybox ? <BuyBoxCard s={buybox} /> : null}

        <div>
          <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Todos os sellers (ordenados por preço)
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3">Seller</th>
                  <th className="py-2 pr-3">À vista</th>
                  <th className="py-2 pr-3">Parcelamento</th>
                  <th className="py-2 pr-3">Frete</th>
                  <th className="py-2 pr-3">Reputação</th>
                  <th className="py-2 pr-3">Estoque</th>
                  <th className="py-2 pr-3">Idade</th>
                  <th className="py-2 pr-3"></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((s) => (
                  <tr
                    key={s.seller}
                    className={`border-t ${s.is_buybox ? "bg-amber-500/5" : ""}`}
                  >
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-2 font-medium">
                        {s.is_buybox ? (
                          <Trophy className="h-3.5 w-3.5 text-amber-500" />
                        ) : null}
                        {s.seller}
                        {s.authorized ? (
                          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                            autorizado
                          </Badge>
                        ) : (
                          <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 text-[10px]">
                            não autorizado
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-2 pr-3 tabular-nums font-semibold">
                      {brl(s.price_avista_cents)}
                    </td>
                    <td className="py-2 pr-3 text-muted-foreground">{s.installments}</td>
                    <td className="py-2 pr-3">
                      <ShippingBadge kind={s.shipping} />
                    </td>
                    <td className="py-2 pr-3 text-muted-foreground">
                      ★ {s.rating.toFixed(1)} ({s.reviews.toLocaleString("pt-BR")})
                    </td>
                    <td className="py-2 pr-3">
                      <StockBadge stock={s.stock} />
                    </td>
                    <td className="py-2 pr-3 text-muted-foreground">{s.listing_age_days}d</td>
                    <td className="py-2 pr-3">
                      {s.url ? (
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Quem ganhou a BuyBox nas últimas 24h
          </div>
          <div className="flex h-6 w-full overflow-hidden rounded-md border">
            {r.buybox_history_24h.map((h, i) => (
              <div
                key={i}
                title={`${h.seller} — ${h.hours}h`}
                style={{ width: `${(h.hours / 24) * 100}%` }}
                className={`flex items-center justify-center text-[10px] font-medium text-white ${
                  h.authorized ? "bg-emerald-500" : "bg-rose-500"
                }`}
              >
                {h.hours >= 3 ? `${h.seller} · ${h.hours}h` : ""}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BuyBoxCard({ s }: { s: MarketplaceSeller }) {
  return (
    <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-amber-700 dark:text-amber-400">
            <Trophy className="h-3.5 w-3.5" /> BuyBox atual
          </div>
          <div className="mt-1 flex items-center gap-2 text-lg font-semibold">
            {s.seller}
            {s.authorized ? (
              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                autorizado
              </Badge>
            ) : (
              <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30">
                <XCircle className="mr-1 h-3 w-3" /> não autorizado
              </Badge>
            )}
          </div>
          <div className="text-2xl font-bold tabular-nums">{brl(s.price_avista_cents)}</div>
        </div>
        <div className="min-w-[260px] flex-1">
          <div className="mb-1 text-xs font-medium uppercase text-muted-foreground">
            Por que ganhou a BuyBox
          </div>
          <ul className="space-y-1 text-sm">
            {(s.buybox_reasons ?? []).map((r, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function ShippingBadge({ kind }: { kind: MarketplaceSeller["shipping"] }) {
  const map = {
    gratis: { label: "grátis", cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
    pago: { label: "pago", cls: "bg-muted text-muted-foreground" },
    full: { label: "Full", cls: "bg-yellow-400/20 text-yellow-700 dark:text-yellow-400" },
    prime: { label: "Prime", cls: "bg-sky-500/15 text-sky-700 dark:text-sky-400" },
  } as const;
  const m = map[kind];
  return <span className={`rounded px-1.5 py-0.5 text-[11px] ${m.cls}`}>{m.label}</span>;
}

function StockBadge({ stock }: { stock: MarketplaceSeller["stock"] }) {
  const map = {
    alto: { label: "alto", tone: "green" as const },
    medio: { label: "médio", tone: "yellow" as const },
    baixo: { label: "baixo", tone: "yellow" as const },
    sem: { label: "esgotado", tone: "red" as const },
  };
  const m = map[stock];
  return (
    <span className={`inline-flex rounded-md border px-1.5 py-0.5 text-[10px] ${toneClass[m.tone]}`}>
      {m.label}
    </span>
  );
}

// ===================== Cupom =====================
function CouponsPanel() {
  const active = couponsMock.filter((c) => c.active);
  const inactive = couponsMock.filter((c) => !c.active);
  const violating = active.filter((c) => c.triggers_map_violation);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          icon={<Ticket className="h-4 w-4" />}
          label="Cupons ativos"
          value={String(active.length)}
          hint="aplicáveis ao Wolverine"
        />
        <KpiCard
          icon={<AlertTriangle className="h-4 w-4 text-rose-500" />}
          label="Geram violação MAP"
          value={String(violating.length)}
          hint="preço efetivo abaixo do piso"
        />
        <KpiCard
          icon={<Store className="h-4 w-4" />}
          label="Varejistas com cupom"
          value={String(new Set(active.map((c) => c.retailer_id)).size)}
        />
        <KpiCard
          icon={<Clock className="h-4 w-4" />}
          label="Encerram em 48h"
          value={String(
            active.filter(
              (c) =>
                new Date(c.expires_at).getTime() - Date.now() < 48 * 3600_000,
            ).length,
          )}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-4 w-4" /> Cupons ativos agora
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CouponTable list={active} />
        </CardContent>
      </Card>

      {inactive.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-muted-foreground">Encerrados (histórico)</CardTitle>
          </CardHeader>
          <CardContent>
            <CouponTable list={inactive} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function CouponTable({ list }: { list: typeof couponsMock }) {
  if (list.length === 0)
    return <p className="text-sm text-muted-foreground">Nenhum cupom no momento.</p>;
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="py-2 pr-3">Varejista</th>
            <th className="py-2 pr-3">Código</th>
            <th className="py-2 pr-3">Descrição</th>
            <th className="py-2 pr-3">Desconto</th>
            <th className="py-2 pr-3">Vigência</th>
            <th className="py-2 pr-3">Onde aparece</th>
            <th className="py-2 pr-3">Preço efetivo</th>
            <th className="py-2 pr-3">MAP</th>
          </tr>
        </thead>
        <tbody>
          {list.map((c) => (
            <tr key={c.id} className="border-t">
              <td className="py-2 pr-3 font-medium">{c.retailer_name}</td>
              <td className="py-2 pr-3">
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{c.code}</code>
              </td>
              <td className="py-2 pr-3 text-muted-foreground">{c.description}</td>
              <td className="py-2 pr-3 tabular-nums">
                {c.discount_pct ? `${c.discount_pct}%` : brl(c.discount_cents ?? 0)}
              </td>
              <td className="py-2 pr-3 text-muted-foreground">
                {fmt(c.starts_at)} → {fmt(c.expires_at)}
              </td>
              <td className="py-2 pr-3">
                <Badge variant="outline" className="text-[10px] uppercase">
                  {c.source}
                </Badge>
              </td>
              <td className="py-2 pr-3 tabular-nums font-semibold">
                {brl(c.effective_price_cents)}
              </td>
              <td className="py-2 pr-3">
                {c.triggers_map_violation ? (
                  <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30">
                    <AlertTriangle className="mr-1 h-3 w-3" /> viola
                  </Badge>
                ) : (
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                    ok
                  </Badge>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ===================== Tendências =====================
function TrendsPanel() {
  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground">
          Placeholder com dados mockados. Sprint 2 conecta Google Trends, YouTube Data API e Reddit
          API (todas gratuitas).
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {trendsMock.map((t) => (
          <TrendCard key={t.source} t={t} />
        ))}
      </div>
    </div>
  );
}

function TrendCard({ t }: { t: (typeof trendsMock)[number] }) {
  const up = t.delta_7d_pct >= 0;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" />
            {t.source_name}
          </span>
          <Badge
            className={
              up
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                : "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30"
            }
          >
            {up ? "▲" : "▼"} {t.delta_7d_pct.toFixed(1)}% / 7d
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-2">
          <div className="text-3xl font-bold">{t.current_score}</div>
          <div className="text-xs text-muted-foreground">índice 0–100</div>
        </div>
        <div className="h-24">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={t.series}>
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--primary)"
                strokeWidth={2}
                dot={false}
              />
              <XAxis dataKey="date" hide />
              <YAxis hide />
              <Tooltip />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {t.top_items ? (
          <div>
            <div className="mb-1 text-xs font-medium uppercase text-muted-foreground">
              Em destaque
            </div>
            <ul className="space-y-1.5 text-sm">
              {t.top_items.map((it, i) => (
                <li key={i} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{it.title}</div>
                    <div className="text-xs text-muted-foreground">{it.author}</div>
                  </div>
                  <div className="whitespace-nowrap text-xs text-muted-foreground">
                    {it.metric}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
