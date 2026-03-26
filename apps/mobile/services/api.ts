import { API_BASE_URL, USER_ID } from "../constants/config";

export async function fetchHome() {
  const res = await fetch(`${API_BASE_URL}/home?userId=${USER_ID}`);
  return res.json();
}

export async function claimBonus() {
  const res = await fetch(`${API_BASE_URL}/login-bonus`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: USER_ID })
  });
  return res.json();
}

export async function startCpuMatch(botLevel: "EASY" | "NORMAL" | "HARD") {
  const res = await fetch(`${API_BASE_URL}/matches/cpu`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: USER_ID, botLevel })
  });
  return res.json();
}

export async function sendAction(matchId: string, actionType: "BUY" | "SELL" | "HOLD", amount: number) {
  const res = await fetch(`${API_BASE_URL}/matches/${matchId}/actions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: USER_ID, actionType, amount })
  });
  return res.json();
}

export async function fetchDebugMessages() {
  const res = await fetch(`${API_BASE_URL}/debug/messages?limit=20`);
  return res.json();
}
