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

export const adminListUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const admin = adminClient();

    const { data: profiles } = await admin.from("profiles").select("*").order("created_at", { ascending: false });
    const { data: roles } = await admin.from("user_roles").select("user_id, role");
    const { data: sessions } = await admin
      .from("login_sessions")
      .select("user_id, login_at, last_seen_at, logout_at, ip_address, device, browser, os, country, city")
      .order("login_at", { ascending: false });

    const rolesByUser = new Map<string, string>();
    (roles ?? []).forEach((r) => rolesByUser.set(r.user_id, r.role));

    const sessionsByUser = new Map<string, typeof sessions>();
    (sessions ?? []).forEach((s) => {
      const arr = sessionsByUser.get(s.user_id) ?? [];
      arr.push(s);
      sessionsByUser.set(s.user_id, arr);
    });

    return (profiles ?? []).map((p) => ({
      id: p.id,
      email: p.email,
      full_name: p.full_name,
      created_at: p.created_at,
      role: rolesByUser.get(p.id) ?? "viewer",
      sessions: sessionsByUser.get(p.id) ?? [],
    }));
  });

export const adminCreateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { email: string; password: string; fullName?: string; role: "admin" | "viewer" }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const admin = adminClient();
    const { data: created, error } = await admin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName ?? "" },
    });
    if (error) throw new Error(error.message);
    const newId = created.user!.id;
    // Override default role if admin requested
    if (data.role === "admin") {
      await admin.from("user_roles").delete().eq("user_id", newId);
      await admin.from("user_roles").insert({ user_id: newId, role: "admin" });
    }
    return { id: newId };
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.userId === context.userId) throw new Error("Cannot delete yourself");
    const admin = adminClient();
    const { error } = await admin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminUpdateRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { userId: string; role: "admin" | "viewer" }) => d)
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const admin = adminClient();
    await admin.from("user_roles").delete().eq("user_id", data.userId);
    const { error } = await admin.from("user_roles").insert({ user_id: data.userId, role: data.role });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
