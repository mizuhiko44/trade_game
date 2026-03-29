import { CHART_PATTERN_MAP } from "./chartPatterns";
import { CPU_STRATEGY_CONSTANTS } from "./constants";
import { ChartPattern } from "./types";

export type DetectedPattern = {
  pattern: ChartPattern;
  confidence: number;
  isFakeBreakRisk: boolean;
};

function avg(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function slope(values: number[]): number {
  if (values.length < 2) return 0;
  return (values[values.length - 1] - values[0]) / Math.max(1, values[0]);
}

function safeGetPattern(id: string): ChartPattern {
  const pattern = CHART_PATTERN_MAP.get(id);
  if (!pattern) {
    throw new Error(`PATTERN_NOT_FOUND:${id}`);
  }
  return pattern;
}

export function detectPatternsFromPriceHistory(prices: number[]): DetectedPattern[] {
  if (prices.length < 3) return [];

  const recent = prices.slice(-6);
  const fullSlope = slope(prices);
  const recentSlope = slope(recent);
  const volatility = avg(recent.map((v, i) => (i === 0 ? 0 : Math.abs(v - recent[i - 1]) / Math.max(1, recent[i - 1]))));

  const latest = prices[prices.length - 1];
  const recentHigh = Math.max(...recent);
  const recentLow = Math.min(...recent);
  const rangeMid = (recentHigh + recentLow) / 2;

  const detected: DetectedPattern[] = [];

  if (fullSlope > CPU_STRATEGY_CONSTANTS.trendThreshold) {
    detected.push({ pattern: safeGetPattern("trend_up_confirmed"), confidence: 0.72, isFakeBreakRisk: false });
  } else if (fullSlope < -CPU_STRATEGY_CONSTANTS.trendThreshold) {
    detected.push({ pattern: safeGetPattern("trend_down_confirmed"), confidence: 0.72, isFakeBreakRisk: false });
  } else {
    detected.push({ pattern: safeGetPattern("range_box_confirmed"), confidence: 0.58, isFakeBreakRisk: false });
  }

  if (volatility < 0.004) {
    detected.push({ pattern: safeGetPattern("bollinger_squeeze_confirmed"), confidence: 0.61, isFakeBreakRisk: false });
  } else if (volatility > 0.018) {
    detected.push({ pattern: safeGetPattern("volatility_expansion_confirmed"), confidence: 0.68, isFakeBreakRisk: false });
  }

  const breaksUp = latest >= recentHigh * (1 - CPU_STRATEGY_CONSTANTS.breakoutThreshold / 2);
  const breaksDown = latest <= recentLow * (1 + CPU_STRATEGY_CONSTANTS.breakoutThreshold / 2);

  if (breaksUp && recentSlope > 0) {
    const fakeRisk = recent[recent.length - 2] > latest;
    detected.push({
      pattern: safeGetPattern(fakeRisk ? "fake_break_up_confirmed" : "breakout_up_confirmed"),
      confidence: fakeRisk ? 0.57 : 0.75,
      isFakeBreakRisk: fakeRisk
    });
  }

  if (breaksDown && recentSlope < 0) {
    const fakeRisk = recent[recent.length - 2] < latest;
    detected.push({
      pattern: safeGetPattern(fakeRisk ? "fake_break_down_confirmed" : "breakout_down_confirmed"),
      confidence: fakeRisk ? 0.57 : 0.75,
      isFakeBreakRisk: fakeRisk
    });
  }

  if (latest < rangeMid && recentSlope > 0) {
    detected.push({ pattern: safeGetPattern("support_retest_hold_confirmed"), confidence: 0.59, isFakeBreakRisk: false });
  } else if (latest > rangeMid && recentSlope < 0) {
    detected.push({ pattern: safeGetPattern("resistance_retest_reject_confirmed"), confidence: 0.59, isFakeBreakRisk: false });
  }

  return detected.slice(0, 5);
}
