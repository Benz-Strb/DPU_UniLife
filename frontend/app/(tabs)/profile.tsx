import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, Dimensions, StatusBar, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { theme } from "@/constants/theme";
import { useUser } from "@/store/UserContext";
import { authService, BASE_URL } from "@/services/api";
import { Post } from "@/types/backend";

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 4) / 3;

export default function ProfileScreen() {
  const router = useRouter();
  const { isDarkMode, name, bio, profileImage, userId, themeColors, user: currentUser } = useUser();
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);

  const fetchProfileData = async () => {
    if (!userId) return;
    try {
      const data = await authService.getProfile(userId);
      setProfileData(data);
      if (data.authoredPosts) {
        setUserPosts(data.authoredPosts);
      }
    } catch (error) {
      console.error("Fetch profile error:", error);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, [userId]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchProfileData();
    setIsRefreshing(false);
  };

  const getFullImageUrl = (url: string | null | undefined) => {
    if (!url) return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&background=7C3AED&color=fff`;
    if (url.startsWith('http')) return url;
    return `${BASE_URL}${url}`;
  };

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
            <TouchableOpacity 
              onPress={() => router.push("/settings")}
              className="w-10 h-10 items-center justify-center rounded-full bg-black/20"
            >
              <Ionicons name="settings-outline" size={22} color="white" />
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
        {/* Header Cover Background */}
        <View 
          className="h-48 w-full" 
          style={{ backgroundColor: theme.colors.primary }}
        >
          <View className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/10" />
          <View className="absolute top-10 -left-10 w-32 h-32 rounded-full bg-black/5" />
        </View>

        {/* Profile Info Card */}
        <View className="px-6 -mt-16">
          <View 
            className="rounded-[40px] p-6 shadow-xl"
            style={{ backgroundColor: themeColors.card, elevation: 10 }}
          >
            <View className="flex-row justify-between items-end mb-6">
              <View 
                className="w-28 h-28 rounded-[35px] border-4 p-1"
                style={{ backgroundColor: themeColors.card, borderColor: themeColors.card }}
              >
                <Image 
                  source={{ uri: getFullImageUrl(profileImage) }} 
                  className="w-full h-full rounded-[28px]" 
                />
              </View>
              
              <TouchableOpacity 
                onPress={() => router.push("/edit-profile")}
                className="px-6 py-3 rounded-2xl bg-violet-500"
              >
                <Text className="font-black text-xs text-white uppercase tracking-widest">Edit</Text>
              </TouchableOpacity>
            </View>

            <View>
              <Text className="text-3xl font-black tracking-tighter" style={{ color: themeColors.text }}>
                {name || "User"}
              </Text>
              <View className="flex-row items-center mt-1 flex-wrap">
                <Text className="text-sm font-bold text-violet-500 mr-2">@{currentUser?.username || "username"}</Text>
                <View className="px-2 py-0.5 rounded-md bg-violet-100 mr-2 mb-1">
                  <Text className="text-[8px] font-black text-violet-600 uppercase">{currentUser?.role || "STUDENT"}</Text>
                </View>
                {profileData?.faculty && (
                  <View className="px-2 py-0.5 rounded-md bg-blue-100 mb-1">
                    <Text className="text-[8px] font-black text-blue-600 uppercase">{profileData.faculty}</Text>
                  </View>
                )}
              </View>
              
              <Text className="text-sm mt-5 leading-6 font-medium" style={{ color: themeColors.subText }}>
                {bio || "Your campus life journey begins here. Tap 'Edit' to share your story with the DPU community."}
              </Text>
            </View>

            {/* Stats Bar */}
            <View className="flex-row mt-8 pt-6 border-t" style={{ borderTopColor: themeColors.border }}>
              <View className="flex-1 items-center">
                <Text className="text-xl font-black" style={{ color: themeColors.text }}>{userPosts.length}</Text>
                <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-[2px] mt-1">Posts</Text>
              </View>
              <View className="flex-1 items-center">
                <Text className="text-xl font-black" style={{ color: themeColors.text }}>{profileData?._count?.followers || 0}</Text>
                <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-[2px] mt-1">Followers</Text>
              </View>
              <View className="flex-1 items-center">
                <Text className="text-xl font-black" style={{ color: themeColors.text }}>{profileData?._count?.following || 0}</Text>
                <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-[2px] mt-1">Following</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Content Section Header */}
        <View className="px-8 mt-10 mb-6 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View className="w-2 h-6 rounded-full bg-violet-500 mr-3" />
            <Text className="font-black text-lg tracking-tight" style={{ color: themeColors.text }}>Your Collection</Text>
          </View>
          <Ionicons name="grid-outline" size={20} color={themeColors.subText} />
        </View>

        {/* Posts Grid Layout */}
        <View className="flex-row flex-wrap px-4">
          {userPosts.length === 0 ? (
            <View className="w-full py-20 items-center justify-center bg-gray-50 rounded-[40px] border-2 border-dashed border-gray-200">
              <Ionicons name="add-circle-outline" size={48} color="#CBD5E1" />
              <Text className="text-gray-400 font-black text-xs uppercase mt-4 tracking-widest">Share your first post</Text>
            </View>
          ) : (
            userPosts.map((post) => (
              <TouchableOpacity 
                key={post.id} 
                style={{ 
                  width: '33.33%', 
                  aspectRatio: 1,
                  padding: 4
                }}
              >
                <View 
                  className="w-full h-full rounded-[24px] overflow-hidden shadow-sm"
                  style={{ backgroundColor: themeColors.card, elevation: 2 }}
                >
                  <Image 
                    source={{ uri: (post.media && post.media.length > 0) ? getFullImageUrl(post.media[0].url) : `https://ui-avatars.com/api/?name=Post&background=F3F4F6&color=A5B4FC` }} 
                    className="w-full h-full" 
                  />
                  {(!post.media || post.media.length === 0) && (
                    <View className="absolute inset-0 items-center justify-center p-3 bg-violet-50/90">
                       <Text className="text-[9px] font-black text-violet-500 text-center uppercase leading-3" numberOfLines={4}>
                         {post.content}
                       </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
        <View className="h-32" />
      </ScrollView>
    </View>
  );
}
