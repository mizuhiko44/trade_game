export type PatternDirection = "bullish" | "bearish" | "neutral" | "reversal" | "breakout";
export type PatternStrength = "weak" | "medium" | "strong";
export type CpuActionBias = "buy" | "sell" | "hold" | "counter" | "breakout_follow";

export type ChartPatternCategory =
  | "trend"
  | "reversal"
  | "continuation"
  | "candlestick"
  | "breakout"
  | "indicator";

export type ChartPattern = {
  id: string;
  name: string;
  category: ChartPatternCategory;
  description: string;
  direction: PatternDirection;
  strength: PatternStrength;
  cpuBias: CpuActionBias;
  detectionHint: string;
};

export type CpuDifficulty = "easy" | "normal" | "hard";
export type CpuStyle = "trend_follower" | "contrarian";

export type CpuAction = "buy" | "sell" | "hold" | "item";

export type BattleContext = {
  currentPrice: number;
  initialPrice: number;
  targetUpPrice: number;
  targetDownPrice: number;
  turn: number;
  maxTurn: number;
  playerCash: number;
  cpuCash: number;
  priceHistory: number[];
  lastActions: string[];
  detectedPatterns: string[];
};

export type CpuDecision = {
  action: CpuAction;
  amount: number;
  itemId?: "PRICE_SPIKE" | "SHIELD" | "DOUBLE_FORCE";
  reason: string;
};
