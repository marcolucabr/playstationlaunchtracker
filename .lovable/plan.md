## Plano: Conectar dados reais ao painel

Implementação em **3 etapas**. Cada uma é testável sozinha.

---

### Etapa 1 — Cadastro de URLs por (produto, varejista)

Sem URL cadastrada, o coletor não tem o que ler.

**Banco:** nova tabela `product_retailer_urls`
- `product_id` (uuid, FK lógica → products)
- `retailer_id` (uuid, FK lógica → retailers)
- `url` (text)
- `active` (boolean, default true)
- `last_status` (text, nullable — "ok", "blocked", "not_found", "error")
- `last_checked_at` (timestamptz, nullable)
- UNIQUE (product_id, retailer_id)
- RLS: leitura pública (igual products/retailers), escrita só admin

**UI:** nova aba "URLs" no painel `/admin`
- Tabela com linhas = produto × varejista (15 linhas para Wolverine)
- Input inline para colar URL + toggle ativo
- Botão "Salvar"

---

### Etapa 2 — Coletor de preços (fetch puro + manual)

**Server function** `runCollection({ productId? })` em `src/lib/collector.functions.ts`, protegida por `requireSupabaseAuth` + checagem de admin:

1. Cria `collection_runs` (status=running, trigger=manual)
2. Para cada URL ativa:
   - `fetch(url, { headers: { 'User-Agent': '...realista...', 'Accept-Language': 'pt-BR' } })`
   - Extrai preço de 3 fontes nessa ordem (parser próprio, sem dep nova):
     - **JSON-LD** `<script type="application/ld+json">` com `@type: Product` → `offers.price`, `priceCurrency`, `availability`, `seller`
     - **Meta tags** `og:price:amount`, `product:price:amount`
     - **Microdata** `itemprop="price"`
   - Detecta bloqueio: status 403/503, ou HTML contém "captcha"/"Access Denied" → marca `blocked`
   - Insere `price_snapshots` (price_avista_cents, price_full_cents quando der, seller_name, in_stock, status, raw_payload com o trecho extraído)
   - Atualiza `product_retailer_urls.last_status` + `last_checked_at`
3. Fecha o run (status=success/partial/error, counters preenchidos)

**Aviso visível ao usuário no admin:** "Lojas que renderizam preço via JavaScript (Amazon, ML, Magalu, etc.) provavelmente vão retornar `blocked`. Para essas, ativar Firecrawl depois (Etapa 3)."

**UI:** botão **"Coletar agora"** no topo do `/admin`
- Dispara `runCollection({})` (todos os produtos)
- Mostra toast com counters: "X coletados, Y bloqueados, Z erros"
- Atualiza tabela de snapshots em tempo real (invalidate query)

**Card novo no AdminDashboard:** "Últimas execuções" lendo `collection_runs` (status, gatilho, contagens, tempo).

---

### Etapa 3 — Agendamento + (futuro) Firecrawl fallback

**Cron diário** via `pg_cron` + `pg_net`:
- Rota pública `/api/public/hooks/collect-all` valida header `apikey` (anon key)
- Chama mesma `runCollection({})` com trigger=`scheduled`
- Roda 1×/dia às 03:00 BRT (06:00 UTC)

**Firecrawl como fallback (preparado, não ativado):**
- Quando uma URL retorna `blocked`, marcar para retry com Firecrawl
- Implementação fica comentada/feature-flag até você conectar o Firecrawl

---

### Ordem de execução

1. Migration (tabela + RLS) — você aprova
2. UI de cadastro de URLs + botão coletar
3. Server function de coleta + parser
4. Card "Últimas execuções" no dashboard
5. Cron + rota pública (Etapa 3)

Posso começar pela migration?