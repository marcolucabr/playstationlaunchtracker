/**
 * market-scanner.server.ts
 *
 * Varredura ampla de mercado por EAN — Brasil.
 * Descobre qualquer vendedor (marketplace ou site independente)
 * que esteja vendendo o produto, classifica como autorizado/não autorizado,
 * detecta violações de preço mínimo e dispara alertas por email.
 */

import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import type { Database } from "@/integrations/supabase/types";

type Admin = ReturnType<typeof createClient<Database>>;

// ─── Config ──────────────────────────────────────────────────────────────────

const ALERT_EMAIL = "marco.luca@sony.com";
const PRICE_FLOOR_DISCOUNT = 0.07; // 7% máximo de desconto

// Marketplaces brasileiros que precisam de varredura interna de sellers
const MARKETPLACE_CONFIGS: Array<{
  name: string;
  searchUrl: (ean: string) => string;
  sellerPattern: RegExp;
}> = [
  {
    name: "Mercado Livre",
    searchUrl: (ean) => `https://lista.mercadolivre.com.br/${ean}`,
    sellerPattern: /vendido e entregue por ([^<\n"]+)/gi,
  },
  {
    name: "Amazon",
    searchUrl: (ean) =>
      `https://www.amazon.com.br/s?k=${ean}&i=videogames`,
    sellerPattern: /Vendido por[:\s]+([^<\n"]+)/gi,
  },
  {
    name: "Shopee",
    searchUrl: (ean) =>
      `https://shopee.com.br/search?keyword=${ean}`,
    sellerPattern: /([A-Za-z0-9_\.\-]+)\s*(?:•|\|)/gi,
  },
];

// ─── Types ───────────────────────────────────────────────────────────────────

export type ScannedListing = {
  source: string; // "Mercado Livre", "Amazon", "Shopee", "site independente"
  url: string;
  seller_name: string | null;
  price_cents: number | null;
  in_stock: boolean | null;
  is_authorized: boolean;
  violation: "unauthorized_seller" | "price_below_floor" | "both" | null;
  raw_title?: string;
};

export type ScanResult = {
  product_id: string;
  ean: string;
  listings: ScannedListing[];
  violations: ScannedListing[];
  new_sellers: number;
  scan_at: string;
};

// ─── Firecrawl helpers ───────────────────────────────────────────────────────

type FcResult = {
  url?: string;
  title?: string;
  description?: string;
  markdown?: string;
};

async function fcSearch(
  query: string,
  opts: { limit?: number } = {}
): Promise<FcResult[]> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) return [];
  try {
    const res = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        limit: opts.limit ?? 10,
        location: "Brazil",
        lang: "pt",
        country: "br",
      }),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: FcResult[]; web?: FcResult[] };
    return json.data ?? json.web ?? [];
  } catch {
    return [];
  }
}

async function fcScrape(url: string): Promise<string | null> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        onlyMainContent: true,
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: { markdown?: string } };
    return json.data?.markdown ?? null;
  } catch {
    return null;
  }
}

// ─── Price extraction ────────────────────────────────────────────────────────

function extractPrice(text: string): number | null {
  // Padrões: R$ 371,91 / R$371.91 / 371,91
  const patterns = [
    /R\$\s*([\d]{1,4}[\.,]\d{2,3}(?:[.,]\d{2})?)/gi,
    /(?:por|preço|price)[:\s]+R?\$?\s*([\d]{1,4}[\.,]\d{2,3})/gi,
  ];
  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern)];
    for (const m of matches) {
      const raw = m[1]
        .replace(/\./g, "")
        .replace(",", ".");
      const val = parseFloat(raw);
      if (isFinite(val) && val > 50 && val < 2000) {
        return Math.round(val * 100);
      }
    }
  }
  return null;
}

