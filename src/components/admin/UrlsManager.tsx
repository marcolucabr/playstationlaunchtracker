import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Save, ExternalLink, AlertCircle, CheckCircle2, Ban, HelpCircle } from "lucide-react";
import { listProductRetailerUrls, saveProductRetailerUrl } from "@/lib/collector.functions";
import { toast } from "sonner";

function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <Badge variant="outline" className="text-xs">nunca</Badge>;
  const map: Record<string, { icon: React.ReactNode; cls: string; label: string }> = {
    ok: { icon: <CheckCircle2 className="h-3 w-3" />, cls: "bg-emerald-100 text-emerald-700", label: "OK" },
    blocked: { icon: <Ban className="h-3 w-3" />, cls: "bg-amber-100 text-amber-700", label: "Bloqueado" },
    not_found: { icon: <HelpCircle className="h-3 w-3" />, cls: "bg-slate-100 text-slate-600", label: "Sem preço" },
    error: { icon: <AlertCircle className="h-3 w-3" />, cls: "bg-red-100 text-red-700", label: "Erro" },
  };
  const m = map[status] ?? { icon: null, cls: "bg-slate-100 text-slate-600", label: status };
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded ${m.cls}`}>
      {m.icon}
      {m.label}
    </span>
  );
}

type Row = { product_id: string; retailer_id: string; url: string; active: boolean; dirty: boolean; last_status?: string | null };

export function UrlsManager() {
  const qc = useQueryClient();
  const listFn = useServerFn(listProductRetailerUrls);
  const saveFn = useServerFn(saveProductRetailerUrl);

  const { data, isLoading } = useQuery({
    queryKey: ["pru"],
    queryFn: () => listFn({}),
  });

  const [rows, setRows] = useState<Map<string, Row>>(new Map());

  useEffect(() => {
    if (!data) return;
    const m = new Map<string, Row>();
    for (const p of data.products) {
      for (const r of data.retailers) {
        const key = `${p.id}|${r.id}`;
        const existing = data.urls.find((u) => u.product_id === p.id && u.retailer_id === r.id);
        m.set(key, {
          product_id: p.id,
          retailer_id: r.id,
          url: existing?.url ?? "",
          active: existing?.active ?? true,
          dirty: false,
          last_status: existing?.last_status,
        });
      }
    }
    setRows(m);
  }, [data]);

  const saveMut = useMutation({
    mutationFn: (row: Row) =>
      saveFn({ data: { productId: row.product_id, retailerId: row.retailer_id, url: row.url, active: row.active } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pru"] });
      toast.success("URL salva");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const dirtyRows = useMemo(() => [...rows.values()].filter((r) => r.dirty), [rows]);

  const update = (key: string, patch: Partial<Row>) => {
    setRows((prev) => {
      const next = new Map(prev);
      const cur = next.get(key);
      if (!cur) return prev;
      next.set(key, { ...cur, ...patch, dirty: true });
      return next;
    });
  };

  const saveAll = async () => {
    for (const r of dirtyRows) {
      await saveMut.mutateAsync(r);
    }
  };

  if (isLoading || !data) return <Card><CardContent className="p-6 text-slate-500">Carregando…</CardContent></Card>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">URLs por loja</CardTitle>
        {dirtyRows.length > 0 && (
          <Button size="sm" onClick={saveAll} disabled={saveMut.isPending} className="bg-blue-600 hover:bg-blue-700">
            <Save className="h-4 w-4 mr-1" /> Salvar {dirtyRows.length} alteraç{dirtyRows.length === 1 ? "ão" : "ões"}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {data.products.map((p) => (
          <div key={p.id} className="space-y-2">
            <div className="text-sm font-semibold">
              {p.name} <span className="text-xs text-slate-500">· {p.platform}</span>
            </div>
            <div className="space-y-1">
              {data.retailers.map((r) => {
                const key = `${p.id}|${r.id}`;
                const row = rows.get(key);
                if (!row) return null;
                return (
                  <div key={key} className="flex items-center gap-2 text-sm">
                    <div className="w-32 text-slate-600 shrink-0">{r.name}</div>
                    <Input
                      placeholder="https://www.loja.com.br/produto..."
                      value={row.url}
                      onChange={(e) => update(key, { url: e.target.value })}
                      className="h-8 text-xs"
                    />
                    <Switch
                      checked={row.active}
                      onCheckedChange={(v) => update(key, { active: v })}
                    />
                    <div className="w-20 shrink-0"><StatusBadge status={row.last_status} /></div>
                    {row.url && (
                      <a href={row.url} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-slate-700 shrink-0">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
