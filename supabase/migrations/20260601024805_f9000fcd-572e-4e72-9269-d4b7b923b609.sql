CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove qualquer agendamento anterior
DO $$
DECLARE j RECORD;
BEGIN
  FOR j IN SELECT jobname FROM cron.job WHERE jobname LIKE 'collect-all-%' LOOP
    PERFORM cron.unschedule(j.jobname);
  END LOOP;
END $$;

-- 08:00 BRT (UTC-3) = 11:00 UTC
SELECT cron.schedule(
  'collect-all-0800-brt',
  '0 11 * * *',
  $$
  SELECT net.http_post(
    url:='https://project--59eed2a9-91a0-4c9e-bb74-e1dc304c30a3.lovable.app/api/public/hooks/collect-all',
    headers:='{"Content-Type": "application/json", "apikey": "sb_publishable_FRii9QUaREzN6nElZ5rkFQ_VtjYQ0ql"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);

-- 13:00 BRT (UTC-3) = 16:00 UTC
SELECT cron.schedule(
  'collect-all-1300-brt',
  '0 16 * * *',
  $$
  SELECT net.http_post(
    url:='https://project--59eed2a9-91a0-4c9e-bb74-e1dc304c30a3.lovable.app/api/public/hooks/collect-all',
    headers:='{"Content-Type": "application/json", "apikey": "sb_publishable_FRii9QUaREzN6nElZ5rkFQ_VtjYQ0ql"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);