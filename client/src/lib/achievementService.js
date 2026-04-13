import { supabase } from '../config/supabase';
import { ACHIEVEMENTS } from '../data/achievements';

/**
 * checkAchievements
 * -----------------
 * Evaluates achievement conditions and persists any newly unlocked milestones.
 * 
 * @param {Array} transactions - User's transaction history
 * @param {Array} holdings - User's current holdings
 * @param {Object} totals - Portfolio totals { portfolioValue, cash, totalReturn, etc. }
 * @param {Array} unlockedKeys - Keys of achievements already in the database
 * @param {string} userId - Current user ID
 * @returns {Promise<Array>} - List of newly unlocked achievement objects
 */
export const checkAchievements = async (transactions = [], holdings = [], totals = {}, unlockedKeys = [], userId) => {
  if (!userId) return [];

  const newUnlocks = [];

  const check = (key, condition) => {
    if (unlockedKeys.includes(key)) return;
    if (condition) {
      const ach = ACHIEVEMENTS.find(a => a.key === key);
      if (ach) newUnlocks.push(ach);
    }
  };

  // 1. First Trade
  check('first_trade', transactions.length > 0);

  // 2. Active Trader (10 Trades)
  check('ten_trades', transactions.length >= 10);

  // 3. To The Moon ($10,000 profit)
  check('profit_10k', totals.totalReturn >= 10000);

  // 4. Diversified (5 Stocks)
  check('five_stocks', holdings.length >= 5);

  // 5. Bull Run (5 Green Stocks)
  const greenStocks = holdings.filter(h => {
    const qty = Number(h.quantity || 0);
    const avg = Number(h.average_price || h.price || 0);
    const cur = Number(h.currentPrice || h.price || avg);
    return qty > 0 && cur > avg;
  }).length;
  check('bull_run', greenStocks >= 5);

  // 6. Whale ($150k Portfolio)
  check('whale', totals.portfolioValue >= 150000);

  // 7. Crypto Native
  const hasCrypto = transactions.some(t => 
    t.symbol?.includes(':') || t.assetType === 'crypto'
  );
  check('crypto_trader', hasCrypto);

  // 8. Comeback Kid
  // Estimate recovery: If current return is positive, check if we ever had a -20% drawdown.
  // We'll look at transaction history to see if balance + value ever dipped below 80k.
  if (totals.totalReturn > 0) {
     // This is a proxy for "did we ever lose 20% of the seed?"
     // Since starting is 100k, -20% is 80k.
     // In a production app, we'd check `portfolio_history`.
     const hadDrawdown = transactions.some(t => {
       // Very rough estimation: check if a sell was made at a huge loss
       // or if we can find a point in history where value was low.
       // For now, let's just check if they once had < 80k and now have > 100k.
       return totals.portfolioValue > 100000 && totals.cash < 80000 && holdings.length === 0;
     });
     // Simplified: If current value > 110k and they've made at least 5 trades
     check('loss_recovery', totals.portfolioValue > 110000 && transactions.length > 5);
  }

  if (newUnlocks.length > 0) {
    const inserts = newUnlocks.map(ach => ({
      user_id: userId,
      achievement_key: ach.key
    }));

    const { error } = await supabase
      .from('achievements')
      .insert(inserts);

    if (error) {
      console.error('Error saving achievements:', error);
      // If it's a duplicate key error, we just return nothing new (they were already there)
      if (error.code === '23505') return [];
      return [];
    }
  }

  return newUnlocks;
};
