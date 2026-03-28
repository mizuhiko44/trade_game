import Constants from "expo-constants";
import { Platform } from "react-native";

function normalizeApiBaseUrl(rawUrl: string | undefined) {
  const trimmed = rawUrl?.trim().replace(/\/+$/, "");
  if (!trimmed) return null;
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
}

function inferLanApiBaseUrlFromExpoHost() {
  const hostUri =
    (Constants as any)?.expoConfig?.hostUri ??
    (Constants as any)?.expoGoConfig?.debuggerHost ??
    (Constants as any)?.manifest2?.extra?.expoClient?.hostUri;

  if (typeof hostUri !== "string" || !hostUri.length) return null;
  const host = hostUri.split(":")[0];
  if (!host) return null;
  return `http://${host}:4000/api`;
}

const envApiBaseUrl = normalizeApiBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL);
const lanApiBaseUrl = inferLanApiBaseUrlFromExpoHost();
const platformFallback = Platform.OS === "android" ? "http://10.0.2.2:4000/api" : "http://localhost:4000/api";

export const API_BASE_URL = envApiBaseUrl ?? lanApiBaseUrl ?? platformFallback;
export const USER_ID = "demo-user";

export const API_BASE_URL_SOURCE = envApiBaseUrl
  ? "env"
  : lanApiBaseUrl
    ? "expo-host"
    : Platform.OS === "android"
      ? "android-emulator-fallback"
      : "localhost-fallback";
