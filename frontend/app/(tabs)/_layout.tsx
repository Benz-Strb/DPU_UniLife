import React, { useEffect } from "react";
import { View, TouchableOpacity } from "react-native";
import { useRouter, useSegments, withLayoutContext } from "expo-router";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/constants/theme";
import { useUser } from "@/store/UserContext";
import { tabRefreshEmitter } from "@/utils/tabRefresh";

const { Navigator } = createMaterialTopTabNavigator();
const SwipeableTabs = withLayoutContext(Navigator);

const TAB_NAMES = ["home", "group", "search", "messenger", "profile"] as const;

const TAB_ICONS: Record<string, { active: string; inactive: string }> = {
  home:      { active: "home",          inactive: "home-outline" },
  group:     { active: "people",        inactive: "people-outline" },
  search:    { active: "search",        inactive: "search-outline" },
  messenger: { active: "chatbubble",    inactive: "chatbubble-outline" },
  profile:   { active: "person",        inactive: "person-outline" },
};

export default function TabsLayout() {
  const { userId, isDarkMode, themeColors, unreadChatCount } = useUser();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (userId === "") {
      router.replace("/(auth)/login");
    }
  }, [userId]);

  const currentTab = segments[segments.length - 1] as string;
  const inactiveColor = isDarkMode ? "#555555" : "#D1D5DB";

  return (
    <SwipeableTabs
      tabBarPosition="bottom"
      initialRouteName="home"
      style={{ backgroundColor: themeColors.background }}
      screenOptions={{
        swipeEnabled: true,
        animationEnabled: true,
        sceneStyle: {
          backgroundColor: themeColors.background,
        },
      }}
      tabBar={({ state, navigation }) => (
        <View
          style={{
            flexDirection: "row",
            height: 85,
            paddingBottom: 25,
            paddingTop: 10,
            backgroundColor: themeColors.tabBar,
            borderTopWidth: 1,
            borderTopColor: themeColors.border,
          }}
        >
          {state.routes.map((route, index) => {
            const isFocused = state.index === index;
            const tabName = route.name as string;
            const icons = TAB_ICONS[tabName];
            const iconName: any = isFocused ? icons?.active : icons?.inactive;
            const color = isFocused ? theme.colors.primary : inactiveColor;

            return (
              <TouchableOpacity
                key={route.key}
                onPress={() => {
                  if (isFocused) {
                    tabRefreshEmitter.emit(tabName);
                  } else {
                    navigation.navigate(route.name);
                  }
                }}
                style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
                activeOpacity={0.7}
              >
                <View style={{ position: "relative" }}>
                  <Ionicons name={iconName} size={28} color={color} />
                  {tabName === "messenger" && unreadChatCount > 0 && (
                    <View style={{
                      position: "absolute", top: -2, right: -4,
                      backgroundColor: "#EF4444", borderRadius: 99,
                      width: 8, height: 8,
                    }} />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    >
      {TAB_NAMES.map((name) => (
        <SwipeableTabs.Screen
          key={name}
          name={name}
          options={{ title: name.charAt(0).toUpperCase() + name.slice(1) }}
        />
      ))}
    </SwipeableTabs>
  );
}
