import React, { useEffect, useState, useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, StatusBar, RefreshControl, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { theme } from "@/constants/theme";
import { useUser } from "@/store/UserContext";
import { authService, postService } from "@/services/api";
import { getAvatarUrl } from "@/utils/imageUtils";
import { tabRefreshEmitter } from "@/utils/tabRefresh";
import { Post, UserRole } from "@/types/backend";
import { usePosts } from "@/hooks/usePosts";
import PostThumbnailCard from "@/components/PostThumbnailCard";
import ProfileGridTabBar from "@/components/ProfileGridTabBar";
import EmptyState from "@/components/EmptyState";

function AdminDashboard() {
  const router = useRouter();
  const { themeColors, profileImage, name, userId, user: currentUser, isUniAdmin } = useUser();
  const { posts, deletePost, updateCommentsStatus, togglePin } = usePosts();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const adminPosts = useMemo(() => {
    const filtered = posts.filter(p => p.authorId === userId);
    return [...filtered].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [posts, userId]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await authService.getProfile(userId);
    setIsRefreshing(false);
  };

  useEffect(() => {
    tabRefreshEmitter.on("profile", onRefresh);
    return () => tabRefreshEmitter.off("profile", onRefresh);
  }, []);

  const handlePostOptions = (post: any) => {
    Alert.alert(
      "จัดการประกาศ",
      "กรุณาเลือกรายการที่ต้องการ",
      [
        {
          text: "แก้ไขประกาศ",
          onPress: () => router.push({
            pathname: "/new-post",
            params: {
              editPostId: post.id,
              editContent: post.content ?? "",
              editVisibility: post.visibility ?? "PUBLIC",
            },
          } as any)
        },
        {
          text: post.isPinned ? "เลิกปักหมุด" : "ปักหมุดประกาศ",
          onPress: () => togglePin(post.id, !!post.isPinned)
        },
        {
          text: post.commentsEnabled ? "ปิดการคอมเมนต์" : "เปิดการคอมเมนต์",
          onPress: () => updateCommentsStatus(post.id, !post.commentsEnabled)
        },
        {
          text: "ลบประกาศ",
          style: "destructive",
          onPress: () => {
            Alert.alert("ยืนยันการลบ", "คุณต้องการลบประกาศนี้ถาวรใช่หรือไม่?", [
              { text: "ยกเลิก", style: "cancel" },
              { text: "ลบ", style: "destructive", onPress: () => deletePost(post.id) }
            ]);
          }
        },
        { text: "ยกเลิก", style: "cancel" }
      ]
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: themeColors.background }}>
      <StatusBar barStyle="light-content" />
      
      <View className="absolute top-0 left-0 right-0 z-10">
        <SafeAreaView edges={['top']}>
          <View className="flex-row justify-between px-6 py-2">
            <View className="w-10 h-10" />
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
        <View className="h-48 w-full" style={{ backgroundColor: theme.colors.primary }}>
          <View className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/10" />
          <View className="absolute top-10 -left-10 w-32 h-32 rounded-full bg-black/5" />
        </View>

        <View className="px-6 -mt-16">
          <View className="rounded-[40px] p-6 shadow-xl" style={{ backgroundColor: themeColors.card, elevation: 10 }}>
            <View className="flex-row justify-between items-end mb-6">
              <View className="w-28 h-28 rounded-[35px] border-4 p-1" style={{ backgroundColor: themeColors.card, borderColor: themeColors.card }}>
                <Image source={{ uri: getAvatarUrl(profileImage, name) }} className="w-full h-full rounded-[28px]" />
              </View>
              
              <TouchableOpacity onPress={() => router.push("/edit-profile")} className="px-6 py-3 rounded-2xl bg-amber-400">
                <Text className="font-black text-xs text-amber-900 uppercase tracking-widest">Edit Profile</Text>
              </TouchableOpacity>
            </View>

            <View>
              <Text className="text-3xl font-black tracking-tighter" style={{ color: themeColors.text }}>{name || "Admin"}</Text>
              <View className="flex-row items-center mt-1 flex-wrap">
                <Text className="text-sm font-bold text-violet-500 mr-2">@{currentUser?.username}</Text>
                <View className="px-2 py-0.5 rounded-md bg-violet-100 mr-2 mb-1">
                  <Text className="text-[8px] font-black text-violet-600 uppercase">{isUniAdmin ? "University Admin" : "Faculty Admin"}</Text>
                </View>
                {!isUniAdmin && currentUser?.faculty && (
                  <View className="px-2 py-0.5 rounded-md bg-blue-100 mb-1">
                    <Text className="text-[8px] font-black text-blue-600 uppercase">{currentUser.faculty}</Text>
                  </View>
                )}
              </View>
              <View className="h-4" />
            </View>
          </View>
        </View>

        <View className="px-8 mt-10 mb-6 flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View className="w-2 h-6 rounded-full bg-violet-500 mr-3" />
            <Text className="font-black text-lg tracking-tight" style={{ color: themeColors.text }}>Management Grid</Text>
          </View>
          <Ionicons name="grid-outline" size={20} color={themeColors.subText} />
        </View>

        <View className="flex-row flex-wrap px-4">
          {adminPosts.length === 0 ? (
            <View className="w-full py-20 items-center justify-center rounded-[40px] border-2 border-dashed" style={{ backgroundColor: themeColors.iconBg, borderColor: themeColors.border }}>
              <Ionicons name="megaphone-outline" size={48} color={themeColors.subText} />
              <Text className="font-black text-xs uppercase mt-4 tracking-widest" style={{ color: themeColors.subText }}>No announcements yet</Text>
            </View>
          ) : (
            adminPosts.map((post) => (
              <PostThumbnailCard
                key={post.id}
                post={post}
                onPress={() => router.push({ pathname: "/post-detail", params: { postId: post.id, userId, single: "true" } } as any)}
                onLongPress={() => handlePostOptions(post)}
                themeColors={themeColors}
                badgeIcon={post.isPinned ? "pin" : undefined}
                badgeColor={theme.colors.primary}
              />
            ))
          )}
        </View>
        <View className="h-32" />
      </ScrollView>
    </View>
  );
}

function StudentProfile() {
  const router = useRouter();
  const { name, bio, profileImage, userId, themeColors, user: currentUser, posts: globalPosts } = useUser();
  const { deletePost } = usePosts();
  
  const [reposts, setReposts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"posts" | "reposts">("posts");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);

  // Derive userPosts from globalPosts for real-time updates
  const userPosts = useMemo(() => {
    return globalPosts
      .filter(p => p.authorId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [globalPosts, userId]);

  const fetchProfileData = async () => {
    if (!userId) return;
    try {
      const data = await authService.getProfile(userId);
      setProfileData(data);
      if (data.postShares) setReposts(data.postShares);
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

  useEffect(() => {
    tabRefreshEmitter.on("profile", onRefresh);
    return () => tabRefreshEmitter.off("profile", onRefresh);
  }, []);

  const handlePostOptions = (post: any) => {
    Alert.alert(
      "จัดการโพสต์",
      "กรุณาเลือกรายการที่ต้องการ",
      [
        {
          text: "ลบโพสต์",
          style: "destructive",
          onPress: () => {
            Alert.alert("ยืนยันการลบ", "คุณต้องการลบโพสต์นี้ถาวรใช่หรือไม่?", [
              { text: "ยกเลิก", style: "cancel" },
              { 
                text: "ลบ", 
                style: "destructive", 
                onPress: async () => {
                  try {
                    await deletePost(post.id);
                  } catch {
                    Alert.alert("Error", "Could not delete post.");
                  }
                }
              }
            ]);
          }
        },
        { text: "ยกเลิก", style: "cancel" }
      ]
    );
  };


  return (
    <View className="flex-1" style={{ backgroundColor: themeColors.background }}>
      <StatusBar barStyle="light-content" />
      
      <View className="absolute top-0 left-0 right-0 z-10">
        <SafeAreaView edges={['top']}>
          <View className="flex-row justify-between px-6 py-2">
            <View className="w-10 h-10" />
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
        <View className="h-48 w-full" style={{ backgroundColor: theme.colors.primary }}>
          <View className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/10" />
          <View className="absolute top-10 -left-10 w-32 h-32 rounded-full bg-black/5" />
        </View>

        <View className="px-6 -mt-16">
          <View className="rounded-[40px] p-6 shadow-xl" style={{ backgroundColor: themeColors.card, elevation: 10 }}>
            <View className="flex-row justify-between items-end mb-6">
              <View className="w-28 h-28 rounded-[35px] border-4 p-1" style={{ backgroundColor: themeColors.card, borderColor: themeColors.card }}>
                <Image source={{ uri: getAvatarUrl(profileImage, name) }} className="w-full h-full rounded-[28px]" />
              </View>
              
              <TouchableOpacity onPress={() => router.push("/edit-profile")} className="px-6 py-3 rounded-2xl bg-violet-500">
                <Text className="font-black text-xs text-white uppercase tracking-widest">Edit</Text>
              </TouchableOpacity>
            </View>

            <View>
              <Text className="text-3xl font-black tracking-tighter" style={{ color: themeColors.text }}>{name || "User"}</Text>
              <View className="flex-row items-center mt-1 flex-wrap">
                <Text className="text-sm font-bold text-violet-500 mr-2">@{currentUser?.username || "username"}</Text>
                <View className="px-2 py-0.5 rounded-md bg-violet-100 mr-2 mb-1">
                  <Text className="text-[8px] font-black text-violet-600 uppercase">{currentUser?.role || "STUDENT"}</Text>
                </View>
                {profileData?.faculty && currentUser?.role !== UserRole.SUPER_ADMIN && (
                  <View className="px-2 py-0.5 rounded-md bg-blue-100 mb-1">
                    <Text className="text-[8px] font-black text-blue-600 uppercase">{profileData.faculty}</Text>
                  </View>
                )}
              </View>
              {bio ? (
                <Text className="text-sm mt-5 leading-6 font-medium" style={{ color: themeColors.subText }}>{bio}</Text>
              ) : null}
            </View>

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

        <ProfileGridTabBar activeTab={activeTab} onTabChange={setActiveTab} themeColors={themeColors} />

        {/* Posts tab */}
        <View style={{ display: activeTab === "posts" ? "flex" : "none" }}>
          <View className="flex-row flex-wrap px-4 pt-2">
            {userPosts.length === 0 ? (
              <View className="w-full rounded-[40px] border-2 border-dashed" style={{ backgroundColor: themeColors.iconBg, borderColor: themeColors.border }}>
                <EmptyState icon="add-circle-outline" title="Share your first post" themeColors={themeColors} />
              </View>
            ) : (
              userPosts.map((post) => (
                <PostThumbnailCard
                  key={post.id}
                  post={post}
                  onPress={() => router.push({ pathname: "/post-detail", params: { postId: post.id, userId, single: "true" } } as any)}
                  onLongPress={() => handlePostOptions(post)}
                  themeColors={themeColors}
                />
              ))
            )}
          </View>
        </View>

        {/* Reposts tab */}
        <View style={{ display: activeTab === "reposts" ? "flex" : "none" }}>
          <View className="flex-row flex-wrap px-4 pt-2">
            {reposts.length === 0 ? (
              <View className="w-full rounded-[40px] border-2 border-dashed" style={{ backgroundColor: themeColors.iconBg, borderColor: themeColors.border }}>
                <EmptyState icon="repeat" title="No reposts yet" themeColors={themeColors} />
              </View>
            ) : (
              reposts.map((share) => {
                const post = share.post;
                const handleUnrepost = () => {
                  Alert.alert("ยกเลิก Repost", "ต้องการยกเลิก repost โพสต์นี้ใช่ไหม?", [
                    { text: "ยกเลิก", style: "cancel" },
                    {
                      text: "ยืนยัน", style: "destructive",
                      onPress: async () => {
                        try {
                          await postService.unrepostPost(post.id, userId);
                          setReposts(prev => prev.filter(s => s.id !== share.id));
                        } catch {
                          Alert.alert("Error", "Could not unrepost.");
                        }
                      }
                    }
                  ]);
                };
                return (
                  <PostThumbnailCard
                    key={share.id}
                    post={post}
                    onPress={() => router.push({ pathname: "/post-detail", params: { postId: post.id, userId: post.author?.id, single: "true" } } as any)}
                    themeColors={themeColors}
                    badgeIcon="repeat"
                    onBadgePress={handleUnrepost}
                  />
                );
              })
            )}
          </View>
        </View>
        <View className="h-32" />
      </ScrollView>
    </View>
  );
}

export default function ProfileScreen() {
  const { isAdmin, isUniAdmin } = useUser();
  if (isAdmin || isUniAdmin) return <AdminDashboard />;
  return <StudentProfile />;
}
