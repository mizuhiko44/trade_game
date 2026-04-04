import { CPU_STRATEGY_CONSTANTS, PRICE_SPIKE_ITEM_WEIGHT } from "./constants";
import { detectPatternsFromPriceHistory } from "./patternDetector";
import { BattleContext, CpuDecision, CpuDifficulty } from "./types";

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function calcBaseAmount(difficulty: CpuDifficulty, context: BattleContext): number {
  const risk = CPU_STRATEGY_CONSTANTS.riskPerTrade[difficulty];
  const raw = context.cpuCash * risk;
  return clamp(Math.round(raw), CPU_STRATEGY_CONSTANTS.minTradeAmount, CPU_STRATEGY_CONSTANTS.maxTradeAmount);
}

function scoreActionByBias(bias: string): number {
  if (bias === "buy") return 1;
  if (bias === "sell") return -1;
  if (bias === "breakout_follow") return 1;
  if (bias === "counter") return -0.7;
  return 0;
}

function decideCoreAction(difficulty: CpuDifficulty, context: BattleContext): CpuDecision {
  const baseAmount = calcBaseAmount(difficulty, context);
  const prices =
    context.priceHistory.length > 1
      ? context.priceHistory
      : [context.initialPrice, context.currentPrice];
  const patterns = detectPatternsFromPriceHistory(prices);

  const momentum = (context.currentPrice - context.initialPrice) / Math.max(1, context.initialPrice);
  const shortTrend =
    prices.length >= 2
      ? (prices[prices.length - 1] - prices[prices.length - 2]) / Math.max(1, prices[prices.length - 2])
      : 0;
  const patternScore = patterns.reduce((sum, p) => {
    const fakePenalty = difficulty === "hard" && p.isFakeBreakRisk ? CPU_STRATEGY_CONSTANTS.fakeBreakPenalty : 0;
    return sum + (scoreActionByBias(p.pattern.cpuBias) - fakePenalty) * p.confidence;
  }, 0);

  const turnsLeft = Math.max(0, context.maxTurn - context.turn);
  const upDistance = Math.abs(context.targetUpPrice - context.currentPrice);
  const downDistance = Math.abs(context.currentPrice - context.targetDownPrice);

  let directionalScore = patternScore + momentum * 5 + shortTrend * 7;

  if (difficulty === "hard") {
    if (turnsLeft <= 2) {
      directionalScore += upDistance < downDistance ? 0.7 : -0.7;
    }
    if (context.cpuCash < context.playerCash * 0.7) {
      directionalScore *= 0.85;
    }
  }

  if (difficulty === "easy" && Math.random() < 0.28) {
    return { action: "hold", amount: 0, reason: "easy_random_hold" };
  }

  if (difficulty !== "easy" && Math.random() < PRICE_SPIKE_ITEM_WEIGHT[difficulty] && turnsLeft <= 4) {
    return {
      action: "item",
      amount: 0,
      itemId: "PRICE_SPIKE",
      reason: `item_finisher_${difficulty}_turnsLeft=${turnsLeft}`
    };
  }

  const directionalThreshold = difficulty === "easy" ? 0.06 : difficulty === "normal" ? 0.045 : 0.03;

  if (directionalScore > directionalThreshold) {
    return {
      action: "buy",
      amount: baseAmount,
      reason: `bullish_ds=${directionalScore.toFixed(3)}_th=${directionalThreshold.toFixed(3)}`
    };
  }

  if (directionalScore < -directionalThreshold) {
    return {
      action: "sell",
      amount: baseAmount,
      reason: `bearish_ds=${directionalScore.toFixed(3)}_th=${directionalThreshold.toFixed(3)}`
    };
  }

  const neutralTradeChance = difficulty === "easy" ? 0.22 : difficulty === "normal" ? 0.38 : 0.55;
  if (Math.random() < neutralTradeChance) {
    const fallbackBias = momentum + shortTrend;
    const action = fallbackBias >= 0 ? "buy" : "sell";
    const conservativeAmount = difficulty === "hard" ? Math.round(baseAmount * 0.7) : Math.round(baseAmount * 0.5);
    return {
      action,
      amount: clamp(conservativeAmount, CPU_STRATEGY_CONSTANTS.minTradeAmount, CPU_STRATEGY_CONSTANTS.maxTradeAmount),
      reason: `neutral_follow_bias=${fallbackBias.toFixed(3)}_ds=${directionalScore.toFixed(3)}`
    };
  }

  const conservative = difficulty === "hard" ? Math.round(baseAmount * 0.55) : Math.round(baseAmount * 0.4);
  return {
    action: "hold",
    amount: conservative,
    reason: `neutral_hold_ds=${directionalScore.toFixed(3)}_th=${directionalThreshold.toFixed(3)}`
  };
}

export function decideCpuAction(difficulty: CpuDifficulty, context: BattleContext): CpuDecision {
  return decideCoreAction(difficulty, context);
}
