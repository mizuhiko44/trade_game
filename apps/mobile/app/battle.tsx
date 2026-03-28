import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Button, ScrollView, Text, View } from "react-native";
import CandlestickChart from "../components/CandlestickChart";
import { API_BASE_URL, API_BASE_URL_SOURCE } from "../constants/config";
import { closePosition, fetchPositions, sendAction, startCpuMatch } from "../services/api";

type TradeAction = "BUY" | "SELL" | "HOLD" | "SETTLE";
type Position = {
  id: string;
  positionId?: string;
  entryTurn: number;
  exitTurn?: number;
  entryPrice: number | string;
  exitPrice?: number | string;
  side: "BUY" | "SELL" | string;
  status: "OPEN" | "CLOSED" | string;
  orderType: "MARKET" | "LIMIT" | string;
};

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

const UI_REVISION = "battle-ui-r7";

export default function BattleScreen() {
  const router = useRouter();
  const { matchId, autoStart, botLevel } = useLocalSearchParams<{ matchId?: string; autoStart?: string; botLevel?: "EASY" | "NORMAL" | "HARD" }>();
  const [state, setState] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [amount] = useState(100);
  const assetType: keyof typeof CHART_PRESETS = "USDJPY";
  const [notice, setNotice] = useState<string | null>(null);
  const [turnInfo, setTurnInfo] = useState<string>("あなたのターン");
  const [isUserTurn, setIsUserTurn] = useState(true);
  const [remainingSec, setRemainingSec] = useState(60);
  const [positions, setPositions] = useState<Position[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<any | null>(null);
  const [chartTapPrice, setChartTapPrice] = useState<number | null>(null);
  const [startLog, setStartLog] = useState<string[]>([]);

  const chartData = useMemo(
    () => [...CHART_PRESETS[assetType], ...((state?.turns as any[]) ?? [])],
    [assetType, state?.turns]
  );

  const currentPrice = Number(state?.currentPrice ?? 100);
  const selfPlayer = state?.players?.find((p: any) => p.userId === "demo-user");
  const opponentPlayer = state?.players?.find((p: any) => p.userId !== "demo-user");

  function pushStartLog(message: string) {
    const timestamp = new Date().toISOString().slice(11, 19);
    setStartLog((prev) => [`${timestamp} ${message}`, ...prev].slice(0, 8));
  }

  useEffect(() => {
    if (matchId || autoStart !== "1") return;
    let active = true;
    void (async () => {
      try {
        setNotice("対戦を開始しています...");
        pushStartLog("autoStart 検知");
        const data = await startCpuMatch(botLevel ?? "NORMAL");
        if (!active) return;
        pushStartLog(`マッチ作成成功: ${data.match.id}`);
        router.replace({ pathname: "/battle", params: { matchId: data.match.id } });
      } catch (e) {
        if (!active) return;
        const msg = (e as Error).message;
        setError(msg);
        pushStartLog(`マッチ作成失敗: ${msg}`);
      }
    })();
    return () => {
      active = false;
    };
  }, [autoStart, botLevel, matchId, router]);

  async function refreshPositions() {
    if (!matchId) return;
    const data = await fetchPositions(matchId);
    setPositions((data.positions ?? []) as Position[]);
  }

  async function action(type: TradeAction, source: "USER" | "AUTO" = "USER") {
    if (!matchId) return;
    if (source === "USER" && !isUserTurn) {
      setNotice("現在は相手ターンです。");
      return;
    }
    try {
      setError(null);
      setNotice(null);

      if (type === "SETTLE") {
        await sendAction(matchId, "HOLD", 0);
        setNotice("ポジションを決済しました（MVPではHoldとして処理）");
        return;
      }

      const data = await sendAction(matchId, type, type === "HOLD" ? 0 : amount);
      setState(data.match);
      await refreshPositions();
      setRemainingSec(60);
      setIsUserTurn(false);
      setTimeout(() => setIsUserTurn(true), 5000);
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
      await refreshPositions();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    if (!matchId) return;
    void refreshPositions();
  }, [matchId]);

  useEffect(() => {
    if (!matchId) return;
    const timer = setInterval(() => {
      if (state?.status === "FINISHED") return;
      setRemainingSec((prev) => {
        if (!isUserTurn) return prev;
        if (prev <= 1) {
          void action("HOLD", "AUTO");
          setNotice("60秒間操作がなかったためパスしました。相手ターンです。");
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [matchId, state?.status, isUserTurn]);

  useEffect(() => {
    if (isUserTurn) {
      setTurnInfo(`あなたのターン（残り ${remainingSec} 秒）`);
    } else {
      setTurnInfo("相手ターン...");
    }
  }, [isUserTurn, remainingSec]);

  const executionMarkers: Array<{
    id: string;
    positionId: string;
    turnNumber: number;
    price: number;
    side: "BUY" | "SELL";
    status: "OPEN" | "CLOSED";
    orderType: "MARKET" | "LIMIT";
  }> = positions.map((p) => ({
    id: String(p.id),
    positionId: String(p.id),
    turnNumber: Number(p.status === "OPEN" ? p.entryTurn : p.exitTurn ?? p.entryTurn),
    price: Number(p.status === "OPEN" ? p.entryPrice : p.exitPrice ?? p.entryPrice),
    side: p.side === "BUY" ? "BUY" : "SELL",
    status: p.status === "CLOSED" ? "CLOSED" : "OPEN",
    orderType: p.orderType === "LIMIT" ? "LIMIT" : "MARKET"
  }));

  return (
    <ScrollView contentContainerStyle={{ gap: 10, padding: 20 }} style={{ flex: 1 }}>
      <Text style={{ fontSize: 20, fontWeight: "700" }}>対戦画面</Text>
      {error ? <Text style={{ color: "red" }}>通信エラー: {error}</Text> : null}
      <Text style={{ color: "#1d4ed8" }}>{turnInfo}</Text>
      {notice ? <Text style={{ color: "#1d4ed8" }}>{notice}</Text> : null}
      <View style={{ borderWidth: 1, borderRadius: 8, padding: 8, gap: 2, borderColor: "#cbd5e1" }}>
        <Text style={{ fontSize: 12, color: "#64748b" }}>UI Revision: {UI_REVISION}</Text>
        <Text style={{ fontSize: 12, color: "#64748b" }}>autoStart: {String(autoStart ?? "-")}</Text>
        <Text style={{ fontSize: 12, color: "#64748b" }}>param matchId: {String(matchId ?? "-")}</Text>
        <Text style={{ fontSize: 12, color: "#64748b" }}>state matchId: {String(state?.id ?? "-")}</Text>
        <Text style={{ fontSize: 12, color: "#64748b" }}>API: {API_BASE_URL}</Text>
        <Text style={{ fontSize: 12, color: "#64748b" }}>API Source: {API_BASE_URL_SOURCE}</Text>
        {startLog.map((line) => (
          <Text key={line} style={{ fontSize: 12, color: "#475569" }}>{line}</Text>
        ))}
      </View>
      <Text>Match: {matchId}</Text>
      <Text>現在価格: {state?.currentPrice ?? "100"}</Text>
      <Text>ターン: {state?.turnNumber ?? 1}</Text>
      <Text>目標価格: 上110 / 下90</Text>
      <Text>
        自分: {AVATAR_PRESETS[selfPlayer?.userId ?? "demo-user"] ?? "🙂"} / 相手:{" "}
        {AVATAR_PRESETS[opponentPlayer?.userId ?? "cpu-normal"] ?? "🤖"}
      </Text>
      <CandlestickChart
        turns={chartData}
        executions={executionMarkers}
        onExecutionPress={(execution) => {
          setSelectedMarker(execution);
          setChartTapPrice(null);
        }}
        onChartPress={({ price }) => {
          setChartTapPrice(price);
          setSelectedMarker(null);
        }}
      />
      {chartTapPrice !== null ? (
        <View style={{ borderWidth: 1, borderRadius: 8, padding: 10, gap: 6 }}>
          <Text style={{ fontWeight: "700" }}>チャートタップ操作</Text>
          <Text>タップ価格: {chartTapPrice.toFixed(2)}</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button title={`Buy ${amount}`} onPress={() => action("BUY")} />
            <Button title={`Sell ${amount}`} onPress={() => action("SELL")} />
            <Button title="Hold" onPress={() => action("HOLD")} />
          </View>
        </View>
      ) : null}
      {selectedMarker ? (
        <View style={{ borderWidth: 1, borderRadius: 8, padding: 10, gap: 4 }}>
          <Text style={{ fontWeight: "700" }}>約定マーカー詳細</Text>
          <Text>サイド: {selectedMarker.side}</Text>
          <Text>価格: {Number(selectedMarker.price).toFixed(2)}</Text>
          <Text>状態: {selectedMarker.status}</Text>
          <Text>注文: {selectedMarker.orderType}</Text>
          {selectedMarker.status === "OPEN" && selectedMarker.orderType === "MARKET" ? (
            <Button
              title="成行で決済"
              onPress={async () => {
                await closePosition(selectedMarker.positionId, currentPrice, Number(state?.turnNumber ?? 1));
                setNotice("決済しました。");
                setSelectedMarker(null);
                await refreshPositions();
              }}
            />
          ) : null}
          <Button title="閉じる" onPress={() => setSelectedMarker(null)} />
        </View>
      ) : null}
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
    </ScrollView>
  );
}
