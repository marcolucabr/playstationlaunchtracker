
-- Restrict collection_runs to admins only
DROP POLICY IF EXISTS runs_read_all ON public.collection_runs;
CREATE POLICY runs_admin_read ON public.collection_runs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
REVOKE SELECT ON public.collection_runs FROM anon;

-- Restrict product_retailer_urls to admins only
DROP POLICY IF EXISTS pru_read_all ON public.product_retailer_urls;
CREATE POLICY pru_admin_read ON public.product_retailer_urls FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
REVOKE SELECT ON public.product_retailer_urls FROM anon;

-- Restrict manual_keywords to admins only
DROP POLICY IF EXISTS manual_keywords_read_all ON public.manual_keywords;
CREATE POLICY manual_keywords_admin_read ON public.manual_keywords FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
REVOKE SELECT ON public.manual_keywords FROM anon;

-- Restrict keyword_snapshots to authenticated users
DROP POLICY IF EXISTS keywords_read_all ON public.keyword_snapshots;
CREATE POLICY keywords_auth_read ON public.keyword_snapshots FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.keyword_snapshots FROM anon;

-- Restrict trends_snapshots to authenticated users
DROP POLICY IF EXISTS trends_read_all ON public.trends_snapshots;
CREATE POLICY trends_auth_read ON public.trends_snapshots FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.trends_snapshots FROM anon;

-- Restrict other operational tables to authenticated (dashboard needs them)
DROP POLICY IF EXISTS mentions_read_all ON public.mentions;
CREATE POLICY mentions_auth_read ON public.mentions FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.mentions FROM anon;

DROP POLICY IF EXISTS coupons_read_all ON public.coupon_snapshots;
CREATE POLICY coupons_auth_read ON public.coupon_snapshots FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.coupon_snapshots FROM anon;

DROP POLICY IF EXISTS snapshots_read_all ON public.price_snapshots;
CREATE POLICY snapshots_auth_read ON public.price_snapshots FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.price_snapshots FROM anon;

DROP POLICY IF EXISTS auth_sellers_read_all ON public.authorized_sellers;
CREATE POLICY auth_sellers_auth_read ON public.authorized_sellers FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.authorized_sellers FROM anon;

DROP POLICY IF EXISTS aliases_read_all ON public.product_aliases;
CREATE POLICY aliases_auth_read ON public.product_aliases FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.product_aliases FROM anon;

DROP POLICY IF EXISTS retailers_read_all ON public.retailers;
CREATE POLICY retailers_auth_read ON public.retailers FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.retailers FROM anon;

-- products: authenticated only, and hide internal 'notes' column from non-admin
DROP POLICY IF EXISTS products_read_all ON public.products;
CREATE POLICY products_auth_read ON public.products FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.products FROM anon;
REVOKE SELECT (notes) ON public.products FROM authenticated;
GRANT SELECT (id, name, platform, ean, srp_cents, max_discount_avista_pct, presale_allowed, presale_starts_at, release_date, active, created_at, updated_at) ON public.products TO authenticated;

-- Lock down SECURITY DEFINER functions: only service_role and postgres can execute directly
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
