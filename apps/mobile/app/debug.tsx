import { useEffect, useState } from "react";
import { Button, ScrollView, Text, View } from "react-native";
import { fetchDebugMessages } from "../services/api";

type DebugMessage = {
  id: string;
  text: string;
  source: string;
  createdAt: string;
};

export default function DebugScreen() {
  const [messages, setMessages] = useState<DebugMessage[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const data = await fetchDebugMessages();
    setMessages(data.messages ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const timer = setInterval(load, 2000);
    return () => clearInterval(timer);
  }, []);

  return (
    <View style={{ flex: 1, padding: 20, gap: 10 }}>
      <Text style={{ fontSize: 22, fontWeight: "700" }}>デバッグ受信画面</Text>
      <Text>外部コマンドで送ったメッセージを2秒ごとに再取得します。</Text>
      <Button title={loading ? "更新中..." : "手動更新"} onPress={load} />
      <ScrollView style={{ marginTop: 8 }}>
        {messages.length === 0 ? (
          <Text>まだメッセージがありません。</Text>
        ) : (
          messages.map((m) => (
            <View key={m.id} style={{ padding: 10, borderWidth: 1, marginBottom: 8, borderRadius: 8 }}>
              <Text style={{ fontWeight: "600" }}>{m.text}</Text>
              <Text>source: {m.source}</Text>
              <Text>{new Date(m.createdAt).toLocaleString()}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}
