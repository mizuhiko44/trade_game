import { Stack } from "expo-router";
import { LogBox } from "react-native";

LogBox.ignoreLogs([
  "Unable to activate keep awake"
]);

export default function Layout() {
  return <Stack screenOptions={{ headerShown: true }} />;
}
