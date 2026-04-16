import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, Dimensions, StatusBar, RefreshControl, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import { theme } from "@/constants/theme";
import { useUser } from "@/store/UserContext";
import { authService, adminService } from "@/services/api";
import { getAvatarUrl, getImageUrl } from "@/utils/imageUtils";
import { Post } from "@/types/backend";

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 16) / 3;

export default function UserProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ userId: string }>();
  const targetUserId = params.userId;
  
  const { userId: currentUserId, themeColors, toggleFollow, followingIds, getDirectChat, isAdmin, isUniAdmin } = useUser();
  
  const [userData, setUserData] = useState<any>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [reposts, setReposts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"posts" | "reposts">("posts");
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchUserData = async () => {
    if (!targetUserId) return;
    try {
      const data = await authService.getProfile(targetUserId);
      setUserData(data);
      if (data.authoredPosts) setUserPosts(data.authoredPosts);
      if (data.postShares) setReposts(data.postShares);
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


  const handleSuspendToggle = async () => {
    if (!userData) return;
    const isSuspended = userData.status === 'SUSPENDED';
    const action = isSuspended ? 'Unsuspend' : 'Suspend';
    Alert.alert(
      `${action} User`,
      `Are you sure you want to ${action.toLowerCase()} ${userData.fullName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action,
          style: isSuspended ? 'default' : 'destructive',
          onPress: async () => {
            try {
              const newStatus = isSuspended ? 'ACTIVE' : 'SUSPENDED';
              await adminService.updateUserStatus(targetUserId, newStatus, currentUserId);
              setUserData((prev: any) => ({ ...prev, status: newStatus }));
            } catch (e) {
              Alert.alert('Error', 'Failed to update user status');
            }
          },
        },
      ]
    );
  };

  const handleChatPress = async () => {
    const convo = await getDirectChat(targetUserId);
    if (convo) {
      router.push({
        pathname: "/chat-detail",
        params: { 
          id: convo.id, 
          userName: userData.fullName, 
          userAvatar: getAvatarUrl(userData.avatarUrl, userData.fullName),
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
      <Stack.Screen options={{ gestureEnabled: true, fullScreenGestureEnabled: false, gestureResponseDistance: 100 }} />
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
                <Image source={{ uri: getAvatarUrl(userData?.avatarUrl, userData?.fullName) }} className="w-full h-full rounded-[28px]" />
              </View>
              
              <View className="flex-row items-center">
                {(isAdmin || isUniAdmin) && targetUserId !== currentUserId && (
                  <TouchableOpacity
                    onPress={handleSuspendToggle}
                    className="w-12 h-12 rounded-2xl items-center justify-center mr-2"
                    style={{ backgroundColor: userData?.status === 'SUSPENDED' ? '#D1FAE5' : '#FEE2E2' }}
                  >
                    <Ionicons
                      name={userData?.status === 'SUSPENDED' ? 'checkmark-circle-outline' : 'ban-outline'}
                      size={22}
                      color={userData?.status === 'SUSPENDED' ? '#059669' : '#DC2626'}
                    />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => toggleFollow(targetUserId)}
                  className={`px-6 py-3 rounded-2xl mr-2 ${isFollowing ? 'border' : 'bg-violet-500'}`}
                  style={isFollowing ? { borderColor: themeColors.border } : {}}
                >
                  <Text className={`font-black text-xs uppercase tracking-widest ${isFollowing ? '' : 'text-white'}`} style={isFollowing ? {color: themeColors.text} : {}}>
                    {isFollowing ? 'Following' : 'Follow'}
                  </Text>
                </TouchableOpacity>
                {isFollowing && (
                  <TouchableOpacity
                    onPress={handleChatPress}
                    className="w-12 h-12 rounded-2xl items-center justify-center border"
                    style={{ borderColor: themeColors.border }}
                  >
                    <Ionicons name="chatbubble-ellipses-outline" size={22} color={themeColors.text} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View>
              <View className="flex-row items-center flex-wrap">
                <Text className="text-3xl font-black tracking-tighter mr-2" style={{ color: themeColors.text }}>{userData?.fullName}</Text>
                {userData?.status === 'SUSPENDED' && (
                  <View className="px-2 py-0.5 rounded-md bg-red-100">
                    <Text className="text-[9px] font-black text-red-600 uppercase">Suspended</Text>
                  </View>
                )}
              </View>
              <View className="flex-row items-center mt-1">
                <Text className="text-sm font-bold text-violet-500 mr-2">@{userData?.username}</Text>
                {userData?.faculty && (
                  <View className="px-2.5 py-1 rounded-lg bg-blue-100">
                    <Text className="text-[9px] font-black text-blue-600 uppercase">{userData.faculty}</Text>
                  </View>
                )}
              </View>
              
              {userData?.bio ? (
                <Text className="text-sm mt-5 leading-6 font-medium" style={{ color: themeColors.subText }}>{userData.bio}</Text>
              ) : null}
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

        {/* Tab icons */}
        <View className="flex-row border-t mt-6" style={{ borderTopColor: themeColors.border }}>
          <TouchableOpacity
            onPress={() => setActiveTab("posts")}
            className="flex-1 items-center py-3"
            style={{ borderBottomWidth: 2, borderBottomColor: activeTab === "posts" ? themeColors.text : "transparent" }}
          >
            <Ionicons name="grid-outline" size={22} color={activeTab === "posts" ? themeColors.text : themeColors.subText} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab("reposts")}
            className="flex-1 items-center py-3"
            style={{ borderBottomWidth: 2, borderBottomColor: activeTab === "reposts" ? themeColors.text : "transparent" }}
          >
            <Ionicons name="repeat" size={22} color={activeTab === "reposts" ? themeColors.text : themeColors.subText} />
          </TouchableOpacity>
        </View>

        {/* Posts tab — always mounted, hidden when inactive */}
        <View style={{ display: activeTab === "posts" ? "flex" : "none" }}>
          <View className="flex-row flex-wrap px-4 pt-2 pb-20">
            {userPosts.length === 0 ? (
              <View className="w-full py-20 items-center justify-center rounded-[40px] border-2 border-dashed" style={{ backgroundColor: themeColors.iconBg, borderColor: themeColors.border }}>
                <Ionicons name="images-outline" size={40} color={themeColors.subText} />
                <Text className="font-black text-[10px] uppercase mt-4" style={{ color: themeColors.subText }}>No public posts</Text>
              </View>
            ) : (
              userPosts.map((post) => (
                <TouchableOpacity key={post.id} onPress={() => router.push({ pathname: "/post-detail", params: { postId: post.id, userId: targetUserId } } as any)} style={{ width: '33.33%', aspectRatio: 1, padding: 4 }}>
                  <View className="w-full h-full rounded-[20px] overflow-hidden" style={{ backgroundColor: themeColors.iconBg }}>
                    <Image source={{ uri: (post.media && post.media.length > 0) ? getImageUrl(post.media[0].url) : undefined }} className="w-full h-full" />
                    {(!post.media || post.media.length === 0) && (
                      <View className="absolute inset-0 items-center justify-center p-2" style={{ backgroundColor: themeColors.iconBg }}>
                        <Text className="text-[9px] font-black text-center uppercase leading-3" numberOfLines={4} style={{ color: themeColors.text }}>{post.content}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>

        {/* Reposts tab — always mounted, hidden when inactive */}
        <View style={{ display: activeTab === "reposts" ? "flex" : "none" }}>
          <View className="flex-row flex-wrap px-4 pt-2 pb-20">
            {reposts.length === 0 ? (
              <View className="w-full py-20 items-center justify-center rounded-[40px] border-2 border-dashed" style={{ backgroundColor: themeColors.iconBg, borderColor: themeColors.border }}>
                <Ionicons name="repeat" size={40} color={themeColors.subText} />
                <Text className="font-black text-[10px] uppercase mt-4" style={{ color: themeColors.subText }}>No reposts yet</Text>
              </View>
            ) : (
              reposts.map((share) => {
                const post = share.post;
                return (
                  <TouchableOpacity key={share.id} onPress={() => router.push({ pathname: "/post-detail", params: { postId: post.id, userId: post.author?.id, single: "true" } } as any)} style={{ width: '33.33%', aspectRatio: 1, padding: 4 }}>
                    <View className="w-full h-full rounded-[20px] overflow-hidden" style={{ backgroundColor: themeColors.iconBg }}>
                      <Image source={{ uri: (post.media && post.media.length > 0) ? getImageUrl(post.media[0].url) : undefined }} className="w-full h-full" />
                      <View className="absolute top-2 right-2 rounded-full p-1" style={{ backgroundColor: "#10B981" }}>
                        <Ionicons name="repeat" size={10} color="white" />
                      </View>
                      {(!post.media || post.media.length === 0) && (
                        <View className="absolute inset-0 items-center justify-center p-2" style={{ backgroundColor: themeColors.iconBg }}>
                          <Text className="text-[9px] font-black text-center uppercase leading-3" numberOfLines={4} style={{ color: themeColors.text }}>{post.content}</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
