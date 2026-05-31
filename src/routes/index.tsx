import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, useEffect, useContext, createContext } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
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
  Languages,
} from "lucide-react";

import { fetchDashboard, type DashboardData } from "@/lib/dashboard-data";
import {
  marketplaceMock,
  couponsMock,
  trendsMock,
  
  RELEASE_DATE_ISO,
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
import { LangCtx, useT, type Lang } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import psLogo from "@/assets/playstation-logo.png";
import wolverineCover from "@/assets/wolverine-cover.png";
import wolverineHero from "@/assets/wolverine-banner.jpg";
import psBg from "@/assets/ps-bg.jpg";




export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Painel Wolverine PS5 — Monitoramento de Preço & Mídia" },
      {
        name: "description",
        content:
          "Visibilidade completa do título Wolverine [PS5]: preço, parcelamento, sellers autorizados e menções sociais.",
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
    <LangProvider>
      <ThemeProvider>
        <DashboardInner data={data} />
      </ThemeProvider>
    </LangProvider>
  );
}

function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window === "undefined") return "pt";
    return (localStorage.getItem("wlv-lang") as Lang) || "pt";
  });
  useEffect(() => {
    localStorage.setItem("wlv-lang", lang);
  }, [lang]);
  return <LangCtx.Provider value={{ lang, setLang }}>{children}</LangCtx.Provider>;
}

function FlagUS({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 16" className={className} aria-hidden>
      <rect width="24" height="16" fill="#fff" />
      {[0, 2, 4, 6, 8, 10, 12, 14].map((y) => (
        <rect key={y} y={y + 1} width="24" height="1.1" fill="#b22234" />
      ))}
      <rect width="10" height="8" fill="#3c3b6e" />
    </svg>
  );
}
function FlagBR({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 16" className={className} aria-hidden>
      <rect width="24" height="16" fill="#009b3a" />
      <polygon points="12,2 22,8 12,14 2,8" fill="#ffdf00" />
      <circle cx="12" cy="8" r="3" fill="#002776" />
    </svg>
  );
}

function LangToggle() {
  const { lang, setLang } = useContext(LangCtx);
  return (
    <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-wider">
      <button
        onClick={() => setLang("en")}
        className={`inline-flex items-center gap-1.5 ${lang === "en" ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground"}`}
      >
        <FlagUS className="h-3 w-[18px] rounded-[1px] ring-1 ring-border" /> EN
      </button>
      <span className="text-muted-foreground/40">/</span>
      <button
        onClick={() => setLang("pt")}
        className={`inline-flex items-center gap-1.5 ${lang === "pt" ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground"}`}
      >
        <FlagBR className="h-3 w-[18px] rounded-[1px] ring-1 ring-border" /> PT
      </button>
    </div>
  );
}





