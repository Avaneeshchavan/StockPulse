-- RPC function to fetch leaderboard data
-- Calculates returns based on initial $100,000 balance
CREATE OR REPLACE FUNCTION get_leaderboard()
RETURNS TABLE(
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  virtual_balance DECIMAL,
  portfolio_value DECIMAL,
  total_return_percent DECIMAL,
  total_trades BIGINT
)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT
    p.id as user_id,
    COALESCE(p.display_name, split_part(p.email, '@', 1)) as display_name,
    p.avatar_url,
    p.virtual_balance,
    p.virtual_balance as portfolio_value,
    ROUND(((p.virtual_balance - 100000.0) / 100000.0 * 100)::numeric, 2) as total_return_percent,
    COUNT(t.id) as total_trades
  FROM profiles p
  LEFT JOIN transactions t ON t.user_id = p.id
  GROUP BY p.id, p.display_name, p.email, p.avatar_url, p.virtual_balance
  ORDER BY total_return_percent DESC
  LIMIT 20;
$$;
