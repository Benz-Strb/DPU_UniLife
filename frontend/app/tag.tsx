import React from "react";
import { View, Text, ScrollView, TouchableOpacity, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { theme } from "@/constants/theme";
import { useUser } from "@/store/UserContext";

export default function TagScreen() {
  const router = useRouter();
  const { tagName } = useLocalSearchParams<{ tagName: string }>();
  const { isDarkMode, userId, posts, toggleLike, themeColors } = useUser();
  const name = tagName || "DPU";

  const bgColor = themeColors.background;
  const cardColor = themeColors.card;
  const textColor = themeColors.text;
  const subTextColor = themeColors.subText;
  const borderColor = themeColors.border;

  const filteredPosts = posts.filter(p => p.tags?.some(t => t.tag.name.toLowerCase() === name.toLowerCase()));

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: bgColor }}>
      <View 
        className="flex-row items-center px-6 py-6 border-b" 
        style={{ backgroundColor: cardColor, borderBottomColor: borderColor }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={textColor} />
        </TouchableOpacity>
        <View className="ml-4">
           <Text className="text-[10px] font-black uppercase tracking-[2px]" style={{ color: subTextColor }}>Exploring Tag</Text>
           <Text className="text-xl font-black" style={{ color: theme.colors.primary }}>#{name}</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
        {filteredPosts.length === 0 ? (
          <View className="items-center justify-center py-20 bg-white rounded-[40px] border border-dashed" style={{ backgroundColor: cardColor, borderColor: borderColor }}>
             <Ionicons name="pricetag-outline" size={48} color={borderColor} />
             <Text className="mt-4 font-bold" style={{ color: subTextColor }}>ยังไม่มีโพสต์ในแท็ก #{name}</Text>
          </View>
        ) : (
          filteredPosts.map((post) => (
            <View 
              key={post.id} 
              className="rounded-[40px] overflow-hidden border mb-8 shadow-sm"
              style={{ backgroundColor: cardColor, borderColor: borderColor }}
            >
              <View className="flex-row items-center p-4">
                 <Image source={{ uri: post.author.avatarUrl }} className="w-8 h-8 rounded-full mr-3" />
                 <Text className="font-bold text-xs flex-1" style={{ color: textColor }}>{post.author.fullName}</Text>
                 <Text className="text-[9px]" style={{ color: subTextColor }}>{new Date(post.createdAt).toLocaleDateString()}</Text>
              </View>
              {post.media && post.media.length > 0 && (
                <Image source={{ uri: post.media[0].url }} className="w-full h-64" />
              )}
              <View className="p-6">
                 <Text className="text-xs mb-4 leading-5" style={{ color: textColor }}>{post.content}</Text>
                 <TouchableOpacity onPress={() => toggleLike(post.id)} className="flex-row items-center">
                    <Ionicons 
                      name={post.reactions?.some(r => r.userId === userId) ? "heart" : "heart-outline"} 
                      size={20} 
                      color={post.reactions?.some(r => r.userId === userId) ? "#EF4444" : textColor} 
                    />
                    <Text className="ml-2 font-bold text-xs" style={{ color: textColor }}>{post._count?.reactions || 0}</Text>
                 </TouchableOpacity>
              </View>
            </View>
          ))
        )}
        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
}
