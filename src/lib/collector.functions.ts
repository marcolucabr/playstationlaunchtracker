import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function adminClient() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function assertAdmin(supabase: ReturnType<typeof createClient<Database>>, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin only");
}

// =========== URL management ===========

export const listProductRetailerUrls = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const admin = adminClient();
    const [{ data: products }, { data: retailers }, { data: urls }] = await Promise.all([
      admin.from("products").select("id, name, platform, active").eq("active", true).order("name"),
      admin.from("retailers").select("id, name, slug, kind, active").eq("active", true).order("display_order"),
      admin.from("product_retailer_urls").select("*"),
    ]);
    return {
      products: products ?? [],
      retailers: retailers ?? [],
      urls: urls ?? [],
    };
  });

export const saveProductRetailerUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { productId: string; retailerId: string; url: string; active: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const admin = adminClient();
    const url = data.url.trim();
    if (url && !/^https?:\/\//i.test(url)) throw new Error("URL deve começar com http(s)://");

    if (!url) {
      // Empty URL = delete the row
      await admin
        .from("product_retailer_urls")
        .delete()
        .eq("product_id", data.productId)
        .eq("retailer_id", data.retailerId);
      return { ok: true, deleted: true };
    }

    const { error } = await admin
      .from("product_retailer_urls")
      .upsert(
        {
          product_id: data.productId,
          retailer_id: data.retailerId,
          url,
          active: data.active,
        },
        { onConflict: "product_id,retailer_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// =========== Price parser ===========

type Parsed = {
  status: "ok" | "blocked" | "not_found" | "error";
  price_avista_cents?: number;
  price_full_cents?: number;
  installment_count?: number;
  installment_value_cents?: number;
  seller_name?: string;
  in_stock?: boolean;
  raw?: Record<string, unknown>;
  error?: string;
};

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";
const FIRECRAWL_SCRAPE_URL = "https://api.firecrawl.dev/v2/scrape";

function toCents(n: number | string | undefined | null): number | undefined {
  if (n == null) return undefined;
  const num = typeof n === "string" ? parseFloat(n.replace(/[^0-9.,]/g, "").replace(/\.(?=\d{3})/g, "").replace(",", ".")) : n;
  if (!isFinite(num) || num <= 0) return undefined;
  return Math.round(num * 100);
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectStock(text: string): boolean | undefined {
  if (/(indispon[ií]vel|esgotado|sem estoque)/i.test(text)) return false;
  if (/(em estoque|dispon[ií]vel|comprar|adicionar ao carrinho|pr[ée]-venda|pre venda|retire)/i.test(text)) return true;
  return undefined;
}

function parseTextualPrice(html: string): Omit<Parsed, "status" | "error"> | null {
  const text = htmlToText(html);

  const contextualMatches = [
    ...text.matchAll(/(?:à vista|a vista|no pix|pix|por|pre[cç]o(?:\s+por)?|apenas)[^r$0-9]{0,30}r\$\s*([\d.]+,\d{2})/gi),
    ...text.matchAll(/r\$\s*([\d.]+,\d{2})[^a-z0-9]{0,20}(?:à vista|a vista|no pix|pix)/gi),
  ]
    .map((m) => toCents(m[1]))
    .filter((value): value is number => typeof value === "number" && value > 500);

  const installment = text.match(/(\d{1,2})\s*x\s*de\s*r\$\s*([\d.]+,\d{2})/i);
  const installmentCount = installment ? Number(installment[1]) : undefined;
  const installmentValue = installment ? toCents(installment[2]) : undefined;

  const genericPrices = [...text.matchAll(/r\$\s*([\d.]+,\d{2})/gi)]
    .map((m) => toCents(m[1]))
    .filter((value): value is number => typeof value === "number" && value > 500)
    .slice(0, 12);
  const uniquePrices = [...new Set(genericPrices)];
  const chosen =
    contextualMatches[0] ??
    (uniquePrices.length === 1
      ? uniquePrices[0]
      : uniquePrices.find((value) => value !== installmentValue) ?? uniquePrices[0]);

  if (!chosen) return null;

  return {
    price_avista_cents: chosen,
    price_full_cents: chosen,
    installment_count: installmentCount,
    installment_value_cents: installmentValue,
    in_stock: detectStock(text),
    raw: {
      text_price: {
        chosen,
        contextual: contextualMatches[0] ?? null,
        installment_count: installmentCount ?? null,
        installment_value_cents: installmentValue ?? null,
      },
    },
  };
}

function parseHtml(html: string): Parsed {
  // Blocked detection
  const lower = html.slice(0, 5000).toLowerCase();
  if (/captcha|access denied|cf-browser-verification|cloudflare|robot check|are you a human/.test(lower)) {
    return { status: "blocked", error: "Anti-bot / captcha detected" };
  }

  const raw: Record<string, unknown> = {};

  // 1. JSON-LD
  const ldMatches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const m of ldMatches) {
    try {
      const json = JSON.parse(m[1].trim());
      const items = Array.isArray(json) ? json : json["@graph"] ? json["@graph"] : [json];
      for (const item of items) {
        const type = item["@type"];
        const isProduct = type === "Product" || (Array.isArray(type) && type.includes("Product"));
        if (!isProduct) continue;
        const offers = Array.isArray(item.offers) ? item.offers[0] : item.offers;
        if (!offers) continue;
        const price = toCents(offers.price ?? offers.lowPrice);
        const seller = offers.seller?.name ?? offers.seller;
        const avail = String(offers.availability ?? "").toLowerCase();
        raw.jsonld = { price: offers.price, availability: offers.availability, seller };
        if (price) {
          return {
            status: "ok",
            price_avista_cents: price,
            price_full_cents: price,
            seller_name: typeof seller === "string" ? seller : undefined,
            in_stock: avail.includes("instock") || avail.includes("preorder"),
            raw,
          };
        }
      }
    } catch {
      // ignore malformed JSON-LD
    }
  }

  // 2. Open Graph / Meta
  const metaPrice =
    html.match(/<meta[^>]+property=["'](?:og:price:amount|product:price:amount)["'][^>]+content=["']([^"']+)["']/i) ||
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["'](?:og:price:amount|product:price:amount)["']/i);
  if (metaPrice) {
    const cents = toCents(metaPrice[1]);
    if (cents) {
      raw.meta = { price: metaPrice[1] };
      return { status: "ok", price_avista_cents: cents, price_full_cents: cents, raw };
    }
  }

  // 3. Microdata
  const micro =
    html.match(/itemprop=["']price["'][^>]*content=["']([^"']+)["']/i) ||
    html.match(/content=["']([^"']+)["'][^>]*itemprop=["']price["']/i);
  if (micro) {
    const cents = toCents(micro[1]);
    if (cents) {
      raw.microdata = { price: micro[1] };
      return { status: "ok", price_avista_cents: cents, price_full_cents: cents, raw };
    }
  }

  const textual = parseTextualPrice(html);
  if (textual) {
    return {
      status: "ok",
      ...textual,
      raw: { ...raw, ...(textual.raw ?? {}) },
    };
  }

  return { status: "not_found", error: "Nenhum preço encontrado (JSON-LD, OG, microdata)" };
}

async function fetchAndParse(url: string): Promise<Parsed> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
      redirect: "follow",
    });
    if (res.status === 403 || res.status === 503 || res.status === 429) {
      return { status: "blocked", error: `HTTP ${res.status}` };
    }
    if (!res.ok) return { status: "error", error: `HTTP ${res.status}` };
    const html = await res.text();
    return parseHtml(html);
  } catch (e) {
    return { status: "error", error: e instanceof Error ? e.message : String(e) };
  }
}

// =========== Internal helpers (no auth, callable from cron route) ===========

type AdminDb = ReturnType<typeof adminClient>;

async function runDiscoveryInternal(admin: AdminDb, opts: { productId?: string; overwrite?: boolean }) {
  let prodQ = admin.from("products").select("id, name, ean, platform").eq("active", true);
  if (opts.productId) prodQ = prodQ.eq("id", opts.productId);
  const { data: products } = await prodQ;
  const { data: retailers } = await admin
    .from("retailers")
    .select("id, slug, name")
    .eq("active", true);

  const { data: existing } = await admin
    .from("product_retailer_urls")
    .select("product_id, retailer_id, url");
  const existingMap = new Map<string, string>();
  for (const e of existing ?? []) existingMap.set(`${e.product_id}|${e.retailer_id}`, e.url);

  let found = 0, blocked = 0, notFound = 0, skipped = 0, errors = 0;
  const blockedDetails: Array<{ retailer: string; product: string; reason: string }> = [];

  for (const p of products ?? []) {
    for (const r of retailers ?? []) {
      const tpl = SEARCH_TEMPLATES[r.slug];
      if (!tpl) { skipped++; continue; }
      const key = `${p.id}|${r.id}`;
      if (!opts.overwrite && existingMap.has(key)) { skipped++; continue; }

      const result = await discoverForProduct(tpl, p);
      if (result.status === "ok" && result.url) {
        await admin.from("product_retailer_urls").upsert(
          {
            product_id: p.id,
            retailer_id: r.id,
            url: result.url,
            active: true,
            last_status: "discovered",
            last_checked_at: new Date().toISOString(),
          },
          { onConflict: "product_id,retailer_id" },
        );
        found++;
      } else if (result.status === "blocked") {
        blocked++;
        blockedDetails.push({ retailer: r.name, product: p.name, reason: result.error ?? "blocked" });
      } else if (result.status === "not_found") notFound++;
      else errors++;
    }
  }
  return { found, blocked, notFound, skipped, errors, blockedDetails };
}


async function runCollectionInternal(
  admin: AdminDb,
  opts: { productId?: string; trigger?: "manual" | "cron" },
) {
  // 1. Auto-discover URLs for products/retailers without one
  const discovery = await runDiscoveryInternal(admin, { productId: opts.productId, overwrite: false });

  // 2. Load active URLs + retailer kinds + authorized sellers + product info (for validation)
  let urlsQuery = admin
    .from("product_retailer_urls")
    .select("id, product_id, retailer_id, url")
    .eq("active", true);
  if (opts.productId) urlsQuery = urlsQuery.eq("product_id", opts.productId);
  const { data: urls } = await urlsQuery;

  const { data: retailers } = await admin.from("retailers").select("id, kind, slug, name");
  const retailerKind = new Map<string, string>();
  const retailerSlug = new Map<string, string>();
  const retailerName = new Map<string, string>();
  for (const r of retailers ?? []) {
    retailerKind.set(r.id, r.kind as string);
    retailerSlug.set(r.id, r.slug as string);
    retailerName.set(r.id, r.name as string);
  }


  const { data: prodRows } = await admin.from("products").select("id, name, ean, platform");
  const productById = new Map<string, ProductLite>();
  for (const p of prodRows ?? []) productById.set(p.id, p);

  const { data: authSellers } = await admin
    .from("authorized_sellers")
    .select("product_id, retailer_id, seller_name");
  const isAuthorized = (pid: string, rid: string, seller?: string | null) => {
    if (!seller) return false;
    const s = seller.toLowerCase().trim();
    return (authSellers ?? []).some(
      (a) => a.product_id === pid && a.retailer_id === rid && a.seller_name.toLowerCase().trim() === s,
    );
  };

  const { data: run, error: runErr } = await admin
    .from("collection_runs")
    .insert({
      status: "running",
      trigger: opts.trigger ?? "manual",
      product_id: opts.productId ?? null,
      retailers_checked: 0,
    })
    .select()
    .single();
  if (runErr) throw new Error(runErr.message);

  let snapshots = 0, okCount = 0, blockedCount = 0, errorCount = 0, notFoundCount = 0;
  let rediscoveredCount = 0, rediscoveryFailed = 0;
  const errors: Array<{ url: string; error: string; retailer?: string; kind?: "blocked" | "not_found" | "error" | "rediscovery_failed" | "validation" }> = [];



  for (const u of urls ?? []) {
    const product = productById.get(u.product_id);
    let effectiveUrl = u.url;
    let validationNote: string | undefined;

    // Validate the saved URL still matches the product. If not, drop it and re-discover.
    if (product) {
      const page = await fetchHtml(u.url);
      if (page.status === "ok" && page.html) {
        const v = await validateCandidate(page.html, product);
        if (!v.ok) {
          validationNote = `URL antiga descartada: ${v.reason}`;
          const slug = retailerSlug.get(u.retailer_id);
          const tpl = slug ? SEARCH_TEMPLATES[slug] : undefined;
          // Delete the bad URL row
          await admin.from("product_retailer_urls").delete().eq("id", u.id);
          // Try to re-discover
          if (tpl) {
            const rediscovered = await discoverForProduct(tpl, product);
            if (rediscovered.status === "ok" && rediscovered.url) {
              const { data: ins } = await admin
                .from("product_retailer_urls")
                .upsert(
                  {
                    product_id: u.product_id,
                    retailer_id: u.retailer_id,
                    url: rediscovered.url,
                    active: true,
                    last_status: "rediscovered",
                    last_checked_at: new Date().toISOString(),
                  },
                  { onConflict: "product_id,retailer_id" },
                )
                .select()
                .single();
              effectiveUrl = rediscovered.url;
              u.id = ins?.id ?? u.id;
              rediscoveredCount++;
            } else {
              errors.push({
                url: u.url,
                error: `rediscovery failed: ${rediscovered.error ?? rediscovered.status}`,
                retailer: retailerName.get(u.retailer_id),
                kind: rediscovered.status === "blocked" ? "blocked" : "rediscovery_failed",
              });
              rediscoveryFailed++;
              notFoundCount++;
              continue;
            }

          } else {
            errors.push({
              url: u.url, error: validationNote,
              retailer: retailerName.get(u.retailer_id), kind: "validation",
            });
            errorCount++;
            continue;
          }

        }
      }
    }

    const parsed = await fetchAndParse(effectiveUrl);
    const kind = retailerKind.get(u.retailer_id) ?? "3p";
    let isFirstParty = false;
    if (kind === "1p") isFirstParty = true;
    else if (kind === "both") isFirstParty = isAuthorized(u.product_id, u.retailer_id, parsed.seller_name);

    const { error: snapErr } = await admin.from("price_snapshots").insert({
      product_id: u.product_id,
      retailer_id: u.retailer_id,
      is_first_party: isFirstParty,
      seller_name: parsed.seller_name ?? null,
      product_url: effectiveUrl,
      price_avista_cents: parsed.price_avista_cents ?? null,
      price_full_cents: parsed.price_full_cents ?? null,
      installment_count: parsed.installment_count ?? null,
      installment_value_cents: parsed.installment_value_cents ?? null,
      in_stock: parsed.in_stock ?? null,
      is_presale: false,
      status: parsed.status,
      raw_payload: { ...(parsed.raw ?? {}), error: parsed.error ?? null, validation: validationNote ?? null },
    });
    if (!snapErr) snapshots++;
    if (parsed.status === "ok") okCount++;
    else if (parsed.status === "blocked") blockedCount++;
    else if (parsed.status === "not_found") notFoundCount++;
    else errorCount++;
    if (parsed.status !== "ok") errors.push({
      url: effectiveUrl,
      error: parsed.error ?? parsed.status,
      retailer: retailerName.get(u.retailer_id),
      kind: parsed.status === "blocked" ? "blocked" : parsed.status === "not_found" ? "not_found" : "error",
    });


    await admin
      .from("product_retailer_urls")
      .update({ last_status: parsed.status, last_checked_at: new Date().toISOString() })
      .eq("id", u.id);
  }

  // === Qualitative pass (Reddit / YouTube / News / Trends / Keywords / Coupons / Sentiment / Twitter / TikTok / Instagram) ===
  const qualitative = {
    reddit: 0, youtube: 0, news: 0, trends: 0, keywords: 0, coupons: 0,
    sentiment: 0, twitter: 0, tiktok: 0, instagram: 0,
  };
  try {
    const { runQualitativeForProduct } = await import("./qualitative-collector.server");
    let prodQuery = admin.from("products").select("id, name, platform").eq("active", true);
    if (opts.productId) prodQuery = prodQuery.eq("id", opts.productId);
    const { data: prods } = await prodQuery;
    for (const p of prods ?? []) {
      const r = await runQualitativeForProduct(admin, p);
      qualitative.reddit += r.reddit;
      qualitative.youtube += r.youtube;
      qualitative.news += r.news;
      qualitative.trends += r.trends;
      qualitative.keywords += r.keywords;
      qualitative.coupons += r.coupons;
      qualitative.sentiment += r.sentiment;
      qualitative.twitter += r.twitter ?? 0;
      qualitative.tiktok += r.tiktok ?? 0;
      qualitative.instagram += r.instagram ?? 0;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    errors.push({ url: "qualitative", error: msg });
  }

  const mentionsInserted =
    qualitative.reddit + qualitative.youtube + qualitative.news +
    qualitative.twitter + qualitative.tiktok + qualitative.instagram;

  const sourcesBreakdown = {
    price: { ok: okCount, blocked: blockedCount, not_found: notFoundCount, error: errorCount, urls_checked: urls?.length ?? 0 },
    discovery: {
      newly_discovered: discovery.found,
      blocked: discovery.blocked,
      not_found: discovery.notFound,
      errors: discovery.errors,
      skipped: discovery.skipped,
      rediscovered: rediscoveredCount,
      rediscovery_failed: rediscoveryFailed,
      blocked_details: discovery.blockedDetails ?? [],

    },
    reddit: qualitative.reddit,
    youtube: qualitative.youtube,
    news: qualitative.news,
    twitter: qualitative.twitter,
    tiktok: qualitative.tiktok,
    instagram: qualitative.instagram,
    trends: qualitative.trends,
    keywords: qualitative.keywords,
    coupons: qualitative.coupons,
    sentiment_classified: qualitative.sentiment,
  };


  const hasPriceSuccess = okCount > 0;
  const hasDiscoverySuccess = discovery.found + rediscoveredCount > 0;
  const hasQualitativeSuccess = Object.values(qualitative).some((value) => value > 0);
  const hasUsefulOutput = hasPriceSuccess || hasDiscoverySuccess || hasQualitativeSuccess || snapshots > 0;
  const hasAnyIssue =
    blockedCount + errorCount + notFoundCount > 0 ||
    discovery.blocked + discovery.notFound + discovery.errors + rediscoveryFailed > 0 ||
    errors.length > 0;

  const finalStatus: "success" | "partial" | "failed" =
    !hasUsefulOutput ? "failed" : hasAnyIssue ? "partial" : "success";
  await admin
    .from("collection_runs")
    .update({
      status: finalStatus,
      finished_at: new Date().toISOString(),
      retailers_checked: urls?.length ?? 0,
      snapshots_inserted: snapshots,
      mentions_inserted: mentionsInserted,
      coupons_inserted: qualitative.coupons,
      trends_snapshots_inserted: qualitative.trends,
      keyword_snapshots_inserted: qualitative.keywords,
      sources_breakdown: sourcesBreakdown,
      errors: errors.length ? errors : null,
    })
    .eq("id", run.id);

  return {
    runId: run.id,
    discovered: discovery.found,
    total: urls?.length ?? 0,
    ok: okCount,
    blocked: blockedCount,
    notFound: notFoundCount,
    error: errorCount,
    qualitative,
  };
}

// Exported for the public cron route
export async function runScheduledCollection() {
  const admin = adminClient();
  return runCollectionInternal(admin, { trigger: "cron" });
}

// =========== Run collection (admin server fn) ===========

export const runCollection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { productId?: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    return runCollectionInternal(adminClient(), { productId: data.productId, trigger: "manual" });
  });

// =========== Recent runs ===========

export const listRecentRuns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const admin = adminClient();
    const { data } = await admin
      .from("collection_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(20);
    return data ?? [];
  });

// =========== Channels dashboard (mentions aggregated by source) ===========

export const listChannelsData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const admin = adminClient();
    const [{ data: mentions }, { data: trends }, { data: products }] = await Promise.all([
      admin
        .from("mentions")
        .select("id, source, source_name, title, excerpt, url, sentiment, captured_at, posted_at, product_id")
        .order("captured_at", { ascending: false })
        .limit(2000),
      admin
        .from("trends_snapshots")
        .select("id, keyword, series, avg_value, peak_value, peak_date, captured_at, product_id")
        .order("captured_at", { ascending: false })
        .limit(20),
      admin.from("products").select("id, name").eq("active", true),
    ]);
    return { mentions: mentions ?? [], trends: trends ?? [], products: products ?? [] };
  });


// =========== Listings (current ads view) ===========

export const listListings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const admin = adminClient();
    const [{ data: products }, { data: retailers }, { data: snaps }] = await Promise.all([
      admin.from("products").select("id, name, platform, srp_cents").eq("active", true),
      admin.from("retailers").select("id, name, slug, kind").eq("active", true),
      admin
        .from("price_snapshots")
        .select("product_id, retailer_id, seller_name, product_url, price_avista_cents, in_stock, status, is_first_party, captured_at")
        .eq("status", "ok")
        .order("captured_at", { ascending: false })
        .limit(2000),
    ]);

    // Keep latest snapshot per (product, retailer, seller_name, product_url)
    const latest = new Map<string, NonNullable<typeof snaps>[number]>();
    for (const s of snaps ?? []) {
      const k = `${s.product_id}|${s.retailer_id}|${s.seller_name ?? ""}|${s.product_url ?? ""}`;
      if (!latest.has(k)) latest.set(k, s);
    }

    const listings = [...latest.values()];
    return {
      products: products ?? [],
      retailers: retailers ?? [],
      listings,
    };
  });

// =========== Discover URLs by EAN ===========

type SearchTemplate = {
  origin: string;
  searchUrl: (q: string) => string;
  productHrefRegex: RegExp;
  normalize?: (href: string) => string;
};

import { validateCandidate } from "./collector-validation";
import type { ProductLite } from "./collector-validation";
export type { ProductLite };

const SEARCH_TEMPLATES: Record<string, SearchTemplate> = {
  amazon: {
    origin: "https://www.amazon.com.br",
    searchUrl: (q) => `https://www.amazon.com.br/s?k=${encodeURIComponent(q)}`,
    productHrefRegex: /href="(\/[^"]*\/dp\/[A-Z0-9]{10}[^"]*)"/i,
  },
  "mercado-livre": {
    origin: "https://www.mercadolivre.com.br",
    searchUrl: (q) => `https://lista.mercadolivre.com.br/${encodeURIComponent(q)}`,
    productHrefRegex: /href="(https:\/\/(?:produto\.)?mercadolivre\.com\.br\/MLB[^"#?]+)"/i,
  },
  magalu: {
    origin: "https://www.magazineluiza.com.br",
    searchUrl: (q) => `https://www.magazineluiza.com.br/busca/${encodeURIComponent(q)}/`,
    productHrefRegex: /href="(\/[^"]+\/p\/[^"]+)"/i,
  },
  americanas: {
    origin: "https://www.americanas.com.br",
    searchUrl: (q) => `https://www.americanas.com.br/busca/${encodeURIComponent(q)}`,
    productHrefRegex: /href="(\/produto\/\d+[^"]*)"/i,
  },
  kabum: {
    origin: "https://www.kabum.com.br",
    searchUrl: (q) => `https://www.kabum.com.br/busca/${encodeURIComponent(q)}`,
    productHrefRegex: /href="(\/produto\/\d+[^"]*)"/i,
  },
  carrefour: {
    origin: "https://www.carrefour.com.br",
    searchUrl: (q) => `https://www.carrefour.com.br/busca/${encodeURIComponent(q)}`,
    productHrefRegex: /href="(\/[^"]+\/p[^"]*)"/i,
  },
  "fast-shop": {
    origin: "https://www.fastshop.com.br",
    searchUrl: (q) => `https://www.fastshop.com.br/web/s/?ft=${encodeURIComponent(q)}`,
    productHrefRegex: /href="(\/web\/p\/[^"]+)"/i,
  },
  shopee: {
    origin: "https://shopee.com.br",
    searchUrl: (q) => `https://shopee.com.br/search?keyword=${encodeURIComponent(q)}`,
    productHrefRegex: /href="(\/[^"]+-i\.\d+\.\d+)"/i,
  },
  havan: {
    origin: "https://www.havan.com.br",
    searchUrl: (q) => `https://www.havan.com.br/catalogsearch/result/?q=${encodeURIComponent(q)}`,
    productHrefRegex: /href="(https:\/\/www\.havan\.com\.br\/[^"]+\.html)"/i,
  },
  gazin: {
    origin: "https://www.gazin.com.br",
    searchUrl: (q) => `https://www.gazin.com.br/busca?q=${encodeURIComponent(q)}`,
    productHrefRegex: /href="(\/produto\/[^"]+)"/i,
  },
  bemol: {
    origin: "https://www.bemol.com.br",
    searchUrl: (q) => `https://www.bemol.com.br/busca?q=${encodeURIComponent(q)}`,
    productHrefRegex: /href="(\/[^"]+\/p)"/i,
  },
  "sams-club": {
    origin: "https://www.samsclub.com.br",
    searchUrl: (q) => `https://www.samsclub.com.br/busca?q=${encodeURIComponent(q)}`,
    productHrefRegex: /href="(\/[^"]+\/p)"/i,
  },
  webfones: {
    origin: "https://www.webfones.com.br",
    searchUrl: (q) => `https://www.webfones.com.br/busca?q=${encodeURIComponent(q)}`,
    productHrefRegex: /href="(\/[^"]+\.html)"/i,
  },
};

