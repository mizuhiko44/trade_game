import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Button, Text, View } from "react-native";
import { sendAction } from "../services/api";

export default function BattleScreen() {
  const router = useRouter();
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const [state, setState] = useState<any>(null);

  async function action(type: "BUY" | "SELL" | "HOLD") {
    if (!matchId) return;
    const data = await sendAction(matchId, type, type === "HOLD" ? 0 : 100);
    setState(data.match);
    if (data.match.status === "FINISHED") {
      router.push({
        pathname: "/result",
        params: { winnerSide: data.match.winnerSide, price: data.match.currentPrice }
      });
    }
  }

  return (
    <View style={{ flex: 1, gap: 10, padding: 20 }}>
      <Text style={{ fontSize: 20, fontWeight: "700" }}>対戦画面</Text>
      <Text>Match: {matchId}</Text>
      <Text>現在価格: {state?.currentPrice ?? "100"}</Text>
      <Text>ターン: {state?.turnNumber ?? 1}</Text>
      <Text>目標価格: 上110 / 下90</Text>
      <Button title="Buy 100" onPress={() => action("BUY")} />
      <Button title="Sell 100" onPress={() => action("SELL")} />
      <Button title="Hold" onPress={() => action("HOLD")} />
    </View>
  );
}
