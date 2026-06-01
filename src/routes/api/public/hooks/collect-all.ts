import { createFileRoute } from "@tanstack/react-router";
import { runScheduledCollection } from "@/lib/collector.functions";

export const Route = createFileRoute("/api/public/hooks/collect-all")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const result = await runScheduledCollection();
          return new Response(JSON.stringify({ success: true, ...result }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error("collect-all failed", msg);
          return new Response(JSON.stringify({ ok: false, error: msg }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
