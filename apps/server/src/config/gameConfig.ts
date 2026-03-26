export const GAME_CONFIG = {
  initialCash: 1000,
  initialPrice: 100,
  upperTarget: 110,
  lowerTarget: 90,
  maxTurns: 10,
  maxInvestmentPerTurn: 300,
  matchCostLifePoints: 30,
  loginBonusLifePoints: 150,
  basePriceImpactFactor: 0.02,
  minimumPrice: 1
} as const;

export const REWARDS = {
  winCoins: 100,
  loseCoins: 20
} as const;
