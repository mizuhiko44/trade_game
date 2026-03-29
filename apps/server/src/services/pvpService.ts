import { MatchStatus, MatchType, PrismaClient, Side } from "@prisma/client";
import { GAME_CONFIG } from "../config/gameConfig";

const prisma = new PrismaClient();

type QueueTicket = {
  id: string;
  userId: string;
  createdAt: number;
  matchedMatchId?: string;
};

const queue: QueueTicket[] = [];

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

async function createPvpMatch(userA: string, userB: string) {
  return prisma.match.create({
    data: {
      type: MatchType.PVP,
      status: MatchStatus.ACTIVE,
      initialPrice: GAME_CONFIG.initialPrice,
      currentPrice: GAME_CONFIG.initialPrice,
      targetUpperPrice: GAME_CONFIG.upperTarget,
      targetLowerPrice: GAME_CONFIG.lowerTarget,
      maxTurns: GAME_CONFIG.maxTurns,
      players: {
        create: [
          { userId: userA, side: Side.BUY, cash: GAME_CONFIG.initialCash },
          { userId: userB, side: Side.SELL, cash: GAME_CONFIG.initialCash }
        ]
      }
    }
  });
}

export async function enqueuePvp(userId: string) {
  const existing = queue.find((t) => t.userId === userId && !t.matchedMatchId);
  if (existing) return existing;

  const ticket: QueueTicket = { id: uid(), userId, createdAt: Date.now() };
  queue.push(ticket);

  if (queue.length >= 2) {
    const a = queue.shift();
    const b = queue.shift();
    if (a && b) {
      const match = await createPvpMatch(a.userId, b.userId);
      a.matchedMatchId = match.id;
      b.matchedMatchId = match.id;
      queue.unshift(a, b);
    }
  }

  return ticket;
}

export function getPvpTicket(ticketId: string) {
  return queue.find((t) => t.id === ticketId);
}

export async function getRanking(limit = 20) {
  return prisma.user.findMany({
    orderBy: { coins: "desc" },
    take: limit,
    select: { id: true, name: true, coins: true, lifePoints: true }
  });
}
