import React, { useState, useEffect, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, StatusBar, RefreshControl, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { theme } from "@/constants/theme";
import { useUser } from "@/store/UserContext";
import { tagService } from "@/services/api";
import { getAvatarUrl, getImageUrl } from "@/utils/imageUtils";
import ImageCarousel from "@/components/ImageCarousel";

export default function TagScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tagName: string }>();
  const tagName = params.tagName || "DPU";
  const { userId, toggleLike, themeColors } = useUser();

  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchPosts = useCallback(async () => {
    try {
      const data = await tagService.getTagPosts(tagName);
      setPosts(data);
    } catch (e) {
      console.error("Failed to fetch tag posts", e);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [tagName]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchPosts();
  };

  const handleLike = async (postId: string) => {
    await toggleLike(postId);
    fetchPosts();
  };

  return (
    <View className="flex-1" style={{ backgroundColor: themeColors.background }}>
      <StatusBar barStyle={themeColors.statusBar as any} />

      <SafeAreaView className="flex-1" edges={['top']}>
        <View
          className="flex-row items-center px-6 py-4 border-b shadow-sm"
          style={{ backgroundColor: themeColors.card, borderBottomColor: themeColors.border }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center rounded-2xl"
            style={{ backgroundColor: themeColors.iconBg }}
          >
            <Ionicons name="chevron-back" size={24} color={themeColors.text} />
          </TouchableOpacity>
          <View className="ml-4">
            <Text className="text-[10px] font-black uppercase tracking-[2px]" style={{ color: themeColors.subText }}>Exploring Space</Text>
            <Text className="text-xl font-black" style={{ color: theme.colors.primary }}>#{tagName}</Text>
          </View>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : (
          <ScrollView
            className="flex-1 px-6 pt-6"
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
            }
          >
            {posts.length === 0 ? (
              <View className="items-center justify-center py-32 bg-gray-50/50 rounded-[40px] border border-dashed border-gray-200">
                <Ionicons name="planet-outline" size={60} color="#CBD5E1" />
                <Text className="mt-4 font-black text-[10px] uppercase text-gray-400">No posts in #{tagName} Space</Text>
              </View>
            ) : (
              posts.map((post) => {
                const isLiked = post.reactions?.some((r: any) => r.userId === userId);
                return (
                  <View
                    key={post.id}
                    className="mb-10 rounded-[40px] overflow-hidden border shadow-sm"
                    style={{
                      backgroundColor: themeColors.card,
                      borderColor: themeColors.border,
                      elevation: 4,
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 10 },
                      shadowOpacity: 0.05,
                      shadowRadius: 20
                    }}
                  >
                    {/* Header: User Info */}
                    <View className="flex-row items-center p-5">
                      <View className="relative">
                        <Image
                          source={{ uri: getAvatarUrl(post.author?.avatarUrl, post.author?.fullName) }}
                          className="w-10 h-10 rounded-[18px] mr-3"
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="font-black text-sm tracking-tight" style={{ color: themeColors.text }}>{post.author?.fullName}</Text>
                        <Text className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">{new Date(post.createdAt).toLocaleDateString()} • Community</Text>
                      </View>
                      <TouchableOpacity className="w-8 h-8 items-center justify-center rounded-full bg-gray-50">
                        <Ionicons name="ellipsis-horizontal" size={16} color={themeColors.subText} />
                      </TouchableOpacity>
                    </View>

                    {/* Content: Text */}
                    {post.content && (
                      <View className="px-6 pb-4">
                        <Text className="text-sm leading-6 font-medium" style={{ color: themeColors.text }}>{post.content}</Text>
                      </View>
                    )}

                    {/* Content: Media */}
                    {post.media && post.media.length > 1 ? (
                      <View className="px-4 pb-4">
                        <ImageCarousel
                          images={post.media.map((m: any) => ({ url: getImageUrl(m.url) ?? "" }))}
                          aspectRatio={1}
                        />
                      </View>
                    ) : post.media && post.media.length === 1 ? (
                      <View className="px-4 pb-4">
                        <View className="rounded-[30px] overflow-hidden bg-gray-100" style={{ aspectRatio: 1 }}>
                          <Image
                            source={{ uri: getImageUrl(post.media[0].url) }}
                            className="w-full h-full"
                            resizeMode="cover"
                          />
                        </View>
                      </View>
                    ) : null}

                    {/* Footer: Actions */}
                    <View className="px-6 py-5 flex-row items-center justify-between border-t" style={{ borderTopColor: themeColors.border }}>
                      <View className="flex-row items-center">
                        <TouchableOpacity
                          onPress={() => handleLike(post.id)}
                          className="flex-row items-center mr-6"
                        >
                          <Ionicons
                            name={isLiked ? "heart" : "heart-outline"}
                            size={24}
                            color={isLiked ? "#EF4444" : themeColors.text}
                          />
                          <Text className="ml-2 font-black text-xs" style={{ color: themeColors.text }}>{post._count?.reactions || 0}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity className="flex-row items-center">
                          <Ionicons name="chatbubble-outline" size={22} color={themeColors.text} />
                          <Text className="ml-2 font-black text-xs" style={{ color: themeColors.text }}>{post._count?.comments || 0}</Text>
                        </TouchableOpacity>
                      </View>

                      <TouchableOpacity>
                        <Ionicons name="bookmark-outline" size={22} color={themeColors.text} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
            <View className="h-20" />
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}
