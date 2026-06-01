import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, useEffect, useContext, createContext } from "react";
import { useAuth } from "@/lib/auth-context";
import { Shield, LogOut } from "lucide-react";
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
  LabelList,
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
  Search,
} from "lucide-react";

import { fetchDashboard, type DashboardData, type RetailerCategoryKey } from "@/lib/dashboard-data";


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
import { ListingsPanel } from "@/components/admin/ListingsPanel";




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
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" });
  }, [user, authLoading, navigate]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["wolverine-dashboard"],
    queryFn: fetchDashboard,
    refetchInterval: 60_000,
    enabled: !!user,
  });

  if (authLoading || !user || isLoading) {
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






function UserMenu() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;
  return (
    <div className="flex items-center gap-2 text-white/90 text-xs">
      <span className="hidden md:inline opacity-70">{user.email}</span>
      {isAdmin && (
        <Link to="/admin" className="inline-flex items-center gap-1 rounded-md border border-white/30 px-2 py-1 hover:bg-white/10">
          <Shield className="h-3.5 w-3.5" /> Admin
        </Link>
      )}
      <button
        onClick={async () => { await signOut(); navigate({ to: "/login" }); }}
        className="inline-flex items-center gap-1 rounded-md border border-white/30 px-2 py-1 hover:bg-white/10"
      >
        <LogOut className="h-3.5 w-3.5" /> Sign out
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
        <CountdownRow data={data} />
        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 md:w-auto md:grid-cols-8">
            <TabsTrigger value="overview">{t("tab_overview")}</TabsTrigger>
            <TabsTrigger value="listings">{t("tab_listings")}</TabsTrigger>
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
          <TabsContent value="listings">
            <ListingsPanel />
          </TabsContent>
          <TabsContent value="marketplace">
            <MarketplacePanel data={data} />
          </TabsContent>
          <TabsContent value="coupons">
            <CouponsPanel data={data} />
          </TabsContent>
          <TabsContent value="trends">
            <TrendsPanel data={data} />
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
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            {tr(titleKey)}
          </div>
          <div className="text-sm font-medium">
            {past ? tr(liveKey) : tr(embargoKey)}
          </div>
          <div className="text-xs text-muted-foreground">{tr(dateKey)}</div>
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

function CountdownRow({ data }: { data: DashboardData }) {
  const tr = useT();
  const categoryLabel: Record<RetailerCategoryKey, "cat_pure_online" | "cat_hybrid_retail" | "cat_physical_stores" | "cat_telco" | "cat_marketplace" | "cat_regional_retailer"> = {
    pure_online: "cat_pure_online",
    hybrid_retail: "cat_hybrid_retail",
    physical_stores: "cat_physical_stores",
    telco: "cat_telco",
    marketplace: "cat_marketplace",
    regional_retailer: "cat_regional_retailer",
  };
  const order: RetailerCategoryKey[] = [
    "pure_online",
    "hybrid_retail",
    "physical_stores",
    "telco",
    "marketplace",
    "regional_retailer",
  ];
  const grouped = order
    .map((cat) => ({
      cat,
      items: data.retailers.filter((r) => r.category === cat),
    }))
    .filter((g) => g.items.length > 0);

  const releaseIso = data.product.release_date
    ? new Date(data.product.release_date + "T03:00:00.000Z").toISOString()
    : null;

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[45%_55%]">
      {releaseIso ? (
        <CountdownCard
          targetIso={releaseIso}
          titleKey="release_official"
          liveKey="release_live"
          embargoKey="release_countdown"
          dateKey="release_date_label"
        />
      ) : (
        <Card className="border-dashed border-amber-500/40">
          <CardContent className="p-4 text-sm text-muted-foreground">
            Data de lançamento ainda não configurada. Configure em <code>/admin → Configurações</code>.
          </CardContent>
        </Card>
      )}
      <Card className="border-sky-500/70">
        <CardHeader className="px-4 pb-1 pt-2">
          <CardTitle className="flex items-center gap-2 text-sm tracking-wider">{tr("mapped_retailers_title")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-x-10 gap-y-0.5 p-4 pt-0 sm:grid-cols-[60%_40%]">
          {grouped.length === 0 ? (
            <span className="text-xs text-muted-foreground">Nenhuma loja categorizada ainda.</span>
          ) : grouped.map((g) => (
            <div key={g.cat} className="flex items-baseline gap-2 min-w-0">
              <span className="w-28 shrink-0 text-xs font-medium tracking-wider text-muted-foreground">
                {tr(categoryLabel[g.cat])}
              </span>
              <span className="flex-1 truncate text-xs text-muted-foreground" title={g.items.map((i) => i.name).join(" • ")}>
                {g.items.map((it, idx) => (
                  <span key={it.id}>
                    {it.name}
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
              <UserMenu />
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
  const [mode, setMode] = useState<"avista" | "prazo">("avista");
  const [party, setParty] = useState<"all" | "1p" | "3p">("all");

  const slots = Array.from(new Set(data.snapshots.map((s) => s.captured_at))).sort();
  const retailers = data.retailers;

  const palette = [
    "hsl(210 90% 55%)", "hsl(142 71% 45%)", "hsl(0 72% 51%)", "hsl(38 92% 50%)",
    "hsl(280 70% 55%)", "hsl(170 70% 40%)", "hsl(330 75% 55%)", "hsl(20 85% 55%)",
    "hsl(190 75% 45%)", "hsl(260 60% 55%)", "hsl(100 50% 45%)", "hsl(350 70% 55%)",
    "hsl(50 90% 50%)", "hsl(220 60% 45%)", "hsl(160 60% 35%)",
  ];

  const seriesKeys = Array.from(
    new Set(
      data.snapshots
        .filter((s) => party === "all" || (s.is_first_party ? "1p" : "3p") === party)
        .map((s) => `${s.retailer_id}::${s.is_first_party ? "1p" : "3p"}`)
    )
  );

  const lines = seriesKeys
    .map((key) => {
      const [retailerId, p] = key.split("::") as [string, "1p" | "3p"];
      const retailer = retailers.find((r) => r.id === retailerId);
      if (!retailer) return null;
      const colorIdx = retailers.findIndex((r) => r.id === retailerId);
      return {
        key: `${retailer.slug}_${p}`,
        retailerId,
        party: p,
        name: party === "all" ? `${retailer.name} · ${p.toUpperCase()}` : retailer.name,
        color: palette[colorIdx % palette.length],
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);

  const series = slots.map((iso) => {
    const row: Record<string, number | string | null> = {
      label: new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }),
    };
    for (const l of lines) {
      const snap = data.snapshots.find(
        (s) => s.captured_at === iso && s.retailer_id === l.retailerId && (s.is_first_party ? "1p" : "3p") === l.party
      );
      const cents = snap ? (mode === "avista" ? snap.price_avista_cents : snap.price_full_cents) : null;
      row[l.key] = cents != null ? Math.round(cents / 100) : null;
    }
    return row;
  });

  const partyOptions: { v: typeof party; l: string }[] = [
    { v: "all", l: "todos" },
    { v: "1p", l: "1P" },
    { v: "3p", l: "3P" },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    return (
      <div className="rounded-lg border bg-background p-3 shadow-md">
        <p className="mb-2 text-xs font-semibold text-foreground">{label}</p>
        <div className="space-y-1.5">
          {payload.map((entry: any) => (
            <div key={entry.dataKey} className="flex items-center gap-2 text-xs">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{entry.name}</span>
              <span className="ml-auto font-semibold text-foreground">
                {brl(entry.value * 100)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle>Preço mapeado por varejista</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">Coletas diárias mantidas no histórico</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-md border bg-muted/40 p-0.5 text-xs">
            {partyOptions.map((opt) => (
              <button
                key={opt.v}
                onClick={() => setParty(opt.v)}
                className={`rounded px-3 py-1 transition ${party === opt.v ? "bg-background font-semibold shadow-sm" : "text-muted-foreground"}`}
              >
                {opt.l}
              </button>
            ))}
          </div>
          <div className="flex rounded-md border bg-muted/40 p-0.5 text-xs">
            <button
              onClick={() => setMode("avista")}
              className={`rounded px-3 py-1 transition ${mode === "avista" ? "bg-background font-semibold shadow-sm" : "text-muted-foreground"}`}
            >
              à vista
            </button>
            <button
              onClick={() => setMode("prazo")}
              className={`rounded px-3 py-1 transition ${mode === "prazo" ? "bg-background font-semibold shadow-sm" : "text-muted-foreground"}`}
            >
              a prazo
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="h-[420px]">
        {series.length === 0 || lines.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem histórico suficiente ainda.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 12, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis
                tick={{ fontSize: 11 }}
                width={50}
                domain={[300, 420]}
                ticks={[300, 320, 340, 360, 380, 400, 420]}
                tickFormatter={(v) => `R$${v}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {lines.map((l) => (
                <Line
                  key={l.key}
                  type="monotone"
                  dataKey={l.key}
                  name={l.name}
                  stroke={l.color}
                  strokeWidth={2}
                  strokeDasharray={party === "all" && l.party === "3p" ? "5 4" : undefined}
                  dot={{ r: 3, strokeWidth: 2, fill: "transparent" }}
                  activeDot={{ r: 5, fill: "transparent", strokeWidth: 2 }}
                  connectNulls
                />
              ))}
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



type MarketplaceListing = {
  id: string;
  retailer_id: string;
  retailer_name: string;
  seller_name: string;
  is_first_party: boolean;
  authorized: boolean;
  price_avista_cents: number;
  price_full_cents: number | null;
  installments: string;
  product_url: string | null;
  status: string;
  captured_at: string;
};

function useMarketplaceListings(data: DashboardData): MarketplaceListing[] {
  const latest = useLatestPerListing(data);
  return useMemo(() => {
    const authMap = new Map<string, Set<string>>();
    for (const a of data.authorizedSellers) {
      const s = authMap.get(a.retailer_id) ?? new Set<string>();
      s.add(a.seller_name.toLowerCase().trim());
      authMap.set(a.retailer_id, s);
    }
    return latest
      .filter((s) => s.price_avista_cents != null)
      .map((s) => {
        const retailer = data.retailers.find((r) => r.id === s.retailer_id);
        const sellerName = s.is_first_party
          ? retailer?.name ?? "1P"
          : s.seller_name ?? "—";
        const authorized = s.is_first_party
          ? true
          : authMap.get(s.retailer_id)?.has((s.seller_name ?? "").toLowerCase().trim()) ?? false;
        const inst =
          s.installment_count && s.installment_value_cents
            ? `${s.installment_count}x ${brl(s.installment_value_cents)}`
            : "—";
        return {
          id: s.id,
          retailer_id: s.retailer_id,
          retailer_name: retailer?.name ?? "—",
          seller_name: sellerName,
          is_first_party: s.is_first_party,
          authorized,
          price_avista_cents: s.price_avista_cents!,
          price_full_cents: s.price_full_cents,
          installments: inst,
          product_url: s.product_url,
          status: s.status,
          captured_at: s.captured_at,
        };
      });
  }, [latest, data.authorizedSellers, data.retailers]);
}

function MarketplacePanel({ data }: { data: DashboardData }) {
  const listings = useMarketplaceListings(data);
  const ranked = [...listings].sort((a, b) => a.price_avista_cents - b.price_avista_cents);

  const byRetailer = useMemo(() => {
    const m = new Map<string, MarketplaceListing[]>();
    for (const l of listings) {
      const arr = m.get(l.retailer_id) ?? [];
      arr.push(l);
      m.set(l.retailer_id, arr);
    }
    return m;
  }, [listings]);

  const scatterData = data.retailers
    .map((r) => {
      const items = byRetailer.get(r.id) ?? [];
      if (items.length === 0) return null;
      const prices = items.map((i) => i.price_avista_cents);
      return {
        retailer: r.name,
        sellers: items.length,
        avg_price: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length / 100),
        min_price: Math.round(Math.min(...prices) / 100),
        unauthorized: items.filter((i) => !i.authorized).length,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const firstThirdData = data.retailers
    .map((r) => {
      const items = byRetailer.get(r.id) ?? [];
      if (items.length === 0) return null;
      const oneP = items.filter((i) => i.is_first_party);
      const threeP = items.filter((i) => !i.is_first_party);
      const avg = (arr: MarketplaceListing[]) =>
        arr.length ? Math.round(arr.reduce((a, s) => a + s.price_avista_cents, 0) / arr.length / 100) : 0;
      return {
        retailer: r.name,
        "1P": oneP.length,
        "3P": threeP.length,
        avg_1p: avg(oneP),
        avg_3p: avg(threeP),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
  const total1P = firstThirdData.reduce((a, r) => a + r["1P"], 0);
  const total3P = firstThirdData.reduce((a, r) => a + r["3P"], 0);
  const totalUnauthorized = listings.filter((l) => !l.authorized).length;

  if (listings.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          Sem coletas de preço ainda. Configure URLs em <strong>Admin → Anúncios</strong> e rode a coleta.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 p-4 text-sm">
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
            {listings.length} ofertas coletadas
          </Badge>
          <Badge className="bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30">
            {total1P} 1P · {total3P} 3P
          </Badge>
          {totalUnauthorized > 0 && (
            <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30">
              {totalUnauthorized} sellers não autorizados
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
            Dados reais — uma oferta por URL configurada em Admin → Anúncios.
          </span>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Ranking global de sellers</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              menor preço primeiro — pressão competitiva
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
                  {ranked.slice(0, 12).map((s, i) => (
                    <tr key={s.id} className="border-t">
                      <td className="py-1.5 pr-2 font-bold text-muted-foreground">{i + 1}</td>
                      <td className="py-1.5 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{s.seller_name}</span>
                          {!s.authorized && (
                            <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 text-[10px]">
                              não autorizado
                            </Badge>
                          )}
                          {s.is_first_party && (
                            <Badge variant="outline" className="text-[10px]">1P</Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-1.5 pr-2 text-xs text-muted-foreground">{s.retailer_name}</td>
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
            <CardTitle className="text-base">Sellers por plataforma vs preço médio</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              linha = preço (R$) · contagem = quantidade de ofertas
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
                <Line yAxisId="left" type="monotone" dataKey="sellers" name="Sellers ativos" stroke="var(--chart-2)" strokeWidth={2} />
                <Line yAxisId="right" type="monotone" dataKey="avg_price" name="Preço médio (R$)" stroke="var(--primary)" strokeWidth={2} />
                <Line yAxisId="right" type="monotone" dataKey="min_price" name="Menor preço (R$)" stroke="var(--chart-3)" strokeWidth={2} strokeDasharray="4 4" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <CardTitle className="text-base">1P vs 3P por varejista</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                1P = venda direta do varejista · 3P = sellers do marketplace
              </p>
            </div>
            <div className="flex gap-2 text-xs">
              <Badge className="border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                {total1P} ofertas 1P
              </Badge>
              <Badge className="border-sky-500/30 bg-sky-500/15 text-sky-700 dark:text-sky-400">
                {total3P} ofertas 3P
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

      {data.retailers
        .filter((r) => (byRetailer.get(r.id)?.length ?? 0) > 0)
        .map((r) => (
          <MarketplaceRetailerCardReal
            key={r.id}
            retailerName={r.name}
            items={byRetailer.get(r.id) ?? []}
          />
        ))}
    </div>
  );
}

function MarketplaceRetailerCardReal({
  retailerName,
  items,
}: {
  retailerName: string;
  items: MarketplaceListing[];
}) {
  const sorted = [...items].sort((a, b) => a.price_avista_cents - b.price_avista_cents);
  const cheapest = sorted[0];
  const authorizedCount = items.filter((i) => i.authorized).length;
  const unauthorizedCount = items.length - authorizedCount;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg">{retailerName}</CardTitle>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="outline">{items.length} ofertas</Badge>
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
              {authorizedCount} autorizados
            </Badge>
            {unauthorizedCount > 0 && (
              <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30">
                {unauthorizedCount} não autorizados
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {cheapest && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-amber-700 dark:text-amber-400">
              <Trophy className="h-3.5 w-3.5" /> Oferta mais barata
            </div>
            <div className="mt-1 flex items-center gap-2 text-lg font-semibold">
              {cheapest.seller_name}
              {cheapest.is_first_party && <Badge variant="outline" className="text-[10px]">1P</Badge>}
              {!cheapest.authorized && (
                <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30">
                  <XCircle className="mr-1 h-3 w-3" /> não autorizado
                </Badge>
              )}
            </div>
            <div className="text-2xl font-bold tabular-nums">{brl(cheapest.price_avista_cents)}</div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-2 pr-3">Seller</th>
                <th className="py-2 pr-3 text-right">À vista</th>
                <th className="py-2 pr-3">Parcelamento</th>
                <th className="py-2 pr-3">Coletado</th>
                <th className="py-2 pr-3"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((s) => (
                <tr key={s.id} className="border-t">
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-2 font-medium">
                      {s.seller_name}
                      {s.is_first_party && <Badge variant="outline" className="text-[10px]">1P</Badge>}
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
                  <td className="py-2 pr-3 text-right tabular-nums font-semibold">
                    {brl(s.price_avista_cents)}
                  </td>
                  <td className="py-2 pr-3 text-muted-foreground">{s.installments}</td>
                  <td className="py-2 pr-3 text-xs text-muted-foreground">
                    {new Date(s.captured_at).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="py-2 pr-3">
                    {s.product_url ? (
                      <a
                        href={s.product_url}
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
      </CardContent>
    </Card>
  );
}



// ===================== Cupom =====================
function CouponsPanel({ data }: { data: DashboardData }) {
  const coupons = data.coupons;
  const srpCents = data.product.srp_cents;
  const minAvistaCents = Math.round(srpCents * (1 - data.product.max_discount_avista_pct / 100));

  const enriched = coupons.map((c) => {
    const effective = c.discount_value_cents != null
      ? Math.max(0, srpCents - c.discount_value_cents)
      : c.discount_pct != null
      ? Math.round(srpCents * (1 - Number(c.discount_pct) / 100))
      : null;
    const violatesMap = effective != null && effective < minAvistaCents;
    return { ...c, effective_price_cents: effective, violates_map: violatesMap };
  });

  const violating = enriched.filter((c) => c.violates_map);
  const retailers = new Set(enriched.map((c) => c.retailer_name).filter(Boolean));
  const sources = new Set(enriched.map((c) => c.source));
  const lastCapture = enriched[0]?.captured_at;
  const fmtDateTime = (iso?: string) =>
    iso ? new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          icon={<Ticket className="h-4 w-4" />}
          label="Cupons coletados"
          value={String(enriched.length)}
          hint={lastCapture ? `última coleta: ${fmtDateTime(lastCapture)}` : "aguardando coleta"}
        />
        <KpiCard
          icon={<AlertTriangle className="h-4 w-4 text-rose-500" />}
          label="Violam MAP"
          value={String(violating.length)}
          hint={`preço efetivo < ${brl(minAvistaCents)}`}
        />
        <KpiCard
          icon={<Store className="h-4 w-4" />}
          label="Varejistas mencionados"
          value={String(retailers.size)}
        />
        <KpiCard
          icon={<Flame className="h-4 w-4" />}
          label="Fontes"
          value={String(sources.size)}
          hint={[...sources].join(" · ") || "—"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Ticket className="h-4 w-4" /> Cupons agregados (Promobit · Pelando · Cuponomia)
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Coleta automática 2× ao dia (08:00 e 13:00 BRT). Foco Brasil.
          </p>
        </CardHeader>
        <CardContent>
          {enriched.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              Sem cupons ainda — aguardando próxima coleta automática ou clique em "Coletar agora" no Admin.
            </p>
          ) : (
            <CouponTable list={enriched} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

type CouponRow = DashboardData["coupons"][number] & { effective_price_cents: number | null; violates_map: boolean };

function CouponTable({ list }: { list: CouponRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="py-2 pr-3">Varejista</th>
            <th className="py-2 pr-3">Código</th>
            <th className="py-2 pr-3">Descrição</th>
            <th className="py-2 pr-3">Desconto</th>
            <th className="py-2 pr-3">Fonte</th>
            <th className="py-2 pr-3">Preço efetivo</th>
            <th className="py-2 pr-3">MAP</th>
          </tr>
        </thead>
        <tbody>
          {list.map((c) => (
            <tr key={c.id} className="border-t">
              <td className="py-2 pr-3 font-medium">{c.retailer_name ?? "—"}</td>
              <td className="py-2 pr-3">
                {c.code ? (
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">{c.code}</code>
                ) : (
                  <span className="text-xs text-muted-foreground italic">sem código</span>
                )}
              </td>
              <td className="py-2 pr-3 text-muted-foreground max-w-[28ch] truncate" title={c.description ?? c.title}>
                {c.description ?? c.title}
              </td>
              <td className="py-2 pr-3 tabular-nums">
                {c.discount_pct ? `${Number(c.discount_pct).toFixed(0)}%` :
                 c.discount_value_cents ? brl(c.discount_value_cents) : "—"}
              </td>
              <td className="py-2 pr-3">
                {c.source_url ? (
                  <a href={c.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                    {c.source} <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <Badge variant="outline" className="text-[10px] uppercase">{c.source}</Badge>
                )}
              </td>
              <td className="py-2 pr-3 tabular-nums font-semibold">
                {c.effective_price_cents != null ? brl(c.effective_price_cents) : "—"}
              </td>
              <td className="py-2 pr-3">
                {c.effective_price_cents == null ? (
                  <span className="text-xs text-muted-foreground">—</span>
                ) : c.violates_map ? (
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
function TrendsPanel({ data }: { data: DashboardData }) {
  const trends = data.trends;
  const keywordSnaps = data.keywordSuggestions;
  const manualKw = data.manualKeywords.filter((k) => k.active);
  const productLabel = `${data.product.name}${data.product.platform ? " " + data.product.platform : ""}`;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground">
          Google Trends (geo Brasil, últimos 30 dias) + Google Autocomplete. Coleta automática 2× ao dia.
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Tag className="h-4 w-4" /> Palavras-chave monitoradas
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Termos usados em todas as buscas (Reddit, YouTube, Notícias, Trends, Cupons). Edição restrita ao Admin.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">automática (nome do produto)</div>
            <Badge className="font-normal">{productLabel}</Badge>
          </div>
          <div>
            <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
              manuais ({manualKw.length})
            </div>
            {manualKw.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Nenhuma palavra-chave manual cadastrada.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {manualKw.map((k) => (
                  <Badge key={k.id} variant="secondary" className="font-normal">{k.term}</Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>


      {trends.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground italic">
            Sem dados de tendências ainda — aguardando próxima coleta.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {trends.map((t) => (
            <TrendCardReal key={t.id} t={t} />
          ))}
        </div>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="h-4 w-4" /> Sugestões do Google Autocomplete (BR)
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            O que pessoas no Brasil estão digitando depois do nome do produto.
          </p>
        </CardHeader>
        <CardContent>
          {keywordSnaps.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">Sem sugestões ainda — aguardando coleta.</p>
          ) : (
            <div className="space-y-3">
              {keywordSnaps.map((k) => (
                <div key={k.id}>
                  <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
                    seed: <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">{k.seed}</code>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {k.suggestions.slice(0, 12).map((s, i) => (
                      <Badge key={i} variant="secondary" className="font-normal">{s.term}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TrendCardReal({ t }: { t: DashboardData["trends"][number] }) {
  const series = (t.series ?? []).map((p) => ({
    date: p.date,
    value: typeof p.value === "number" ? p.value : Number(p.value) || 0,
  }));
  const peak = t.peak_value ?? (series.length ? Math.max(...series.map((p) => p.value)) : 0);
  const avg = t.avg_value ?? (series.length ? series.reduce((a, p) => a + p.value, 0) / series.length : 0);
  const last = series[series.length - 1]?.value ?? 0;
  const prev = series[Math.max(0, series.length - 8)]?.value ?? last;
  const delta = prev > 0 ? ((last - prev) / prev) * 100 : 0;
  const up = delta >= 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" />
            {t.keyword}
            <Badge variant="outline" className="text-[10px] uppercase">{t.geo}</Badge>
          </span>
          <Badge
            className={up
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
              : "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30"}
          >
            {up ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}% / 7d
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-3">
          <div className="text-3xl font-bold tabular-nums">{Math.round(Number(last))}</div>
          <div className="text-xs text-muted-foreground">
            índice 0–100 · pico {Math.round(Number(peak))} · média {Math.round(Number(avg))}
          </div>
        </div>
        <div className="h-24">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series}>
              <Line type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={2} dot={false} />
              <XAxis dataKey="date" hide />
              <YAxis hide domain={[0, 100]} />
              <Tooltip />
            </LineChart>
          </ResponsiveContainer>
        </div>
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

  // Sellers reais a partir das coletas (uma oferta = um seller por URL)
  const realListings = useMarketplaceListings(data);
  const totalSellers = realListings.length;
  const unauthorizedSellers = realListings.filter((l) => !l.authorized).length;


  // Cupons reais
  const now = Date.now();
  const last7dCoupons = data.coupons.filter(
    (c) => now - new Date(c.captured_at).getTime() < 7 * 24 * 3600_000,
  );
  const activeCoupons = last7dCoupons; // sem expires-at confiável, ativos = últimos 7d
  const violatingCoupons = activeCoupons.filter((c) => {
    const eff = c.discount_value_cents != null
      ? Math.max(0, data.product.srp_cents - c.discount_value_cents)
      : c.discount_pct != null
      ? Math.round(data.product.srp_cents * (1 - Number(c.discount_pct) / 100))
      : null;
    return eff != null && eff < piso;
  });

  // Tendências reais a partir de trends_snapshots (Google Trends)
  const topTrends = data.trends
    .map((t) => {
      const series = t.series ?? [];
      const last = series[series.length - 1]?.value ?? 0;
      const prev = series[Math.max(0, series.length - 8)]?.value ?? last;
      const delta_7d_pct = prev > 0 ? ((last - prev) / prev) * 100 : 0;
      return {
        source: t.id,
        source_name: t.keyword,
        current_score: Math.round(last),
        delta_7d_pct,
      };
    })
    .sort((a, b) => b.delta_7d_pct - a.delta_7d_pct)
    .slice(0, 5);

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
              value={latest.filter((s) => s.is_presale && (s.price_avista_cents ?? Infinity) <= data.product.srp_cents).length}
              tone="green"
              hint={`${tr("within_srp")} · ${brl(data.product.srp_cents)}`}
            />
            <ConfBar
              label={tr("below_floor")}
              value={latest.filter((s) => (s.price_avista_cents ?? Infinity) < piso).length}
              tone="red"
              hint={`${tr("floor")} ${brl(piso)}`}
            />

            <ConfBar
              label={tr("above_srp")}
              value={latest.filter((s) => (s.price_avista_cents ?? 0) > data.product.srp_cents).length}
              tone="yellow"
              hint={`${tr("srp")} ${brl(data.product.srp_cents)}`}
            />
            <ConfBar
              label={tr("unauthorized_sellers")}
              value={unauthorizedSellers}
              tone="red"
              hint={tr("no_permission_3p")}
            />
          </CardContent>
        </ClickCard>

        <ClickCard onClick={() => onNavigate("marketplace")}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wider"> {tr("sellers_by_marketplace")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data.retailers
                    .map((r) => {
                      const items = realListings.filter((l) => l.retailer_id === r.id);
                      if (items.length === 0) return null;
                      const autorizados = items.filter((i) => i.authorized).length;
                      const nao = items.length - autorizados;
                      return {
                        name: r.name,
                        total: items.length,
                        autorizados: autorizados || null,
                        nao_autorizados: nao || null,
                      };
                    })
                    .filter((x): x is NonNullable<typeof x> => x !== null)}
                  margin={{ top: 16, right: 16, left: 0, bottom: 4 }}
                >
                  <defs>
                    <linearGradient id="lineTotal" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="hsl(0 72% 51%)" />
                      <stop offset="100%" stopColor="hsl(142 71% 45%)" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} axisLine={false} tickLine={false} width={28} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Line
                    type="monotone"
                    dataKey="nao_autorizados"
                    stroke="hsl(0 72% 51%)"
                    strokeWidth={2.5}
                    dot={{ r: 4, strokeWidth: 2, fill: "transparent" }}
                    activeDot={{ r: 6, fill: "transparent", strokeWidth: 2 }}
                    name={tr("unauthorized_sellers")}
                  >
                    <LabelList dataKey="nao_autorizados" position="top" offset={10} style={{ fontSize: 11, fontWeight: 600, fill: "hsl(0 72% 51%)" }} />
                  </Line>
                  <Line
                    type="monotone"
                    dataKey="autorizados"
                    stroke="hsl(142 71% 45%)"
                    strokeWidth={2.5}
                    dot={{ r: 4, strokeWidth: 2, fill: "transparent" }}
                    activeDot={{ r: 6, fill: "transparent", strokeWidth: 2 }}
                    name={tr("ok_short")}
                  >
                    <LabelList dataKey="autorizados" position="top" offset={10} style={{ fontSize: 11, fontWeight: 600, fill: "hsl(142 71% 45%)" }} />
                  </Line>

                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex items-center justify-center gap-4 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> {tr("ok_short")}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-rose-500" /> {tr("unauthorized_sellers")}
              </span>
            </div>
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
              {activeCoupons.slice(0, 4).map((c) => {
                const eff = c.discount_value_cents != null
                  ? Math.max(0, data.product.srp_cents - c.discount_value_cents)
                  : c.discount_pct != null
                  ? Math.round(data.product.srp_cents * (1 - Number(c.discount_pct) / 100))
                  : null;
                const violates = eff != null && eff < piso;
                const label = c.discount_pct != null
                  ? `-${Number(c.discount_pct).toFixed(0)}%`
                  : c.discount_value_cents != null
                  ? `-${brl(c.discount_value_cents)}`
                  : "—";
                return (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-2 rounded-md border bg-card/50 px-2 py-1"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      {c.code && (
                        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                          {c.code}
                        </code>
                      )}
                      <span className="truncate text-xs text-muted-foreground">
                        {c.retailer_name ?? c.source}
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5 whitespace-nowrap text-[11px]">
                      {eff != null && (
                        <span className="font-medium text-foreground">{brl(eff)}</span>
                      )}
                      <span className={violates ? "text-rose-500" : "text-emerald-600"}>
                        {label}
                      </span>
                    </span>
                  </li>
                );
              })}
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
                      <span className="flex flex-col items-end tabular-nums leading-tight">
                        <span className="font-semibold">{brl(s.price_avista_cents)} <span className="text-[10px] font-normal uppercase text-muted-foreground">à vista</span></span>
                        {s.price_full_cents != null && s.price_full_cents !== s.price_avista_cents && (
                          <span className="text-xs text-muted-foreground">{brl(s.price_full_cents)} <span className="text-[10px] uppercase">a prazo</span></span>
                        )}
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
  total?: number;
  tone: "green" | "yellow" | "red";
  hint?: string;
}) {
  const hasTotal = typeof total === "number";
  const pctv = hasTotal && total! > 0 ? (value / total!) * 100 : value > 0 ? 100 : 0;
  const color = tone === "red" ? "bg-rose-500" : tone === "yellow" ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span>{label}</span>
        <span className="tabular-nums">
          <strong>{value}</strong>
          {hasTotal ? <span className="text-muted-foreground">/{total}</span> : null}
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
