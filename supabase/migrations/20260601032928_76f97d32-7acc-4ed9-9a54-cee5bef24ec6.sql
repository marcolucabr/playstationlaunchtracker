-- Coupon snapshots: cupons coletados de Promobit/Pelando/Cuponomia
CREATE TABLE public.coupon_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL,
  retailer_id UUID,
  source TEXT NOT NULL, -- 'promobit', 'pelando', 'cuponomia'
  source_url TEXT,
  code TEXT,
  title TEXT NOT NULL,
  description TEXT,
  discount_pct NUMERIC,
  discount_value_cents INTEGER,
  retailer_name TEXT,
  valid_until DATE,
  stackable BOOLEAN,
  upvotes INTEGER,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.coupon_snapshots TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupon_snapshots TO authenticated;
GRANT ALL ON public.coupon_snapshots TO service_role;

ALTER TABLE public.coupon_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coupons_read_all" ON public.coupon_snapshots FOR SELECT USING (true);

CREATE INDEX idx_coupons_product_captured ON public.coupon_snapshots(product_id, captured_at DESC);

-- Manual keywords: termos adicionados pelo admin para expandir buscas
CREATE TABLE public.manual_keywords (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL,
  term TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, term)
);

GRANT SELECT ON public.manual_keywords TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manual_keywords TO authenticated;
GRANT ALL ON public.manual_keywords TO service_role;

ALTER TABLE public.manual_keywords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "manual_keywords_read_all" ON public.manual_keywords FOR SELECT USING (true);
CREATE POLICY "manual_keywords_admin_insert" ON public.manual_keywords FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "manual_keywords_admin_update" ON public.manual_keywords FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "manual_keywords_admin_delete" ON public.manual_keywords FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));