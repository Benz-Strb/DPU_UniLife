import React from "react";
import { View, Text, TouchableOpacity } from "react-native";

interface ExpandableTextProps {
  content: string;
  authorName?: string;
  isExpanded: boolean;
  onToggle: () => void;
  themeColors: any;
}

export default function ExpandableText({ content, authorName, isExpanded, onToggle, themeColors }: ExpandableTextProps) {
  const isLong = content.length > 120 || content.split("\n").length > 2;

  return (
    <View className="px-4 pb-3">
      <Text
        className="text-[13px] leading-[22px]"
        style={{ color: themeColors.text }}
        numberOfLines={isExpanded ? undefined : 3}
      >
        {authorName ? <Text className="font-black">{authorName} </Text> : null}
        {content}
      </Text>
      {isLong && (
        <TouchableOpacity onPress={onToggle}>
          <Text className="text-violet-500 font-bold text-[11px] mt-1">
            {isExpanded ? "Show less" : "Show more"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
