import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Button, Text, TextInput, View } from "react-native";
import CandlestickChart from "../components/CandlestickChart";
import { sendAction } from "../services/api";

type TradeAction = "BUY" | "SELL" | "HOLD" | "SETTLE";
type OrderType = "MARKET" | "LIMIT";

const AVATAR_PRESETS: Record<string, string> = {
  "demo-user": "🧑‍💼",
  "cpu-easy": "🤖",
  "cpu-normal": "🦾",
  "cpu-hard": "👾"
};

const CHART_PRESETS = {
  USDJPY: [
    { id: "u1", turnNumber: -5, openPrice: 99.5, highPrice: 100.2, lowPrice: 99.3, closePrice: 100.1 },
    { id: "u2", turnNumber: -4, openPrice: 100.1, highPrice: 100.6, lowPrice: 99.9, closePrice: 100.4 },
    { id: "u3", turnNumber: -3, openPrice: 100.4, highPrice: 100.7, lowPrice: 99.8, closePrice: 100.0 }
  ],
  STOCK: [
    { id: "s1", turnNumber: -5, openPrice: 98, highPrice: 101, lowPrice: 97.5, closePrice: 100.8 },
    { id: "s2", turnNumber: -4, openPrice: 100.8, highPrice: 102.2, lowPrice: 99.5, closePrice: 99.7 },
    { id: "s3", turnNumber: -3, openPrice: 99.7, highPrice: 101.5, lowPrice: 99.1, closePrice: 100.9 }
  ],
  BOND: [
    { id: "b1", turnNumber: -5, openPrice: 100.2, highPrice: 100.3, lowPrice: 99.8, closePrice: 99.9 },
    { id: "b2", turnNumber: -4, openPrice: 99.9, highPrice: 100.1, lowPrice: 99.6, closePrice: 99.8 },
    { id: "b3", turnNumber: -3, openPrice: 99.8, highPrice: 100.0, lowPrice: 99.5, closePrice: 99.7 }
  ]
} as const;

export default function BattleScreen() {
  const router = useRouter();
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const [state, setState] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState(100);
  const [orderType, setOrderType] = useState<OrderType>("MARKET");
  const [limitPrice, setLimitPrice] = useState("100");
  const [assetType, setAssetType] = useState<keyof typeof CHART_PRESETS>("USDJPY");
  const [notice, setNotice] = useState<string | null>(null);

  const chartData = useMemo(
    () => [...CHART_PRESETS[assetType], ...((state?.turns as any[]) ?? [])],
    [assetType, state?.turns]
  );

  const currentPrice = Number(state?.currentPrice ?? 100);
  const selfPlayer = state?.players?.find((p: any) => p.userId === "demo-user");
  const opponentPlayer = state?.players?.find((p: any) => p.userId !== "demo-user");

  async function action(type: TradeAction) {
    if (!matchId) return;
    try {
      setError(null);
      setNotice(null);

      if (type === "SETTLE") {
        await sendAction(matchId, "HOLD", 0);
        setNotice("ポジションを決済しました（MVPではHoldとして処理）");
        return;
      }

      if (orderType === "LIMIT" && (type === "BUY" || type === "SELL")) {
        const limit = Number(limitPrice);
        const shouldFill = type === "BUY" ? currentPrice <= limit : currentPrice >= limit;
        if (!shouldFill) {
          setNotice(`指値未約定 (${type}) : 現在価格=${currentPrice.toFixed(2)} / 指値=${limit.toFixed(2)}`);
          return;
        }
      }

      const data = await sendAction(matchId, type, type === "HOLD" ? 0 : amount);
      setState(data.match);
      if (data.match.status === "FINISHED") {
        router.push({
          pathname: "/result",
          params: { winnerSide: data.match.winnerSide, price: data.match.currentPrice, matchId: data.match.id }
        });
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function useItem(itemType: "PRICE_SPIKE" | "SHIELD" | "DOUBLE_FORCE") {
    if (!matchId) return;
    try {
      setError(null);
      const data = await sendAction(matchId, "ITEM", 0, itemType);
      setState(data.match);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    if (!matchId) return;
    const timer = setInterval(() => {
      if (state?.status !== "FINISHED") {
        void action("HOLD");
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [matchId, state?.status]);

  return (
    <View style={{ flex: 1, gap: 10, padding: 20 }}>
      <Text style={{ fontSize: 20, fontWeight: "700" }}>対戦画面</Text>
      {error ? <Text style={{ color: "red" }}>通信エラー: {error}</Text> : null}
      {notice ? <Text style={{ color: "#1d4ed8" }}>{notice}</Text> : null}
      <Text>Match: {matchId}</Text>
      <Text>現在価格: {state?.currentPrice ?? "100"}</Text>
      <Text>ターン: {state?.turnNumber ?? 1}</Text>
      <Text>目標価格: 上110 / 下90</Text>
      <Text>
        自分: {AVATAR_PRESETS[selfPlayer?.userId ?? "demo-user"] ?? "🙂"} / 相手:{" "}
        {AVATAR_PRESETS[opponentPlayer?.userId ?? "cpu-normal"] ?? "🤖"}
      </Text>
      <Text>チャート種別</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button title="ドル円" onPress={() => setAssetType("USDJPY")} />
        <Button title="株" onPress={() => setAssetType("STOCK")} />
        <Button title="債券" onPress={() => setAssetType("BOND")} />
      </View>
      <Text>投入金額: {amount}</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button title="50" onPress={() => setAmount(50)} />
        <Button title="100" onPress={() => setAmount(100)} />
        <Button title="200" onPress={() => setAmount(200)} />
        <Button title="300" onPress={() => setAmount(300)} />
      </View>
      <Text>注文方式</Text>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button title="成行" onPress={() => setOrderType("MARKET")} />
        <Button title="指値" onPress={() => setOrderType("LIMIT")} />
      </View>
      {orderType === "LIMIT" ? (
        <TextInput
          value={limitPrice}
          onChangeText={setLimitPrice}
          keyboardType="numeric"
          placeholder="指値価格"
          style={{ borderWidth: 1, borderRadius: 8, padding: 8 }}
        />
      ) : null}
      <CandlestickChart turns={chartData} />
      <Button title={`Buy ${amount}`} onPress={() => action("BUY")} />
      <Button title={`Sell ${amount}`} onPress={() => action("SELL")} />
      <Button title="Hold" onPress={() => action("HOLD")} />
      <Button
        title="Item: Price Spike"
        onPress={() => useItem("PRICE_SPIKE")}
      />
      <Button
        title="Item: Shield"
        onPress={() => useItem("SHIELD")}
      />
      <Button
        title="Item: Double Force"
        onPress={() => useItem("DOUBLE_FORCE")}
      />
      <Button title="決済" onPress={() => action("SETTLE")} />
    </View>
  );
}
