import React from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/constants/theme";
import { getAvatarUrl } from "@/utils/imageUtils";

function getIcon(type: string) {
  switch (type) {
    case "LIKE":    return { name: "heart",                color: "#EF4444" };
    case "COMMENT": return { name: "chatbubble",           color: "#3B82F6" };
    case "FOLLOW":  return { name: "person-add",           color: "#10B981" };
    case "REPLY":   return { name: "return-down-forward",  color: "#8B5CF6" };
    default:        return { name: "notifications",        color: theme.colors.primary };
  }
}

function getNotificationText(item: any) {
  const senderName = item.sender?.fullName || "Someone";
  switch (item.type) {
    case "LIKE":    return `${senderName} liked your post`;
    case "COMMENT": return `${senderName} commented on your post`;
    case "FOLLOW":  return `${senderName} started following you`;
    case "REPLY":   return `${senderName} replied to your comment`;
    default:        return item.body || item.title;
  }
}

interface NotificationItemProps {
  item: any;
  onPress: (item: any) => void;
  themeColors: any;
}

export default function NotificationItem({ item, onPress, themeColors }: NotificationItemProps) {
  const icon = getIcon(item.type);
  const isRead = item.isRead;

  return (
    <TouchableOpacity
      onPress={() => onPress(item)}
      className="flex-row items-center p-4 mb-4 rounded-[28px] border"
      style={{
        backgroundColor: themeColors.card,
        borderColor: isRead ? themeColors.border : theme.colors.primaryLight,
        opacity: isRead ? 0.7 : 1,
        elevation: isRead ? 0 : 2,
      }}
    >
      <View className="relative">
        <Image
          source={{ uri: getAvatarUrl(item.sender?.avatarUrl, item.sender?.fullName) }}
          className="w-12 h-12 rounded-full mr-4"
        />
        <View
          className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full items-center justify-center border-2"
          style={{ borderColor: themeColors.card, backgroundColor: icon.color }}
        >
          <Ionicons name={icon.name as any} size={12} color="white" />
        </View>
      </View>

      <View className="flex-1">
        <Text className="text-xs font-medium leading-4" style={{ color: themeColors.text }}>
          {getNotificationText(item)}
        </Text>
        <Text className="text-[9px] font-bold text-gray-400 mt-1 uppercase tracking-tighter">
          {new Date(item.createdAt).toLocaleString()}
        </Text>
      </View>

      {!isRead && <View className="w-2.5 h-2.5 rounded-full ml-2 bg-violet-500" />}
    </TouchableOpacity>
  );
}
