import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { theme } from "@/constants/theme";

interface PostActionBarProps {
  isLiked: boolean;
  likeCount: number;
  commentCount: number;
  isReposted: boolean;
  isCommentActive: boolean;
  onLike: () => void;
  onToggleComments: () => void;
  onRepost: () => void;
  themeColors: any;
}

export default function PostActionBar({
  isLiked, likeCount, commentCount, isReposted, isCommentActive,
  onLike, onToggleComments, onRepost, themeColors,
}: PostActionBarProps) {
  return (
    <View className="flex-row items-center px-4 pt-3 pb-2 gap-4">
      <TouchableOpacity onPress={onLike} className="flex-row items-center">
        <Ionicons
          name={isLiked ? "heart" : "heart-outline"}
          size={26}
          color={isLiked ? theme.colors.like : themeColors.text}
        />
        <Text className="ml-1.5 font-black text-sm" style={{ color: themeColors.text }}>{likeCount}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onToggleComments} className="flex-row items-center">
        <Feather
          name="message-circle"
          size={24}
          color={isCommentActive ? theme.colors.primary : themeColors.text}
        />
        <Text className="ml-1.5 font-black text-sm" style={{ color: themeColors.text }}>{commentCount}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onRepost}>
        <Ionicons
          name="repeat"
          size={24}
          color={isReposted ? theme.colors.repost : themeColors.text}
        />
      </TouchableOpacity>
    </View>
  );
}
