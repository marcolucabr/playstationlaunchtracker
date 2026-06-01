ALTER TABLE public.collection_runs
  ADD COLUMN IF NOT EXISTS sources_breakdown jsonb,
  ADD COLUMN IF NOT EXISTS coupons_inserted integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trends_snapshots_inserted integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS keyword_snapshots_inserted integer NOT NULL DEFAULT 0;