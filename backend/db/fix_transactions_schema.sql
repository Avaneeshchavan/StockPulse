-- ============================================================
-- Stockpulse — transactions table fix migration
-- Run this in: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- STEP 1: Add the missing 'side' column if it doesn't exist yet.
-- CHECK constraint ensures only lowercase 'buy'/'sell' are stored
-- (matching what tradeRouter.js inserts).
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS side TEXT NOT NULL DEFAULT 'buy'
  CONSTRAINT transactions_side_check CHECK (side IN ('buy', 'sell'));

-- STEP 2: Make sure every other required column exists.
-- These are no-ops if the columns already exist, so safe to re-run.
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS id        UUID        NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS user_id   UUID        NOT NULL,
  ADD COLUMN IF NOT EXISTS symbol    TEXT        NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS quantity  DECIMAL(15,6) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price     DECIMAL(15,6) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- STEP 3: Verify the final shape — this SELECT should return all 7 columns.
-- Run separately to confirm after the ALTER statements above complete.
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'transactions'
ORDER BY ordinal_position;

-- ============================================================
-- EXPECTED RESULT: 7 rows —
--   id, user_id, symbol, side, quantity, price, timestamp
-- ============================================================

-- STEP 4 (optional): If RLS is enabled but policies don't exist yet,
-- add them so authenticated users can read/write their own rows.
-- Skip if you have already done this.

-- Allow users to SELECT their own transactions
CREATE POLICY IF NOT EXISTS "Users see own transactions"
  ON public.transactions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to INSERT their own transactions
CREATE POLICY IF NOT EXISTS "Users insert own transactions"
  ON public.transactions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow the service role (backend) to do anything
CREATE POLICY IF NOT EXISTS "Service role full access to transactions"
  ON public.transactions
  FOR ALL
  USING (true)
  WITH CHECK (true);
