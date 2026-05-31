ALTER TYPE price_status ADD VALUE IF NOT EXISTS 'blocked';
ALTER TYPE price_status ADD VALUE IF NOT EXISTS 'not_found';
ALTER TYPE price_status ADD VALUE IF NOT EXISTS 'error';