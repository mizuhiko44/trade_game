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
    return {
      count: turns.length,
      high: Math.max(...closes).toFixed(2),
      low: Math.min(...closes).toFixed(2),
      lastClose: closes[closes.length - 1].toFixed(2)
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
        </View>
      ) : null}
      <Text>報酬: 勝利100コイン / 敗北20コイン</Text>
      <Button title="ホームへ戻る" onPress={() => router.replace("/")} />
    </View>
  );
}
