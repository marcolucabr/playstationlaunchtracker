/**
 * market-scanner.server.ts
 * Varredura ampla de mercado por EAN — Brasil.
 */

import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

import type { Database } from "@/integrations/supabase/types";

type Admin = ReturnType<typeof createClient<Database>>;

const ALERT_EMAIL = "marcoluca_@hotmail.com"; // temp — trocar para marco.luca@sony.com após verificar domínio

export type ScannedListing = {
  source: string;
  url: string;
  seller_name: string | null;
  price_cents: number | null;
  in_stock: boolean | null;
  is_authorized: boolean;
  violation: "unauthorized_seller" | "price_below_floor" | "both" | null;
  raw_title?: string;
};

// ─── Firecrawl ────────────────────────────────────────────────────────────────

type FcResult = { url?: string; title?: string; description?: string };

async function fcSearch(query: string, limit = 10): Promise<FcResult[]> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) return [];
  try {
    const res = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit, lang: "pt", country: "br" }),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: FcResult[]; web?: FcResult[] };
    return json.data ?? json.web ?? [];
  } catch {
    return [];
  }
}

// ─── Price extraction ─────────────────────────────────────────────────────────

function extractPrice(text: string): number | null {
  const matches = [...text.matchAll(/R\$\s*([\d]{1,4}[.,]\d{2,3})/gi)];
  for (const m of matches) {
    const val = parseFloat(m[1].replace(/\./g, "").replace(",", "."));
    if (isFinite(val) && val > 50 && val < 2000) return Math.round(val * 100);
  }
  return null;
}

