import { API_BASE_URL, USER_ID } from "../constants/config";

async function parseJsonOrThrow(res: Response) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = typeof body?.message === "string" ? body.message : `HTTP_${res.status}`;
    throw new Error(message);
  }
  return body;
}

export async function fetchHome() {
  const res = await fetch(`${API_BASE_URL}/home?userId=${USER_ID}`);
  return parseJsonOrThrow(res);
}

export async function claimBonus() {
  const res = await fetch(`${API_BASE_URL}/login-bonus`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: USER_ID })
  });
  return parseJsonOrThrow(res);
}

export async function startCpuMatch(botLevel: "EASY" | "NORMAL" | "HARD") {
  const res = await fetch(`${API_BASE_URL}/matches/cpu`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: USER_ID, botLevel })
  });
  return parseJsonOrThrow(res);
}

export async function sendAction(matchId: string, actionType: "BUY" | "SELL" | "HOLD", amount: number) {
  const res = await fetch(`${API_BASE_URL}/matches/${matchId}/actions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: USER_ID, actionType, amount })
  });
  return parseJsonOrThrow(res);
}

export async function fetchDebugMessages() {
  const res = await fetch(`${API_BASE_URL}/debug/messages?limit=20`);
  return parseJsonOrThrow(res);
}
