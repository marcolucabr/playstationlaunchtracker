
-- Enums for status classification
CREATE TYPE public.price_status AS ENUM (
  'ok',
  'abaixo_piso',
  'acima_srp',
  'vendedor_nao_autorizado',
  'pre_venda_nao_permitida',
  'sem_desconto'
);

CREATE TYPE public.retailer_kind AS ENUM ('1p', '3p', 'both');

CREATE TYPE public.alias_kind AS ENUM (
  'ean', 'asin', 'keyword', 'hashtag', 'url', 'concept_id', 'other'
);

CREATE TYPE public.mention_source AS ENUM (
  'twitter', 'reddit', 'youtube', 'tiktok', 'instagram', 'forum', 'blog', 'other'
);

CREATE TYPE public.sentiment AS ENUM ('positive', 'neutral', 'negative');

CREATE TYPE public.run_trigger AS ENUM ('manual', 'cron');
CREATE TYPE public.run_status AS ENUM ('running', 'success', 'partial', 'failed');

-- Products
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  platform TEXT,
  ean TEXT UNIQUE,
  srp_cents INTEGER NOT NULL,
  max_discount_avista_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  presale_allowed BOOLEAN NOT NULL DEFAULT false,
  presale_starts_at TIMESTAMPTZ,
  release_date DATE,
  active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.products TO anon, authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_read_all" ON public.products FOR SELECT USING (true);

-- Product aliases (search terms per source)
CREATE TABLE public.product_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  kind public.alias_kind NOT NULL,
  value TEXT NOT NULL,
  scope TEXT, -- e.g. 'amazon', 'reddit', 'global'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX product_aliases_product_idx ON public.product_aliases(product_id);

GRANT SELECT ON public.product_aliases TO anon, authenticated;
GRANT ALL ON public.product_aliases TO service_role;
ALTER TABLE public.product_aliases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aliases_read_all" ON public.product_aliases FOR SELECT USING (true);

-- Retailers
CREATE TABLE public.retailers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  kind public.retailer_kind NOT NULL,
  website TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.retailers TO anon, authenticated;
GRANT ALL ON public.retailers TO service_role;
ALTER TABLE public.retailers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "retailers_read_all" ON public.retailers FOR SELECT USING (true);

-- Authorized sellers
CREATE TABLE public.authorized_sellers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  retailer_id UUID NOT NULL REFERENCES public.retailers(id) ON DELETE CASCADE,
  seller_name TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, retailer_id, seller_name)
);

GRANT SELECT ON public.authorized_sellers TO anon, authenticated;
GRANT ALL ON public.authorized_sellers TO service_role;
ALTER TABLE public.authorized_sellers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_sellers_read_all" ON public.authorized_sellers FOR SELECT USING (true);

-- Price snapshots
CREATE TABLE public.price_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  retailer_id UUID NOT NULL REFERENCES public.retailers(id) ON DELETE CASCADE,
  is_first_party BOOLEAN NOT NULL,
  seller_name TEXT,
  product_url TEXT,
  price_avista_cents INTEGER,
  price_full_cents INTEGER,
  installment_count INTEGER,
  installment_value_cents INTEGER,
  installment_total_cents INTEGER,
  is_presale BOOLEAN NOT NULL DEFAULT false,
  in_stock BOOLEAN,
  status public.price_status NOT NULL DEFAULT 'ok',
  raw_payload JSONB,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX price_snapshots_product_captured_idx ON public.price_snapshots(product_id, captured_at DESC);
CREATE INDEX price_snapshots_retailer_captured_idx ON public.price_snapshots(retailer_id, captured_at DESC);

GRANT SELECT ON public.price_snapshots TO anon, authenticated;
GRANT ALL ON public.price_snapshots TO service_role;
ALTER TABLE public.price_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "snapshots_read_all" ON public.price_snapshots FOR SELECT USING (true);

-- Mentions
CREATE TABLE public.mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  source public.mention_source NOT NULL,
  source_name TEXT,
  author TEXT,
  url TEXT,
  title TEXT,
  excerpt TEXT,
  sentiment public.sentiment,
  engagement INTEGER,
  posted_at TIMESTAMPTZ,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX mentions_product_posted_idx ON public.mentions(product_id, posted_at DESC NULLS LAST);

GRANT SELECT ON public.mentions TO anon, authenticated;
GRANT ALL ON public.mentions TO service_role;
ALTER TABLE public.mentions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mentions_read_all" ON public.mentions FOR SELECT USING (true);

-- Collection runs
CREATE TABLE public.collection_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  trigger public.run_trigger NOT NULL DEFAULT 'manual',
  status public.run_status NOT NULL DEFAULT 'running',
  retailers_checked INTEGER NOT NULL DEFAULT 0,
  snapshots_inserted INTEGER NOT NULL DEFAULT 0,
  mentions_inserted INTEGER NOT NULL DEFAULT 0,
  errors JSONB,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);

GRANT SELECT ON public.collection_runs TO anon, authenticated;
GRANT ALL ON public.collection_runs TO service_role;
ALTER TABLE public.collection_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "runs_read_all" ON public.collection_runs FOR SELECT USING (true);
