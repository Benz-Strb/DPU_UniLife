import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, Dimensions, StatusBar, RefreshControl, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { theme } from "@/constants/theme";
import { useUser } from "@/store/UserContext";
import { authService, BASE_URL } from "@/services/api";
import { Post } from "@/types/backend";

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 16) / 3;

export default function UserProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ userId: string }>();
  const targetUserId = params.userId;
  
  const { userId: currentUserId, themeColors, toggleFollow, followingIds, getDirectChat } = useUser();
  
  const [userData, setUserData] = useState<any>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchUserData = async () => {
    if (!targetUserId) return;
    try {
      const data = await authService.getProfile(targetUserId);
      setUserData(data);
      if (data.authoredPosts) {
        setUserPosts(data.authoredPosts);
      }
    } catch (error) {
      console.error("Fetch user profile error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [targetUserId]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchUserData();
    setIsRefreshing(false);
  };

  const getFullImageUrl = (url: string | null | undefined) => {
    if (!url) return `https://ui-avatars.com/api/?name=${encodeURIComponent(userData?.fullName || 'U')}&background=7C3AED&color=fff`;
    if (url.startsWith('http')) return url;
    return `${BASE_URL}${url}`;
  };

  const handleChatPress = async () => {
    const convo = await getDirectChat(targetUserId);
    if (convo) {
      router.push({
        pathname: "/chat-detail",
        params: { 
          id: convo.id, 
          userName: userData.fullName, 
          userAvatar: getFullImageUrl(userData.avatarUrl),
          userId: targetUserId
        }
      });
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: themeColors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  const isFollowing = followingIds.includes(targetUserId);

  return (
    <View className="flex-1" style={{ backgroundColor: themeColors.background }}>
      <StatusBar barStyle="light-content" />
      
      {/* Fixed Header */}
      <View className="absolute top-0 left-0 right-0 z-10">
        <SafeAreaView edges={['top']}>
          <View className="flex-row justify-between px-6 py-2">
            <TouchableOpacity 
              onPress={() => router.back()}
              className="w-10 h-10 items-center justify-center rounded-full bg-black/20"
            >
              <Ionicons name="chevron-back" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView 
        className="flex-1" 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
      >
        {/* Header Cover */}
        <View className="h-48 w-full" style={{ backgroundColor: theme.colors.primary }}>
          <View className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/10" />
          <View className="absolute top-10 -left-10 w-32 h-32 rounded-full bg-black/5" />
        </View>

        {/* Profile Info Card */}
        <View className="px-6 -mt-16">
          <View className="rounded-[40px] p-6 shadow-xl" style={{ backgroundColor: themeColors.card, elevation: 10 }}>
            <View className="flex-row justify-between items-end mb-6">
              <View className="w-28 h-28 rounded-[35px] border-4 p-1" style={{ backgroundColor: themeColors.card, borderColor: themeColors.card }}>
                <Image source={{ uri: getFullImageUrl(userData?.avatarUrl) }} className="w-full h-full rounded-[28px]" />
              </View>
              
              <View className="flex-row">
                <TouchableOpacity 
                  onPress={() => toggleFollow(targetUserId)}
                  className={`px-6 py-3 rounded-2xl mr-2 ${isFollowing ? 'border' : 'bg-violet-500'}`}
                  style={isFollowing ? { borderColor: themeColors.border } : {}}
                >
                  <Text className={`font-black text-xs uppercase tracking-widest ${isFollowing ? '' : 'text-white'}`} style={isFollowing ? {color: themeColors.text} : {}}>
                    {isFollowing ? 'Following' : 'Follow'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={handleChatPress}
                  className="w-12 h-12 rounded-2xl items-center justify-center border"
                  style={{ borderColor: themeColors.border }}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={22} color={themeColors.text} />
                </TouchableOpacity>
              </View>
            </View>

            <View>
              <Text className="text-3xl font-black tracking-tighter" style={{ color: themeColors.text }}>{userData?.fullName}</Text>
              <View className="flex-row items-center mt-1">
                <Text className="text-sm font-bold text-violet-500 mr-2">@{userData?.username}</Text>
                {userData?.faculty && (
                  <View className="px-2.5 py-1 rounded-lg bg-blue-100">
                    <Text className="text-[9px] font-black text-blue-600 uppercase">{userData.faculty}</Text>
                  </View>
                )}
              </View>
              
              <Text className="text-sm mt-5 leading-6 font-medium" style={{ color: themeColors.subText }}>
                {userData?.bio || "Hello! I'm using DPU UniLife."}
              </Text>
            </View>

            {/* Stats */}
            <View className="flex-row mt-8 pt-6 border-t" style={{ borderTopColor: themeColors.border }}>
              <View className="flex-1 items-center">
                <Text className="text-xl font-black" style={{ color: themeColors.text }}>{userPosts.length}</Text>
                <Text className="text-[10px] font-bold text-gray-400 uppercase mt-1">Posts</Text>
              </View>
              <View className="flex-1 items-center">
                <Text className="text-xl font-black" style={{ color: themeColors.text }}>{userData?._count?.followers || 0}</Text>
                <Text className="text-[10px] font-bold text-gray-400 uppercase mt-1">Followers</Text>
              </View>
              <View className="flex-1 items-center">
                <Text className="text-xl font-black" style={{ color: themeColors.text }}>{userData?._count?.following || 0}</Text>
                <Text className="text-[10px] font-bold text-gray-400 uppercase mt-1">Following</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Collection Section */}
        <View className="px-8 mt-10 mb-6 flex-row items-center">
          <View className="w-2 h-6 rounded-full bg-violet-500 mr-3" />
          <Text className="font-black text-lg tracking-tight" style={{ color: themeColors.text }}>Collection</Text>
        </View>

        <View className="flex-row flex-wrap px-4 pb-20">
          {userPosts.length === 0 ? (
            <View className="w-full py-20 items-center justify-center bg-gray-50/50 rounded-[40px] border-2 border-dashed border-gray-200">
              <Ionicons name="images-outline" size={40} color="#CBD5E1" />
              <Text className="text-gray-400 font-black text-[10px] uppercase mt-4">No public posts</Text>
            </View>
          ) : (
            userPosts.map((post) => (
              <TouchableOpacity key={post.id} style={{ width: '33.33%', aspectRatio: 1, padding: 4 }}>
                <View className="w-full h-full rounded-[20px] overflow-hidden bg-gray-100">
                  <Image source={{ uri: (post.media && post.media.length > 0) ? getFullImageUrl(post.media[0].url) : `https://ui-avatars.com/api/?name=Post&background=F3F4F6&color=A5B4FC` }} className="w-full h-full" />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
