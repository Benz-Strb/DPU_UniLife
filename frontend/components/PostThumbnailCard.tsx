import React from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getImageUrl } from "@/utils/imageUtils";

interface PostThumbnailCardProps {
  post: any;
  onPress: () => void;
  onLongPress?: () => void;
  themeColors: any;
  badgeIcon?: "repeat" | "pin";
  badgeColor?: string;
  onBadgePress?: () => void;
  borderRadius?: number;
}

export default function PostThumbnailCard({
  post,
  onPress,
  onLongPress,
  themeColors,
  badgeIcon,
  badgeColor = "#10B981",
  onBadgePress,
  borderRadius = 24,
}: PostThumbnailCardProps) {
  const imageUrl = post.media && post.media.length > 0 ? getImageUrl(post.media[0].url) : undefined;

  const Badge = onBadgePress ? TouchableOpacity : View;

  return (
    <TouchableOpacity 
      onPress={onPress} 
      onLongPress={onLongPress}
      delayLongPress={200}
      style={{ width: "33.33%", aspectRatio: 1, padding: 4 }}
    >
      <View style={{ width: "100%", height: "100%", borderRadius, overflow: "hidden", backgroundColor: themeColors.card, elevation: 2 }}>
        {imageUrl && (
          <Image source={{ uri: imageUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
        )}
        {!imageUrl && (
          <View className="absolute inset-0 items-center justify-center p-3" style={{ backgroundColor: themeColors.iconBg }}>
            <Text className="text-[9px] font-black text-center uppercase leading-3" numberOfLines={4} style={{ color: themeColors.text }}>
              {post.content}
            </Text>
          </View>
        )}
        {badgeIcon && (
          <Badge
            onPress={onBadgePress}
            style={{ position: "absolute", top: 8, right: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: badgeColor, alignItems: "center", justifyContent: "center" }}
          >
            <Ionicons name={badgeIcon} size={12} color="white" />
          </Badge>
        )}
      </View>
    </TouchableOpacity>
  );
}
