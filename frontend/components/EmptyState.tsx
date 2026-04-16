import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface EmptyStateProps {
  icon: string;
  title: string;
  description?: string;
  themeColors: any;
  className?: string;
}

export default function EmptyState({ icon, title, description, themeColors, className }: EmptyStateProps) {
  return (
    <View className={`items-center justify-center py-20 ${className ?? ""}`}>
      <Ionicons name={icon as any} size={50} color={themeColors.subText} />
      <Text className="text-xl font-black mt-4" style={{ color: themeColors.subText }}>{title}</Text>
      {description ? (
        <Text className="text-sm mt-2 text-center px-8" style={{ color: themeColors.subText }}>{description}</Text>
      ) : null}
    </View>
  );
}
