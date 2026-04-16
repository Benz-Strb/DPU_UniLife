import React from "react";
import { Text, TouchableOpacity, ScrollView } from "react-native";

interface TabOption {
  label: string;
  value: string;
}

interface TabSelectorProps {
  options: TabOption[];
  selected: string;
  onSelect: (value: string) => void;
  /** Hex color for active tab background. Defaults to indigo-600 (#4F46E5) */
  activeColor?: string;
  containerClassName?: string;
}

export default function TabSelector({
  options,
  selected,
  onSelect,
  activeColor = "#4F46E5",
  containerClassName,
}: TabSelectorProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className={containerClassName}>
      {options.map((opt) => {
        const isActive = selected === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => onSelect(opt.value)}
            className="mr-2 px-5 py-2 rounded-full border"
            style={
              isActive
                ? { backgroundColor: activeColor, borderColor: activeColor }
                : { backgroundColor: "white", borderColor: "#F3F4F6" }
            }
          >
            <Text
              className="font-bold"
              style={{ color: isActive ? "white" : "#9CA3AF" }}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
