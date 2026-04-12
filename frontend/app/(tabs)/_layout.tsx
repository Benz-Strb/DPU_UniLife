import React, { useEffect } from "react";
import { Tabs, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/constants/theme";
import { useUser } from "@/store/UserContext";
import { tabRefreshEmitter } from "@/utils/tabRefresh";

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
      {(["home", "group", "search", "messenger", "profile"] as const).map((name) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{ title: name.charAt(0).toUpperCase() + name.slice(1) }}
          listeners={({ navigation }) => ({
            tabPress: () => {
              if (navigation.isFocused()) {
                tabRefreshEmitter.emit(name);
              }
            },
          })}
        />
      ))}
    </Tabs>
  );
}
