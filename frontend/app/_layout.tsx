import "./global.css";
import React from "react";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { UserProvider } from "../store/UserContext";
import { GestureHandlerRootView } from "react-native-gesture-handler";

// Root navigator ของแอปมือถือสำหรับครอบ provider หลักและกำหนด screen stack ทั้งหมด
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <UserProvider>
      <SafeAreaProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: "slide_from_right",
            animationDuration: 180,
            gestureEnabled: true,
            fullScreenGestureEnabled: true,
            presentation: "card"
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </SafeAreaProvider>
    </UserProvider>
    </GestureHandlerRootView>
  );
}
