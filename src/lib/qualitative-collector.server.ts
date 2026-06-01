/**
 * Qualitative collector — Brazil only.
 * Reddit / YouTube / News via Firecrawl Search,
 * Google Trends (free), Google Autocomplete (free),
 * Coupons via Promobit/Pelando/Cuponomia via Firecrawl Search,
 * Sentiment via Lovable AI.
 *
 * Honors manual_keywords for expanded searches.
 */
import Firecrawl from "@mendable/firecrawl-js";
// @ts-expect-error -- no types ship with this package
import googleTrends from "google-trends-api";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type Admin = ReturnType<typeof createClient<Database>>;

function fc() {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error("FIRECRAWL_API_KEY not configured");
  return new Firecrawl({ apiKey });
}

type Product = { id: string; name: string; platform: string | null };

const BR_NEWS_DOMAINS = [
  "g1.globo.com", "uol.com.br", "tecmundo.com.br", "adrenaline.com.br",
  "ign.com/br", "theenemy.com.br", "techtudo.com.br", "voxel.com.br",
  "canaltech.com.br", "olhardigital.com.br", "meiobit.com", "tudocelular.com",
  "thegamer.com.br", "jovemnerd.com.br", "omelete.com.br", "exame.com",
];

function baseQuery(p: Product) {
  return [p.name, p.platform].filter(Boolean).join(" ").trim();
}

async function getManualTerms(admin: Admin, productId: string): Promise<string[]> {
  const { data } = await admin
    .from("manual_keywords")
    .select("term")
    .eq("product_id", productId)
    .eq("active", true);
  return (data ?? []).map((k) => k.term).filter(Boolean);
}

function uniq<T>(arr: T[]): T[] { return [...new Set(arr)]; }

// ============ Reddit (BR) ============
export async function collectReddit(admin: Admin, p: Product, extraTerms: string[]) {
  const client = fc();
  const queries = uniq([baseQuery(p), ...extraTerms]).map((q) => `${q} site:reddit.com`);
  let inserted = 0;
  for (const query of queries) {
    try {
      const res = await client.search(query, { limit: 8, sources: ["web"], location: "Brazil", tbs: "qdr:w" });
      const results = ((res as any)?.web ?? (res as any)?.data ?? []) as any[];
      for (const r of results) {
        if (!r?.url || !/reddit\.com/.test(r.url)) continue;
        const { error } = await admin.from("mentions").insert({
          product_id: p.id, source: "reddit", source_name: "Reddit",
          url: r.url, title: r.title ?? null,
          excerpt: r.description ?? r.markdown?.slice(0, 500) ?? null,
          captured_at: new Date().toISOString(),
        });
        if (!error) inserted++;
      }
    } catch (e) { console.error("[reddit]", e); }
  }
  return inserted;
}

// ============ YouTube (BR) ============
export async function collectYouTube(admin: Admin, p: Product, extraTerms: string[]) {
  const client = fc();
  const queries = uniq([baseQuery(p) + " review análise", ...extraTerms.map((t) => `${t} review`)]).map(
    (q) => `${q} site:youtube.com`,
  );
  let inserted = 0;
  for (const query of queries) {
    try {
      const res = await client.search(query, { limit: 8, sources: ["web"], location: "Brazil", tbs: "qdr:m" });
      const results = ((res as any)?.web ?? (res as any)?.data ?? []) as any[];
      for (const r of results) {
        if (!r?.url || !/youtube\.com|youtu\.be/.test(r.url)) continue;
        const { error } = await admin.from("mentions").insert({
          product_id: p.id, source: "youtube", source_name: "YouTube",
          url: r.url, title: r.title ?? null, excerpt: r.description ?? null,
          captured_at: new Date().toISOString(),
        });
        if (!error) inserted++;
      }
    } catch (e) { console.error("[youtube]", e); }
  }
  return inserted;
}