function absolutize(href: string, origin: string): string {
  if (/^https?:\/\//i.test(href)) return href;
  if (href.startsWith("/")) return origin + href;
  return origin + "/" + href;
}

// === Product-page validation (impl in ./collector-validation) ===========

function extractCandidates(html: string, tpl: SearchTemplate, max = 8): string[] {
  const flags = tpl.productHrefRegex.flags.includes("g")
    ? tpl.productHrefRegex.flags
    : tpl.productHrefRegex.flags + "g";
  const re = new RegExp(tpl.productHrefRegex.source, flags);
  const set = new Set<string>();
  for (const m of html.matchAll(re)) {
    let href = m[1].replace(/&amp;/g, "&");
    href = absolutize(href, tpl.origin);
    set.add(href);
    if (set.size >= max) break;
  }
  return [...set];
}

async function fetchHtml(url: string): Promise<{ status: "ok" | "blocked" | "error"; html?: string; error?: string }> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
      redirect: "follow",
    });
    if (res.status === 403 || res.status === 503 || res.status === 429) {
      return { status: "blocked", error: `HTTP ${res.status}` };
    }
    if (!res.ok) return { status: "error", error: `HTTP ${res.status}` };
    const html = await res.text();
    const lower = html.slice(0, 5000).toLowerCase();
    if (/captcha|access denied|cf-browser-verification|robot check|are you a human/.test(lower)) {
      return { status: "blocked", error: "Anti-bot / captcha" };
    }
    return { status: "ok", html };
  } catch (e) {
    return { status: "error", error: e instanceof Error ? e.message : String(e) };
  }
}


