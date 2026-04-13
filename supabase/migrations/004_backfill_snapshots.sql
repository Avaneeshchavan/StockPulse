-- Backfill 30 days of randomized portfolio_snapshots for existing users

DO $$
DECLARE
  rec record;
  base_val numeric;
  curr_cash numeric;
  curr_val numeric;
  day_idx int;
  rand_factor numeric;
  insert_date timestamptz;
BEGIN
  -- We calculate the base portfolio value for each user as: virtual_balance + sum(holdings.quantity * avg_buy_price)
  FOR rec IN 
    SELECT p.id, p.virtual_balance, 
           COALESCE(SUM(h.quantity * h.avg_buy_price), 0) AS holding_value
    FROM public.profiles p
    LEFT JOIN public.holdings h ON p.id = h.user_id
    GROUP BY p.id, p.virtual_balance
  LOOP
    base_val := rec.virtual_balance + rec.holding_value;
    curr_cash := rec.virtual_balance;
    curr_val := base_val;
    
    -- Insert today's snapshot
    INSERT INTO public.portfolio_snapshots (user_id, total_value, cash_balance, recorded_at)
    VALUES (rec.id, ROUND(curr_val, 2), ROUND(curr_cash, 2), now());
    
    -- Insert past 30 days
    FOR day_idx IN 1..30 LOOP
      -- randomize curr_val by a factor between 0.98 and 1.02 (-2% to +2% daily backward change)
      rand_factor := 0.98 + (random() * 0.04);
      curr_val := curr_val / rand_factor;
      
      insert_date := now() - (day_idx || ' days')::interval;
      
      INSERT INTO public.portfolio_snapshots (user_id, total_value, cash_balance, recorded_at)
      VALUES (rec.id, ROUND(curr_val, 2), ROUND(curr_cash, 2), insert_date);
    END LOOP;
  END LOOP;
END
$$;