function DashboardInner({ data }: { data: DashboardData }) {
  const t = useT();
  const [tab, setTab] = useState("overview");
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <ThemeBackdrop />
      <Header data={data} />
      <main className="relative mx-auto w-full max-w-[1600px] space-y-6 px-6 py-6 lg:px-10">
        <CountdownRow />
        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 md:w-auto md:grid-cols-7">
            <TabsTrigger value="overview">{t("tab_overview")}</TabsTrigger>
            <TabsTrigger value="marketplace">{t("tab_marketplace")}</TabsTrigger>
            <TabsTrigger value="coupons">{t("tab_coupons")}</TabsTrigger>
            <TabsTrigger value="trends">{t("tab_trends")}</TabsTrigger>
            <TabsTrigger value="social">{t("tab_social")}</TabsTrigger>
            <TabsTrigger value="violations">{t("tab_violations")}</TabsTrigger>
            <TabsTrigger value="history">{t("tab_history")}</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
            <OverviewSummary data={data} onNavigate={setTab} />
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
          <TabsContent value="social">
            <SocialFeed data={data} />
          </TabsContent>
          <TabsContent value="violations">
            <ViolationsTable data={data} />
          </TabsContent>
          <TabsContent value="history">
            <HistoryChart data={data} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
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
  const t = useT();
  return (
    <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-wider">
      <span className="text-muted-foreground/70">Theme:</span>
      <button
        onClick={() => setTheme("corporate")}
        className={theme === "corporate" ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground"}
      >
        {t("theme_light")}
      </button>
      <span className="text-muted-foreground/40">/</span>
      <button
        onClick={() => setTheme("wolverine")}
        className={theme === "wolverine" ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground"}
      >
        {t("theme_wolverine")}
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

function CountdownCard({
  targetIso,
  titleKey,
  liveKey,
  embargoKey,
  dateKey,
}: {
  targetIso: string;
  titleKey: "presale_official" | "release_official";
  liveKey: "presale_liberated" | "release_live";
  embargoKey: "presale_embargo" | "release_countdown";
  dateKey: "presale_start_date" | "release_date_label";
}) {
  const tr = useT();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const target = new Date(targetIso).getTime();
  const diff = target - now;
  const past = diff <= 0;
  const abs = Math.abs(diff);
  const d = Math.floor(abs / 86_400_000);
  const h = Math.floor((abs % 86_400_000) / 3_600_000);
  const m = Math.floor((abs % 3_600_000) / 60_000);
  const s = Math.floor((abs % 60_000) / 1000);

  return (
    <Card className={past ? "border-emerald-500/40" : "border-amber-500/40"}>
      <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-md ${
              past
                ? "bg-emerald-500/15 text-emerald-600"
                : "bg-rose-500/15 text-rose-600"
            }`}
          >
            {past ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              {tr(titleKey)}
            </div>
            <div className="text-sm font-medium">
              {past ? tr(liveKey) : tr(embargoKey)}
            </div>
            <div className="text-xs text-muted-foreground">{tr(dateKey)}</div>
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

function CountdownRow() {
  const tr = useT();
  const groups: Array<{
    key: "cat_pure_online" | "cat_hybrid_retail" | "cat_physical_stores" | "cat_telco" | "cat_marketplace" | "cat_regional_retailer";
    items: Array<{ name: string; sellerNote?: string }>;
  }> = [
    { key: "cat_pure_online", items: [{ name: "Amazon" }, { name: "Kabum" }, { name: "Mercado Livre" }, { name: "Webfones" }] },
    { key: "cat_hybrid_retail", items: [{ name: "Magazine Luiza" }] },
    { key: "cat_physical_stores", items: [{ name: "Carrefour" }, { name: "Sam's Club" }, { name: "Lasa" }] },
    { key: "cat_telco", items: [{ name: "TIM" }, { name: "Vivo" }] },
    { key: "cat_marketplace", items: [
      { name: "Casas Bahia", sellerNote: "Game Play Fulfillment" },
      { name: "Shopee", sellerNote: "Webfones" },
    ] },
    { key: "cat_regional_retailer", items: [{ name: "Havan" }, { name: "Gazin" }, { name: "Bemol" }] },
  ];
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[45%_55%]">
      <CountdownCard
        targetIso={RELEASE_DATE_ISO}
        titleKey="release_official"
        liveKey="release_live"
        embargoKey="release_countdown"
        dateKey="release_date_label"
      />
      <Card className="border-sky-500/70">
        <CardHeader className="px-4 pb-1 pt-2">
          <CardTitle className="flex items-center gap-2 text-sm tracking-wider">{tr("mapped_retailers_title")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-x-10 gap-y-0.5 p-4 pt-0 sm:grid-cols-[60%_40%]">
          {groups.map((g) => (
            <div key={g.key} className="flex items-baseline gap-2 min-w-0">
              <span className="w-28 shrink-0 text-xs font-medium tracking-wider text-muted-foreground">
                {tr(g.key)}
              </span>
              <span className="flex-1 truncate text-xs text-muted-foreground" title={g.items.map(i => i.sellerNote ? `${i.name} (${i.sellerNote})` : i.name).join(" • ")}>
                {g.items.map((it, idx) => (
                  <span key={it.name}>
                    {it.name}{it.sellerNote ? ` (${it.sellerNote})` : ""}
                    {idx < g.items.length - 1 && <span className="text-muted-foreground/50"> • </span>}
                  </span>
                ))}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
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

function PsIcon({ className = "" }: { className?: string; style?: React.CSSProperties }) {
  // Official PlayStation logo, rendered in pure white via filter
  return (
    <img
      src={psLogo}
      alt="PlayStation"
      className={`object-contain object-left ${className}`}
      style={{ filter: "brightness(0) invert(1)" }}
      draggable={false}
    />
  );
}

function Header({ data }: { data: DashboardData }) {
  const { product } = data;
  const { theme } = useContext(ThemeCtx);
  const t = useT();
  const minAvista = Math.round(product.srp_cents * (1 - product.max_discount_avista_pct / 100));
  const isWlv = theme === "wolverine";
  const lastSyncLabel = new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return (
    <header
      className="relative overflow-hidden border-b"
      style={{
        background: isWlv
          ? "linear-gradient(135deg, #0a0a0a, #161616)"
          : "linear-gradient(135deg, #1a1a3a, #2a4ab8)",
      }}
    >
      {/* Theme photographic backdrop */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `url(${isWlv ? wolverineHero : psBg})`,
          backgroundSize: "cover",
          backgroundPosition: isWlv ? "right center" : "center",
          opacity: isWlv ? 0.22 : 0.85,
        }}
      />
      {/* Legibility gradient over the photo */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: isWlv
            ? "linear-gradient(90deg, rgba(8,8,8,0.92) 0%, rgba(8,8,8,0.55) 45%, rgba(8,8,8,0.05) 100%)"
            : "linear-gradient(90deg, rgba(20,22,55,0.78) 0%, rgba(20,22,55,0.35) 45%, rgba(20,22,55,0.05) 100%)",
        }}
      />

      <div className="relative mx-auto w-full max-w-[1600px] px-6 py-6 text-white lg:px-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-4">
              <div className="flex w-[44px] justify-start md:w-[52px]">
                <PsIcon className="h-auto w-full" />
              </div>
              <div
                className="text-2xl font-light uppercase tracking-[0.32em] text-white md:text-3xl"
              >
                Launch Tracking
              </div>
            </div>
            <div className="flex items-end gap-4">
              <div className="flex w-[68px] justify-start md:w-[80px]">
                <img
                  src={wolverineCover}
                  alt="Capa Wolverine PS5"
                  className="h-16 w-auto rounded-sm shadow-md ring-1 ring-border md:h-20"
                  draggable={false}
                />
              </div>
              <div>
                <h1
                  className="text-4xl font-black tracking-tight md:text-6xl"
                  style={{
                    fontFamily: "system-ui, sans-serif",
                    letterSpacing: "-0.02em",
                    lineHeight: 1,
                    color: isWlv ? "#f5c842" : "#7ec8ff",
                  }}
                >
                  Wolverine
                </h1>
                <p className="mt-2 text-sm text-white/75">
                  EAN <span className="font-mono">{product.ean}</span> · SKU{" "}
                  <span className="font-mono">1000052329</span> · {t("srp")}{" "}
                  <strong className="text-white">{brl(product.srp_cents)}</strong>
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-10 [&_button.text-muted-foreground]:!text-white/60 [&_button.font-semibold]:!text-white [&_span]:!text-white/40">
              <LangToggle />
              <ThemeToggle />
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3" /> Last sync {lastSyncLabel}
              </Badge>
            </div>

          </div>
        </div>

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
  label,
  value,
  hint,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
          <p className="text-sm text-muted-foreground">Tudo conforme.</p>
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
        <CardTitle className="flex items-center gap-2"> Menções nas redes & fóruns
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
        <CardTitle className="flex items-center gap-2"> Sellers 3P autorizados
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
function is1P(sellerName: string, retailerName: string): boolean {
  if (/\(1P\)/i.test(sellerName)) return true;
  if (retailerName === "Amazon" && /^Amazon/i.test(sellerName)) return true;
  return false;
}

function MarketplacePanel() {
  // Ranking global cross-plataforma (todos sellers)
  const allSellers = marketplaceMock.flatMap((r) =>
    r.sellers.map((s) => ({ ...s, retailer_name: r.retailer_name, retailer_id: r.retailer_id })),
  );
  const ranked = [...allSellers].sort((a, b) => a.price_avista_cents - b.price_avista_cents);

  // Sellers x preço médio por plataforma
  const scatterData = marketplaceMock.map((r) => {
    const avg = Math.round(
      r.sellers.reduce((a, s) => a + s.price_avista_cents, 0) / r.sellers.length / 100,
    );
    const min = Math.min(...r.sellers.map((s) => s.price_avista_cents)) / 100;
    return {
      retailer: r.retailer_name,
      sellers: r.total_sellers,
      avg_price: avg,
      min_price: Math.round(min),
      unauthorized: r.unauthorized_count,
    };
  });

  // 1P vs 3P por varejista — usa os sellers do mock para inferir presença/preço de cada categoria
  const firstThirdData = marketplaceMock.map((r) => {
    const oneP = r.sellers.filter((s) => is1P(s.seller, r.retailer_name));
    const threeP = r.sellers.filter((s) => !is1P(s.seller, r.retailer_name));
    const avg = (arr: typeof r.sellers) =>
      arr.length
        ? Math.round(arr.reduce((a, s) => a + s.price_avista_cents, 0) / arr.length / 100)
        : 0;
    return {
      retailer: r.retailer_name,
      "1P": oneP.length,
      "3P": threeP.length,
      avg_1p: avg(oneP),
      avg_3p: avg(threeP),
    };
  });
  const total1P = firstThirdData.reduce((a, r) => a + r["1P"], 0);
  const total3P = firstThirdData.reduce((a, r) => a + r["3P"], 0);

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

      {/* Grid: ranking global + gráfico */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base"> Ranking global de sellers (todas plataformas)
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              menor preço primeiro — útil para identificar onde está a pressão de preço
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-2">#</th>
                    <th className="py-2 pr-2">Seller</th>
                    <th className="py-2 pr-2">Plataforma</th>
                    <th className="py-2 pr-2 text-right">À vista</th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.slice(0, 10).map((s, i) => (
                    <tr key={`${s.retailer_id}-${s.seller}`} className="border-t">
                      <td className="py-1.5 pr-2 font-bold text-muted-foreground">{i + 1}</td>
                      <td className="py-1.5 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{s.seller}</span>
                          {!s.authorized && (
                            <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 text-[10px]">
                              não autorizado
                            </Badge>
                          )}
                          {s.is_buybox && (
                            <Trophy className="h-3 w-3 text-amber-500" />
                          )}
                        </div>
                      </td>
                      <td className="py-1.5 pr-2 text-xs text-muted-foreground">
                        {s.retailer_name}
                      </td>
                      <td className="py-1.5 pr-2 text-right tabular-nums font-semibold">
                        {brl(s.price_avista_cents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base"> Sellers por plataforma vs preço médio
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              barra = quantidade de sellers · linha = preço médio à vista (R$)
            </p>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={scatterData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="retailer" className="text-xs" />
                <YAxis yAxisId="left" className="text-xs" />
                <YAxis yAxisId="right" orientation="right" className="text-xs" />
                <Tooltip />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="sellers"
                  name="Sellers ativos"
                  stroke="var(--chart-2)"
                  strokeWidth={2}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="avg_price"
                  name="Preço médio (R$)"
                  stroke="var(--primary)"
                  strokeWidth={2}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="min_price"
                  name="Menor preço (R$)"
                  stroke="var(--chart-3)"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 1P vs 3P por varejista */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base"> 1P vs 3P por varejista
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                1P = venda direta do varejista · 3P = sellers do marketplace. Ajuda a
                identificar onde a operação do próprio varejo concorre (ou não) com 3Ps.
              </p>
            </div>
            <div className="flex gap-2 text-xs">
              <Badge className="border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                {total1P} sellers 1P
              </Badge>
              <Badge className="border-sky-500/30 bg-sky-500/15 text-sky-700 dark:text-sky-400">
                {total3P} sellers 3P
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="h-72 lg:col-span-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={firstThirdData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="retailer" className="text-xs" />
                  <YAxis className="text-xs" allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="1P" name="1P (varejista)" stackId="a" fill="var(--chart-2)" />
                  <Bar dataKey="3P" name="3P (sellers)" stackId="a" fill="var(--chart-3)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-2">Varejista</th>
                    <th className="py-2 pr-2 text-right">1P</th>
                    <th className="py-2 pr-2 text-right">3P</th>
                    <th className="py-2 pr-2 text-right">À vista (1P)</th>
                    <th className="py-2 pr-2 text-right">À vista (3P médio)</th>
                  </tr>
                </thead>
                <tbody>
                  {firstThirdData.map((row) => (
                    <tr key={row.retailer} className="border-t">
                      <td className="py-1.5 pr-2 font-medium">{row.retailer}</td>
                      <td className="py-1.5 pr-2 text-right tabular-nums">{row["1P"]}</td>
                      <td className="py-1.5 pr-2 text-right tabular-nums">{row["3P"]}</td>
                      <td className="py-1.5 pr-2 text-right tabular-nums">
                        {row.avg_1p ? `R$ ${row.avg_1p}` : "—"}
                      </td>
                      <td className="py-1.5 pr-2 text-right tabular-nums">
                        {row.avg_3p ? `R$ ${row.avg_3p}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
          <CardTitle className="flex items-center gap-2 text-lg"> {r.retailer_name}
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
          <CardTitle className="flex items-center gap-2"> Cupons ativos agora
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

// ===================== Overview (resumo do tudo) =====================
function OverviewSummary({ data, onNavigate }: { data: DashboardData; onNavigate: (tab: string) => void }) {
  const tr = useT();
  const latest = useLatestPerListing(data);
  const total = latest.length;
  const counts = latest.reduce(
    (acc, s) => {
      acc[statusTone[s.status as PriceStatus]]++;
      return acc;
    },
    { green: 0, yellow: 0, red: 0 } as Record<"green" | "yellow" | "red", number>,
  );
  const prices = latest.map((s) => s.price_avista_cents).filter((v): v is number => v != null);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const avgPrice = prices.length
    ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
    : 0;
  const minSeller = latest.find((s) => s.price_avista_cents === minPrice);
  const maxSeller = latest.find((s) => s.price_avista_cents === maxPrice);
  const minRetailer = data.retailers.find((r) => r.id === minSeller?.retailer_id);
  const maxRetailer = data.retailers.find((r) => r.id === maxSeller?.retailer_id);
  const piso = Math.round(
    data.product.srp_cents * (1 - data.product.max_discount_avista_pct / 100),
  );

  const totalSellers = marketplaceMock.reduce((a, m) => a + m.total_sellers, 0);
  const unauthorizedSellers = marketplaceMock.reduce((a, m) => a + m.unauthorized_count, 0);
  const presaleListings = latest.filter((s) => s.is_presale).length;
  const activeCoupons = couponsMock.filter((c) => c.active);
  const violatingCoupons = activeCoupons.filter((c) => c.triggers_map_violation);
  const last7dCoupons = couponsMock.filter(
    (c) => Date.now() - new Date(c.starts_at).getTime() < 7 * 24 * 3600_000,
  );

  const topTrends = [...trendsMock].sort((a, b) => b.delta_7d_pct - a.delta_7d_pct);
  const topMentions = data.mentions.slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <HeroKpi
          label={tr("kpi_listings")}
          value={String(total)}
          sub={`${data.retailers.length} ${tr("kpi_retailers")} · ${totalSellers} ${tr("kpi_sellers")}`}
          icon={<TrendingUp className="h-4 w-4" />}
          accent
          onClick={() => onNavigate("marketplace")}
        />
        <HeroKpi
          label={tr("kpi_violations")}
          value={String(counts.red)}
          sub={`${counts.yellow} ${tr("in_attention")} · ${counts.green} ${tr("ok_short")} · ${tr("click_for_details")}`}
          icon={<AlertTriangle className="h-4 w-4" />}
          danger
          onClick={() => onNavigate("violations")}
        />
        <HeroKpi
          label={tr("pressure_low")}
          value={brl(minPrice)}
          sub={
            minSeller
              ? `${minRetailer?.name ?? "?"} · ${minSeller.seller_name ?? "1P"}`
              : "—"
          }
          icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
          onClick={() => onNavigate("marketplace")}
        />
        <HeroKpi
          label={tr("kpi_avg_price")}
          value={brl(avgPrice)}
          sub={`${tr("highest")}: ${brl(maxPrice)} (${maxRetailer?.name ?? "?"})`}
          icon={<Tag className="h-4 w-4" />}
          onClick={() => onNavigate("history")}
        />
      </div>







      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ClickCard onClick={() => onNavigate("violations")}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wider"> {tr("compliance")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ConfBar
              label={tr("in_presale")}
              value={presaleListings}
              total={total}
              tone={data.product.presale_allowed ? "green" : "red"}
              hint={data.product.presale_allowed ? tr("permitted") : tr("embargoed")}
            />
            <ConfBar
              label={tr("below_floor")}
              value={latest.filter((s) => (s.price_avista_cents ?? Infinity) < piso).length}
              total={total}
              tone="red"
              hint={`${tr("floor")} ${brl(piso)}`}
            />
            <ConfBar
              label={tr("above_srp")}
              value={latest.filter((s) => (s.price_avista_cents ?? 0) > data.product.srp_cents).length}
              total={total}
              tone="red"
              hint={`${tr("srp")} ${brl(data.product.srp_cents)}`}
            />
            <ConfBar
              label={tr("unauthorized_sellers")}
              value={unauthorizedSellers}
              total={totalSellers}
              tone="yellow"
              hint={tr("no_permission_3p")}
            />
          </CardContent>
        </ClickCard>

        <ClickCard onClick={() => onNavigate("marketplace")}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wider"> {tr("sellers_by_marketplace")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {marketplaceMock.map((m) => (
              <div key={m.retailer_id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{m.retailer_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {m.total_sellers} {tr("kpi_sellers")} · {m.authorized_count} {tr("ok_short")}
                  </span>
                </div>
                <div className="flex h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="bg-emerald-500"
                    style={{ width: `${(m.authorized_count / m.total_sellers) * 100}%` }}
                  />
                  <div
                    className="bg-rose-500"
                    style={{ width: `${(m.unauthorized_count / m.total_sellers) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </ClickCard>

        <ClickCard onClick={() => onNavigate("coupons")}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wider"> {tr("coupons")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <MiniStat n={activeCoupons.length} l={tr("active_today")} tone="green" />
              <MiniStat n={violatingCoupons.length} l={tr("violate_map")} tone="red" />
              <MiniStat n={last7dCoupons.length} l={tr("last_7d")} tone="neutral" />
            </div>
            <ul className="space-y-1.5 text-sm">
              {activeCoupons.slice(0, 4).map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between rounded-md border bg-card/50 px-2 py-1"
                >
                  <span className="flex items-center gap-2">
                    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                      {c.code}
                    </code>
                    <span className="text-xs text-muted-foreground">{c.retailer_name}</span>
                  </span>
                  <span
                    className={`text-[11px] ${
                      c.triggers_map_violation ? "text-rose-500" : "text-emerald-600"
                    }`}
                  >
                    {c.discount_pct ? `-${c.discount_pct}%` : brl(c.discount_cents ?? 0)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </ClickCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ClickCard onClick={() => onNavigate("marketplace")} className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wider"> {tr("pressure_title")}
            </CardTitle>
            <p className="mt-1 text-xs font-normal normal-case text-muted-foreground">
              {tr("most_aggressive_subtitle")}
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {[...latest]
                .filter((s) => s.price_avista_cents != null)
                .sort((a, b) => (a.price_avista_cents ?? 0) - (b.price_avista_cents ?? 0))
                .slice(0, 8)
                .map((s, i) => {
                  const retailer = data.retailers.find((r) => r.id === s.retailer_id);
                  const tone = statusTone[s.status as PriceStatus];
                  const range = maxPrice - minPrice || 1;
                  const w = ((s.price_avista_cents! - minPrice) / range) * 100;
                  return (
                    <div key={s.id} className="grid grid-cols-[20px_1fr_auto] items-center gap-3">
                      <span className="text-xs font-bold text-muted-foreground">{i + 1}</span>
                      <div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium">{retailer?.name ?? "?"}</span>
                          <span className="text-xs text-muted-foreground">
                            {s.is_first_party ? "1P" : `· ${s.seller_name ?? "?"}`}
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full ${
                              tone === "red"
                                ? "bg-rose-500"
                                : tone === "yellow"
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                            }`}
                            style={{ width: `${Math.max(8, 100 - w)}%` }}
                          />
                        </div>
                      </div>
                      <span className="tabular-nums font-semibold">
                        {brl(s.price_avista_cents)}
                      </span>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </ClickCard>

        <ClickCard onClick={() => onNavigate("trends")}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wider"> {tr("trends_7d")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topTrends.map((t) => (
              <div
                key={t.source}
                className="flex items-center justify-between rounded-md border bg-card/50 px-3 py-2"
              >
                <div>
                  <div className="text-sm font-medium">{t.source_name}</div>
                  <div className="text-xs text-muted-foreground">{tr("index_score_label")} · {t.current_score}/100</div>
                </div>
                <div
                  className={`text-sm font-semibold ${
                    t.delta_7d_pct >= 0 ? "text-emerald-600" : "text-rose-500"
                  }`}
                >
                  {t.delta_7d_pct >= 0 ? "▲" : "▼"} {t.delta_7d_pct.toFixed(0)}%
                </div>
              </div>
            ))}
          </CardContent>
        </ClickCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ClickCard onClick={() => onNavigate("violations")}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wider"> {tr("violations_highlight")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const bad = latest
                .filter((s) => statusTone[s.status as PriceStatus] === "red")
                .slice(0, 5);
              if (bad.length === 0)
                return (
                  <p className="text-sm text-muted-foreground">
                    {tr("all_clear_keep_watch")}
                  </p>
                );
              return (
                <ul className="space-y-2 text-sm">
                  {bad.map((s) => {
                    const r = data.retailers.find((x) => x.id === s.retailer_id);
                    return (
                      <li
                        key={s.id}
                        className="flex items-start justify-between gap-3 rounded-md border border-rose-500/20 bg-rose-500/5 p-2"
                      >
                        <div>
                          <div className="font-medium">
                            {r?.name} · {s.seller_name ?? "1P"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {statusLabel[s.status as PriceStatus]} · {brl(s.price_avista_cents)}
                          </div>
                        </div>
                        {s.product_url ? (
                          <a href={s.product_url} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                          </a>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              );
            })()}
          </CardContent>
        </ClickCard>

        <ClickCard onClick={() => onNavigate("social")}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wider"> {tr("social_highlight")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topMentions.length === 0 ? (
              <p className="text-sm text-muted-foreground">{tr("no_mentions_yet")}</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {topMentions.map((m) => (
                  <li key={m.id} className="rounded-md border bg-card/50 p-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {m.source_name ?? m.source} · {m.author ?? "—"}
                      </span>
                      {m.engagement ? <span>{m.engagement.toLocaleString()} eng.</span> : null}
                    </div>
                    <div className="mt-1 font-medium">{m.title ?? "—"}</div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </ClickCard>
      </div>

    </div>
  );
}

function HeroKpi({
  label,
  value,
  sub,
  accent,
  danger,
  onClick,
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: React.ReactNode;
  accent?: boolean;
  danger?: boolean;
  onClick?: () => void;
}) {
  const clickable = !!onClick;
  return (
    <Card
      onClick={onClick}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={(e) => {
        if (clickable && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={`claw-cut relative overflow-hidden ${
        clickable ? "cursor-pointer transition hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring" : ""
      }`}
      style={
        accent
          ? { background: "var(--accent-gradient)", color: "var(--primary-foreground)" }
          : danger
            ? { borderColor: "oklch(0.6 0.24 27 / 0.4)" }
            : undefined
      }
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider opacity-80">
          {label}
        </div>
        <div className="mt-2 text-3xl font-black tabular-nums">{value}</div>
        {sub ? <div className="mt-1 text-xs opacity-75">{sub}</div> : null}
      </CardContent>
    </Card>
  );
}

function ConfBar({
  label,
  value,
  total,
  tone,
  hint,
}: {
  label: string;
  value: number;
  total: number;
  tone: "green" | "yellow" | "red";
  hint?: string;
}) {
  const pctv = total ? (value / total) * 100 : 0;
  const color = tone === "red" ? "bg-rose-500" : tone === "yellow" ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="tabular-nums">
          <strong>{value}</strong>
          <span className="text-muted-foreground">/{total}</span>
          {hint ? <span className="ml-2 text-xs text-muted-foreground">· {hint}</span> : null}
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${color}`} style={{ width: `${pctv}%` }} />
      </div>
    </div>
  );
}

function MiniStat({ n, l, tone }: { n: number; l: string; tone: "green" | "red" | "neutral" }) {
  const color =
    tone === "red"
      ? "text-rose-500"
      : tone === "green"
        ? "text-emerald-600"
        : "text-foreground";
  return (
    <div className="rounded-md border bg-card/50 p-2">
      <div className={`text-xl font-bold tabular-nums ${color}`}>{n}</div>
      <div className="text-[10px] uppercase text-muted-foreground">{l}</div>
    </div>
  );
}

function ClickCard({
  onClick,
  className = "",
  children,
}: {
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  const clickable = !!onClick;
  return (
    <Card
      onClick={onClick}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={(e) => {
        if (clickable && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={`claw-cut ${
        clickable
          ? "cursor-pointer transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring"
          : ""
      } ${className}`}
    >
      {children}
    </Card>
  );
}
