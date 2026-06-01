import { createFileRoute } from "@tanstack/react-router";
import { runScheduledCollection } from "@/lib/collector.functions";

export const Route = createFileRoute("/api/public/hooks/collect-all")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Auth: require the Supabase publishable key in the `apikey` header.
        // pg_cron already sends it (see migration 20260601024805). This blocks
        // anonymous internet callers from triggering paid Firecrawl/AI work.
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
        const provided = request.headers.get("apikey");
        if (!expected || provided !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }

        try {
          const result = await runScheduledCollection();
          return new Response(JSON.stringify({ success: true, ...result }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error("collect-all failed", msg);
          return new Response(JSON.stringify({ success: false, error: msg }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
