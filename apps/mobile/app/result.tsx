import { useLocalSearchParams, useRouter } from "expo-router";
import { Button, Text, View } from "react-native";

export default function ResultScreen() {
  const router = useRouter();
  const { winnerSide, price } = useLocalSearchParams<{ winnerSide: string; price: string }>();
  return (
    <View style={{ flex: 1, padding: 20, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: "700" }}>結果</Text>
      <Text>勝者サイド: {winnerSide}</Text>
      <Text>最終価格: {price}</Text>
      <Text>報酬: 勝利100コイン / 敗北20コイン</Text>
      <Button title="ホームへ戻る" onPress={() => router.replace("/")} />
    </View>
  );
}
