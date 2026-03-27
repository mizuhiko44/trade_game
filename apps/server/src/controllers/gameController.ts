import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { claimLoginBonus, getMatch, getUserHome, resolveTurn, startCpuMatch } from "../services/gameService";
import { addDebugMessage, clearDebugMessages, listDebugMessages } from "../services/debugService";
import { enqueuePvp, getPvpTicket, getRanking } from "../services/pvpService";

const startMatchSchema = z.object({
  userId: z.string(),
  botLevel: z.enum(["EASY", "NORMAL", "HARD"])
});

const actionSchema = z.object({
  userId: z.string(),
  actionType: z.enum(["BUY", "SELL", "HOLD", "ITEM"]),
  amount: z.number().int().min(0).optional(),
  itemType: z.enum(["PRICE_SPIKE", "SHIELD", "DOUBLE_FORCE"]).optional()
});

export async function home(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = String(req.query.userId ?? "demo-user");
    const user = await getUserHome(userId);
    res.json({ user });
  } catch (e) {
    next(e);
  }
}

export async function loginBonus(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = z.object({ userId: z.string() }).parse(req.body);
    const user = await claimLoginBonus(parsed.userId);
    res.json({ user });
  } catch (e) {
    next(e);
  }
}

export async function startCpu(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = startMatchSchema.parse(req.body);
    const match = await startCpuMatch(parsed);
    res.status(201).json({ match });
  } catch (e) {
    next(e);
  }
}

export async function action(req: Request, res: Response, next: NextFunction) {
  try {
    const matchId = req.params.matchId;
    const parsed = actionSchema.parse(req.body);
    const result = await resolveTurn({ matchId, action: parsed });
    res.json(result);
  } catch (e) {
    next(e);
  }
}

export async function matchDetail(req: Request, res: Response, next: NextFunction) {
  try {
    const match = await getMatch(req.params.matchId);
    res.json({ match });
  } catch (e) {
    next(e);
  }
}

export async function postDebugMessage(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = z.object({ text: z.string().min(1), source: z.string().optional() }).parse(req.body);
    const message = addDebugMessage(parsed.text, parsed.source ?? "external");
    res.status(201).json({ message });
  } catch (e) {
    next(e);
  }
}

export async function getDebugMessages(req: Request, res: Response, next: NextFunction) {
  try {
    const limit = z.coerce.number().int().min(1).max(100).parse(req.query.limit ?? 20);
    const messages = listDebugMessages(limit);
    res.json({ messages });
  } catch (e) {
    next(e);
  }
}

export async function deleteDebugMessages(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = clearDebugMessages();
    res.json(result);
  } catch (e) {
    next(e);
  }
}

export async function pvpQueue(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = z.object({ userId: z.string() }).parse(req.body);
    const ticket = await enqueuePvp(parsed.userId);
    res.status(201).json({ ticket });
  } catch (e) {
    next(e);
  }
}

export async function pvpQueueStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const ticket = getPvpTicket(req.params.ticketId);
    if (!ticket) return res.status(404).json({ code: "NOT_FOUND", message: "ticket not found" });
    res.json({ ticket });
  } catch (e) {
    next(e);
  }
}

export async function rankings(req: Request, res: Response, next: NextFunction) {
  try {
    const limit = z.coerce.number().int().min(1).max(100).parse(req.query.limit ?? 20);
    const ranking = await getRanking(limit);
    res.json({ ranking });
  } catch (e) {
    next(e);
  }
}
