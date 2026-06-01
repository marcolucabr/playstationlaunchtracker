import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import {
  listManualKeywords,
  addManualKeyword,
  toggleManualKeyword,
  deleteManualKeyword,
} from "@/lib/keywords.functions";

export function KeywordsManager() {
  const qc = useQueryClient();
  const listFn = useServerFn(listManualKeywords);
  const addFn = useServerFn(addManualKeyword);
  const toggleFn = useServerFn(toggleManualKeyword);
  const delFn = useServerFn(deleteManualKeyword);

  const { data, isLoading } = useQuery({ queryKey: ["manual-keywords"], queryFn: () => listFn({}) });
  const [term, setTerm] = useState("");
  const [productId, setProductId] = useState<string>("");

  const invalidate = () => qc.invalidateQueries({ queryKey: ["manual-keywords"] });

  const addMut = useMutation({
    mutationFn: (v: { productId: string; term: string }) => addFn({ data: v }),
    onSuccess: () => { invalidate(); setTerm(""); toast.success("Palavra-chave adicionada"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const togMut = useMutation({
    mutationFn: (v: { id: string; active: boolean }) => toggleFn({ data: v }),
    onSuccess: invalidate,
  });
  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { invalidate(); toast.success("Removida"); },
  });

  if (isLoading || !data) return <Card><CardContent className="p-6 text-slate-500">Carregando…</CardContent></Card>;

  const currentProductId = productId || data.products[0]?.id || "";
  const currentProduct = data.products.find((p) => p.id === currentProductId);
  const productKeywords = data.keywords.filter((k) => k.product_id === currentProductId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Search className="h-4 w-4 text-blue-600" /> Palavras-chave manuais
        </CardTitle>
        <p className="text-xs text-slate-500 mt-1">
          Termos extras usados na busca de Reddit, YouTube, Notícias e Trends, <strong>além</strong> do nome do produto. Use sinônimos, codinomes, hashtags etc.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.products.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            {data.products.map((p) => (
              <Button
                key={p.id}
                size="sm"
                variant={p.id === currentProductId ? "default" : "outline"}
                onClick={() => setProductId(p.id)}
              >
                {p.name}
              </Button>
            ))}
          </div>
        )}

        {currentProduct && (
          <div className="space-y-3">
            <div className="text-sm">
              <span className="text-slate-500">Buscas automáticas para</span>{" "}
              <strong>{currentProduct.name} {currentProduct.platform ?? ""}</strong>
            </div>

            <div className="flex gap-2">
              <Input
                placeholder='Ex: "insomniac wolverine", "marvel wolverine 2026"'
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && term.trim()) {
                    addMut.mutate({ productId: currentProductId, term });
                  }
                }}
              />
              <Button
                onClick={() => term.trim() && addMut.mutate({ productId: currentProductId, term })}
                disabled={!term.trim() || addMut.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-1" /> Adicionar
              </Button>
            </div>

            {productKeywords.length === 0 ? (
              <p className="text-sm text-slate-400 italic">
                Nenhuma palavra-chave manual ainda. A busca usa apenas o nome do produto.
              </p>
            ) : (
              <div className="space-y-1">
                {productKeywords.map((k) => (
                  <div key={k.id} className="flex items-center justify-between gap-2 text-sm border-b border-slate-100 py-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant={k.active ? "default" : "outline"} className="text-xs shrink-0">
                        {k.active ? "ativa" : "pausada"}
                      </Badge>
                      <code className="rounded bg-muted px-1.5 py-0.5 truncate">{k.term}</code>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch
                        checked={k.active}
                        onCheckedChange={(v) => togMut.mutate({ id: k.id, active: v })}
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { if (confirm(`Remover "${k.term}"?`)) delMut.mutate(k.id); }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
