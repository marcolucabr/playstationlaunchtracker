DELETE FROM public.product_retailer_urls WHERE retailer_id IN (SELECT id FROM public.retailers WHERE slug = 'submarino');
DELETE FROM public.retailers WHERE slug = 'submarino';

INSERT INTO public.retailers (slug, name, kind, category, active, display_order)
VALUES ('gamer-hut', 'Gamer Hut', '3p', 'pure_online', true, 100)
ON CONFLICT (slug) DO NOTHING;