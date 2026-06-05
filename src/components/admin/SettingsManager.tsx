import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  listSettings,
  updateProductDates,
  updateRetailerCategory,
  setActiveLaunch,
  deleteProduct,
  type RetailerCategory,
} from "@/lib/settings.functions";
import { Trash2 } from "lucide-react";

const CATEGORY_LABELS: Record<RetailerCategory, string> = {
  pure_online: "Puro online",
  hybrid_retail: "Varejo híbrido",
  physical_stores: "Lojas físicas",
  telco: "Telecom",
  marketplace: "Marketplace",
  regional_retailer: "Varejo regional",
};

export function SettingsManager() {
  const qc = useQueryClient();
  const listFn = useServerFn(listSettings);
  const updProd = useServerFn(updateProductDates);
  const updCat = useServerFn(updateRetailerCategory);
  const setLaunchFn = useServerFn(setActiveLaunch);
  const delProdFn = useServerFn(deleteProduct);

  const { data, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: () => listFn({}),
  });

  const [launch, setLaunch] = useState({ ean: "", name: "", platform: "PS5", release_date: "", srp: "" });
  const activeProduct = data?.products.find((p) => p.active);

  useEffect(() => {
    if (!activeProduct) return;
    setLaunch({
      ean: activeProduct.ean ?? "",
      name: activeProduct.name ?? "",
      platform: activeProduct.platform ?? "PS5",
      release_date: activeProduct.release_date ?? "",
      srp: activeProduct.srp_cents ? (activeProduct.srp_cents / 100).toFixed(2) : "",
    });
  }, [activeProduct?.id]);

  const setLaunchMut = useMutation({
    mutationFn: () =>
      setLaunchFn({
        data: {
          ean: launch.ean,
          name: launch.name || undefined,
          platform: launch.platform || undefined,
          release_date: launch.release_date || null,
          srp_cents: launch.srp ? Math.round(parseFloat(launch.srp.replace(",", ".")) * 100) : null,
        },
      }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(r.created ? "Novo lançamento criado e ativado" : "Lançamento ativo atualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [prodForms, setProdForms] = useState<Record<string, { release_date: string; presale_starts_at: string }>>({});

  useEffect(() => {
    if (!data) return;
    const m: typeof prodForms = {};
    for (const p of data.products) {
      m[p.id] = {
        release_date: p.release_date ?? "",
        presale_starts_at: p.presale_starts_at ? new Date(p.presale_starts_at).toISOString().slice(0, 16) : "",
      };
    }
    setProdForms(m);
  }, [data]);

  const saveProd = useMutation({
    mutationFn: (vars: { productId: string; release_date: string | null; presale_starts_at: string | null }) =>
      updProd({ data: vars }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Datas atualizadas");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delProdMut = useMutation({
    mutationFn: (productId: string) => delProdFn({ data: { productId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Produto deletado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveCat = useMutation({
    mutationFn: (vars: { retailerId: string; category: RetailerCategory | null }) =>
      updCat({ data: vars }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="text-sm text-muted-foreground">Carregando…</div>;

  return (
    <div className="space-y-4">
      <Card className="border-blue-300">
        <CardHeader>
          <CardTitle className="text-base">Lançamento ativo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Informe o <strong>EAN</strong> do lançamento que o tracker deve monitorar. Trocar aqui
            desativa os outros produtos e faz toda a coleta (preços, menções, trends, cupons) passar
            a buscar este EAN. Se o EAN já existir, ele é reativado; senão, é criado.
          </p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[180px_1fr_120px_160px_140px_auto] md:items-end">
            <div>
              <Label className="text-xs">EAN</Label>
              <Input
                inputMode="numeric"
                placeholder="7117190281166"
                value={launch.ean}
                onChange={(e) => setLaunch({ ...launch, ean: e.target.value.replace(/\D/g, "") })}
              />
            </div>
            <div>
              <Label className="text-xs">Nome</Label>
              <Input
                placeholder="Marvel's Wolverine"
                value={launch.name}
                onChange={(e) => setLaunch({ ...launch, name: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">Plataforma</Label>
              <Input
                placeholder="PS5"
                value={launch.platform}
                onChange={(e) => setLaunch({ ...launch, platform: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">Lançamento</Label>
              <Input
                type="date"
                value={launch.release_date}
                onChange={(e) => setLaunch({ ...launch, release_date: e.target.value })}
              />
            </div>
            <div>
              <Label className="text-xs">SRP (R$)</Label>
              <Input
                inputMode="decimal"
                placeholder="349.90"
                value={launch.srp}
                onChange={(e) => setLaunch({ ...launch, srp: e.target.value })}
              />
            </div>
            <Button
              onClick={() => setLaunchMut.mutate()}
              disabled={setLaunchMut.isPending || !launch.ean}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {setLaunchMut.isPending ? "Salvando…" : "Ativar"}
            </Button>
          </div>
          {activeProduct && (
            <div className="text-xs text-muted-foreground">
              Ativo agora: <strong>{activeProduct.name}</strong> · EAN {activeProduct.ean ?? "—"} ·{" "}
              {activeProduct.platform ?? "—"}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datas dos produtos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {data?.products.map((p) => {
            const f = prodForms[p.id] ?? { release_date: "", presale_starts_at: "" };
            return (
              <div key={p.id} className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_auto_auto_auto] md:items-end border-b pb-4 last:border-0">
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">EAN: {p.ean ?? "—"}</div>
                </div>
                <div>
                  <Label className="text-xs">Lançamento</Label>
                  <Input
                    type="date"
                    value={f.release_date}
                    onChange={(e) => setProdForms({ ...prodForms, [p.id]: { ...f, release_date: e.target.value } })}
                    className="w-40"
                  />
                </div>
                <div>
                  <Label className="text-xs">Pré-venda (BRT)</Label>
                  <Input
                    type="datetime-local"
                    value={f.presale_starts_at}
                    onChange={(e) => setProdForms({ ...prodForms, [p.id]: { ...f, presale_starts_at: e.target.value } })}
                    className="w-52"
                  />
                </div>
                <Button
                  size="sm"
                  onClick={() =>
                    saveProd.mutate({
                      productId: p.id,
                      release_date: f.release_date || null,
                      presale_starts_at: f.presale_starts_at ? new Date(f.presale_starts_at).toISOString() : null,
                    })
                  }
                  disabled={saveProd.isPending}
                >
                  Salvar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    if (confirm(`Deletar "${p.name}" (EAN ${p.ean ?? "—"})?\n\nIsso remove o produto e todos os dados coletados (preços, menções, trends, cupons, URLs, palavras-chave). Esta ação não pode ser desfeita.`)) {
                      delProdMut.mutate(p.id);
                    }
                  }}
                  disabled={delProdMut.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Categorias das lojas</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-muted-foreground">
            Define o agrupamento exibido no card "Lojas mapeadas" do dashboard.
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Loja</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Categoria</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.retailers.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.slug}</TableCell>
                  <TableCell>
                    <Select
                      value={r.category ?? "__none__"}
                      onValueChange={(v) =>
                        saveCat.mutate({
                          retailerId: r.id,
                          category: v === "__none__" ? null : (v as RetailerCategory),
                        })
                      }
                    >
                      <SelectTrigger className="w-56 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— sem categoria —</SelectItem>
                        {(Object.keys(CATEGORY_LABELS) as RetailerCategory[]).map((k) => (
                          <SelectItem key={k} value={k}>{CATEGORY_LABELS[k]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
