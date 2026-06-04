-- Fix EAN for Wolverine PS5 (correct barcode)
UPDATE public.products
SET ean = '711719028116'
WHERE ean IS NULL OR ean != '711719028116';

-- Ensure srp_cents and max_discount are correct for Wolverine
UPDATE public.products
SET
  srp_cents = 39990,
  max_discount_avista_pct = 7
WHERE name ILIKE '%wolverine%';

-- Market scan alerts table
CREATE TABLE IF NOT EXISTS public.market_scan_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL,
  source TEXT NOT NULL,
  seller_name TEXT,
  product_url TEXT NOT NULL,
  price_cents INTEGER,
  violation TEXT NOT NULL, -- 'unauthorized_seller' | 'price_below_floor' | 'both'
  is_authorized BOOLEAN NOT NULL DEFAULT false,
  alerted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  notes TEXT,
  raw_payload JSONB
);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS market_scan_alerts_product_id_idx ON public.market_scan_alerts(product_id);
CREATE INDEX IF NOT EXISTS market_scan_alerts_alerted_at_idx ON public.market_scan_alerts(alerted_at DESC);
CREATE INDEX IF NOT EXISTS market_scan_alerts_resolved_at_idx ON public.market_scan_alerts(resolved_at);

-- RLS: only admin can read/write
ALTER TABLE public.market_scan_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_market_scan_alerts"
  ON public.market_scan_alerts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );
