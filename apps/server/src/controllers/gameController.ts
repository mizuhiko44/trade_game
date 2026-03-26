import { Request, Response } from "express";
import { z } from "zod";
import { claimLoginBonus, getMatch, getUserHome, resolveTurn, startCpuMatch } from "../services/gameService";

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

export async function home(req: Request, res: Response) {
  try {
    const userId = String(req.query.userId ?? "demo-user");
    const user = await getUserHome(userId);
    res.json({ user });
  } catch (e) {
    res.status(400).json({ message: (e as Error).message });
  }
}

export async function loginBonus(req: Request, res: Response) {
  try {
    const parsed = z.object({ userId: z.string() }).parse(req.body);
    const user = await claimLoginBonus(parsed.userId);
    res.json({ user });
  } catch (e) {
    res.status(400).json({ message: (e as Error).message });
  }
}

export async function startCpu(req: Request, res: Response) {
  try {
    const parsed = startMatchSchema.parse(req.body);
    const match = await startCpuMatch(parsed);
    res.status(201).json({ match });
  } catch (e) {
    res.status(400).json({ message: (e as Error).message });
  }
}

export async function action(req: Request, res: Response) {
  try {
    const matchId = req.params.matchId;
    const parsed = actionSchema.parse(req.body);
    const result = await resolveTurn({ matchId, action: parsed });
    res.json(result);
  } catch (e) {
    res.status(400).json({ message: (e as Error).message });
  }
}

export async function matchDetail(req: Request, res: Response) {
  try {
    const match = await getMatch(req.params.matchId);
    res.json({ match });
  } catch (e) {
    res.status(400).json({ message: (e as Error).message });
  }
}
