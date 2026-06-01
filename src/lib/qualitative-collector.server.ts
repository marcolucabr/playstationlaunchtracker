/**
 * Qualitative collector — Brazil only.
 * Runs Reddit / YouTube / News searches via Firecrawl,
 * Google Trends (free public endpoint), Google Autocomplete (free),
 * and sentiment classification via Lovable AI.
 *
 * Designed to be called from the price collector's run pipeline.
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

function buildQuery(p: Product, suffix = "") {
  const base = [p.name, p.platform].filter(Boolean).join(" ").trim();
  return suffix ? `${base} ${suffix}` : base;
}

// ============ Reddit (BR communities priority) ============
export async function collectReddit(admin: Admin, p: Product) {
  const client = fc();
  const query = `${buildQuery(p)} site:reddit.com`;
  let inserted = 0;
  try {
    const res = await client.search(query, {
      limit: 10,
      lang: "pt",
      country: "br",
      tbs: "qdr:w", // last week
    });
    const results = ((res as any)?.web ?? (res as any)?.data ?? []) as any[];
    for (const r of results) {
      if (!r?.url || !/reddit\.com/.test(r.url)) continue;
      await admin.from("mentions").insert({
        product_id: p.id,
        source: "reddit",
        source_name: "Reddit",
        url: r.url,
        title: r.title ?? null,
        excerpt: r.description ?? r.markdown?.slice(0, 500) ?? null,
        captured_at: new Date().toISOString(),
      });
      inserted++;
    }
  } catch (e) {
    console.error("[reddit]", e);
  }
  return inserted;
}

// ============ YouTube (BR) ============
export async function collectYouTube(admin: Admin, p: Product) {
  const client = fc();
  const query = `${buildQuery(p, "review análise")} site:youtube.com`;
  let inserted = 0;
  try {
    const res = await client.search(query, {
      limit: 10,
      lang: "pt",
      country: "br",
      tbs: "qdr:m", // last month
    });
    const results = ((res as any)?.web ?? (res as any)?.data ?? []) as any[];
    for (const r of results) {
      if (!r?.url || !/youtube\.com|youtu\.be/.test(r.url)) continue;
      await admin.from("mentions").insert({
        product_id: p.id,
        source: "youtube",
        source_name: "YouTube",
        url: r.url,
        title: r.title ?? null,
        excerpt: r.description ?? null,
        captured_at: new Date().toISOString(),
      });
      inserted++;
    }
  } catch (e) {
    console.error("[youtube]", e);
  }
  return inserted;
}

// ============ News (BR portals) ============
export async function collectNews(admin: Admin, p: Product) {
  const client = fc();
  const query = `${buildQuery(p, "lançamento preço Brasil")}`;
  let inserted = 0;
  try {
    const res = await client.search(query, {
      limit: 15,
      lang: "pt",
      country: "br",
      tbs: "qdr:d", // last day (refresh fast)
    });
    const results = ((res as any)?.web ?? (res as any)?.data ?? []) as any[];
    for (const r of results) {
      if (!r?.url) continue;
      const host = (() => { try { return new URL(r.url).hostname.toLowerCase(); } catch { return ""; } })();
      const isBrPortal =
        host.endsWith(".com.br") ||
        BR_NEWS_DOMAINS.some((d) => host.includes(d.split("/")[0]));
      if (!isBrPortal) continue;
      await admin.from("mentions").insert({
        product_id: p.id,
        source: "news",
        source_name: host,
        url: r.url,
        title: r.title ?? null,
        excerpt: r.description ?? null,
        captured_at: new Date().toISOString(),
      });
      inserted++;
    }
  } catch (e) {
    console.error("[news]", e);
  }
  return inserted;
}

// ============ Google Trends (BR, last 30 days, FREE) ============
export async function collectTrends(admin: Admin, p: Product) {
  const keyword = buildQuery(p);
  try {
    const raw = await googleTrends.interestOverTime({
      keyword,
      geo: "BR",
      startTime: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    });
    const parsed = JSON.parse(raw);
    const timeline = parsed?.default?.timelineData ?? [];
    if (!timeline.length) return 0;

    const series = timeline.map((t: any) => ({
      date: t.formattedTime,
      timestamp: Number(t.time) * 1000,
      value: Number(t.value?.[0] ?? 0),
    }));
    const values = series.map((s: any) => s.value);
    const avg = values.reduce((a: number, b: number) => a + b, 0) / values.length;
    const peakIdx = values.indexOf(Math.max(...values));
    const peakDate = new Date(series[peakIdx].timestamp).toISOString().slice(0, 10);

    await admin.from("trends_snapshots").insert({
      product_id: p.id,
      geo: "BR",
      timeframe: "today 1-m",
      keyword,
      series,
      avg_value: avg,
      peak_value: values[peakIdx],
      peak_date: peakDate,
    });
    return 1;
  } catch (e) {
    console.error("[trends]", e);
    return 0;
  }
}

// ============ Google Autocomplete (BR, FREE) ============
async function fetchAutocomplete(q: string): Promise<string[]> {
  const url = `https://suggestqueries.google.com/complete/search?client=firefox&hl=pt-BR&gl=br&q=${encodeURIComponent(q)}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LaunchTracker/1.0)" },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as [string, string[]];
    return Array.isArray(json?.[1]) ? json[1] : [];
  } catch {
    return [];
  }
}

export async function collectKeywords(admin: Admin, p: Product) {
  const seed = buildQuery(p);
  const seeds = [seed, `${seed} preço`, `${seed} review`, `${seed} comprar`];
  const all = new Map<string, string>();
  for (const s of seeds) {
    const sugg = await fetchAutocomplete(s);
    for (const term of sugg) all.set(term.toLowerCase(), s);
  }
  if (!all.size) return 0;
  const suggestions = [...all.entries()].map(([term, fromSeed]) => ({ term, seed: fromSeed }));
  await admin.from("keyword_snapshots").insert({
    product_id: p.id,
    seed,
    suggestions,
    source: "google_autocomplete",
  });
  return 1;
}

// ============ Sentiment (Lovable AI, FREE) ============
async function classifyBatch(items: Array<{ id: string; text: string }>): Promise<Map<string, "positive" | "neutral" | "negative">> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey || !items.length) return new Map();

  const prompt = `Classifique cada menção sobre um produto em uma das três categorias: positive, neutral, negative.
Responda APENAS com JSON válido no formato: {"results":[{"id":"...","s":"positive|neutral|negative"}, ...]}

Menções:
${items.map((i) => `id=${i.id}: ${i.text.slice(0, 400)}`).join("\n")}`;

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "Você é um classificador de sentimento PT-BR. Responda só JSON." },
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
      if (r?.id && ["positive", "neutral", "negative"].includes(r?.s)) {
        out.set(r.id, r.s);
      }
    }
    return out;
  } catch (e) {
    console.error("[sentiment]", e);
    return new Map();
  }
}

export async function classifyRecentSentiment(admin: Admin, productId: string) {
  const { data: rows } = await admin
    .from("mentions")
    .select("id, title, excerpt")
    .eq("product_id", productId)
    .is("sentiment", null)
    .order("captured_at", { ascending: false })
    .limit(40);
  if (!rows?.length) return 0;
  const items = rows.map((r) => ({
    id: r.id,
    text: `${r.title ?? ""} — ${r.excerpt ?? ""}`.trim(),
  }));
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
  const [reddit, youtube, news, trends, keywords] = await Promise.all([
    collectReddit(admin, p),
    collectYouTube(admin, p),
    collectNews(admin, p),
    collectTrends(admin, p),
    collectKeywords(admin, p),
  ]);
  const sentiment = await classifyRecentSentiment(admin, p.id);
  return { reddit, youtube, news, trends, keywords, sentiment };
}
