import { Platform } from "react-native";

function normalizeApiBaseUrl(rawUrl: string | undefined) {
  const fallback = Platform.OS === "android" ? "http://10.0.2.2:4000/api" : "http://localhost:4000/api";
  if (!rawUrl) return fallback;
  const trimmed = rawUrl.trim().replace(/\/+$/, "");
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
}

export const API_BASE_URL = normalizeApiBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL);
export const USER_ID = "demo-user";
