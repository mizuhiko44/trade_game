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
import { ResolveTurnInput, StartCpuMatchInput } from "../types/game";

const prisma = new PrismaClient();

const levelMultiplier: Record<BotLevel, number> = {
  EASY: 0.7,
  NORMAL: 1,
  HARD: 1.2
};

type MatchEffectState = {
  shieldUntilTurn: Partial<Record<Side, number>>;
  doubleForceUntilTurn: Partial<Record<Side, number>>;
};

const matchEffects = new Map<string, MatchEffectState>();

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
  if (user.lifePoints < GAME_CONFIG.matchCostLifePoints) throw new Error("NOT_ENOUGH_LIFE_POINTS");

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

  await prisma.user.update({
    where: { id: user.id },
    data: { lifePoints: { decrement: GAME_CONFIG.matchCostLifePoints } }
  });

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

function cpuDecision(
  botLevel: BotLevel,
  turn: number,
  currentPrice: number,
  initialPrice: number
): { actionType: ActionType; amount: number } {
  const base = Math.min(GAME_CONFIG.maxInvestmentPerTurn, 80 + turn * 10);
  const amount = Math.round(base * levelMultiplier[botLevel]);

  if (botLevel === BotLevel.EASY) {
    return turn % 3 === 0 ? { actionType: ActionType.HOLD, amount: 0 } : { actionType: ActionType.SELL, amount };
  }

  if (botLevel === BotLevel.NORMAL) {
    const actionType = currentPrice >= initialPrice ? ActionType.SELL : ActionType.BUY;
    return { actionType, amount };
  }

  // HARD: target side（SELL）優先で価格を押し下げる
  const actionType = currentPrice > initialPrice - 1 ? ActionType.SELL : ActionType.HOLD;
  return { actionType, amount: actionType === ActionType.HOLD ? 0 : amount };
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
    include: { players: true }
  });
  if (!match) throw new Error("MATCH_NOT_FOUND");
  if (match.status !== MatchStatus.ACTIVE) throw new Error("MATCH_NOT_ACTIVE");

  const player = match.players.find((p) => p.userId === input.action.userId);
  const cpu = match.players.find((p) => p.isCpu);
  if (!player || !cpu) throw new Error("PLAYER_NOT_FOUND");

  const playerAmount = clamp(input.action.amount ?? 0, 0, GAME_CONFIG.maxInvestmentPerTurn);
  const botMove = cpuDecision(
    match.botLevel ?? BotLevel.EASY,
    match.turnNumber,
    Number(match.currentPrice),
    Number(match.initialPrice)
  );

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

  const open = Number(match.currentPrice);
  const rawDelta = (buyTotal - sellTotal) * GAME_CONFIG.basePriceImpactFactor;
  let close = Math.max(GAME_CONFIG.minimumPrice, open + rawDelta);
  close = applyItemPrice(input.action.itemType, close, player.side);
  const high = Math.max(open, close);
  const low = Math.min(open, close);

  if (input.action.actionType === ActionType.ITEM && input.action.itemType === ItemType.SHIELD) {
    effectState.shieldUntilTurn[player.side] = match.turnNumber + 1;
  }
  if (input.action.actionType === ActionType.ITEM && input.action.itemType === ItemType.DOUBLE_FORCE) {
    effectState.doubleForceUntilTurn[player.side] = match.turnNumber + 1;
  }
  matchEffects.set(match.id, effectState);

  const turn = await prisma.matchTurn.create({
    data: {
      matchId: match.id,
      turnNumber: match.turnNumber,
      openPrice: open,
      highPrice: high,
      lowPrice: low,
      closePrice: close,
      buyTotal,
      sellTotal,
      actions: {
        create: [
          {
            userId: player.userId,
            actionType: input.action.actionType,
            amount: playerEffectiveAmount,
            itemType: input.action.itemType
          },
          { userId: cpu.userId, actionType: botMove.actionType, amount: cpuEffectiveAmount }
        ]
      }
    }
  });

  let status: MatchStatus = MatchStatus.ACTIVE;
  let winnerSide: Side | null = null;

  if (close >= Number(match.targetUpperPrice)) {
    status = MatchStatus.FINISHED;
    winnerSide = Side.BUY;
  } else if (close <= Number(match.targetLowerPrice)) {
    status = MatchStatus.FINISHED;
    winnerSide = Side.SELL;
  } else if (match.turnNumber >= match.maxTurns) {
    status = MatchStatus.FINISHED;
    winnerSide = close >= Number(match.initialPrice) ? Side.BUY : Side.SELL;
  }

  const updated = await prisma.match.update({
    where: { id: match.id },
    data: {
      currentPrice: close,
      turnNumber: status === MatchStatus.FINISHED ? match.turnNumber : match.turnNumber + 1,
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
  }

  auditLog("TURN_RESOLVED", {
    matchId: match.id,
    turnNumber: match.turnNumber,
    actionType: input.action.actionType,
    buyTotal,
    sellTotal,
    close
  });

  return { match: updated, turn };
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
