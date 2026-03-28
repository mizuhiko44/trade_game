import { Pressable, Text, View } from "react-native";

type TurnCandle = {
  id: string;
  turnNumber: number;
  openPrice: string | number;
  highPrice: string | number;
  lowPrice: string | number;
  closePrice: string | number;
};

type Props = {
  turns: TurnCandle[];
  executions?: Array<{
    id: string;
    turnNumber: number;
    price: number;
    side: "BUY" | "SELL";
    status?: "OPEN" | "CLOSED";
    positionId?: string;
    orderType?: "MARKET" | "LIMIT";
  }>;
  onExecutionPress?: (execution: {
    id: string;
    turnNumber: number;
    price: number;
    side: "BUY" | "SELL";
    status?: "OPEN" | "CLOSED";
    positionId?: string;
    orderType?: "MARKET" | "LIMIT";
  }) => void;
};

const CHART_HEIGHT = 170;

function toNum(v: string | number) {
  return typeof v === "string" ? Number(v) : v;
}

export default function CandlestickChart({ turns, executions = [], onExecutionPress }: Props) {
  if (!turns.length) {
    return <Text>まだローソク足データはありません（最初の行動後に表示）</Text>;
  }

  const highs = turns.map((t) => toNum(t.highPrice));
  const lows = turns.map((t) => toNum(t.lowPrice));
  const maxPrice = Math.max(...highs);
  const minPrice = Math.min(...lows);
  const range = Math.max(1, maxPrice - minPrice);

  const y = (price: number) => ((maxPrice - price) / range) * CHART_HEIGHT;

  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontWeight: "700" }}>ローソク足チャート</Text>
      <View style={{ height: CHART_HEIGHT + 8, borderWidth: 1, borderRadius: 8, padding: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-end", height: CHART_HEIGHT }}>
          {turns.map((t) => {
            const open = toNum(t.openPrice);
            const high = toNum(t.highPrice);
            const low = toNum(t.lowPrice);
            const close = toNum(t.closePrice);

            const highY = y(high);
            const lowY = y(low);
            const openY = y(open);
            const closeY = y(close);

            const bodyTop = Math.min(openY, closeY);
            const bodyHeight = Math.max(3, Math.abs(openY - closeY));
            const wickTop = highY;
            const wickHeight = Math.max(2, lowY - highY);
            const color = close >= open ? "#16a34a" : "#dc2626";

            return (
              <View
                key={t.id}
                style={{ width: 18, marginRight: 8, height: CHART_HEIGHT, position: "relative" }}
              >
                <View
                  style={{
                    position: "absolute",
                    left: 8,
                    top: wickTop,
                    width: 2,
                    height: wickHeight,
                    backgroundColor: color
                  }}
                />
                <View
                  style={{
                    position: "absolute",
                    left: 4,
                    top: bodyTop,
                    width: 10,
                    height: bodyHeight,
                    borderRadius: 2,
                    backgroundColor: color
                  }}
                />
                {executions
                  .filter((e) => e.turnNumber === t.turnNumber)
                  .map((e) => {
                    const markerY = y(e.price);
                    const markerColor = e.side === "BUY" ? "#2563eb" : "#7c3aed";
                    return (
                      <Pressable
                        key={e.id}
                        onPress={() => onExecutionPress?.(e)}
                        style={{
                          position: "absolute",
                          top: markerY,
                          left: 0,
                          width: 18,
                          alignItems: "center"
                        }}
                      >
                        <View
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: markerColor
                          }}
                        />
                        <Text style={{ fontSize: 8, color: markerColor }}>{e.side === "BUY" ? "B" : "S"}</Text>
                      </Pressable>
                    );
                  })}
              </View>
            );
          })}
        </View>
      </View>
      <Text style={{ fontSize: 12, color: "#666" }}>
        High: {maxPrice.toFixed(2)} / Low: {minPrice.toFixed(2)}
      </Text>
    </View>
  );
}
