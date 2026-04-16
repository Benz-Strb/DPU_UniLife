import React from "react";
import { View, Text, TouchableOpacity, Switch } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/constants/theme";

interface SettingItemProps {
  icon: string;
  label: string;
  type?: "switch" | "link";
  value?: boolean;
  onToggle?: (value: boolean) => void;
  onPress?: () => void;
  themeColors: any;
}

export default function SettingItem({
  icon,
  label,
  type = "switch",
  value,
  onToggle,
  onPress,
  themeColors,
}: SettingItemProps) {
  return (
    <TouchableOpacity
      onPress={type === "link" ? onPress : undefined}
      activeOpacity={type === "link" ? 0.7 : 1}
      className="flex-row items-center justify-between py-5 border-b"
      style={{ borderBottomColor: themeColors.border }}
    >
      <View className="flex-row items-center">
        <View
          className="w-11 h-11 rounded-2xl items-center justify-center mr-4"
          style={{ backgroundColor: themeColors.iconBg }}
        >
          <Ionicons name={icon as any} size={22} color={theme.colors.primary} />
        </View>
        <Text className="font-bold text-sm" style={{ color: themeColors.text }}>
          {label}
        </Text>
      </View>

      {type === "switch" ? (
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: "#D1D5DB", true: theme.colors.primaryLight }}
          thumbColor={value ? theme.colors.primary : "#F4F3F4"}
        />
      ) : (
        <Ionicons name="chevron-forward" size={20} color={themeColors.subText} />
      )}
    </TouchableOpacity>
  );
}
