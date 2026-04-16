import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface ScreenHeaderProps {
  title: string;
  /** Small label shown above the title */
  subtitle?: string;
  onBack: () => void;
  backIcon?: "chevron-back" | "close";
  /** When true, title is centred between back button and rightElement */
  centerTitle?: boolean;
  /** Optional element on the right side */
  rightElement?: React.ReactNode;
  showBorder?: boolean;
  themeColors: any;
}

export default function ScreenHeader({
  title,
  subtitle,
  onBack,
  backIcon = "chevron-back",
  centerTitle = false,
  rightElement,
  showBorder = false,
  themeColors,
}: ScreenHeaderProps) {
  return (
    <View
      className={`flex-row items-center ${centerTitle ? "justify-between" : ""} px-6 py-4${showBorder ? " border-b" : ""}`}
      style={showBorder ? { borderBottomColor: themeColors.border } : undefined}
    >
      <TouchableOpacity
        onPress={onBack}
        className="w-10 h-10 rounded-2xl items-center justify-center"
        style={{ backgroundColor: themeColors.card }}
      >
        <Ionicons name={backIcon} size={24} color={themeColors.text} />
      </TouchableOpacity>

      {centerTitle ? (
        <Text className="text-xl font-black" style={{ color: themeColors.text }}>
          {title}
        </Text>
      ) : (
        <View className="flex-1 ml-4">
          {subtitle ? (
            <Text className="text-[10px] font-black uppercase tracking-[2px]" style={{ color: themeColors.subText }}>
              {subtitle}
            </Text>
          ) : null}
          <Text className="text-xl font-black" style={{ color: themeColors.text }}>
            {title}
          </Text>
        </View>
      )}

      {rightElement ?? (centerTitle ? <View className="w-10" /> : null)}
    </View>
  );
}
