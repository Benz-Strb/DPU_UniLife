import React, { useEffect } from "react";
import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/constants/theme";
import { useUser } from "@/store/UserContext";

export default function TabsLayout() {
  const { userId, isDarkMode, themeColors } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (userId === "") {
      router.replace("/(auth)/login");
    }
  }, [userId]);

  const inactiveColor = isDarkMode ? "#555555" : "#D1D5DB";

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        animation: "fade",
        tabBarStyle: {
          backgroundColor: themeColors.tabBar,
          borderTopWidth: 1,
          borderTopColor: themeColors.border,
          height: 85,
          paddingBottom: 25,
          paddingTop: 10,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: inactiveColor,
        tabBarShowLabel: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: any;
          if (route.name === "home") iconName = focused ? "home" : "home-outline";
          else if (route.name === "group") iconName = focused ? "people" : "people-outline";
          else if (route.name === "search") iconName = focused ? "search" : "search-outline";
          else if (route.name === "messenger") iconName = focused ? "chatbubble" : "chatbubble-outline";
          else if (route.name === "profile") iconName = focused ? "person" : "person-outline";
          return <Ionicons name={iconName} size={28} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen name="group" options={{ title: "Group" }} />
      <Tabs.Screen name="search" options={{ title: "Search" }} />
      <Tabs.Screen name="messenger" options={{ title: "Messenger" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
