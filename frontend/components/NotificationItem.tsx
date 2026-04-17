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
  const isRead = !!item.readAt; // backend uses readAt usually

  const getTimeLabel = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <TouchableOpacity
      onPress={() => onPress(item)}
      activeOpacity={0.7}
      className="flex-row items-center px-4 py-4 mb-3 rounded-[28px] border-2"
      style={{
        backgroundColor: isRead ? themeColors.card : (themeColors.isDark ? "#2D2D3A" : "#F5F3FF"),
        borderColor: isRead ? themeColors.border : "rgba(139, 92, 246, 0.2)",
        shadowColor: "#8B5CF6",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isRead ? 0 : 0.1,
        shadowRadius: 8,
        elevation: isRead ? 0 : 3,
      }}
    >
      <View className="relative">
        <Image
          source={{ uri: getAvatarUrl(item.sender?.avatarUrl, item.sender?.fullName) }}
          className="w-14 h-14 rounded-full border-2 border-white shadow-sm"
        />
        <View
          className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full items-center justify-center border-2 border-white shadow-sm"
          style={{ backgroundColor: icon.color }}
        >
          <Ionicons name={icon.name as any} size={12} color="white" />
        </View>
      </View>

      <View className="flex-1 ml-4">
        <Text className="text-[14px] leading-5 font-bold" style={{ color: themeColors.text }}>
          {getNotificationText(item)}
        </Text>
        <Text className="text-[10px] font-black mt-1 uppercase tracking-wider opacity-40" style={{ color: themeColors.subText }}>
          {getTimeLabel(item.createdAt)}
        </Text>
      </View>

      {!isRead && (
        <View 
          className="w-3 h-3 rounded-full ml-2 bg-violet-500" 
          style={{ shadowColor: "#8B5CF6", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 4 }}
        />
      )}
    </TouchableOpacity>
  );
}
