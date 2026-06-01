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

function toCents(n: number | string | undefined | null): number | undefined {
  if (n == null) return undefined;
  const num = typeof n === "string" ? parseFloat(n.replace(/[^0-9.,]/g, "").replace(/\.(?=\d{3})/g, "").replace(",", ".")) : n;
  if (!isFinite(num) || num <= 0) return undefined;
  return Math.round(num * 100);
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

// =========== Run collection ===========

export const runCollection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { productId?: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const admin = adminClient();

    let urlsQuery = admin
      .from("product_retailer_urls")
      .select("id, product_id, retailer_id, url")
      .eq("active", true);
    if (data.productId) urlsQuery = urlsQuery.eq("product_id", data.productId);
    const { data: urls, error: urlsErr } = await urlsQuery;
    if (urlsErr) throw new Error(urlsErr.message);

    const { data: run, error: runErr } = await admin
      .from("collection_runs")
      .insert({
        status: "running",
        trigger: "manual",
        product_id: data.productId ?? null,
        retailers_checked: 0,
      })
      .select()
      .single();
    if (runErr) throw new Error(runErr.message);

    let snapshots = 0;
    let okCount = 0;
    let blockedCount = 0;
    let errorCount = 0;
    let notFoundCount = 0;
    const errors: Array<{ url: string; error: string }> = [];

    // Process sequentially to avoid hammering / rate limits
    for (const u of urls ?? []) {
      const parsed = await fetchAndParse(u.url);
      const isFirstParty = false; // unknown without retailer kind; default false

      const { error: snapErr } = await admin.from("price_snapshots").insert({
        product_id: u.product_id,
        retailer_id: u.retailer_id,
        is_first_party: isFirstParty,
        seller_name: parsed.seller_name ?? null,
        product_url: u.url,
        price_avista_cents: parsed.price_avista_cents ?? null,
        price_full_cents: parsed.price_full_cents ?? null,
        installment_count: parsed.installment_count ?? null,
        installment_value_cents: parsed.installment_value_cents ?? null,
        in_stock: parsed.in_stock ?? null,
        is_presale: false,
        status: parsed.status,
        raw_payload: { ...(parsed.raw ?? {}), error: parsed.error ?? null },
      });
      if (!snapErr) snapshots++;
      if (parsed.status === "ok") okCount++;
      else if (parsed.status === "blocked") blockedCount++;
      else if (parsed.status === "not_found") notFoundCount++;
      else errorCount++;
      if (parsed.status !== "ok") errors.push({ url: u.url, error: parsed.error ?? parsed.status });

      await admin
        .from("product_retailer_urls")
        .update({ last_status: parsed.status, last_checked_at: new Date().toISOString() })
        .eq("id", u.id);
    }

    const finalStatus: "success" | "partial" | "failed" =
      okCount > 0 && blockedCount + errorCount === 0 ? "success" : okCount > 0 ? "partial" : "failed";
    await admin
      .from("collection_runs")
      .update({
        status: finalStatus,
        finished_at: new Date().toISOString(),
        retailers_checked: urls?.length ?? 0,
        snapshots_inserted: snapshots,
        errors: errors.length ? errors : null,
      })
      .eq("id", run.id);

    return {
      runId: run.id,
      total: urls?.length ?? 0,
      ok: okCount,
      blocked: blockedCount,
      notFound: notFoundCount,
      error: errorCount,
    };
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

// =========== Discover URLs by EAN ===========

type SearchTemplate = {
  origin: string;
  searchUrl: (q: string) => string;
  productHrefRegex: RegExp;
  normalize?: (href: string) => string;
};

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

async function searchFirstResult(tpl: SearchTemplate, query: string): Promise<{ url?: string; status: "ok" | "blocked" | "not_found" | "error"; error?: string }> {
  try {
    const res = await fetch(tpl.searchUrl(query), {
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
    const m = html.match(tpl.productHrefRegex);
    if (!m) return { status: "not_found" };
    let href = m[1].replace(/&amp;/g, "&");
    href = absolutize(href, tpl.origin);
    return { status: "ok", url: href };
  } catch (e) {
    return { status: "error", error: e instanceof Error ? e.message : String(e) };
  }
}

export const discoverUrls = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { productId?: string; overwrite?: boolean }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const admin = adminClient();

    let prodQ = admin.from("products").select("id, name, ean, platform").eq("active", true);
    if (data.productId) prodQ = prodQ.eq("id", data.productId);
    const { data: products, error: pErr } = await prodQ;
    if (pErr) throw new Error(pErr.message);

    const { data: retailers, error: rErr } = await admin
      .from("retailers")
      .select("id, slug, name")
      .eq("active", true);
    if (rErr) throw new Error(rErr.message);

    const { data: existing } = await admin
      .from("product_retailer_urls")
      .select("product_id, retailer_id, url");
    const existingMap = new Map<string, string>();
    for (const e of existing ?? []) existingMap.set(`${e.product_id}|${e.retailer_id}`, e.url);

    let found = 0;
    let blocked = 0;
    let notFound = 0;
    let skipped = 0;
    let errors = 0;
    const overwrite = data.overwrite ?? false;

    for (const p of products ?? []) {
      const queries: string[] = [];
      if (p.ean) queries.push(p.ean);
      const nameQuery = [p.name, p.platform].filter(Boolean).join(" ").trim();
      if (nameQuery) queries.push(nameQuery);

      for (const r of retailers ?? []) {
        const tpl = SEARCH_TEMPLATES[r.slug];
        if (!tpl) { skipped++; continue; }
        const key = `${p.id}|${r.id}`;
        if (!overwrite && existingMap.has(key)) { skipped++; continue; }

        let result: Awaited<ReturnType<typeof searchFirstResult>> | null = null;
        for (const q of queries) {
          result = await searchFirstResult(tpl, q);
          if (result.status === "ok" || result.status === "blocked") break;
        }
        if (!result) { skipped++; continue; }

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
        } else if (result.status === "not_found") {
          notFound++;
        } else {
          errors++;
        }
      }
    }

    return { found, blocked, notFound, skipped, errors };
  });
