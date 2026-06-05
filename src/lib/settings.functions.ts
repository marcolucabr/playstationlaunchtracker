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

export type RetailerCategory =
  | "pure_online"
  | "hybrid_retail"
  | "physical_stores"
  | "telco"
  | "marketplace"
  | "regional_retailer";

export const listSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const admin = adminClient();
    const [{ data: products }, { data: retailers }] = await Promise.all([
      admin
        .from("products")
        .select("id, name, ean, platform, release_date, presale_starts_at, presale_allowed, active, srp_cents")
        .order("active", { ascending: false })
        .order("name"),
      admin
        .from("retailers")
        .select("id, name, slug, category, display_order, active")
        .order("display_order"),
    ]);
    return { products: products ?? [], retailers: retailers ?? [] };
  });

export const setActiveLaunch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    ean: string;
    name?: string;
    platform?: string;
    release_date?: string | null;
    srp_cents?: number | null;
  }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const admin = adminClient();
    const ean = data.ean.trim();
    if (!/^\d{8,14}$/.test(ean)) throw new Error("EAN inválido (use apenas dígitos, 8 a 14)");

    const { data: existing, error: selErr } = await admin
      .from("products")
      .select("id, name, platform, release_date, srp_cents")
      .eq("ean", ean)
      .maybeSingle();
    if (selErr) throw new Error(selErr.message);

    // Deactivate everything else
    const { error: deactErr } = await admin
      .from("products")
      .update({ active: false })
      .neq("ean", ean);
    if (deactErr) throw new Error(deactErr.message);

    if (existing) {
      const patch: {
        active: boolean;
        name?: string;
        platform?: string;
        release_date?: string | null;
        srp_cents?: number;
      } = { active: true };
      if (data.name) patch.name = data.name;
      if (data.platform) patch.platform = data.platform;
      if (data.release_date !== undefined) patch.release_date = data.release_date;
      if (data.srp_cents != null) patch.srp_cents = data.srp_cents;
      const { error } = await admin.from("products").update(patch).eq("id", existing.id);
      if (error) throw new Error(error.message);
      return { ok: true, productId: existing.id, created: false };
    }

    const { data: created, error: insErr } = await admin
      .from("products")
      .insert({
        ean,
        name: data.name?.trim() || `Lançamento ${ean}`,
        platform: data.platform?.trim() || "PS5",
        release_date: data.release_date ?? null,
        srp_cents: data.srp_cents ?? 0,
        active: true,
      })
      .select("id")
      .single();
    if (insErr) throw new Error(insErr.message);
    return { ok: true, productId: created.id, created: true };
  });

export const updateProductDates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    productId: string;
    release_date: string | null;
    presale_starts_at: string | null;
  }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const admin = adminClient();
    const { error } = await admin
      .from("products")
      .update({
        release_date: data.release_date,
        presale_starts_at: data.presale_starts_at,
      })
      .eq("id", data.productId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateRetailerCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { retailerId: string; category: RetailerCategory | null }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const admin = adminClient();
    const { error } = await admin
      .from("retailers")
      .update({ category: data.category })
      .eq("id", data.retailerId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { productId: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const admin = adminClient();
    const pid = data.productId;
    // Remove dependent rows first (no FKs declared, so we clean manually)
    await admin.from("price_snapshots").delete().eq("product_id", pid);
    await admin.from("coupon_snapshots").delete().eq("product_id", pid);
    await admin.from("keyword_snapshots").delete().eq("product_id", pid);
    await admin.from("trends_snapshots").delete().eq("product_id", pid);
    await admin.from("mentions").delete().eq("product_id", pid);
    await admin.from("product_retailer_urls").delete().eq("product_id", pid);
    await admin.from("manual_keywords").delete().eq("product_id", pid);
    await admin.from("product_aliases").delete().eq("product_id", pid);
    await admin.from("authorized_sellers").delete().eq("product_id", pid);
    await admin.from("market_scan_alerts").delete().eq("product_id", pid);
    await admin.from("collection_runs").delete().eq("product_id", pid);
    const { error } = await admin.from("products").delete().eq("id", pid);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
