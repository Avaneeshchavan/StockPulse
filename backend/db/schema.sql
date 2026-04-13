-- Run in Supabase Dashboard -> SQL Editor (or via Supabase CLI).
-- This file defines the core schema for the users, portfolio, and transactions.

-- 1. Users table (to hold balance and email metadata)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  balance DECIMAL(15,2) DEFAULT 100000.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Portfolio table (to keep track of assets owned)
CREATE TABLE IF NOT EXISTS public.portfolio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  quantity DECIMAL(15,6) NOT NULL DEFAULT 0,
  average_price DECIMAL(15,6) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, symbol)
);

-- 3. Transactions table (to record all trade history)
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),
  quantity DECIMAL(15,6) NOT NULL,
  price DECIMAL(15,6) NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies should be added based on your specific access rules.
-- e.g. users can see their own portfolio data:
-- CREATE POLICY "Users see own portfolio" ON public.portfolio FOR SELECT USING (auth.uid() = user_id);
