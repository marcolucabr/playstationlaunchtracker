CREATE TABLE public.product_retailer_urls (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL,
  retailer_id uuid NOT NULL,
  url text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  last_status text,
  last_checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, retailer_id)
);

GRANT SELECT ON public.product_retailer_urls TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_retailer_urls TO authenticated;
GRANT ALL ON public.product_retailer_urls TO service_role;

ALTER TABLE public.product_retailer_urls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pru_read_all" ON public.product_retailer_urls FOR SELECT USING (true);
CREATE POLICY "pru_admin_insert" ON public.product_retailer_urls FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "pru_admin_update" ON public.product_retailer_urls FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "pru_admin_delete" ON public.product_retailer_urls FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_pru_updated_at
BEFORE UPDATE ON public.product_retailer_urls
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Allow admins to insert/update price_snapshots and collection_runs from server fns
GRANT INSERT, UPDATE ON public.price_snapshots TO authenticated;
GRANT INSERT, UPDATE ON public.collection_runs TO authenticated;

CREATE POLICY "snapshots_admin_insert" ON public.price_snapshots FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "runs_admin_insert" ON public.collection_runs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "runs_admin_update" ON public.collection_runs FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));