INSERT INTO public.retailers (slug, name, kind, category, active, display_order)
VALUES ('submarino', 'Submarino', '3p', 'marketplace', true, 100)
ON CONFLICT (slug) DO NOTHING;