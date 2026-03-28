import React, { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { useUser } from "@/store/UserContext";

export default function AuthLayout() {
  const { userId } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (userId !== "") {
      router.replace("/(tabs)/home");
    }
  }, [userId]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
