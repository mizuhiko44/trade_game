import { ActionType, BotLevel, ItemType, Side } from "@prisma/client";

export type StartCpuMatchInput = {
  userId: string;
  botLevel: BotLevel;
};

export type PlayerActionInput = {
  userId: string;
  actionType: ActionType;
  amount?: number;
  itemType?: ItemType;
};

export type ResolveTurnInput = {
  matchId: string;
  action: PlayerActionInput;
};

export type CpuAction = {
  actionType: ActionType;
  amount: number;
  side: Side;
};
