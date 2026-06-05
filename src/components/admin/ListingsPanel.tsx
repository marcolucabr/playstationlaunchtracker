import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, ShoppingBag } from "lucide-react";
import { listListings } from "@/lib/collector.functions";

function fmtBRL(cents: number | null | undefined) {
  if (cents == null) return "—";
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ListingsPanel() {
  const fn = useServerFn(listListings);
  const { data, isLoading } = useQuery({
    queryKey: ["listings"],
    queryFn: () => fn({}),
  });

  const grouped = useMemo(() => {
    if (!data) return null;
    const productById = new Map(data.products.map((p) => [p.id, p]));
    const retailerById = new Map(data.retailers.map((r) => [r.id, r]));

    // Group by product → retailer → listings[]
    const byProduct = new Map<string, Map<string, typeof data.listings>>();
    for (const l of data.listings) {
      if (!productById.has(l.product_id) || !retailerById.has(l.retailer_id)) continue;
      let pm = byProduct.get(l.product_id);
      if (!pm) { pm = new Map(); byProduct.set(l.product_id, pm); }
      const arr = pm.get(l.retailer_id) ?? [];
      arr.push(l);
      pm.set(l.retailer_id, arr);
    }
    return { productById, retailerById, byProduct };
  }, [data]);

  if (isLoading || !data || !grouped) {
    return <Card><CardContent className="p-6 text-slate-500">Carregando anúncios…</CardContent></Card>;
  }

  const total = data.listings.length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-blue-600" />
            {total} anúncio{total === 1 ? "" : "s"} ativos
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">
          Lista todos os anúncios coletados com sucesso (última leitura por vendedor e URL). Atualizado a cada coleta.
        </CardContent>
      </Card>

      {[...grouped.byProduct.entries()].map(([pid, retMap]) => {
        const product = grouped.productById.get(pid)!;
        const productTotal = [...retMap.values()].reduce((a, b) => a + b.length, 0);
        return (
          <Card key={pid}>
            <CardHeader>
              <CardTitle className="text-base">
                {product.name}
                <span className="ml-2 text-xs font-normal text-slate-500">· {product.platform} · {productTotal} anúncio{productTotal === 1 ? "" : "s"}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[...retMap.entries()]
                .sort((a, b) => b[1].length - a[1].length)
                .map(([rid, listings]) => {
                  const retailer = grouped.retailerById.get(rid)!;
                  const fp = listings.filter((l) => l.is_first_party).length;
                  const tp = listings.length - fp;
                  return (
                    <div key={rid} className="border-l-2 border-slate-200 pl-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-sm">{retailer.name}</span>
                        <Badge variant="secondary" className="text-xs">{listings.length}</Badge>
                        {fp > 0 && <Badge className="text-xs bg-emerald-100 text-emerald-700 hover:bg-emerald-100">{fp} 1P</Badge>}
                        {tp > 0 && <Badge className="text-xs bg-slate-100 text-slate-700 hover:bg-slate-100">{tp} 3P</Badge>}
                      </div>
                      <div className="space-y-1">
                        {listings.map((l, i) => (
                          <div key={i} className="flex items-center justify-between text-sm gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`inline-block w-1.5 h-1.5 rounded-full ${l.is_first_party ? "bg-emerald-500" : "bg-slate-400"}`} />
                              <span className="truncate text-slate-700">
                                {l.seller_name ?? <span className="italic text-slate-400">vendedor não identificado</span>}
                              </span>
                              {l.in_stock === false && <Badge variant="outline" className="text-xs">sem estoque</Badge>}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="flex flex-col items-end leading-tight">
                                <span className="font-mono text-sm">{fmtBRL(l.price_avista_cents)} <span className="text-[10px] font-normal text-slate-500">à vista</span></span>
                                {l.price_full_cents != null && l.price_full_cents !== l.price_avista_cents && (
                                  <span className="font-mono text-xs text-slate-500">{fmtBRL(l.price_full_cents)} <span className="text-[10px]">a prazo</span></span>
                                )}
                              </div>
                              {l.product_url && (
                                <a href={l.product_url} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-slate-700">
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
            </CardContent>
          </Card>
        );
      })}

      {grouped.byProduct.size === 0 && (
        <Card><CardContent className="p-6 text-center text-slate-500">Nenhum anúncio coletado ainda. Clique em <strong>"Coletar agora"</strong> ou aguarde a próxima coleta agendada.</CardContent></Card>
      )}
    </div>
  );
}
