import React from "react";
import { View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface ProfileGridTabBarProps {
  activeTab: "posts" | "reposts";
  onTabChange: (tab: "posts" | "reposts") => void;
  themeColors: any;
}

export default function ProfileGridTabBar({ activeTab, onTabChange, themeColors }: ProfileGridTabBarProps) {
  return (
    <View className="flex-row border-t mt-6" style={{ borderTopColor: themeColors.border }}>
      <TouchableOpacity
        onPress={() => onTabChange("posts")}
        className="flex-1 items-center py-3"
        style={{ borderBottomWidth: 2, borderBottomColor: activeTab === "posts" ? themeColors.text : "transparent" }}
      >
        <Ionicons name="grid-outline" size={22} color={activeTab === "posts" ? themeColors.text : themeColors.subText} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => onTabChange("reposts")}
        className="flex-1 items-center py-3"
        style={{ borderBottomWidth: 2, borderBottomColor: activeTab === "reposts" ? themeColors.text : "transparent" }}
      >
        <Ionicons name="repeat" size={22} color={activeTab === "reposts" ? themeColors.text : themeColors.subText} />
      </TouchableOpacity>
    </View>
  );
}
