export const ACHIEVEMENTS = [
  { 
    key: 'first_trade', 
    title: 'First Trade', 
    description: 'Execute your first trade', 
    icon: null
  },
  { 
    key: 'ten_trades', 
    title: 'Active Trader', 
    description: 'Complete 10 trades', 
    icon: null
  },
  { 
    key: 'profit_10k', 
    title: 'To The Moon', 
    description: 'Earn $10,000 in profits', 
    icon: null
  },
  { 
    key: 'five_stocks', 
    title: 'Diversified', 
    description: 'Hold 5 different stocks', 
    icon: null
  },
  { 
    key: 'bull_run', 
    title: 'Bull Run', 
    description: 'Have 5 green stocks simultaneously', 
    icon: null
  },
  { 
    key: 'loss_recovery', 
    title: 'Comeback Kid', 
    description: 'Recover from a 20% portfolio loss', 
    icon: null
  },
  { 
    key: 'crypto_trader', 
    title: 'Crypto Native', 
    description: 'Trade any cryptocurrency', 
    icon: null
  },
  { 
    key: 'whale', 
    title: 'Whale', 
    description: 'Portfolio value exceeds $150,000', 
    icon: null
  }
];

export const getAchievement = (key) => ACHIEVEMENTS.find(a => a.key === key);
