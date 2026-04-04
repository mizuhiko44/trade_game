import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Button, Text, View } from "react-native";
import { fetchMatch } from "../services/api";

export default function ResultScreen() {
  const router = useRouter();
  const { winnerSide, price, matchId } = useLocalSearchParams<{ winnerSide: string; price: string; matchId: string }>();
  const [turns, setTurns] = useState<any[]>([]);

  useEffect(() => {
    if (!matchId) return;
    fetchMatch(matchId)
      .then((data) => setTurns(data.match?.turns ?? []))
      .catch(() => setTurns([]));
  }, [matchId]);

  const summary = useMemo(() => {
    if (!turns.length) return null;
    const closes = turns.map((t) => Number(t.closePrice));
    const firstClose = closes[0];
    const lastClose = closes[closes.length - 1];
    const netMove = lastClose - firstClose;
    const keyTurn = turns.reduce(
      (best, t) => {
        const swing = Math.abs(Number(t.highPrice) - Number(t.lowPrice));
        if (swing > best.swing) {
          return { turnNumber: Number(t.turnNumber), swing };
        }
        return best;
      },
      { turnNumber: Number(turns[0]?.turnNumber ?? 1), swing: 0 }
    );
    const winnerText = winnerSide === "BUY" ? "上昇方向" : winnerSide === "SELL" ? "下落方向" : "拮抗";
    return {
      count: turns.length,
      high: Math.max(...closes).toFixed(2),
      low: Math.min(...closes).toFixed(2),
      lastClose: lastClose.toFixed(2),
      summaryText: `勝敗サマリ: ${winnerText}が優勢（値動き ${netMove >= 0 ? "+" : ""}${netMove.toFixed(2)} / 重要ターン T${keyTurn.turnNumber}）`
    };
  }, [turns]);

  return (
    <View style={{ flex: 1, padding: 20, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: "700" }}>結果</Text>
      <Text>勝者サイド: {winnerSide}</Text>
      <Text>最終価格: {price}</Text>
      {summary ? (
        <View style={{ gap: 4 }}>
          <Text>ターン数: {summary.count}</Text>
          <Text>終値レンジ: High {summary.high} / Low {summary.low}</Text>
          <Text>最終終値: {summary.lastClose}</Text>
          <Text>{summary.summaryText}</Text>
        </View>
      ) : null}
      <Text>報酬: 勝利100コイン / 敗北20コイン</Text>
      <Button title="ホームへ戻る" onPress={() => router.replace("/")} />
    </View>
  );
}
