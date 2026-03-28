import { Platform } from "react-native";
import { API_BASE_URL, USER_ID } from "../constants/config";

const DEBUG_API_LOG = true;

function rewriteLoopbackForAndroid(url: string) {
  if (Platform.OS !== "android") return url;
  return url
    .replace("http://localhost:", "http://10.0.2.2:")
    .replace("http://127.0.0.1:", "http://10.0.2.2:");
}

function apiLog(message: string, payload?: unknown) {
  if (!DEBUG_API_LOG) return;
  if (payload === undefined) {
    console.log(`[API] ${message}`);
    return;
  }
  console.log(`[API] ${message}`, payload);
}

async function parseJsonOrThrow(res: Response, traceId: string) {
  const body = await res.json().catch(() => ({}));
  apiLog(`${traceId} <- ${res.status}`, body);
  if (!res.ok) {
    const message = typeof body?.message === "string" ? body.message : `HTTP_${res.status}`;
    throw new Error(message);
  }
  return body;
}

async function requestJson(path: string, init?: RequestInit) {
  const traceId = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const url = rewriteLoopbackForAndroid(`${API_BASE_URL}${path}`);
  apiLog(`${traceId} -> ${init?.method ?? "GET"} ${url}`, init?.body ? { body: init.body } : undefined);
  try {
    const res = await fetch(url, init);
    return parseJsonOrThrow(res, traceId);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    apiLog(`${traceId} !! network_error`, { message, url });
    throw new Error(`NETWORK_ERROR: ${message} (url=${url})`);
  }
}

export async function fetchHome() {
  return requestJson(`/home?userId=${USER_ID}`);
}

export async function claimBonus() {
  return requestJson(`/login-bonus`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: USER_ID })
  });
}

export async function startCpuMatch(botLevel: "EASY" | "NORMAL" | "HARD") {
  return requestJson(`/matches/cpu`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: USER_ID, botLevel })
  });
}

export async function sendAction(
  matchId: string,
  actionType: "BUY" | "SELL" | "HOLD" | "ITEM",
  amount: number,
  itemType?: "PRICE_SPIKE" | "SHIELD" | "DOUBLE_FORCE"
) {
  return requestJson(`/matches/${matchId}/actions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: USER_ID, actionType, amount, itemType })
  });
}

export async function fetchMatch(matchId: string) {
  return requestJson(`/matches/${matchId}`);
}

export async function fetchPositions(matchId: string, userId?: string) {
  const suffix = userId ? `?userId=${userId}` : "";
  return requestJson(`/matches/${matchId}/positions${suffix}`);
}

export async function closePosition(positionId: string, closePrice: number, closeTurn: number) {
  return requestJson(`/positions/${positionId}/close`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ closePrice, closeTurn })
  });
}

export async function fetchDebugMessages() {
  return requestJson(`/debug/messages?limit=20`);
}

export async function postDebugMessage(text: string, source = "mobile") {
  return requestJson(`/debug/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, source })
  });
}

export async function clearDebugMessages() {
  return requestJson(`/debug/messages`, {
    method: "DELETE"
  });
}
