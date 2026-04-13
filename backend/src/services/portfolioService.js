import { getQuotes } from './marketService.js';

export async function takeSnapshot(userId, supabaseClient, userEmail = null) {
  try {
    // 1. Fetch user's virtual balance and portfolio
    let { data: user, error: ue } = await supabaseClient
      .from('users')
      .select('balance')
      .eq('id', userId)
      .maybeSingle();
    
    // If user not found, create with default balance
    if (!user && !ue) {
      console.log(`[takeSnapshot] User ${userId} not found, creating new user row...`)
      const { data: newUser, error: insertError } = await supabaseClient
        .from('users')
        .insert({
          id: userId,
          email: userEmail,
          balance: 100000
        })
        .select('balance')
        .maybeSingle();
      
      if (insertError) {
        console.error('[takeSnapshot] Error creating user row:', insertError)
        throw new Error(`User creation error: ${insertError.message}`)
      }
      
      console.log(`[takeSnapshot] Created new user row with $100,000 balance for ${userId}`)
      user = newUser
    }
    
    if (ue) throw new Error(`User fetch error: ${ue.message}`);
    
    const { data: portfolio, error: pe } = await supabaseClient
      .from('portfolio')
      .select('*')
      .eq('user_id', userId);

    if (pe) throw new Error(`Portfolio fetch error: ${pe.message}`);

    const cashBalance = Number(user?.balance ?? 0);
    const list = portfolio ?? [];

    let totalValue = cashBalance;

    if (list.length > 0) {
      // 2. Fetch current market prices for all holdings
      const symbols = list.map((h) => h.symbol);
      const quotes = await getQuotes(symbols);

      // 3. Calculate portfolio value (Cash + Holdings value)
      for (const holding of list) {
        const quote = quotes.find((q) => q.symbol === holding.symbol);
        const currentPrice = quote?.price ?? Number(holding.average_price);
        totalValue += Number(holding.quantity) * currentPrice;
      }
    }

    // 4. Save to portfolio_snapshots
    const { error: insertError } = await supabaseClient
      .from('portfolio_snapshots')
      .insert({
        user_id: userId,
        total_value: Number(totalValue.toFixed(2)),
        cash_balance: Number(cashBalance.toFixed(2)),
      });

    if (insertError) {
      throw new Error(`Snapshot insert error: ${insertError.message}`);
    }

    return {
      success: true,
      data: {
        total_value: totalValue,
        cash_balance: cashBalance,
      },
    };
  } catch (error) {
    console.error('takeSnapshot error:', error);
    return { success: false, error: error.message };
  }
}
