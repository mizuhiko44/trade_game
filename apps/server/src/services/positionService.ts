import { Side } from "@prisma/client";

export type TradePosition = {
  id: string;
  matchId: string;
  userId: string;
  side: Side;
  orderType: "MARKET" | "LIMIT";
  entryPrice: number;
  quantity: number;
  entryTurn: number;
  status: "OPEN" | "CLOSED";
  exitPrice?: number;
  exitTurn?: number;
  realizedPnl?: number;
};

const positionsByMatch = new Map<string, TradePosition[]>();

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createPosition(params: {
  matchId: string;
  userId: string;
  side: Side;
  orderType?: "MARKET" | "LIMIT";
  entryPrice: number;
  quantity: number;
  entryTurn: number;
}) {
  const position: TradePosition = {
    id: uid(),
    matchId: params.matchId,
    userId: params.userId,
    side: params.side,
    orderType: params.orderType ?? "MARKET",
    entryPrice: params.entryPrice,
    quantity: params.quantity,
    entryTurn: params.entryTurn,
    status: "OPEN"
  };

  const list = positionsByMatch.get(params.matchId) ?? [];
  list.push(position);
  positionsByMatch.set(params.matchId, list);
  return position;
}

export function listPositions(matchId: string, userId?: string) {
  const list = positionsByMatch.get(matchId) ?? [];
  return userId ? list.filter((p) => p.userId === userId) : list;
}

export function closePosition(params: { positionId: string; closePrice: number; closeTurn: number }) {
  for (const [, list] of positionsByMatch.entries()) {
    const position = list.find((p) => p.id === params.positionId);
    if (!position) continue;
    if (position.status === "CLOSED") return position;

    position.status = "CLOSED";
    position.exitPrice = params.closePrice;
    position.exitTurn = params.closeTurn;

    const direction = position.side === Side.BUY ? 1 : -1;
    position.realizedPnl = (params.closePrice - position.entryPrice) * direction * position.quantity;
    return position;
  }
  return null;
}


export function closeAllOpenPositions(matchId: string, closePrice: number, closeTurn: number) {
  const list = positionsByMatch.get(matchId) ?? [];
  return list
    .filter((p) => p.status === "OPEN")
    .map((p) => closePosition({ positionId: p.id, closePrice, closeTurn }))
    .filter((p): p is TradePosition => Boolean(p));
}

export function calculatePnlBySide(matchId: string, sideByUserId: Map<string, Side>) {
  const list = positionsByMatch.get(matchId) ?? [];
  const totals: Record<Side, number> = { BUY: 0, SELL: 0 };

  for (const p of list) {
    if (typeof p.realizedPnl !== "number") continue;
    const side = sideByUserId.get(p.userId);
    if (!side) continue;
    totals[side] += p.realizedPnl;
  }

  return totals;
}
