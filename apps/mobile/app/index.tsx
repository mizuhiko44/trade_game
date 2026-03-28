import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Button, Text, View } from "react-native";
import { claimBonus, fetchHome } from "../services/api";

export default function HomeScreen() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [startingMatch, setStartingMatch] = useState(false);

  async function load() {
    try {
      setError(null);
      const data = await fetchHome();
      setUser(data.user);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <View style={{ flex: 1, gap: 12, padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: "700" }}>Trade Game MVP</Text>
      {error ? <Text style={{ color: "red" }}>通信エラー: {error}</Text> : null}
      <Text>ユーザー: {user?.name ?? "-"}</Text>
      <Text>アバター: {user?.avatarId ?? "-"}</Text>
      <Text>ライフポイント: {user?.lifePoints ?? "-"}</Text>
      <Button
        title="ログインボーナス受け取り"
        onPress={async () => {
          await claimBonus();
          await load();
        }}
      />
      <Button
        title={startingMatch ? "対戦準備中..." : "CPU戦開始 (Normal)"}
        disabled={startingMatch}
        onPress={async () => {
          setError(null);
          setStartingMatch(true);
          router.push({ pathname: "/battle", params: { autoStart: "1", botLevel: "NORMAL" } });
          setStartingMatch(false);
        }}
      />
      <Button title="デバッグ受信画面へ" onPress={() => router.push("/debug")} />
    </View>
  );
}