function extractSeller(text: string): string | null {
  const m = text.match(/vendido (?:e entregue )?por[:\s]+([^\n\|<"]{3,50})/i)
    ?? text.match(/oferta de[:\s]+([^\n\|<"]{3,50})/i)
    ?? text.match(/loja[:\s]+([^\n\|<"]{3,50})/i);
  return m?.[1]?.trim().replace(/['"]/g, "") ?? null;
}

// ─── Authorization ────────────────────────────────────────────────────────────

async function getAuthorizedSellers(admin: Admin, productId: string) {
  const { data } = await admin
    .from("authorized_sellers")
    .select("seller_name, retailer_id")
    .eq("product_id", productId);
  return data ?? [];
}

function isAuthorized(
  sellerName: string | null,
  url: string,
  authorizedSellers: { seller_name: string }[],
  authorizedSlugs: string[]
): boolean {
  try {
    const hostname = new URL(url).hostname.replace("www.", "");
    if (authorizedSlugs.some((s) => hostname.includes(s))) return true;
  } catch { /* ignore */ }
  if (sellerName) {
    const norm = sellerName.toLowerCase().trim();
    return authorizedSellers.some((s) => s.seller_name.toLowerCase().trim() === norm);
  }
  return false;
}

// ─── Email ────────────────────────────────────────────────────────────────────

async function sendAlert(violations: ScannedListing[], productName: string, ean: string) {
  if (!violations.length) return;

  const rows = violations.map((v) => {
    const price = v.price_cents ? `R$ ${(v.price_cents / 100).toFixed(2).replace(".", ",")}` : "—";
    const tag = v.violation === "both" ? "🔴 Seller + preço" : v.violation === "unauthorized_seller" ? "🔴 Seller não autorizado" : "🟡 Preço abaixo do piso";
    return `<tr><td style="padding:8px;border-bottom:1px solid #eee">${v.source}</td><td style="padding:8px;border-bottom:1px solid #eee">${v.seller_name ?? "?"}</td><td style="padding:8px;border-bottom:1px solid #eee">${price}</td><td style="padding:8px;border-bottom:1px solid #eee">${tag}</td><td style="padding:8px;border-bottom:1px solid #eee"><a href="${v.url}">ver</a></td></tr>`;
  }).join("");

  const html = `<div style="font-family:sans-serif;max-width:700px"><h2 style="color:#003087">⚠️ Alerta de Violação</h2><p><b>Produto:</b> ${productName} (EAN: ${ean})</p><p><b>Data:</b> ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</p><table style="width:100%;border-collapse:collapse"><thead><tr style="background:#003087;color:white"><th style="padding:8px;text-align:left">Canal</th><th style="padding:8px;text-align:left">Seller</th><th style="padding:8px;text-align:left">Preço</th><th style="padding:8px;text-align:left">Violação</th><th style="padding:8px;text-align:left">Link</th></tr></thead><tbody>${rows}</tbody></table></div>`;

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: `"Launch Tracker" <${process.env.GMAIL_USER}>`,
      to: ALERT_EMAIL,
      subject: `⚠️ [Launch Tracker] ${violations.length} violação(ões) — ${productName}`,
      html,
    });
    console.log("[market-scanner] email sent via Gmail");
  } catch (e) {
    console.error("[market-scanner] email error:", e);
  }
}

// ─── Save results ─────────────────────────────────────────────────────────────

async function saveAlerts(admin: Admin, violations: ScannedListing[], productId: string) {
  for (const v of violations) {
    await admin.from("market_scan_alerts").insert({
      product_id: productId,
      source: v.source,
      seller_name: v.seller_name,
      product_url: v.url,
      price_cents: v.price_cents,
      violation: v.violation!,
      is_authorized: v.is_authorized,
      raw_payload: { raw_title: v.raw_title },
    }).then(({ error }) => {
      if (error) console.error("[market-scanner] insert error:", error.message);
    });
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export async function runMarketScan(
  admin: Admin,
  productId?: string
): Promise<{ scanned: number; violations: number }> {
  let q = admin.from("products").select("id, name, ean, srp_cents, max_discount_avista_pct").eq("active", true);
  if (productId) q = q.eq("id", productId);
  const { data: products } = await q;
  if (!products?.length) return { scanned: 0, violations: 0 };

  let totalScanned = 0;
  let totalViolations = 0;

  for (const product of products) {
    if (!product.ean) continue;

    const ean = product.ean;
    const floorCents = Math.round(product.srp_cents * (1 - product.max_discount_avista_pct / 100));
    const authorizedSellers = await getAuthorizedSellers(admin, product.id);
    const { data: retailers } = await admin.from("retailers").select("slug").eq("active", true);
    const authorizedSlugs = retailers?.map((r) => r.slug) ?? [];

    // Busca focada nos principais marketplaces BR
    const results = await fcSearch(
      `"${ean}" Wolverine PS5`,
      10
    );

    const listings: ScannedListing[] = [];
    const seenUrls = new Set<string>();

    for (const r of results) {
      if (!r.url) continue;
      if (seenUrls.has(r.url)) continue;
      seenUrls.add(r.url);

      const url = r.url.toLowerCase();
      if (url.includes("youtube") || url.includes("reddit") || url.includes("instagram") || url.includes("twitter") || url.includes("tiktok")) continue;

      let source = "site independente";
      if (url.includes("mercadolivre")) source = "Mercado Livre";
      else if (url.includes("amazon.com.br")) source = "Amazon";
      else if (url.includes("shopee")) source = "Shopee";
      else if (url.includes("kabum")) source = "Kabum";
      else if (url.includes("americanas")) source = "Americanas";
      else if (url.includes("magazineluiza") || url.includes("magalu")) source = "Magazine Luiza";
      else if (url.includes("carrefour")) source = "Carrefour";
      else if (url.includes("vivo")) source = "Vivo";

      // Skip results clearly not about this product
      const titleLower = (r.title ?? "").toLowerCase();
      const descLower = (r.description ?? "").toLowerCase();
      const combined = titleLower + " " + descLower;
      const isRelevant = combined.includes("wolverine") || combined.includes(ean) || combined.includes("711719028116");
      if (!isRelevant) continue;

      const text = [r.title ?? "", r.description ?? ""].join(" ");
      const priceCents = extractPrice(text);
      const sellerName = extractSeller(text);
      const authorized = isAuthorized(sellerName, r.url, authorizedSellers, authorizedSlugs);
      const priceBelowFloor = priceCents != null && priceCents < floorCents;

      let violation: ScannedListing["violation"] = null;
      if (!authorized && priceBelowFloor) violation = "both";
      else if (!authorized) violation = "unauthorized_seller";
      else if (priceBelowFloor) violation = "price_below_floor";

      listings.push({ source, url: r.url, seller_name: sellerName, price_cents: priceCents, in_stock: null, is_authorized: authorized, violation, raw_title: r.title });
      totalScanned++;
    }

    const violations = listings.filter((l) => l.violation !== null);
    totalViolations += violations.length;

    if (violations.length > 0) {
      await saveAlerts(admin, violations, product.id);
      await sendAlert(violations, product.name, ean);
    }

    // Always save a diagnostic record so we know the scan ran
    await admin.from("market_scan_alerts").insert({
      product_id: product.id,
      source: "SISTEMA",
      seller_name: null,
      product_url: "diagnostic",
      price_cents: null,
      violation: "unauthorized_seller",
      is_authorized: true,
      raw_payload: {
        diagnostic: true,
        scanned: listings.length,
        violations: violations.length,
        firecrawl_results: results.length,
        ean,
        ran_at: new Date().toISOString(),
      },
    }).then(() => {}).catch(() => {});
  }

  return { scanned: totalScanned, violations: totalViolations };
}
