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
import { ResolveTurnInput, StartCpuMatchInput } from "../types/game";

const prisma = new PrismaClient();

const levelMultiplier: Record<BotLevel, number> = {
  EASY: 0.7,
  NORMAL: 1,
  HARD: 1.2
};

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
    return user;
  }

  return prisma.user.update({
    where: { id: userId },
    data: {
      lifePoints: { increment: GAME_CONFIG.loginBonusLifePoints },
      lastLoginBonusAt: now
    }
  });
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

  return prisma.match.create({
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
}

function cpuDecision(botLevel: BotLevel, turn: number) {
  const base = Math.min(GAME_CONFIG.maxInvestmentPerTurn, 80 + turn * 10);
  const amount = Math.round(base * levelMultiplier[botLevel]);
  return { actionType: ActionType.SELL, amount };
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
  const botMove = cpuDecision(match.botLevel ?? BotLevel.EASY, match.turnNumber);

  const buyTotal =
    (input.action.actionType === ActionType.BUY ? playerAmount : 0) +
    (botMove.actionType === ActionType.BUY ? botMove.amount : 0);
  const sellTotal =
    (input.action.actionType === ActionType.SELL ? playerAmount : 0) +
    (botMove.actionType === ActionType.SELL ? botMove.amount : 0);

  const open = Number(match.currentPrice);
  const rawDelta = (buyTotal - sellTotal) * GAME_CONFIG.basePriceImpactFactor;
  let close = Math.max(GAME_CONFIG.minimumPrice, open + rawDelta);
  close = applyItemPrice(input.action.itemType, close, player.side);
  const high = Math.max(open, close);
  const low = Math.min(open, close);

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
            amount: playerAmount,
            itemType: input.action.itemType
          },
          { userId: cpu.userId, actionType: botMove.actionType, amount: botMove.amount }
        ]
      }
    }
  });

  let status = MatchStatus.ACTIVE;
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
  }

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
