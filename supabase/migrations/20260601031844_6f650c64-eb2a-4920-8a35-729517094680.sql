
-- 1. Add 'news' to mention_source enum
ALTER TYPE mention_source ADD VALUE IF NOT EXISTS 'news';

-- 2. Trends snapshots (Google Trends interest over time)
CREATE TABLE public.trends_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  geo TEXT NOT NULL DEFAULT 'BR',
  timeframe TEXT NOT NULL DEFAULT 'today 1-m',
  keyword TEXT NOT NULL,
  series JSONB NOT NULL,            -- [{date, value}]
  avg_value NUMERIC,
  peak_value NUMERIC,
  peak_date DATE
);

GRANT SELECT ON public.trends_snapshots TO anon;
GRANT SELECT ON public.trends_snapshots TO authenticated;
GRANT ALL ON public.trends_snapshots TO service_role;

ALTER TABLE public.trends_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trends_read_all" ON public.trends_snapshots FOR SELECT USING (true);

CREATE INDEX idx_trends_product_captured ON public.trends_snapshots(product_id, captured_at DESC);

-- 3. Keyword snapshots (Google Autocomplete BR)
CREATE TABLE public.keyword_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  seed TEXT NOT NULL,
  suggestions JSONB NOT NULL,        -- [{term, source}]
  source TEXT NOT NULL DEFAULT 'google_autocomplete'
);

GRANT SELECT ON public.keyword_snapshots TO anon;
GRANT SELECT ON public.keyword_snapshots TO authenticated;
GRANT ALL ON public.keyword_snapshots TO service_role;

ALTER TABLE public.keyword_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "keywords_read_all" ON public.keyword_snapshots FOR SELECT USING (true);

CREATE INDEX idx_keywords_product_captured ON public.keyword_snapshots(product_id, captured_at DESC);

-- 4. Allow service_role to write mentions (collector inserts mentions now)
GRANT INSERT ON public.mentions TO service_role;
