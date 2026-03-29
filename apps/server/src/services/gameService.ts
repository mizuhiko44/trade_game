import {
  ActionType,
  BotLevel,
  ItemType,
  MatchStatus,
  MatchType,
  PrismaClient,
  Side
} from "@prisma/client";
import { GAME_CONFIG, REWARDS } from "../config/gameConfig";
import { auditLog } from "./auditLogService";
import { calculatePnlBySide, closeAllOpenPositions, createPosition } from "./positionService";
import { ResolveTurnInput, StartCpuMatchInput } from "../types/game";
import { decideCpuAction } from "./cpuStrategy/cpuStrategy";
import { BattleContext, CpuDifficulty } from "./cpuStrategy/types";

const prisma = new PrismaClient();

type MatchEffectState = {
  shieldUntilTurn: Partial<Record<Side, number>>;
  doubleForceUntilTurn: Partial<Record<Side, number>>;
};

const matchEffects = new Map<string, MatchEffectState>();
const matchSubturnCounts = new Map<string, number>();

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export async function claimLoginBonus(userId: string) {
  const now = new Date();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("USER_NOT_FOUND");

  const alreadyClaimedToday =
    user.lastLoginBonusAt && user.lastLoginBonusAt.toDateString() === now.toDateString();

  if (alreadyClaimedToday) {
    auditLog("LOGIN_BONUS_SKIPPED", { userId, reason: "already_claimed_today" });
    return user;
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      lifePoints: { increment: GAME_CONFIG.loginBonusLifePoints },
      lastLoginBonusAt: now
    }
  });
  auditLog("LOGIN_BONUS_CLAIMED", { userId, lifePoints: updated.lifePoints });
  return updated;
}

export async function startCpuMatch(input: StartCpuMatchInput) {
  const user = await prisma.user.findUnique({ where: { id: input.userId } });
  if (!user) throw new Error("USER_NOT_FOUND");
  const debugFreeMatch = process.env.NODE_ENV !== "production" && process.env.DEBUG_FREE_CPU_MATCH === "true";
  if (!debugFreeMatch && user.lifePoints < GAME_CONFIG.matchCostLifePoints) {
    throw new Error("NOT_ENOUGH_LIFE_POINTS");
  }

  const cpuUser = await prisma.user.upsert({
    where: { id: `cpu-${input.botLevel.toLowerCase()}` },
    update: {},
    create: {
      id: `cpu-${input.botLevel.toLowerCase()}`,
      name: `CPU ${input.botLevel}`,
      avatarId: "balanced",
      lifePoints: 9999
    }
  });

  if (!debugFreeMatch) {
    await prisma.user.update({
      where: { id: user.id },
      data: { lifePoints: { decrement: GAME_CONFIG.matchCostLifePoints } }
    });
  }

  const match = await prisma.match.create({
    data: {
      type: MatchType.CPU,
      botLevel: input.botLevel,
      status: MatchStatus.ACTIVE,
      initialPrice: GAME_CONFIG.initialPrice,
      currentPrice: GAME_CONFIG.initialPrice,
      targetUpperPrice: GAME_CONFIG.upperTarget,
      targetLowerPrice: GAME_CONFIG.lowerTarget,
      maxTurns: GAME_CONFIG.maxTurns,
      players: {
        create: [
          { userId: user.id, side: Side.BUY, cash: GAME_CONFIG.initialCash },
          { userId: cpuUser.id, side: Side.SELL, cash: GAME_CONFIG.initialCash, isCpu: true }
        ]
      }
    },
    include: { players: true }
  });
  auditLog("MATCH_CREATED_CPU", { matchId: match.id, userId: user.id, botLevel: input.botLevel });
  return match;
}

export async function refillLifePointsForDebug(userId: string, amount?: number) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("DEBUG_DISABLED");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("USER_NOT_FOUND");

  const refillAmount = amount ?? GAME_CONFIG.debugRefillLifePoints;
  const targetLifePoints = Math.max(user.lifePoints + refillAmount, GAME_CONFIG.debugMinLifePoints);

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { lifePoints: targetLifePoints }
  });

  auditLog("DEBUG_LIFEPOINTS_REFILLED", {
    userId,
    before: user.lifePoints,
    after: updated.lifePoints,
    refillAmount
  });

  return updated;
}

function mapBotLevel(level: BotLevel): CpuDifficulty {
  if (level === BotLevel.HARD) return "hard";
  if (level === BotLevel.NORMAL) return "normal";
  return "easy";
}

function mapCpuActionToTurnAction(action: "buy" | "sell" | "hold" | "item"): ActionType {
  if (action === "buy") return ActionType.BUY;
  if (action === "sell") return ActionType.SELL;
  if (action === "item") return ActionType.ITEM;
  return ActionType.HOLD;
}

