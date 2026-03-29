import { ChartPattern, CpuActionBias, PatternDirection, PatternStrength } from "./types";

type PatternSeed = {
  id: string;
  name: string;
  category: ChartPattern["category"];
  direction: PatternDirection;
  strength: PatternStrength;
  cpuBias: CpuActionBias;
  description: string;
  detectionHint: string;
};

const BASE_PATTERNS: PatternSeed[] = [
  { id: "trend_up", name: "Uptrend", category: "trend", direction: "bullish", strength: "medium", cpuBias: "buy", description: "Higher highs and higher lows.", detectionHint: "positive_slope" },
  { id: "trend_down", name: "Downtrend", category: "trend", direction: "bearish", strength: "medium", cpuBias: "sell", description: "Lower highs and lower lows.", detectionHint: "negative_slope" },
  { id: "golden_cross", name: "Golden Cross", category: "indicator", direction: "bullish", strength: "strong", cpuBias: "buy", description: "Fast MA crossing above slow MA.", detectionHint: "ma_cross_up" },
  { id: "death_cross", name: "Death Cross", category: "indicator", direction: "bearish", strength: "strong", cpuBias: "sell", description: "Fast MA crossing below slow MA.", detectionHint: "ma_cross_down" },
  { id: "double_top", name: "Double Top", category: "reversal", direction: "bearish", strength: "strong", cpuBias: "sell", description: "Two highs near resistance with failure.", detectionHint: "peak_peak_fail" },
  { id: "double_bottom", name: "Double Bottom", category: "reversal", direction: "bullish", strength: "strong", cpuBias: "buy", description: "Two lows near support with rebound.", detectionHint: "trough_trough_rebound" },
  { id: "head_and_shoulders", name: "Head and Shoulders", category: "reversal", direction: "bearish", strength: "strong", cpuBias: "sell", description: "Classic topping pattern.", detectionHint: "hns_breakdown" },
  { id: "inverse_hs", name: "Inverse Head and Shoulders", category: "reversal", direction: "bullish", strength: "strong", cpuBias: "buy", description: "Classic bottoming pattern.", detectionHint: "inverse_hns_breakout" },
  { id: "ascending_triangle", name: "Ascending Triangle", category: "continuation", direction: "bullish", strength: "medium", cpuBias: "breakout_follow", description: "Flat resistance and rising support.", detectionHint: "triangle_up_pressure" },
  { id: "descending_triangle", name: "Descending Triangle", category: "continuation", direction: "bearish", strength: "medium", cpuBias: "breakout_follow", description: "Flat support and falling resistance.", detectionHint: "triangle_down_pressure" },
  { id: "sym_triangle", name: "Symmetrical Triangle", category: "continuation", direction: "neutral", strength: "weak", cpuBias: "hold", description: "Converging highs and lows.", detectionHint: "triangle_compression" },
  { id: "bull_flag", name: "Bull Flag", category: "continuation", direction: "bullish", strength: "medium", cpuBias: "buy", description: "Strong rally with shallow pullback.", detectionHint: "impulse_pullback_up" },
  { id: "bear_flag", name: "Bear Flag", category: "continuation", direction: "bearish", strength: "medium", cpuBias: "sell", description: "Strong decline with weak bounce.", detectionHint: "impulse_pullback_down" },
  { id: "bull_pennant", name: "Bull Pennant", category: "continuation", direction: "bullish", strength: "medium", cpuBias: "buy", description: "Compression after upward impulse.", detectionHint: "pennant_after_rally" },
  { id: "bear_pennant", name: "Bear Pennant", category: "continuation", direction: "bearish", strength: "medium", cpuBias: "sell", description: "Compression after downward impulse.", detectionHint: "pennant_after_drop" },
  { id: "channel_up", name: "Rising Channel", category: "trend", direction: "bullish", strength: "weak", cpuBias: "buy", description: "Price moving in upward sloping channel.", detectionHint: "channel_up" },
  { id: "channel_down", name: "Falling Channel", category: "trend", direction: "bearish", strength: "weak", cpuBias: "sell", description: "Price moving in downward sloping channel.", detectionHint: "channel_down" },
  { id: "range_box", name: "Range Box", category: "breakout", direction: "neutral", strength: "weak", cpuBias: "hold", description: "Sideways movement in clear range.", detectionHint: "horizontal_range" },
  { id: "breakout_up", name: "Upside Breakout", category: "breakout", direction: "breakout", strength: "strong", cpuBias: "breakout_follow", description: "Price escaping above resistance.", detectionHint: "resistance_break_up" },
  { id: "breakout_down", name: "Downside Breakout", category: "breakout", direction: "breakout", strength: "strong", cpuBias: "breakout_follow", description: "Price escaping below support.", detectionHint: "support_break_down" },
  { id: "fake_break_up", name: "Fake Breakout Up", category: "breakout", direction: "reversal", strength: "medium", cpuBias: "counter", description: "Break above resistance quickly rejected.", detectionHint: "upthrust_reject" },
  { id: "fake_break_down", name: "Fake Breakout Down", category: "breakout", direction: "reversal", strength: "medium", cpuBias: "counter", description: "Break below support quickly reclaimed.", detectionHint: "spring_reclaim" },
  { id: "hammer", name: "Hammer", category: "candlestick", direction: "bullish", strength: "medium", cpuBias: "buy", description: "Long lower wick after decline.", detectionHint: "long_lower_wick" },
  { id: "shooting_star", name: "Shooting Star", category: "candlestick", direction: "bearish", strength: "medium", cpuBias: "sell", description: "Long upper wick after rise.", detectionHint: "long_upper_wick" },
  { id: "engulfing_bull", name: "Bullish Engulfing", category: "candlestick", direction: "bullish", strength: "strong", cpuBias: "buy", description: "Bull candle engulfs prior body.", detectionHint: "bull_engulf" },
  { id: "engulfing_bear", name: "Bearish Engulfing", category: "candlestick", direction: "bearish", strength: "strong", cpuBias: "sell", description: "Bear candle engulfs prior body.", detectionHint: "bear_engulf" },
  { id: "morning_star", name: "Morning Star", category: "candlestick", direction: "bullish", strength: "strong", cpuBias: "buy", description: "Three-candle bullish reversal.", detectionHint: "three_candle_reversal_up" },
  { id: "evening_star", name: "Evening Star", category: "candlestick", direction: "bearish", strength: "strong", cpuBias: "sell", description: "Three-candle bearish reversal.", detectionHint: "three_candle_reversal_down" },
  { id: "doji", name: "Doji", category: "candlestick", direction: "neutral", strength: "weak", cpuBias: "hold", description: "Open and close near equal.", detectionHint: "small_body" },
  { id: "marubozu_bull", name: "Bull Marubozu", category: "candlestick", direction: "bullish", strength: "medium", cpuBias: "buy", description: "Large body, little wick up candle.", detectionHint: "full_body_up" },
  { id: "marubozu_bear", name: "Bear Marubozu", category: "candlestick", direction: "bearish", strength: "medium", cpuBias: "sell", description: "Large body, little wick down candle.", detectionHint: "full_body_down" },
  { id: "rsi_oversold", name: "RSI Oversold", category: "indicator", direction: "bullish", strength: "medium", cpuBias: "buy", description: "Momentum deeply oversold.", detectionHint: "rsi_lt_30" },
  { id: "rsi_overbought", name: "RSI Overbought", category: "indicator", direction: "bearish", strength: "medium", cpuBias: "sell", description: "Momentum deeply overbought.", detectionHint: "rsi_gt_70" },
  { id: "macd_bull", name: "MACD Bullish Cross", category: "indicator", direction: "bullish", strength: "medium", cpuBias: "buy", description: "MACD crossing signal upward.", detectionHint: "macd_cross_up" },
  { id: "macd_bear", name: "MACD Bearish Cross", category: "indicator", direction: "bearish", strength: "medium", cpuBias: "sell", description: "MACD crossing signal downward.", detectionHint: "macd_cross_down" },
  { id: "bollinger_squeeze", name: "Bollinger Squeeze", category: "indicator", direction: "neutral", strength: "weak", cpuBias: "hold", description: "Volatility contraction before expansion.", detectionHint: "bandwidth_contract" },
  { id: "bollinger_walk_up", name: "Bollinger Walk Up", category: "indicator", direction: "bullish", strength: "medium", cpuBias: "buy", description: "Price hugging upper band.", detectionHint: "band_walk_up" },
  { id: "bollinger_walk_down", name: "Bollinger Walk Down", category: "indicator", direction: "bearish", strength: "medium", cpuBias: "sell", description: "Price hugging lower band.", detectionHint: "band_walk_down" },
  { id: "stoch_cross_up", name: "Stochastic Cross Up", category: "indicator", direction: "bullish", strength: "weak", cpuBias: "buy", description: "Stoch K crossing above D in low zone.", detectionHint: "stoch_up" },
  { id: "stoch_cross_down", name: "Stochastic Cross Down", category: "indicator", direction: "bearish", strength: "weak", cpuBias: "sell", description: "Stoch K crossing below D in high zone.", detectionHint: "stoch_down" },
  { id: "adx_trend_strong", name: "ADX Trend Strong", category: "indicator", direction: "breakout", strength: "medium", cpuBias: "breakout_follow", description: "Trend strength high.", detectionHint: "adx_gt_25" },
  { id: "adx_trend_weak", name: "ADX Trend Weak", category: "indicator", direction: "neutral", strength: "weak", cpuBias: "hold", description: "Trend strength low.", detectionHint: "adx_lt_20" },
  { id: "wedge_rising", name: "Rising Wedge", category: "reversal", direction: "bearish", strength: "medium", cpuBias: "sell", description: "Narrowing upward wedge.", detectionHint: "wedge_up" },
  { id: "wedge_falling", name: "Falling Wedge", category: "reversal", direction: "bullish", strength: "medium", cpuBias: "buy", description: "Narrowing downward wedge.", detectionHint: "wedge_down" },
  { id: "cup_and_handle", name: "Cup and Handle", category: "continuation", direction: "bullish", strength: "strong", cpuBias: "buy", description: "Rounded base with shallow handle.", detectionHint: "cup_handle_breakout" },
  { id: "inverse_cup_handle", name: "Inverse Cup and Handle", category: "continuation", direction: "bearish", strength: "strong", cpuBias: "sell", description: "Rounded top with weak retest.", detectionHint: "inverse_cup_breakdown" },
  { id: "triple_top", name: "Triple Top", category: "reversal", direction: "bearish", strength: "strong", cpuBias: "sell", description: "Three failed highs near resistance.", detectionHint: "three_peak_fail" },
  { id: "triple_bottom", name: "Triple Bottom", category: "reversal", direction: "bullish", strength: "strong", cpuBias: "buy", description: "Three failed lows near support.", detectionHint: "three_trough_rebound" },
  { id: "broadening_top", name: "Broadening Top", category: "reversal", direction: "bearish", strength: "medium", cpuBias: "sell", description: "Expanding swings after uptrend.", detectionHint: "broadening_up_fail" },
  { id: "broadening_bottom", name: "Broadening Bottom", category: "reversal", direction: "bullish", strength: "medium", cpuBias: "buy", description: "Expanding swings after downtrend.", detectionHint: "broadening_down_rebound" },
  { id: "island_reversal_up", name: "Island Reversal Up", category: "reversal", direction: "bullish", strength: "strong", cpuBias: "buy", description: "Gap-down island followed by gap-up.", detectionHint: "island_up" },
  { id: "island_reversal_down", name: "Island Reversal Down", category: "reversal", direction: "bearish", strength: "strong", cpuBias: "sell", description: "Gap-up island followed by gap-down.", detectionHint: "island_down" },
  { id: "vol_spike_up", name: "Volume Spike Up", category: "breakout", direction: "bullish", strength: "medium", cpuBias: "buy", description: "Bull impulse on unusually high participation.", detectionHint: "volume_up" },
  { id: "vol_spike_down", name: "Volume Spike Down", category: "breakout", direction: "bearish", strength: "medium", cpuBias: "sell", description: "Bear impulse on unusually high participation.", detectionHint: "volume_down" },
  { id: "support_retest_hold", name: "Support Retest Hold", category: "trend", direction: "bullish", strength: "medium", cpuBias: "buy", description: "Retest of broken resistance as support.", detectionHint: "retest_support_success" },
  { id: "resistance_retest_reject", name: "Resistance Retest Reject", category: "trend", direction: "bearish", strength: "medium", cpuBias: "sell", description: "Retest of broken support as resistance.", detectionHint: "retest_resistance_fail" },
  { id: "mean_reversion_up", name: "Mean Reversion Up", category: "indicator", direction: "bullish", strength: "weak", cpuBias: "counter", description: "Price stretched below average and snapping back.", detectionHint: "zscore_low" },
  { id: "mean_reversion_down", name: "Mean Reversion Down", category: "indicator", direction: "bearish", strength: "weak", cpuBias: "counter", description: "Price stretched above average and snapping back.", detectionHint: "zscore_high" },
  { id: "orderflow_buy_imbalance", name: "Orderflow Buy Imbalance", category: "breakout", direction: "bullish", strength: "medium", cpuBias: "buy", description: "Sustained buy imbalance.", detectionHint: "buy_pressure" },
  { id: "orderflow_sell_imbalance", name: "Orderflow Sell Imbalance", category: "breakout", direction: "bearish", strength: "medium", cpuBias: "sell", description: "Sustained sell imbalance.", detectionHint: "sell_pressure" },
  { id: "volatility_expansion", name: "Volatility Expansion", category: "breakout", direction: "breakout", strength: "medium", cpuBias: "breakout_follow", description: "Range expansion from compression.", detectionHint: "atr_expansion" },
  { id: "volatility_compression", name: "Volatility Compression", category: "breakout", direction: "neutral", strength: "weak", cpuBias: "hold", description: "Price is coiling tightly.", detectionHint: "atr_compression" },
  { id: "inside_bar_break_up", name: "Inside Bar Break Up", category: "breakout", direction: "bullish", strength: "weak", cpuBias: "buy", description: "Inside bar resolved upward.", detectionHint: "inside_up" },
  { id: "inside_bar_break_down", name: "Inside Bar Break Down", category: "breakout", direction: "bearish", strength: "weak", cpuBias: "sell", description: "Inside bar resolved downward.", detectionHint: "inside_down" },
  { id: "three_white_soldiers", name: "Three White Soldiers", category: "candlestick", direction: "bullish", strength: "strong", cpuBias: "buy", description: "Three strong bullish candles in sequence.", detectionHint: "three_up" },
  { id: "three_black_crows", name: "Three Black Crows", category: "candlestick", direction: "bearish", strength: "strong", cpuBias: "sell", description: "Three strong bearish candles in sequence.", detectionHint: "three_down" }
];

const STAGES = [
  { suffix: "early", strength: "weak" as PatternStrength, note: "Early signal" },
  { suffix: "confirmed", strength: "medium" as PatternStrength, note: "Confirmation signal" }
];

const stagedPatterns: ChartPattern[] = BASE_PATTERNS.flatMap((pattern) =>
  STAGES.map((stage) => ({
    ...pattern,
    id: `${pattern.id}_${stage.suffix}`,
    name: `${pattern.name} (${stage.suffix})`,
    strength: pattern.strength === "strong" && stage.suffix === "confirmed" ? "strong" : stage.strength,
    description: `${stage.note}: ${pattern.description}`,
    detectionHint: `${pattern.detectionHint}_${stage.suffix}`
  }))
);

export const CHART_PATTERNS: ChartPattern[] = [...BASE_PATTERNS, ...stagedPatterns];

export const CHART_PATTERN_MAP = new Map(CHART_PATTERNS.map((pattern) => [pattern.id, pattern]));
