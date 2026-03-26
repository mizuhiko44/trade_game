import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Button, Text, View } from "react-native";
import { claimBonus, fetchHome, startCpuMatch } from "../services/api";

export default function HomeScreen() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  async function load() {
    const data = await fetchHome();
    setUser(data.user);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <View style={{ flex: 1, gap: 12, padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: "700" }}>Trade Game MVP</Text>
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
        title="CPU戦開始 (Normal)"
        onPress={async () => {
          const data = await startCpuMatch("NORMAL");
          router.push({ pathname: "/battle", params: { matchId: data.match.id } });
        }}
      />
    </View>
  );
}
