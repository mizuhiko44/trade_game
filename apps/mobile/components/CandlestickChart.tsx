import { useState } from "react";
import { GestureResponderEvent, Pressable, Text, View } from "react-native";

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
  onChartPress?: (payload: { price: number }) => void;
};

const CHART_HEIGHT = 170;

function toNum(v: string | number) {
  return typeof v === "string" ? Number(v) : v;
}

export default function CandlestickChart({ turns, executions = [], onExecutionPress, onChartPress }: Props) {
  const [crosshairY, setCrosshairY] = useState<number | null>(null);

  if (!turns.length) {
    return <Text>まだローソク足データはありません（最初の行動後に表示）</Text>;
  }

  const highs = turns.map((t) => toNum(t.highPrice));
  const lows = turns.map((t) => toNum(t.lowPrice));
  const maxPrice = Math.max(...highs);
  const minPrice = Math.min(...lows);
  const range = Math.max(1, maxPrice - minPrice);

  const y = (price: number) => ((maxPrice - price) / range) * CHART_HEIGHT;

  const handleChartPress = (event: GestureResponderEvent) => {
    const clampedY = Math.min(Math.max(event.nativeEvent.locationY - 8, 0), CHART_HEIGHT);
    const touchedPrice = maxPrice - (clampedY / CHART_HEIGHT) * range;
    setCrosshairY(clampedY);
    onChartPress?.({ price: touchedPrice });
  };

  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontWeight: "700" }}>ローソク足チャート</Text>
      <Pressable
        onPress={handleChartPress}
        style={{ height: CHART_HEIGHT + 8, borderWidth: 1, borderRadius: 8, padding: 8 }}
      >
        <View style={{ height: CHART_HEIGHT, position: "relative" }}>
          {crosshairY !== null ? (
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: crosshairY,
                borderTopWidth: 1,
                borderColor: "#0ea5e9",
                zIndex: 10
              }}
            />
          ) : null}
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
                      const markerTop = Math.min(Math.max(markerY - 8, 0), CHART_HEIGHT - 20);
                      return (
                        <Pressable
                          key={e.id}
                          onPress={() => onExecutionPress?.(e)}
                          hitSlop={10}
                          style={{
                            position: "absolute",
                            top: markerTop,
                            left: 0,
                            width: 18,
                            height: 20,
                            alignItems: "center",
                            justifyContent: "center",
                            zIndex: 20,
                            elevation: 2
                          }}
                        >
                          <View
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: 4,
                              backgroundColor: markerColor
                            }}
                          />
                          <Text style={{ fontSize: 8, color: markerColor, fontWeight: "700" }}>
                            {e.side === "BUY" ? "B" : "S"}
                          </Text>
                        </Pressable>
                      );
                    })}
                </View>
              );
            })}
          </View>
        </View>
      </Pressable>
      <Text style={{ fontSize: 12, color: "#666" }}>
        High: {maxPrice.toFixed(2)} / Low: {minPrice.toFixed(2)}
      </Text>
    </View>
  );
}
