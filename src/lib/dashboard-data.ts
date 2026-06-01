import { supabase } from "@/integrations/supabase/client";

export const WOLVERINE_EAN = "711719028116";

export type RetailerCategoryKey =
  | "pure_online"
  | "hybrid_retail"
  | "physical_stores"
  | "telco"
  | "marketplace"
  | "regional_retailer";

export type DashboardData = {
  product: {
    id: string;
    name: string;
    platform: string | null;
    ean: string | null;
    srp_cents: number;
    max_discount_avista_pct: number;
    presale_allowed: boolean;
    notes: string | null;
    release_date: string | null;
    presale_starts_at: string | null;
  };
  retailers: Array<{
    id: string;
    name: string;
    slug: string;
    kind: "1p" | "3p" | "both";
    display_order: number;
    category: RetailerCategoryKey | null;
  }>;
  snapshots: Array<{
    id: string;
    retailer_id: string;
    is_first_party: boolean;
    seller_name: string | null;
    product_url: string | null;
    price_avista_cents: number | null;
    price_full_cents: number | null;
    installment_count: number | null;
    installment_value_cents: number | null;
    installment_total_cents: number | null;
    is_presale: boolean;
    status:
      | "ok"
      | "abaixo_piso"
      | "acima_srp"
      | "vendedor_nao_autorizado"
      | "pre_venda_nao_permitida"
      | "sem_desconto";
    captured_at: string;
  }>;
  authorizedSellers: Array<{
    id: string;
    retailer_id: string;
    seller_name: string;
  }>;
  mentions: Array<{
    id: string;
    source: string;
    source_name: string | null;
    author: string | null;
    url: string | null;
    title: string | null;
    excerpt: string | null;
    sentiment: "positive" | "neutral" | "negative" | null;
    engagement: number | null;
    posted_at: string | null;
  }>;
  coupons: Array<{
    id: string;
    source: string;
    source_url: string | null;
    code: string | null;
    title: string;
    description: string | null;
    discount_pct: number | null;
    discount_value_cents: number | null;
    retailer_name: string | null;
    captured_at: string;
  }>;
  trends: Array<{
    id: string;
    keyword: string;
    geo: string;
    timeframe: string;
    series: Array<{ date: string; timestamp: number; value: number }>;
    avg_value: number | null;
    peak_value: number | null;
    peak_date: string | null;
    captured_at: string;
  }>;
  keywordSuggestions: Array<{
    id: string;
    seed: string;
    source: string;
    suggestions: Array<{ term: string; seed: string }>;
    captured_at: string;
  }>;
  manualKeywords: Array<{ id: string; term: string; active: boolean; created_at: string }>;
  aliases: Array<{ id: string; kind: string; value: string; scope: string | null }>;
};

export async function fetchDashboard(): Promise<DashboardData> {
  const { data: product, error: pErr } = await supabase
    .from("products")
    .select("*")
    .eq("ean", WOLVERINE_EAN)
    .maybeSingle();
  if (pErr || !product) throw new Error(pErr?.message ?? "Produto não encontrado");

  const [retailers, snapshots, sellers, mentions, aliases, coupons, trends, keywordSuggestions, manualKeywords] = await Promise.all([
    supabase.from("retailers").select("*").order("display_order"),
    supabase
      .from("price_snapshots")
      .select("*")
      .eq("product_id", product.id)
      .order("captured_at", { ascending: false })
      .limit(500),
    supabase.from("authorized_sellers").select("*").eq("product_id", product.id),
    supabase
      .from("mentions")
      .select("*")
      .eq("product_id", product.id)
      .order("captured_at", { ascending: false })
      .limit(100),
    supabase.from("product_aliases").select("*").eq("product_id", product.id),
    supabase
      .from("coupon_snapshots")
      .select("*")
      .eq("product_id", product.id)
      .order("captured_at", { ascending: false })
      .limit(80),
    supabase
      .from("trends_snapshots")
      .select("*")
      .eq("product_id", product.id)
      .order("captured_at", { ascending: false })
      .limit(5),
    supabase
      .from("keyword_snapshots")
      .select("*")
      .eq("product_id", product.id)
      .order("captured_at", { ascending: false })
      .limit(5),
    supabase
      .from("manual_keywords")
      .select("id, term, active, created_at")
      .eq("product_id", product.id)
      .order("created_at", { ascending: false }),
  ]);

  return {
    product,
    retailers: retailers.data ?? [],
    snapshots: snapshots.data ?? [],
    authorizedSellers: sellers.data ?? [],
    mentions: mentions.data ?? [],
    aliases: aliases.data ?? [],
    coupons: (coupons.data ?? []) as unknown as DashboardData["coupons"],
    trends: (trends.data ?? []) as unknown as DashboardData["trends"],
    keywordSuggestions: (keywordSuggestions.data ?? []) as unknown as DashboardData["keywordSuggestions"],
    manualKeywords: (manualKeywords.data ?? []) as DashboardData["manualKeywords"],
  } as DashboardData;
}

