import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function parseUA(ua: string): { device: string; browser: string; os: string } {
  const isMobile = /Mobile|Android|iPhone|iPad/i.test(ua);
  const isTablet = /iPad|Tablet/i.test(ua);
  const device = isTablet ? "Tablet" : isMobile ? "Mobile" : "Desktop";
  let browser = "Unknown";
  if (/Edg\//.test(ua)) browser = "Edge";
  else if (/Chrome\//.test(ua)) browser = "Chrome";
  else if (/Firefox\//.test(ua)) browser = "Firefox";
  else if (/Safari\//.test(ua)) browser = "Safari";
  let os = "Unknown";
  if (/Windows/.test(ua)) os = "Windows";
  else if (/Mac OS X|Macintosh/.test(ua)) os = "macOS";
  else if (/Android/.test(ua)) os = "Android";
  else if (/iPhone|iPad|iOS/.test(ua)) os = "iOS";
  else if (/Linux/.test(ua)) os = "Linux";
  return { device, browser, os };
}

export const recordLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const req = getRequest();
    const ua = req?.headers.get("user-agent") ?? "";
    const ip =
      req?.headers.get("cf-connecting-ip") ||
      req?.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req?.headers.get("x-real-ip") ||
      null;
    const country = req?.headers.get("cf-ipcountry") || null;
    const city = req?.headers.get("cf-ipcity") || null;
    const { device, browser, os } = parseUA(ua);

    const { data, error } = await context.supabase
      .from("login_sessions")
      .insert({
        user_id: context.userId,
        ip_address: ip,
        user_agent: ua,
        device, browser, os,
        country, city,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return data.id as string;
  });

export const heartbeatSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { sessionId: string }) => d)
  .handler(async ({ data, context }) => {
    await context.supabase
      .from("login_sessions")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", data.sessionId)
      .eq("user_id", context.userId);
    return { ok: true };
  });

export const endSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { sessionId: string }) => d)
  .handler(async ({ data, context }) => {
    await context.supabase
      .from("login_sessions")
      .update({ logout_at: new Date().toISOString(), last_seen_at: new Date().toISOString() })
      .eq("id", data.sessionId)
      .eq("user_id", context.userId);
    return { ok: true };
  });
