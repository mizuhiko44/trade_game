export const CPU_STRATEGY_CONSTANTS = {
  minTradeAmount: 20,
  maxTradeAmount: 220,
  riskPerTrade: {
    easy: 0.08,
    normal: 0.14,
    hard: 0.2
  },
  trendThreshold: 0.004,
  breakoutThreshold: 0.012,
  fakeBreakPenalty: 0.28,
  confidence: {
    low: 0.35,
    medium: 0.55,
    high: 0.75
  }
} as const;

export const PRICE_SPIKE_ITEM_WEIGHT = {
  easy: 0.02,
  normal: 0.06,
  hard: 0.1
} as const;
