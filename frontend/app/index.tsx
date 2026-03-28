import React from "react";
import { Redirect } from "expo-router";
import { useUser } from "@/store/UserContext";

export default function Index() {
  const { userId } = useUser();

  if (userId === "") {
    return <Redirect href="/(auth)/login" />;
  }

  return <Redirect href="/(tabs)/home" />;
}
