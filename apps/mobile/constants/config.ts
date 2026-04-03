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

function rewriteLoopbackForRuntime(url: string, lanApiBaseUrl: string | null) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1") return { url, source: "env" as const };

    if (Platform.OS === "android") {
      return {
        url: lanApiBaseUrl ?? `http://10.0.2.2:${parsed.port || "4000"}/api`,
        source: lanApiBaseUrl ? ("env-localhost-rewritten-to-expo-host" as const) : ("env-localhost-rewritten-to-android-emulator" as const)
      };
    }

    return { url, source: "env" as const };
  } catch {
    return { url, source: "env" as const };
  }
}

function rewriteLikelyDbPort(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.port !== "5432") return { url, source: "env" as const };
    parsed.port = "4000";
    parsed.pathname = "/api";
    return {
      url: parsed.toString().replace(/\/$/, ""),
      source: "env-db-port-rewritten-to-api-port" as const
    };
  } catch {
    return { url, source: "env" as const };
  }
}

const envApiBaseUrlRaw = normalizeApiBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL);
const lanApiBaseUrl = inferLanApiBaseUrlFromExpoHost();
const platformFallback = Platform.OS === "android" ? "http://10.0.2.2:4000/api" : "http://localhost:4000/api";

const envResolved = envApiBaseUrlRaw ? rewriteLoopbackForRuntime(envApiBaseUrlRaw, lanApiBaseUrl) : null;
const envPortResolved = envResolved ? rewriteLikelyDbPort(envResolved.url) : null;

export const API_BASE_URL = envPortResolved?.url ?? envResolved?.url ?? lanApiBaseUrl ?? platformFallback;
export const USER_ID = "demo-user";

export const API_BASE_URL_SOURCE = envPortResolved?.source
  ?? envResolved?.source
  ?? (lanApiBaseUrl
    ? "expo-host"
    : Platform.OS === "android"
      ? "android-emulator-fallback"
      : "localhost-fallback");
