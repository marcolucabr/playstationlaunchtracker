
DELETE FROM public.price_snapshots;

DO $$
DECLARE
  v_product_id uuid;
  v_srp int;
  v_floor int;
  r record;
  d int;
  hr int;
  cap timestamptz;
  base int;
  jitter int;
  avista int;
  prazo int;
  installments int;
  inst_val int;
  party boolean;
  parties boolean[];
  p_idx int;
  seller_name text;
  status text;
BEGIN
  SELECT id, srp_cents, ROUND(srp_cents * (1 - max_discount_avista_pct/100))::int
    INTO v_product_id, v_srp, v_floor
    FROM public.products
    ORDER BY created_at LIMIT 1;

  FOR r IN SELECT id, slug, name, kind FROM public.retailers WHERE active LOOP
    IF r.kind = '1p' THEN parties := ARRAY[true];
    ELSIF r.kind = '3p' THEN parties := ARRAY[false];
    ELSE parties := ARRAY[true, false];
    END IF;

    base := v_srp - (abs(hashtext(r.slug)) % 3500);

    FOR d IN 0..6 LOOP
      FOREACH hr IN ARRAY ARRAY[9, 13] LOOP
        cap := date_trunc('day', now()) - (d || ' days')::interval + (hr || ' hours')::interval;

        FOR p_idx IN 1..array_length(parties, 1) LOOP
          party := parties[p_idx];
          jitter := (abs(hashtext(r.slug || d::text || hr::text || party::text)) % 2200) - 1100;
          avista := base + jitter - CASE WHEN party THEN 0 ELSE 1500 END;
          prazo := ROUND(avista / 0.93)::int;
          installments := 12;
          inst_val := ROUND(prazo::numeric / installments)::int;

          IF avista > v_srp THEN status := 'acima_srp';
          ELSIF avista < v_floor THEN status := 'abaixo_piso';
          ELSE status := 'ok';
          END IF;

          IF party THEN
            seller_name := NULL;
          ELSE
            seller_name := CASE r.slug
              WHEN 'amazon' THEN 'Marketplace Games BR'
              WHEN 'mercado-livre' THEN 'GameStop Oficial'
              WHEN 'magalu' THEN 'Game Play Fulfillment'
              WHEN 'americanas' THEN 'TecToy Store'
              WHEN 'kabum' THEN 'KaBuM Marketplace Parceiro'
              WHEN 'carrefour' THEN 'TopGames BR'
              WHEN 'fast-shop' THEN 'FastShop Marketplace'
              WHEN 'shopee' THEN 'Webfones'
              ELSE 'Seller Parceiro'
            END;
          END IF;

          INSERT INTO public.price_snapshots
            (product_id, retailer_id, captured_at, is_first_party, seller_name,
             price_avista_cents, price_full_cents,
             installment_count, installment_value_cents, installment_total_cents,
             is_presale, in_stock, status)
          VALUES
            (v_product_id, r.id, cap, party, seller_name,
             avista, prazo,
             installments, inst_val, inst_val * installments,
             false, true, status::price_status);
        END LOOP;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;