// ============ Generic social collector ============
async function collectSocial(
  admin: Admin,
  p: Product,
  extraTerms: string[],
  opts: { source: "twitter" | "tiktok" | "instagram"; sourceName: string; domainRegex: RegExp; siteFilters: string[] },
) {
  const client = fc();
  const sitePart = opts.siteFilters.map((s) => `site:${s}`).join(" OR ");
  const queries = uniq([baseQuery(p), ...extraTerms]).map((q) => `${q} (${sitePart})`);
  let inserted = 0;
  for (const query of queries) {
    try {
      const res = await client.search(query, { limit: 8, sources: ["web"], location: "Brazil", tbs: "qdr:w" });
      const results = ((res as any)?.web ?? (res as any)?.data ?? []) as any[];
      for (const r of results) {
        if (!r?.url || !opts.domainRegex.test(r.url)) continue;
        const { error } = await admin.from("mentions").insert({
          product_id: p.id, source: opts.source, source_name: opts.sourceName,
          url: r.url, title: r.title ?? null,
          excerpt: r.description ?? r.markdown?.slice(0, 500) ?? null,
          captured_at: new Date().toISOString(),
        });
        if (!error) inserted++;
      }
    } catch (e) { console.error(`[${opts.source}]`, e); }
  }
  return inserted;
}

export const collectTwitter = (admin: Admin, p: Product, extra: string[]) =>
  collectSocial(admin, p, extra, {
    source: "twitter", sourceName: "X / Twitter",
    domainRegex: /(twitter\.com|x\.com)/i,
    siteFilters: ["twitter.com", "x.com"],
  });

export const collectTikTok = (admin: Admin, p: Product, extra: string[]) =>
  collectSocial(admin, p, extra, {
    source: "tiktok", sourceName: "TikTok",
    domainRegex: /tiktok\.com/i,
    siteFilters: ["tiktok.com"],
  });

export const collectInstagram = (admin: Admin, p: Product, extra: string[]) =>
  collectSocial(admin, p, extra, {
    source: "instagram", sourceName: "Instagram",
    domainRegex: /instagram\.com/i,
    siteFilters: ["instagram.com"],
  });

// ============ News (BR portals) ============
export async function collectNews(admin: Admin, p: Product, extraTerms: string[]) {
  const client = fc();
  const queries = uniq([
    `${baseQuery(p)} lançamento preço Brasil`,
    ...extraTerms.map((t) => `${t} Brasil`),
  ]);
  let inserted = 0;
  for (const query of queries) {
    try {
      const res = await client.search(query, { limit: 10, sources: ["web"], location: "Brazil", tbs: "qdr:d" });
      const results = ((res as any)?.web ?? (res as any)?.data ?? []) as any[];
      for (const r of results) {
        if (!r?.url) continue;
        const host = (() => { try { return new URL(r.url).hostname.toLowerCase(); } catch { return ""; } })();
        const isBrPortal = host.endsWith(".com.br") || BR_NEWS_DOMAINS.some((d) => host.includes(d.split("/")[0]));
        if (!isBrPortal) continue;
        const { error } = await admin.from("mentions").insert({
          product_id: p.id, source: "news", source_name: host,
          url: r.url, title: r.title ?? null, excerpt: r.description ?? null,
          captured_at: new Date().toISOString(),
        });
        if (!error) inserted++;
      }
    } catch (e) { console.error("[news]", e); }
  }
  return inserted;
}

// ============ Google Trends (BR) ============
export async function collectTrends(admin: Admin, p: Product) {
  const keyword = baseQuery(p);
  try {
    const raw = await googleTrends.interestOverTime({
      keyword, geo: "BR",
      startTime: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    });
    const parsed = JSON.parse(raw);
    const timeline = parsed?.default?.timelineData ?? [];
    if (!timeline.length) return 0;
    const series = timeline.map((t: any) => ({
      date: t.formattedTime, timestamp: Number(t.time) * 1000, value: Number(t.value?.[0] ?? 0),
    }));
    const values = series.map((s: any) => s.value);
    const avg = values.reduce((a: number, b: number) => a + b, 0) / values.length;
    const peakIdx = values.indexOf(Math.max(...values));
    const peakDate = new Date(series[peakIdx].timestamp).toISOString().slice(0, 10);
    await admin.from("trends_snapshots").insert({
      product_id: p.id, geo: "BR", timeframe: "today 1-m", keyword,
      series, avg_value: avg, peak_value: values[peakIdx], peak_date: peakDate,
    });
    return 1;
  } catch (e) { console.error("[trends]", e); return 0; }
}

