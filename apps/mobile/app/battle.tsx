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
  quantity?: number;
  exitPrice?: number | string;
  userId?: string;
  side: "BUY" | "SELL" | string;
  status: "OPEN" | "CLOSED" | string;
  orderType: "MARKET" | "LIMIT" | string;
  realizedPnl?: number;
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
const SELF_USER_ID = "demo-user";

export default function BattleScreen() {
  const router = useRouter();
  const { matchId, autoStart, botLevel } = useLocalSearchParams<{ matchId?: string; autoStart?: string; botLevel?: "EASY" | "NORMAL" | "HARD" }>();
  const [state, setState] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState(100);
  const assetType: keyof typeof CHART_PRESETS = "USDJPY";
  const [notice, setNotice] = useState<string | null>(null);
  const [turnInfo, setTurnInfo] = useState<string>("あなたのターン");
  const [isUserTurn, setIsUserTurn] = useState(true);
  const [remainingSec, setRemainingSec] = useState(60);
  const [positions, setPositions] = useState<Position[]>([]);
  const [selectedMarker, setSelectedMarker] = useState<any | null>(null);
  const [chartTapPrice, setChartTapPrice] = useState<number | null>(null);
  const [startLog, setStartLog] = useState<string[]>([]);

  function toUserFacingError(e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    if (message.includes("DB_SCHEMA_NOT_READY") || message.includes("does not exist in the current database")) {
      return "DBスキーマ未適用: `cd apps/server && npx prisma migrate dev --name init && npm run seed` を実行してください。";
    }
    if (message.includes("DB_UNREACHABLE") || message.includes("Database is unreachable")) {
      return "DB接続エラー: PostgreSQL が起動しているか確認してください（Windows + Docker Desktop の場合はデーモン起動も確認）。apps/server/.env の DATABASE_URL も確認してください。";
    }
    return message;
  }

  const chartData = useMemo(
    () => [...CHART_PRESETS[assetType], ...((state?.turns as any[]) ?? [])],
    [assetType, state?.turns]
  );

  const currentPrice = Number(state?.currentPrice ?? 100);
  const selfPlayer = state?.players?.find((p: any) => p.userId === SELF_USER_ID);
  const opponentPlayer = state?.players?.find((p: any) => p.userId !== SELF_USER_ID);

  const avatarLevelBonus = 0; // 将来: アバターレベルに応じて加算
  const maxLot = 1000 + avatarLevelBonus;
  const lotOptions = useMemo(() => {
    const values: number[] = [];
    for (let lot = 50; lot <= maxLot; lot += 50) values.push(lot);
    return values;
  }, [maxLot]);

  useEffect(() => {
    if (amount > maxLot) setAmount(maxLot);
  }, [amount, maxLot]);

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
    try {
      const data = await fetchPositions(matchId);
      setPositions((data.positions ?? []) as Position[]);
    } catch (e) {
      setError(toUserFacingError(e));
    }
  }

  async function action(type: TradeAction, source: "USER" | "AUTO" = "USER") {
    if (!matchId) return;
    if (state?.status === "FINISHED") {
      setNotice("この対戦は終了済みです。結果画面に遷移してください。");
      return;
    }
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
    } catch (e) {
      const message = toUserFacingError(e);
      if (message.includes("MATCH_NOT_ACTIVE")) {
        setNotice("対戦はすでに終了しています（MATCH_NOT_ACTIVE）。");
        setIsUserTurn(false);
        setError(null);
        return;
      }
      setError(message);
    }
  }

  async function useItem(itemType: "PRICE_SPIKE" | "SHIELD" | "DOUBLE_FORCE") {
    if (!matchId) return;
    if (state?.status === "FINISHED") {
      setNotice("この対戦は終了済みです。");
      return;
    }
    try {
      setError(null);
      const data = await sendAction(matchId, "ITEM", 0, itemType);
      setState(data.match);
      await refreshPositions();
    } catch (e) {
      const message = toUserFacingError(e);
      if (message.includes("MATCH_NOT_ACTIVE")) {
        setNotice("対戦はすでに終了しています（MATCH_NOT_ACTIVE）。");
        setIsUserTurn(false);
        setError(null);
        return;
      }
      setError(message);
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


  const pnlBySide = positions.reduce(
    (acc, p) => {
      if (typeof p.realizedPnl !== "number") return acc;
      const side = p.side === "BUY" ? "BUY" : "SELL";
      acc[side] += p.realizedPnl;
      return acc;
    },
    { BUY: 0, SELL: 0 }
  );

  const selfSide: "BUY" | "SELL" = selfPlayer?.side === "SELL" ? "SELL" : "BUY";
  const opponentSide: "BUY" | "SELL" = selfSide === "BUY" ? "SELL" : "BUY";
  const selfPnl = pnlBySide[selfSide];
  const opponentPnl = pnlBySide[opponentSide];
  const selfPositions = positions.filter((p) => p.userId === selfPlayer?.userId);
  const opponentPositions = positions.filter((p) => p.userId === opponentPlayer?.userId);
  const selfResultLabel =
    state?.status === "FINISHED"
      ? selfPnl === opponentPnl
        ? "DRAW"
        : selfPnl > opponentPnl
          ? "WIN"
          : "LOSE"
      : "";

  function calcPositionPnl(p: Position) {
    const entry = Number(p.entryPrice);
    const qty = Number(p.quantity ?? 0);
    const mark = p.status === "OPEN" ? currentPrice : Number(p.exitPrice ?? currentPrice);
    const direction = p.side === "BUY" ? 1 : -1;
    return (mark - entry) * direction * qty;
  }

  async function settlePosition(positionId: string) {
    try {
      await closePosition(positionId, currentPrice, Number(state?.turnNumber ?? 1));
      await refreshPositions();
    } catch (e) {
      setError(toUserFacingError(e));
    }
  }

  async function settleAllOpenPositions() {
    try {
      const openPositions = positions.filter((p) => p.status === "OPEN");
      for (const p of openPositions) {
        await closePosition(String(p.id), currentPrice, Number(state?.turnNumber ?? 1));
      }
      setNotice(`オール決済しました（${openPositions.length}件）`);
      await refreshPositions();
    } catch (e) {
      setError(toUserFacingError(e));
    }
  }

  return (
    <ScrollView contentContainerStyle={{ gap: 10, padding: 20 }} style={{ flex: 1 }}>
      <Text style={{ fontSize: 20, fontWeight: "700" }}>対戦画面</Text>
      {error ? <Text style={{ color: "red" }}>通信エラー: {error}</Text> : null}
      <Text style={{ color: "#1d4ed8" }}>{turnInfo}</Text>
      {notice ? <Text style={{ color: "#1d4ed8" }}>{notice}</Text> : null}
      <Text>現在価格: {state?.currentPrice ?? "100"}</Text>
      <Text>
        ターン: {state?.turnNumber ?? 1}（ローソク足内バトル {Number(state?.subturn ?? 1)}/3）
      </Text>
      <Text>BUY合計損益: {pnlBySide.BUY.toFixed(2)} / SELL合計損益: {pnlBySide.SELL.toFixed(2)}</Text>

      {state?.status === "FINISHED" ? (
        <Text style={{ fontWeight: "700" }}>損益勝者: {selfPnl >= opponentPnl ? "自分" : "相手"}</Text>
      ) : null}
      <Text>
        自分: {AVATAR_PRESETS[selfPlayer?.userId ?? "demo-user"] ?? "🙂"} 損益={selfPnl.toFixed(2)} {selfResultLabel} / 相手:{" "}
        {AVATAR_PRESETS[opponentPlayer?.userId ?? "cpu-normal"] ?? "🤖"} 損益={opponentPnl.toFixed(2)} / 目標: 上110・下90
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
        <View style={{ borderWidth: 1, borderRadius: 8, padding: 10, gap: 8 }}>
          <Text style={{ fontWeight: "700" }}>チャートタップ操作</Text>
          <Text>タップ価格: {chartTapPrice.toFixed(2)}</Text>
          <Text>ロット選択（最大 {maxLot}）</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator style={{ maxHeight: 44 }}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {lotOptions.map((lot) => (
                <Button key={lot} title={lot === amount ? `●${lot}` : String(lot)} onPress={() => setAmount(lot)} />
              ))}
            </View>
          </ScrollView>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Button title={`Buy ${amount}`} onPress={() => action("BUY")} />
            <Button title={`Sell ${amount}`} onPress={() => action("SELL")} />
            <Button title="Hold" onPress={() => action("HOLD")} />
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <Button title="⚡" onPress={() => useItem("PRICE_SPIKE")} />
            <Button title="🛡" onPress={() => useItem("SHIELD")} />
            <Button title="💥" onPress={() => useItem("DOUBLE_FORCE")} />
            <Button title="🧹" onPress={settleAllOpenPositions} />
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
                try {
                  const result = await closePosition(selectedMarker.positionId, currentPrice, Number(state?.turnNumber ?? 1));
                  const pnl = Number(result?.position?.realizedPnl ?? 0);
                  setNotice(`決済しました。損益=${pnl.toFixed(2)}`);
                  setSelectedMarker(null);
                  await refreshPositions();
                } catch (e) {
                  setError(toUserFacingError(e));
                }
              }}
            />
          ) : null}
          <Button title="閉じる" onPress={() => setSelectedMarker(null)} />
        </View>
      ) : null}
      <View style={{ borderWidth: 1, borderRadius: 8, padding: 8, gap: 6 }}>
        <Text style={{ fontWeight: "700" }}>自分の約定一覧</Text>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ width: 50 }}>Side</Text>
          <Text style={{ width: 80 }}>価格</Text>
          <Text style={{ width: 90 }}>利益</Text>
          <Text style={{ width: 80 }}>決済</Text>
        </View>
        {selfPositions.length === 0 ? <Text>約定はまだありません。</Text> : null}
        {selfPositions.map((p) => (
          <View key={String(p.id)} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ width: 50 }}>{p.side}</Text>
            <Text style={{ width: 80 }}>{Number(p.entryPrice).toFixed(2)}</Text>
            <Text style={{ width: 90 }}>{calcPositionPnl(p).toFixed(2)}</Text>
            {p.status === "OPEN" ? (
              <View style={{ width: 80 }}>
                <Button title="決済" onPress={() => settlePosition(String(p.id))} />
              </View>
            ) : (
              <Text style={{ width: 80 }}>済</Text>
            )}
          </View>
        ))}
      </View>
      <View style={{ borderWidth: 1, borderRadius: 8, padding: 8, gap: 6 }}>
        <Text style={{ fontWeight: "700" }}>相手の約定一覧（CPU含む）</Text>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ width: 50 }}>Side</Text>
          <Text style={{ width: 80 }}>価格</Text>
          <Text style={{ width: 90 }}>利益</Text>
          <Text style={{ width: 80 }}>状態</Text>
        </View>
        {opponentPositions.length === 0 ? <Text>相手の約定はまだありません。</Text> : null}
        {opponentPositions.map((p) => (
          <View key={String(p.id)} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ width: 50 }}>{p.side}</Text>
            <Text style={{ width: 80 }}>{Number(p.entryPrice).toFixed(2)}</Text>
            <Text style={{ width: 90 }}>{calcPositionPnl(p).toFixed(2)}</Text>
            <Text style={{ width: 80 }}>{p.status === "OPEN" ? "保有中" : "済"}</Text>
          </View>
        ))}
      </View>
      <View style={{ borderTopWidth: 1, borderColor: "#cbd5e1", paddingTop: 8, marginTop: 8 }}>
        <Text style={{ fontSize: 12, color: "#64748b" }}>Match: {matchId}</Text>
        <Text style={{ fontSize: 12, color: "#64748b" }}>API: {API_BASE_URL}</Text>
        <Text style={{ fontSize: 12, color: "#64748b" }}>API Source: {API_BASE_URL_SOURCE}</Text>
        <Text style={{ fontSize: 12, color: "#64748b" }}>UI Revision: {UI_REVISION}</Text>
        <Text style={{ fontSize: 12, color: "#64748b" }}>autoStart: {String(autoStart ?? "-")}</Text>
        <Text style={{ fontSize: 12, color: "#64748b" }}>param matchId: {String(matchId ?? "-")}</Text>
        <Text style={{ fontSize: 12, color: "#64748b" }}>state matchId: {String(state?.id ?? "-")}</Text>
        {startLog.map((line) => (
          <Text key={line} style={{ fontSize: 12, color: "#475569" }}>{line}</Text>
        ))}
      </View>
    </ScrollView>
  );
}
