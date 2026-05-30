# Painel Wolverine PS5 — Plano de implementação

## Objetivo
Painel interno com visibilidade de **preço, parcelamento, sellers autorizados e menções sociais** do título Wolverine (PS5), atualizando 2x/dia (08h30 e 13h00).

## Fase 1 — Fundação (esta entrega)

### 1.1 Backend (Lovable Cloud)
Ativar Lovable Cloud e criar as tabelas:

- **products** — catálogo (Wolverine PS5: EAN 711719028116, SRP 399,90, max_desc_avista 7%)
- **product_aliases** — termos/IDs de busca (EAN, ASIN, palavras-chave, hashtags)
- **retailers** — lista fixa que você passou, com flags `is_1p` / `is_3p`
- **authorized_sellers** — vendedores 3P autorizados (você cadastra; o resto vira "não autorizado" em vermelho)
- **price_snapshots** — uma linha por captura: retailer, seller, preço à vista, preço cheio, nº parcelas, valor da parcela, URL, timestamp, status (`ok` / `abaixo_piso` / `acima_srp` / `vendedor_nao_autorizado` / `pre_venda_nao_permitida`)
- **mentions** — menções sociais/fóruns (fonte, autor, URL, trecho, sentimento, timestamp)
- **collection_runs** — log de execuções do crawler

### 1.2 Regras de classificação (semáforo)
- 🟢 Verde: à vista entre R$ 371,91 e R$ 399,90, parcelamento sobre R$ 399,90, seller autorizado
- 🟡 Amarelo: à vista no SRP cheio sem desconto, ou parcelamento abaixo de 399,90 (desconto indevido no à prazo)
- 🔴 Vermelho: abaixo de R$ 371,91, seller 3P não autorizado, ou pré-venda fora do período permitido

### 1.3 Dashboard (UI)
- **Header**: card do título com EAN, SRP, regras, próxima coleta
- **Grid de varejistas**: cada um com 1P e 3P separados, mostrando melhor preço à vista, parcelamento (ex: "10x de R$ 39,99"), seller, status colorido, link
- **Tabela de violações**: tudo que está 🔴 ou 🟡, ordenado por gravidade
- **Histórico**: gráfico de preço médio por varejista ao longo do tempo
- **Aba Social**: feed de menções com filtros por fonte e sentimento
- **Aba Sellers**: gestão dos vendedores autorizados (CRUD simples)

### 1.4 Estrutura de coleta (server functions)
- `runCollection` — server function disparada manualmente (botão "Coletar agora") que itera sobre retailers + aliases
- Cron 2x/dia via endpoint `/api/public/cron-collect` (você configura o agendador externo apontando para o URL estável do projeto, ou usamos pg_cron)
- Integração com **Firecrawl** (search + scrape) para varejistas e fóruns

## Fase 2 — Coleta real (próxima entrega, após pré-venda abrir)
- Conectar Firecrawl
- Scrapers por varejista (cada um tem estrutura HTML diferente)
- Extração de seller name em marketplaces (Amazon 3P, ML 3P, etc.)
- Social listening (Twitter/X, Reddit, fóruns BR de games — GamerDic, GameVicio, PS5Brasil)
- Alertas (e-mail/Slack) quando algo vira 🔴

## Esta entrega cobre
Fase 1 completa: schema + dashboard funcional com dados de exemplo (seed) para você validar a UX antes da pré-venda abrir. Quando o EAN aparecer no varejo, ligamos a coleta real numa segunda iteração.

## Confirmação
Pré-cadastro de **sellers autorizados**: você quer já cadastrar agora (me passa a lista) ou deixo a tela vazia para você preencher pelo painel depois?
