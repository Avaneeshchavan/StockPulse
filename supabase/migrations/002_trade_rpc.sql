-- Atomic buy: debit virtual_balance, upsert holdings, insert transaction (runs as caller's auth.uid()).
CREATE OR REPLACE FUNCTION public.trade_buy(
  p_symbol text,
  p_quantity numeric,
  p_price numeric,
  p_company_name text DEFAULT NULL,
  p_asset_type text DEFAULT 'stock'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  sym text := upper(trim(p_symbol));
  total numeric(15,2);
  bal numeric(15,2);
  h record;
  new_qty numeric(15,6);
  new_avg numeric(15,6);
  atype text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF sym = '' OR p_quantity IS NULL OR p_quantity <= 0 OR p_price IS NULL OR p_price <= 0 THEN
    RAISE EXCEPTION 'invalid input';
  END IF;

  atype := COALESCE(NULLIF(trim(p_asset_type), ''), 'stock');
  total := round(p_quantity * p_price, 2)::numeric(15,2);

  SELECT virtual_balance INTO bal FROM public.profiles WHERE id = uid FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'profile not found';
  END IF;
  IF bal < total THEN
    RAISE EXCEPTION 'insufficient balance';
  END IF;

  UPDATE public.profiles SET virtual_balance = virtual_balance - total WHERE id = uid;

  SELECT * INTO h FROM public.holdings WHERE user_id = uid AND symbol = sym FOR UPDATE;

  IF FOUND THEN
    new_qty := h.quantity + p_quantity;
    new_avg := (h.quantity * h.avg_buy_price + p_quantity * p_price) / NULLIF(new_qty, 0);
    UPDATE public.holdings
      SET quantity = new_qty,
          avg_buy_price = new_avg,
          company_name = COALESCE(p_company_name, company_name),
          asset_type = atype,
          updated_at = now()
      WHERE id = h.id;
  ELSE
    INSERT INTO public.holdings (user_id, symbol, company_name, asset_type, quantity, avg_buy_price)
    VALUES (uid, sym, p_company_name, atype, p_quantity, p_price);
  END IF;

  INSERT INTO public.transactions (user_id, symbol, company_name, asset_type, type, quantity, price_at_time, total)
  VALUES (uid, sym, p_company_name, atype, 'buy', p_quantity, p_price, total);

  SELECT virtual_balance INTO bal FROM public.profiles WHERE id = uid;

  RETURN json_build_object('success', true, 'virtual_balance', bal);
END;
$$;

-- Atomic sell: credit balance, reduce/delete holding, insert transaction.
CREATE OR REPLACE FUNCTION public.trade_sell(
  p_symbol text,
  p_quantity numeric,
  p_price numeric,
  p_company_name text DEFAULT NULL,
  p_asset_type text DEFAULT 'stock'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  sym text := upper(trim(p_symbol));
  total numeric(15,2);
  bal numeric(15,2);
  h record;
  new_qty numeric(15,6);
  atype text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF sym = '' OR p_quantity IS NULL OR p_quantity <= 0 OR p_price IS NULL OR p_price <= 0 THEN
    RAISE EXCEPTION 'invalid input';
  END IF;

  atype := COALESCE(NULLIF(trim(p_asset_type), ''), 'stock');
  total := round(p_quantity * p_price, 2)::numeric(15,2);

  SELECT * INTO h FROM public.holdings WHERE user_id = uid AND symbol = sym FOR UPDATE;
  IF NOT FOUND OR h.quantity < p_quantity THEN
    RAISE EXCEPTION 'insufficient shares';
  END IF;

  UPDATE public.profiles SET virtual_balance = virtual_balance + total WHERE id = uid;

  new_qty := h.quantity - p_quantity;
  IF new_qty <= 0 THEN
    DELETE FROM public.holdings WHERE id = h.id;
  ELSE
    UPDATE public.holdings SET quantity = new_qty, updated_at = now() WHERE id = h.id;
  END IF;

  INSERT INTO public.transactions (user_id, symbol, company_name, asset_type, type, quantity, price_at_time, total)
  VALUES (uid, sym, COALESCE(p_company_name, h.company_name), atype, 'sell', p_quantity, p_price, total);

  SELECT virtual_balance INTO bal FROM public.profiles WHERE id = uid;

  RETURN json_build_object('success', true, 'virtual_balance', bal);
END;
$$;

REVOKE ALL ON FUNCTION public.trade_buy(text, numeric, numeric, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.trade_sell(text, numeric, numeric, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.trade_buy(text, numeric, numeric, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.trade_sell(text, numeric, numeric, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.trade_buy(text, numeric, numeric, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.trade_sell(text, numeric, numeric, text, text) TO service_role;