// ============ Google Autocomplete (BR) ============
async function fetchAutocomplete(q: string): Promise<string[]> {
  const url = `https://suggestqueries.google.com/complete/search?client=firefox&hl=pt-BR&gl=br&q=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; LaunchTracker/1.0)" } });
    if (!res.ok) return [];
    const json = (await res.json()) as [string, string[]];
    return Array.isArray(json?.[1]) ? json[1] : [];
  } catch { return []; }
}

export async function collectKeywords(admin: Admin, p: Product, extraTerms: string[]) {
  const seed = baseQuery(p);
  const seeds = uniq([seed, `${seed} preço`, `${seed} review`, `${seed} comprar`, ...extraTerms]);
  const all = new Map<string, string>();
  for (const s of seeds) {
    const sugg = await fetchAutocomplete(s);
    for (const term of sugg) all.set(term.toLowerCase(), s);
  }
  if (!all.size) return 0;
  const suggestions = [...all.entries()].map(([term, fromSeed]) => ({ term, seed: fromSeed }));
  await admin.from("keyword_snapshots").insert({
    product_id: p.id, seed, suggestions, source: "google_autocomplete",
  });
  return 1;
}

// ============ Coupons (Promobit / Pelando / Cuponomia) ============
type CouponSource = "promobit" | "pelando" | "cuponomia";
const COUPON_DOMAINS: Record<CouponSource, RegExp> = {
  promobit: /promobit\.com\.br/,
  pelando: /pelando\.com\.br/,
  cuponomia: /cuponomia\.com\.br/,
};

async function extractCouponWithAI(items: Array<{ id: number; title: string; description: string }>) {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey || !items.length) return new Map<number, { code: string | null; discount_pct: number | null; discount_value_cents: number | null; retailer: string | null }>();
  const prompt = `Para cada item abaixo (cupom/promoção brasileiro), extraia: code (código do cupom, null se não tiver), discount_pct (% de desconto, número ou null), discount_value_cents (desconto em centavos R$, número ou null), retailer (nome do varejista, ex: "Amazon", "Mercado Livre").
Responda APENAS JSON: {"r":[{"id":1,"code":"GAMER10","discount_pct":10,"discount_value_cents":null,"retailer":"Amazon"}, ...]}

Itens:
${items.map((i) => `id=${i.id}: ${i.title} | ${i.description}`.slice(0, 500)).join("\n")}`;
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "Extrator de cupom PT-BR. Responda só JSON válido." },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!res.ok) return new Map();
    const json = await res.json();
    const content: string = json?.choices?.[0]?.message?.content ?? "";
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return new Map();
    const parsed = JSON.parse(match[0]);
    const out = new Map();
    for (const r of parsed?.r ?? []) {
      if (typeof r?.id === "number") {
        out.set(r.id, {
          code: r.code ?? null,
          discount_pct: typeof r.discount_pct === "number" ? r.discount_pct : null,
          discount_value_cents: typeof r.discount_value_cents === "number" ? r.discount_value_cents : null,
          retailer: r.retailer ?? null,
        });
      }
    }
    return out;
  } catch (e) { console.error("[coupon-ai]", e); return new Map(); }
}

export async function collectCoupons(admin: Admin, p: Product) {
  const client = fc();
  const base = baseQuery(p);
  // Two-pronged: product-specific and broad platform (ex: "PS5 cupom") to catch retailer-wide coupons
  const queries = uniq([
    `${base} cupom desconto`,
    p.platform ? `${p.platform} cupom desconto` : "",
    "PlayStation cupom desconto",
  ]).filter(Boolean);

  const allResults: Array<{ url: string; title: string; description: string; source: CouponSource }> = [];
  for (const query of queries) {
    const fullQuery = `${query} (site:promobit.com.br OR site:pelando.com.br OR site:cuponomia.com.br)`;
    try {
      const res = await client.search(fullQuery, { limit: 10, sources: ["web"], location: "Brazil", tbs: "qdr:w" });
      const results = ((res as any)?.web ?? (res as any)?.data ?? []) as any[];
      for (const r of results) {
        if (!r?.url) continue;
        const src = (Object.entries(COUPON_DOMAINS) as Array<[CouponSource, RegExp]>).find(([, re]) => re.test(r.url))?.[0];
        if (!src) continue;
        allResults.push({
          url: r.url, title: r.title ?? "", description: r.description ?? "", source: src,
        });
      }
    } catch (e) { console.error("[coupons]", e); }
  }

  if (!allResults.length) return 0;

  // Dedup by URL
  const seen = new Set<string>();
  const unique = allResults.filter((r) => (seen.has(r.url) ? false : (seen.add(r.url), true)));

  // AI extraction
  const items = unique.map((r, i) => ({ id: i, title: r.title, description: r.description }));
  const enriched = await extractCouponWithAI(items);

  let inserted = 0;
  for (let i = 0; i < unique.length; i++) {
    const r = unique[i];
    const ext = enriched.get(i);
    const { error } = await admin.from("coupon_snapshots").insert({
      product_id: p.id,
      source: r.source,
      source_url: r.url,
      title: r.title.slice(0, 300),
      description: r.description.slice(0, 600),
      code: ext?.code ?? null,
      discount_pct: ext?.discount_pct ?? null,
      discount_value_cents: ext?.discount_value_cents ?? null,
      retailer_name: ext?.retailer ?? null,
    });
    if (!error) inserted++;
  }
  return inserted;
}

// ============ Sentiment ============
async function classifyBatch(items: Array<{ id: string; text: string }>): Promise<Map<string, "positive" | "neutral" | "negative">> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey || !items.length) return new Map();
  const prompt = `Classifique cada menção em positive, neutral, negative.
JSON: {"results":[{"id":"...","s":"positive|neutral|negative"}, ...]}

Menções:
${items.map((i) => `id=${i.id}: ${i.text.slice(0, 400)}`).join("\n")}`;
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "Classificador de sentimento PT-BR. Só JSON." },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!res.ok) return new Map();
    const json = await res.json();
    const content: string = json?.choices?.[0]?.message?.content ?? "";
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return new Map();
    const parsed = JSON.parse(match[0]);
    const out = new Map<string, "positive" | "neutral" | "negative">();
    for (const r of parsed?.results ?? []) {
      if (r?.id && ["positive", "neutral", "negative"].includes(r?.s)) out.set(r.id, r.s);
    }
    return out;
  } catch (e) { console.error("[sentiment]", e); return new Map(); }
}

export async function classifyRecentSentiment(admin: Admin, productId: string) {
  const { data: rows } = await admin
    .from("mentions").select("id, title, excerpt")
    .eq("product_id", productId).is("sentiment", null)
    .order("captured_at", { ascending: false }).limit(40);
  if (!rows?.length) return 0;
  const items = rows.map((r) => ({ id: r.id, text: `${r.title ?? ""} — ${r.excerpt ?? ""}`.trim() }));
  const classified = await classifyBatch(items);
  let updated = 0;
  for (const [id, s] of classified) {
    const { error } = await admin.from("mentions").update({ sentiment: s }).eq("id", id);
    if (!error) updated++;
  }
  return updated;
}

// ============ Orchestrator ============
export async function runQualitativeForProduct(admin: Admin, p: Product) {
  const extraTerms = await getManualTerms(admin, p.id);
  const [reddit, youtube, news, trends, keywords, coupons, twitter, tiktok, instagram] = await Promise.all([
    collectReddit(admin, p, extraTerms),
    collectYouTube(admin, p, extraTerms),
    collectNews(admin, p, extraTerms),
    collectTrends(admin, p),
    collectKeywords(admin, p, extraTerms),
    collectCoupons(admin, p),
    collectTwitter(admin, p, extraTerms),
    collectTikTok(admin, p, extraTerms),
    collectInstagram(admin, p, extraTerms),
  ]);
  const sentiment = await classifyRecentSentiment(admin, p.id);
  return { reddit, youtube, news, trends, keywords, coupons, twitter, tiktok, instagram, sentiment };
}