function extractSeller(text: string): string | null {
  const patterns = [
    /vendido (?:e entregue )?por[:\s]+([^\n\|<"]{3,50})/i,
    /seller[:\s]+([^\n\|<"]{3,50})/i,
    /loja[:\s]+([^\n\|<"]{3,50})/i,
    /oferta de[:\s]+([^\n\|<"]{3,50})/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) return m[1].trim().replace(/['"]/g, "");
  }
  return null;
}

// ─── Authorization check ─────────────────────────────────────────────────────

async function getAuthorizedSellers(
  admin: Admin,
  productId: string
): Promise<Array<{ seller_name: string; retailer_id: string }>> {
  const { data } = await admin
    .from("authorized_sellers")
    .select("seller_name, retailer_id")
    .eq("product_id", productId);
  return data ?? [];
}

function isAuthorized(
  sellerName: string | null,
  url: string,
  authorizedSellers: Array<{ seller_name: string; retailer_id: string }>,
  authorizedRetailers: string[]
): boolean {
  // Verifica domínio autorizado
  try {
    const hostname = new URL(url).hostname.replace("www.", "");
    if (authorizedRetailers.some((r) => hostname.includes(r))) return true;
  } catch {
    // ignore
  }
  // Verifica nome do seller
  if (sellerName) {
    const norm = sellerName.toLowerCase().trim();
    return authorizedSellers.some(
      (s) => s.seller_name.toLowerCase().trim() === norm
    );
  }
  return false;
}

// ─── Email alert ─────────────────────────────────────────────────────────────

async function sendViolationAlert(
  violations: ScannedListing[],
  productName: string,
  ean: string
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[market-scanner] RESEND_API_KEY not set, skipping email");
    return;
  }

  const resend = new Resend(apiKey);

  const rows = violations
    .map((v) => {
      const price = v.price_cents
        ? `R$ ${(v.price_cents / 100).toFixed(2).replace(".", ",")}`
        : "preço não detectado";
      const violation =
        v.violation === "both"
          ? "🔴 Seller não autorizado + preço abaixo do piso"
          : v.violation === "unauthorized_seller"
            ? "🔴 Seller não autorizado"
            : "🟡 Preço abaixo do piso";
      return `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #eee">${v.source}</td>
          <td style="padding:8px;border-bottom:1px solid #eee">${v.seller_name ?? "desconhecido"}</td>
          <td style="padding:8px;border-bottom:1px solid #eee">${price}</td>
          <td style="padding:8px;border-bottom:1px solid #eee">${violation}</td>
          <td style="padding:8px;border-bottom:1px solid #eee"><a href="${v.url}">ver anúncio</a></td>
        </tr>`;
    })
    .join("");

  const html = `
    <div style="font-family:sans-serif;max-width:700px;margin:0 auto">
      <h2 style="color:#003087">⚠️ Launch Tracker — Alerta de Violação</h2>
      <p><strong>Produto:</strong> ${productName} (EAN: ${ean})</p>
      <p><strong>Data/hora:</strong> ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</p>
      <p><strong>Violações encontradas:</strong> ${violations.length}</p>
      <table style="width:100%;border-collapse:collapse;margin-top:16px">
        <thead>
          <tr style="background:#003087;color:white">
            <th style="padding:8px;text-align:left">Canal</th>
            <th style="padding:8px;text-align:left">Seller</th>
            <th style="padding:8px;text-align:left">Preço</th>
            <th style="padding:8px;text-align:left">Violação</th>
            <th style="padding:8px;text-align:left">Link</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin-top:24px;color:#666;font-size:12px">
        PlayStation Launch Tracker — monitoramento automático
      </p>
    </div>`;

  try {
    await resend.emails.send({
      from: "Launch Tracker <alerts@launchtracker.live>",
      to: ALERT_EMAIL,
      subject: `⚠️ [Launch Tracker] ${violations.length} violação(ões) detectada(s) — ${productName}`,
      html,
    });
    console.log(`[market-scanner] Alert email sent for ${violations.length} violations`);
  } catch (err) {
    console.error("[market-scanner] Failed to send alert email:", err);
  }
}

// ─── Save to DB ───────────────────────────────────────────────────────────────

async function saveMarketScan(
  admin: Admin,
  result: ScanResult
): Promise<void> {
  // Upsert listings into price_snapshots with source metadata
  for (const listing of result.listings) {
    if (!listing.price_cents && !listing.seller_name) continue;

    // Find or create retailer record based on source name
    let { data: retailer } = await admin
      .from("retailers")
      .select("id")
      .ilike("name", listing.source)
      .maybeSingle();

    if (!retailer) {
      const { data: newRetailer } = await admin
        .from("retailers")
        .insert({
          name: listing.source,
          slug: listing.source.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
          kind: "marketplace",
          active: true,
          display_order: 99,
        })
        .select("id")
        .single();
      retailer = newRetailer;
    }

    if (!retailer) continue;

    await admin.from("price_snapshots").insert({
      product_id: result.product_id,
      retailer_id: retailer.id,
      seller_name: listing.seller_name,
      product_url: listing.url,
      price_avista_cents: listing.price_cents,
      in_stock: listing.in_stock,
      is_first_party: listing.is_authorized,
      collection_status: listing.violation ? "violation" : "ok",
      raw_payload: {
        source: listing.source,
        is_authorized: listing.is_authorized,
        violation: listing.violation,
        raw_title: listing.raw_title,
        scanned_at: result.scan_at,
      },
    });
  }
}

// ─── Main scanner ─────────────────────────────────────────────────────────────

export async function runMarketScan(
  admin: Admin,
  productId?: string
): Promise<{ scanned: number; violations: number; newSellers: number }> {
  let prodQuery = admin
    .from("products")
    .select("id, name, ean, srp_cents, max_discount_avista_pct")
    .eq("active", true);

  if (productId) prodQuery = prodQuery.eq("id", productId);

  const { data: products } = await prodQuery;
  if (!products?.length) return { scanned: 0, violations: 0, newSellers: 0 };

  let totalScanned = 0;
  let totalViolations = 0;
  let totalNewSellers = 0;

  for (const product of products) {
    if (!product.ean) continue;

    const ean = product.ean;
    const floorCents = Math.round(
      product.srp_cents * (1 - (product.max_discount_avista_pct / 100))
    );

    // Get authorized sellers
    const authorizedSellers = await getAuthorizedSellers(admin, product.id);
    const { data: retailers } = await admin
      .from("retailers")
      .select("slug")
      .eq("active", true);
    const authorizedSlugs = retailers?.map((r) => r.slug) ?? [];

    const listings: ScannedListing[] = [];

    // 1. Busca ampla por EAN no Brasil inteiro via Firecrawl
    console.log(`[market-scanner] Searching EAN ${ean} broadly...`);
    const broadResults = await fcSearch(
      `"${ean}" comprar PS5 site:mercadolivre.com.br OR site:amazon.com.br OR site:shopee.com.br OR site:kabum.com.br OR site:americanas.com.br OR site:magazineluiza.com.br`,
      { limit: 20 }
    );

    // Also search without site restriction to find indie sellers
    const openResults = await fcSearch(
      `${ean} Marvel Wolverine PS5 comprar Brasil`,
      { limit: 15 }
    );

    const allResults = [...broadResults, ...openResults];
    const seenUrls = new Set<string>();

    for (const result of allResults) {
      if (!result.url) continue;
      if (seenUrls.has(result.url)) continue;
      seenUrls.add(result.url);

      // Skip non-product URLs
      if (
        result.url.includes("youtube.com") ||
        result.url.includes("reddit.com") ||
        result.url.includes("twitter.com") ||
        result.url.includes("instagram.com") ||
        result.url.includes("tiktok.com")
      )
        continue;

      // Determine source
      let source = "site independente";
      if (result.url.includes("mercadolivre.com.br")) source = "Mercado Livre";
      else if (result.url.includes("amazon.com.br")) source = "Amazon";
      else if (result.url.includes("shopee.com.br")) source = "Shopee";
      else if (result.url.includes("kabum.com.br")) source = "Kabum";
      else if (result.url.includes("americanas.com.br")) source = "Americanas";
      else if (result.url.includes("magazineluiza.com.br")) source = "Magazine Luiza";
      else if (result.url.includes("carrefour.com.br")) source = "Carrefour";

      // Extract price and seller from description/title first (fast path)
      const combinedText = [
        result.title ?? "",
        result.description ?? "",
        result.markdown ?? "",
      ].join(" ");

      let priceCents = extractPrice(combinedText);
      let sellerName = extractSeller(combinedText);

      // If marketplace and no seller found, try scraping
      if (
        !sellerName &&
        ["Mercado Livre", "Amazon", "Shopee"].includes(source)
      ) {
        const markdown = await fcScrape(result.url);
        if (markdown) {
          priceCents = priceCents ?? extractPrice(markdown);
          sellerName = sellerName ?? extractSeller(markdown);
        }
      }

      const authorized = isAuthorized(
        sellerName,
        result.url,
        authorizedSellers,
        authorizedSlugs
      );

      const priceBelowFloor =
        priceCents != null && priceCents < floorCents;

      let violation: ScannedListing["violation"] = null;
      if (!authorized && priceBelowFloor) violation = "both";
      else if (!authorized) violation = "unauthorized_seller";
      else if (priceBelowFloor) violation = "price_below_floor";

      listings.push({
        source,
        url: result.url,
        seller_name: sellerName,
        price_cents: priceCents,
        in_stock: null,
        is_authorized: authorized,
        violation,
        raw_title: result.title,
      });

      totalScanned++;
    }

    const violations = listings.filter((l) => l.violation !== null);
    totalViolations += violations.length;
    totalNewSellers += listings.filter((l) => !l.is_authorized).length;

    const scanResult: ScanResult = {
      product_id: product.id,
      ean,
      listings,
      violations,
      new_sellers: listings.filter((l) => !l.is_authorized).length,
      scan_at: new Date().toISOString(),
    };

    // Save to DB
    await saveMarketScan(admin, scanResult);

    // Send email alert if violations found
    if (violations.length > 0) {
      await sendViolationAlert(violations, product.name, ean);
    }

    console.log(
      `[market-scanner] ${product.name}: ${listings.length} listings, ${violations.length} violations`
    );
  }

  return {
    scanned: totalScanned,
    violations: totalViolations,
    newSellers: totalNewSellers,
  };
}
