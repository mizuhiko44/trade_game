import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Button, Text, View } from "react-native";
import { claimBonus, fetchHome } from "../services/api";
import { API_BASE_URL, API_BASE_URL_SOURCE } from "../constants/config";

const UI_REVISION = "mobile-ui-r7";

export default function HomeScreen() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [startingMatch, setStartingMatch] = useState(false);
  const [startLog, setStartLog] = useState<string[]>([]);

  async function load() {
    try {
      setError(null);
      const data = await fetchHome();
      setUser(data.user);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function toUserFacingError(e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    if (message.includes("DB_UNREACHABLE") || message.includes("Database is unreachable")) {
      return "DB接続エラー: PostgreSQL が起動しているか確認してください（apps/server/.env の DATABASE_URL も確認）";
    }
    return message;
  }

  useEffect(() => {
    load();
  }, []);

  function pushStartLog(message: string) {
    const timestamp = new Date().toISOString().slice(11, 19);
    setStartLog((prev) => [`${timestamp} ${message}`, ...prev].slice(0, 5));
  }


  return (
    <View style={{ flex: 1, gap: 12, padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: "700" }}>Trade Game MVP</Text>
      <Text style={{ fontSize: 12, color: "#64748b" }}>UI Revision: {UI_REVISION}</Text>
      <Text style={{ fontSize: 12, color: "#64748b" }}>API: {API_BASE_URL}</Text>
      <Text style={{ fontSize: 12, color: "#64748b" }}>API Source: {API_BASE_URL_SOURCE}</Text>

      {error ? <Text style={{ color: "red" }}>通信エラー: {error}</Text> : null}
      <Text>ユーザー: {user?.name ?? "-"}</Text>
      <Text>アバター: {user?.avatarId ?? "-"}</Text>
      <Text>ライフポイント: {user?.lifePoints ?? "-"}</Text>
      <Button
        title="ログインボーナス受け取り"
        onPress={async () => {
          try {
            await claimBonus();
            await load();
          } catch (e) {
            setError(toUserFacingError(e));
          }
        }}
      />
      <Button
        title={startingMatch ? "対戦準備中..." : "CPU戦開始 (Normal)"}
        disabled={startingMatch}
        onPress={async () => {
          setError(null);
          setStartingMatch(true);
          pushStartLog("対戦画面への遷移を開始");
          try {
            router.push({ pathname: "/battle", params: { autoStart: "1", botLevel: "NORMAL" } });
            pushStartLog("router.push 実行完了");
          } catch (e) {
            const msg = (e as Error).message;
            setError(msg);
            pushStartLog(`router.push 失敗: ${msg}`);
          } finally {
            setStartingMatch(false);
          }
        }}
      />
      <Button title="デバッグ受信画面へ" onPress={() => router.push("/debug")} />

      <Text style={{ fontWeight: "700" }}>起動ログ</Text>
      {startLog.length === 0 ? <Text style={{ color: "#666" }}>ログなし</Text> : null}
      {startLog.map((line) => (
        <Text key={line} style={{ fontSize: 12, color: "#334155" }}>{line}</Text>
      ))}
    </View>
  );
}
