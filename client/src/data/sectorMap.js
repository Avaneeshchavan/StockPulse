export const SECTOR_MAP = {
  // Technology
  'AAPL': 'Technology', 'MSFT': 'Technology', 'GOOGL': 'Technology', 'NVDA': 'Technology', 'META': 'Technology',
  'AVGO': 'Technology', 'ORCL': 'Technology', 'ADBE': 'Technology', 'CRM': 'Technology', 'AMD': 'Technology',
  'CSCO': 'Technology', 'INTC': 'Technology', 'QCOM': 'Technology', 'AMAT': 'Technology', 'TXN': 'Technology',
  'NOW': 'Technology', 'INTU': 'Technology', 'IBM': 'Technology', 'NFLX': 'Communications',
  
  // Finance
  'JPM': 'Finance', 'BAC': 'Finance', 'WFC': 'Finance', 'MS': 'Finance', 'GS': 'Finance',
  'V': 'Finance', 'MA': 'Finance', 'AXP': 'Finance', 'PYPL': 'Finance', 'BX': 'Finance',
  'C': 'Finance', 'SCHW': 'Finance',
  
  // Healthcare
  'JNJ': 'Healthcare', 'UNH': 'Healthcare', 'PFE': 'Healthcare', 'ABBV': 'Healthcare', 'MRK': 'Healthcare',
  'LLY': 'Healthcare', 'TMO': 'Healthcare', 'AMGN': 'Healthcare', 'DHR': 'Healthcare', 'ABT': 'Healthcare',
  
  // Consumer
  'AMZN': 'Consumer', 'TSLA': 'Consumer', 'HD': 'Consumer', 'MCD': 'Consumer', 'NKE': 'Consumer',
  'SBUX': 'Consumer', 'LOW': 'Consumer', 'TJX': 'Consumer', 'PG': 'Consumer', 'KO': 'Consumer', 'PEP': 'Consumer', 'WMT': 'Consumer', 'COST': 'Consumer',
  
  // Energy
  'XOM': 'Energy', 'CVX': 'Energy', 'COP': 'Energy', 'SLB': 'Energy', 'EOG': 'Energy',
  
  // Industrial
  'BA': 'Industrial', 'GE': 'Industrial', 'CAT': 'Industrial', 'HON': 'Industrial', 'MMM': 'Industrial',
  'DE': 'Industrial', 'UPS': 'Industrial', 'LMT': 'Industrial',
  
  // Crypto
  'BTC': 'Crypto', 'ETH': 'Crypto', 'SOL': 'Crypto', 'DOGE': 'Crypto', 'ADA': 'Crypto',
};

export const getSector = (symbol) => SECTOR_MAP[symbol.toUpperCase()] || 'Other';