function applyItemPrice(itemType: ItemType | undefined, currentPrice: number, side: Side) {
  if (!itemType) return currentPrice;
  if (itemType === ItemType.PRICE_SPIKE) {
    return side === Side.BUY ? GAME_CONFIG.upperTarget - 1 : GAME_CONFIG.lowerTarget + 1;
  }
  return currentPrice;
}

export async function resolveTurn(input: ResolveTurnInput) {
  const match = await prisma.match.findUnique({
    where: { id: input.matchId },
    include: {
      players: true,
      turns: { orderBy: { turnNumber: "asc" }, take: 30 }
    }
  });
  if (!match) throw new Error("MATCH_NOT_FOUND");
  if (match.status !== MatchStatus.ACTIVE) throw new Error("MATCH_NOT_ACTIVE");

  const player = match.players.find((p) => p.userId === input.action.userId);
  const cpu = match.players.find((p) => p.isCpu);
  if (!player || !cpu) throw new Error("PLAYER_NOT_FOUND");

  const playerAmount = clamp(input.action.amount ?? 0, 0, GAME_CONFIG.maxInvestmentPerTurn);
  const battleContext: BattleContext = {
    currentPrice: Number(match.currentPrice),
    initialPrice: Number(match.initialPrice),
    targetUpPrice: Number(match.targetUpperPrice),
    targetDownPrice: Number(match.targetLowerPrice),
    turn: match.turnNumber,
    maxTurn: match.maxTurns,
    playerCash: Number(player.cash),
    cpuCash: Number(cpu.cash),
    priceHistory: match.turns.map((turn) => Number(turn.closePrice)),
    lastActions: [],
    detectedPatterns: []
  };
  const cpuDecision = decideCpuAction(mapBotLevel(match.botLevel ?? BotLevel.EASY), battleContext);
  const botMove = {
    actionType: mapCpuActionToTurnAction(cpuDecision.action),
    amount: clamp(cpuDecision.amount, 0, GAME_CONFIG.maxInvestmentPerTurn),
    itemType: cpuDecision.itemId === "PRICE_SPIKE" ? ItemType.PRICE_SPIKE : undefined
  };

  const effectState = matchEffects.get(match.id) ?? { shieldUntilTurn: {}, doubleForceUntilTurn: {} };
  const playerDoubleForce = effectState.doubleForceUntilTurn[player.side] === match.turnNumber ? 2 : 1;
  const cpuDoubleForce = effectState.doubleForceUntilTurn[cpu.side] === match.turnNumber ? 2 : 1;
  const playerShield = effectState.shieldUntilTurn[player.side] === match.turnNumber ? 0.5 : 1;
  const cpuShield = effectState.shieldUntilTurn[cpu.side] === match.turnNumber ? 0.5 : 1;

  const playerEffectiveAmount = Math.round(playerAmount * playerDoubleForce * cpuShield);
  const cpuEffectiveAmount = Math.round(botMove.amount * cpuDoubleForce * playerShield);

  const buyTotal =
    (input.action.actionType === ActionType.BUY ? playerEffectiveAmount : 0) +
    (botMove.actionType === ActionType.BUY ? cpuEffectiveAmount : 0);
  const sellTotal =
    (input.action.actionType === ActionType.SELL ? playerEffectiveAmount : 0) +
    (botMove.actionType === ActionType.SELL ? cpuEffectiveAmount : 0);

  const impactByAction = (actionType: ActionType, amount: number) => {
    if (actionType === ActionType.BUY) return amount * GAME_CONFIG.basePriceImpactFactor;
    if (actionType === ActionType.SELL) return -amount * GAME_CONFIG.basePriceImpactFactor;
    return 0;
  };

  const open = Number(match.currentPrice);
  const playerDelta = impactByAction(input.action.actionType, playerEffectiveAmount);
  const cpuDelta = impactByAction(botMove.actionType, cpuEffectiveAmount);

  const afterPlayer = Math.max(GAME_CONFIG.minimumPrice, open + playerDelta);
  let close = Math.max(GAME_CONFIG.minimumPrice, afterPlayer + cpuDelta);
  close = applyItemPrice(input.action.itemType, close, player.side);
  close = applyItemPrice(botMove.itemType, close, cpu.side);

  const high = Math.max(open, afterPlayer, close);
  const low = Math.min(open, afterPlayer, close);

  if (input.action.actionType === ActionType.ITEM && input.action.itemType === ItemType.SHIELD) {
    effectState.shieldUntilTurn[player.side] = match.turnNumber + 1;
  }
  if (input.action.actionType === ActionType.ITEM && input.action.itemType === ItemType.DOUBLE_FORCE) {
    effectState.doubleForceUntilTurn[player.side] = match.turnNumber + 1;
  }
  matchEffects.set(match.id, effectState);

  const currentSubturn = (matchSubturnCounts.get(match.id) ?? 0) + 1;
  const existingTurn = await prisma.matchTurn.findUnique({
    where: { matchId_turnNumber: { matchId: match.id, turnNumber: match.turnNumber } }
  });

  const turn = existingTurn
    ? await prisma.matchTurn.update({
        where: { id: existingTurn.id },
        data: {
          highPrice: Math.max(Number(existingTurn.highPrice), high),
          lowPrice: Math.min(Number(existingTurn.lowPrice), low),
          closePrice: close,
          buyTotal: existingTurn.buyTotal + buyTotal,
          sellTotal: existingTurn.sellTotal + sellTotal
        }
      })
    : await prisma.matchTurn.create({
        data: {
          matchId: match.id,
          turnNumber: match.turnNumber,
          openPrice: open,
          highPrice: high,
          lowPrice: low,
          closePrice: close,
          buyTotal,
          sellTotal
        }
      });

  await prisma.turnAction.createMany({
    data: [
      {
        matchTurnId: turn.id,
        userId: player.userId,
        actionType: input.action.actionType,
        amount: playerEffectiveAmount,
        itemType: input.action.itemType
      },
      {
        matchTurnId: turn.id,
        userId: cpu.userId,
        actionType: botMove.actionType,
        amount: cpuEffectiveAmount,
        itemType: botMove.itemType
      }
    ]
  });

  if (input.action.actionType === ActionType.BUY || input.action.actionType === ActionType.SELL) {
    createPosition({
      matchId: match.id,
      userId: player.userId,
      side: input.action.actionType === ActionType.BUY ? Side.BUY : Side.SELL,
      orderType: "MARKET",
      entryPrice: afterPlayer,
      quantity: Math.max(1, playerEffectiveAmount),
      entryTurn: match.turnNumber
    });
  }

  if (botMove.actionType === ActionType.BUY || botMove.actionType === ActionType.SELL) {
    createPosition({
      matchId: match.id,
      userId: cpu.userId,
      side: botMove.actionType === ActionType.BUY ? Side.BUY : Side.SELL,
      orderType: "MARKET",
      entryPrice: close,
      quantity: Math.max(1, cpuEffectiveAmount),
      entryTurn: match.turnNumber
    });
  }

  let status: MatchStatus = MatchStatus.ACTIVE;
  let winnerSide: Side | null = null;

  if (close >= Number(match.targetUpperPrice)) {
    status = MatchStatus.FINISHED;
    winnerSide = Side.BUY;
  } else if (close <= Number(match.targetLowerPrice)) {
    status = MatchStatus.FINISHED;
    winnerSide = Side.SELL;
  } else if (match.turnNumber >= match.maxTurns && currentSubturn >= 3) {
    status = MatchStatus.FINISHED;
    winnerSide = close >= Number(match.initialPrice) ? Side.BUY : Side.SELL;
  }

  if (status === MatchStatus.FINISHED) {
    closeAllOpenPositions(match.id, close, match.turnNumber);
    const pnlBySide = calculatePnlBySide(
      match.id,
      new Map(match.players.map((p) => [p.userId, p.side]))
    );
    if (pnlBySide.BUY !== pnlBySide.SELL) {
      winnerSide = pnlBySide.BUY > pnlBySide.SELL ? Side.BUY : Side.SELL;
    }
  }

  const nextTurnNumber = status === MatchStatus.FINISHED ? match.turnNumber : currentSubturn >= 3 ? match.turnNumber + 1 : match.turnNumber;

  const updated = await prisma.match.update({
    where: { id: match.id },
    data: {
      currentPrice: close,
      turnNumber: nextTurnNumber,
      status,
      winnerSide,
      endedAt: status === MatchStatus.FINISHED ? new Date() : null
    },
    include: {
      players: true,
      turns: { orderBy: { turnNumber: "asc" } }
    }
  });

  if (status === MatchStatus.FINISHED) {
    matchSubturnCounts.delete(match.id);
    const isWin = winnerSide === player.side;
    await prisma.user.update({
      where: { id: player.userId },
      data: { coins: { increment: isWin ? REWARDS.winCoins : REWARDS.loseCoins } }
    });
    auditLog("MATCH_FINISHED", {
      matchId: match.id,
      winnerSide,
      playerUserId: player.userId,
      result: isWin ? "WIN" : "LOSE"
    });
  } else {
    matchSubturnCounts.set(match.id, currentSubturn >= 3 ? 0 : currentSubturn);
  }

  auditLog("TURN_RESOLVED", {
    matchId: match.id,
    turnNumber: match.turnNumber,
    subturn: currentSubturn,
    actionType: input.action.actionType,
    buyTotal,
    sellTotal,
    close
  });

  const displaySubturn = currentSubturn >= 3 ? 3 : currentSubturn;
  return { match: { ...updated, subturn: displaySubturn }, turn };
}

export async function getMatch(matchId: string) {
  return prisma.match.findUnique({
    where: { id: matchId },
    include: {
      players: { include: { user: true } },
      turns: { include: { actions: true }, orderBy: { turnNumber: "asc" } }
    }
  });
}

export async function getUserHome(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { inventories: { include: { item: true } } }
  });
  if (!user) throw new Error("USER_NOT_FOUND");
  return user;
}