/**
 * Discovery: search by EAN then by name+platform, validate each candidate
 * with heuristic + AI, return first match.
 */
async function discoverForProduct(
  tpl: SearchTemplate,
  product: ProductLite,
): Promise<{ url?: string; status: "ok" | "blocked" | "not_found" | "error"; error?: string }> {
  const queries: string[] = [];
  if (product.ean) queries.push(product.ean);
  const nameQuery = [product.name, product.platform].filter(Boolean).join(" ").trim();
  if (nameQuery) queries.push(nameQuery);

  let lastReason = "no candidates matched";
  let blockedSeen = false;

  for (const q of queries) {
    const search = await fetchHtml(tpl.searchUrl(q));
    if (search.status === "blocked") { blockedSeen = true; continue; }
    if (search.status !== "ok" || !search.html) continue;

    const candidates = extractCandidates(search.html, tpl);
    for (const url of candidates) {
      const page = await fetchHtml(url);
      if (page.status === "blocked") { blockedSeen = true; continue; }
      if (page.status !== "ok" || !page.html) continue;
      const v = await validateCandidate(page.html, product);
      if (v.ok) return { url, status: "ok" };
      lastReason = v.reason;
    }
  }

  if (blockedSeen) return { status: "blocked", error: "search or page blocked" };
  return { status: "not_found", error: lastReason };
}


