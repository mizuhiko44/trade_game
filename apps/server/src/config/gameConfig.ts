export type VictoryConditionMode = "TARGET_REACH" | "PNL_BATTLE";

const configuredVictoryCondition =
  process.env.GAME_VICTORY_CONDITION === "TARGET_REACH" ? "TARGET_REACH" : "PNL_BATTLE";

export const GAME_CONFIG = {
  initialCash: 1000,
  initialPrice: 100,
  upperTarget: 110,
  lowerTarget: 90,
  maxTurns: 5,
  maxInvestmentPerTurn: 300,
  matchCostLifePoints: 30,
  loginBonusLifePoints: 150,
  debugRefillLifePoints: 300,
  debugMinLifePoints: 90,
  basePriceImpactFactor: 0.02,
  minimumPrice: 1,
  victoryConditionMode: configuredVictoryCondition as VictoryConditionMode
} as const;

export const REWARDS = {
  winCoins: 100,
  loseCoins: 20
} as const;
