export const brl = (cents: number | null | undefined) =>
  cents == null
    ? "—"
    : (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const pct = (n: number) => `${n.toFixed(1).replace(".", ",")}%`;

export type PriceStatus =
  | "ok"
  | "abaixo_piso"
  | "acima_srp"
  | "vendedor_nao_autorizado"
  | "pre_venda_nao_permitida"
  | "sem_desconto";

export const statusLabel: Record<PriceStatus, string> = {
  ok: "Conforme",
  abaixo_piso: "Abaixo do piso à vista",
  acima_srp: "Acima do SRP",
  vendedor_nao_autorizado: "Vendedor não autorizado",
  pre_venda_nao_permitida: "Pré-venda não permitida",
  sem_desconto: "SRP cheio (sem desconto)",
};

export const statusTone: Record<PriceStatus, "green" | "yellow" | "red"> = {
  ok: "green",
  sem_desconto: "yellow",
  abaixo_piso: "red",
  acima_srp: "red",
  vendedor_nao_autorizado: "red",
  pre_venda_nao_permitida: "red",
};

export const toneClass: Record<"green" | "yellow" | "red", string> = {
  green: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  yellow: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
  red: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30",
};

export const dotClass: Record<"green" | "yellow" | "red", string> = {
  green: "bg-emerald-500",
  yellow: "bg-amber-500",
  red: "bg-rose-500",
};
