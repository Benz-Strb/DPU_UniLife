import React from "react";
import { View, TextInput, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  themeColors: any;
  containerStyle?: ViewStyle;
}

export default function SearchBar({ value, onChangeText, placeholder = "Search...", themeColors, containerStyle }: SearchBarProps) {
  return (
    <View
      className="flex-row items-center px-5 py-3.5 rounded-2xl border"
      style={[{ backgroundColor: themeColors.card, borderColor: themeColors.border }, containerStyle]}
    >
      <Ionicons name="search" size={20} color={themeColors.subText} />
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={themeColors.subText}
        className="flex-1 ml-3 font-bold text-sm"
        style={{ color: themeColors.text }}
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
}
