-- Add category enum for retailer grouping
CREATE TYPE public.retailer_category AS ENUM (
  'pure_online',
  'hybrid_retail',
  'physical_stores',
  'telco',
  'marketplace',
  'regional_retailer'
);

ALTER TABLE public.retailers
  ADD COLUMN category public.retailer_category;

-- Pre-populate categories for known retailers (slug-based)
UPDATE public.retailers SET category = 'pure_online' WHERE slug IN ('amazon','kabum','mercadolivre','mercado-livre','webfones');
UPDATE public.retailers SET category = 'hybrid_retail' WHERE slug IN ('magazineluiza','magazine-luiza','magalu');
UPDATE public.retailers SET category = 'physical_stores' WHERE slug IN ('carrefour','samsclub','sams-club','lasa','americanas','submarino','shoptime');
UPDATE public.retailers SET category = 'telco' WHERE slug IN ('tim','vivo','claro');
UPDATE public.retailers SET category = 'marketplace' WHERE slug IN ('casasbahia','casas-bahia','shopee','pontofrio','ponto-frio','extra');
UPDATE public.retailers SET category = 'regional_retailer' WHERE slug IN ('havan','gazin','bemol');

-- Set Wolverine release / presale dates
UPDATE public.products
SET release_date = DATE '2026-09-15',
    presale_starts_at = TIMESTAMPTZ '2026-06-02 22:00:00+00'
WHERE ean = '711719028116';
