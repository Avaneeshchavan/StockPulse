CREATE TABLE public.portfolio_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  total_value NUMERIC NOT NULL,
  cash_balance NUMERIC NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add indexes for charting queries
CREATE INDEX portfolio_snapshots_user_id_idx ON public.portfolio_snapshots(user_id);
CREATE INDEX portfolio_snapshots_recorded_at_idx ON public.portfolio_snapshots(recorded_at);

-- Enable RLS
ALTER TABLE public.portfolio_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can only see and manage their own data
CREATE POLICY "Users see own portfolio snapshots" 
ON public.portfolio_snapshots 
FOR ALL 
USING (auth.uid() = user_id);
