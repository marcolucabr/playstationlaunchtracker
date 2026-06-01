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
        .select("id, name, ean, release_date, presale_starts_at, presale_allowed")
        .order("name"),
      admin
        .from("retailers")
        .select("id, name, slug, category, display_order, active")
        .order("display_order"),
    ]);
    return { products: products ?? [], retailers: retailers ?? [] };
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
