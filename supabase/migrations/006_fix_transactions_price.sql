-- Run in Supabase Dashbord -> SQL Editor
-- This adds the missing 'price' column to the transactions table and ensures portfolio alignment.

-- 1. Fix Transactions table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='price') THEN
        -- If price_at_time exists, we'll rename it or just add price. 
        -- The user specifically asked to ADD 'price'.
        ALTER TABLE public.transactions ADD COLUMN price DECIMAL(15,6) DEFAULT 0;
        
        -- Optional: If price_at_time existed, migrate the data
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='price_at_time') THEN
            UPDATE public.transactions SET price = price_at_time;
        END IF;
    END IF;
END $$;

-- 2. Ensure Portfolio table exists with all required columns
CREATE TABLE IF NOT EXISTS public.portfolio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  quantity DECIMAL(15,6) NOT NULL DEFAULT 0,
  average_price DECIMAL(15,6) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, symbol)
);

-- 3. Ensure Users table (profile equivalent) exists
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  balance DECIMAL(15,2) DEFAULT 100000.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
