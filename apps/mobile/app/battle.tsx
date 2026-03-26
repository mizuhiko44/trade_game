import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Button, Text, View } from "react-native";
import CandlestickChart from "../components/CandlestickChart";
import { sendAction } from "../services/api";

export default function BattleScreen() {
  const router = useRouter();
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const [state, setState] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState(100);

  async function action(type: "BUY" | "SELL" | "HOLD") {
    if (!matchId) return;
    try {
      setError(null);
      const data = await sendAction(matchId, type, type === "HOLD" ? 0 : amount);
      setState(data.match);
      if (data.match.status === "FINISHED") {
        router.push({
          pathname: "/result",
          params: { winnerSide: data.match.winnerSide, price: data.match.currentPrice }
        });
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <View style={{ flex: 1, gap: 10, padding: 20 }}>
      <Text style={{ fontSize: 20, fontWeight: "700" }}>対戦画面</Text>
      {error ? <Text style={{ color: "red" }}>通信エラー: {error}</Text> : null}
      <Text>Match: {matchId}</Text>
      <Text>現在価格: {state?.currentPrice ?? "100"}</Text>
      <Text>ターン: {state?.turnNumber ?? 1}</Text>
      <Text>目標価格: 上110 / 下90</Text>
      <Text>投入金額: {amount}</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button title="50" onPress={() => setAmount(50)} />
        <Button title="100" onPress={() => setAmount(100)} />
        <Button title="200" onPress={() => setAmount(200)} />
        <Button title="300" onPress={() => setAmount(300)} />
      </View>
      <CandlestickChart turns={state?.turns ?? []} />
      <Button title={`Buy ${amount}`} onPress={() => action("BUY")} />
      <Button title={`Sell ${amount}`} onPress={() => action("SELL")} />
      <Button title="Hold" onPress={() => action("HOLD")} />
    </View>
  );
}
