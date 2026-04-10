import React, { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TouchableOpacity,
  Image,
  StatusBar,
  RefreshControl,
  Alert
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { theme } from "@/constants/theme";
import { useUser } from "@/store/UserContext";
import { usePosts } from "@/hooks/usePosts";
import { BASE_URL } from "@/services/api";

const DEFAULT_AVATAR = `https://ui-avatars.com/api/?name=${encodeURIComponent("User")}&background=7C3AED&color=fff`;

const getFullImageUrl = (url: string | null | undefined) => {
  if (!url) return DEFAULT_AVATAR;
  if (url.startsWith("http")) return url;
  return `${BASE_URL}${url}`;
};

export default function HomeScreen() {
  const router = useRouter();
  const {
    themeColors,
    unreadChatCount,
    unreadNotificationCount,
    followingIds,
    toggleFollow,
    getDirectChat,
    isAdmin,
    isUniAdmin
  } = useUser();

  const {
    posts: allPosts,
    isRefreshing,
    refreshPosts,
    toggleLike,
    deletePost,
    updateCommentsStatus,
    userId
  } = usePosts();

  const posts = useMemo(() => {
    return allPosts.filter((post) => !post.isOfficial);
  }, [allPosts]);

  const openPostDetail = (postId: string, focusComments = false) => {
    router.push({
      pathname: "/post-detail",
      params: {
        id: postId,
        ...(focusComments ? { focusComments: "1" } : {})
      }
    });
  };

  const stopPropagation = (event?: { stopPropagation?: () => void }) => {
    event?.stopPropagation?.();
  };

  const handlePostOptions = (post: any) => {
    if (post.authorId !== userId) return;

    Alert.alert(
      "จัดการโพสต์",
      "กรุณาเลือกรายการที่ต้องการ",
      [
        {
          text: post.commentsEnabled ? "ปิดการคอมเมนต์" : "เปิดการคอมเมนต์",
          onPress: () => updateCommentsStatus(post.id, !post.commentsEnabled)
        },
        {
          text: "ลบโพสต์",
          style: "destructive",
          onPress: () => {
            Alert.alert("ยืนยันการลบ", "คุณต้องการลบโพสต์นี้ถาวรใช่หรือไม่?", [
              { text: "ยกเลิก", style: "cancel" },
              { text: "ลบ", style: "destructive", onPress: () => deletePost(post.id) }
            ]);
          }
        },
        { text: "ยกเลิก", style: "cancel" }
      ]
    );
  };

  const handleChatPress = async (targetId: string, targetName: string, targetAvatar: string | null) => {
    try {
      const convo = await getDirectChat(targetId);
      if (convo) {
        router.push({
          pathname: "/chat-detail",
          params: {
            id: convo.id,
            userName: targetName,
            userAvatar: getFullImageUrl(targetAvatar),
            userId: targetId
          }
        });
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: themeColors.background }}>
      <StatusBar barStyle={themeColors.statusBar as any} />

      <SafeAreaView className="flex-1" edges={["top"]}>
        <View className="flex-row justify-between items-center px-6 py-4 border-b" style={{ borderBottomColor: themeColors.border, backgroundColor: themeColors.card }}>
          <View>
            <Text className="text-3xl font-black italic tracking-tighter" style={{ color: theme.colors.primary }}>DPU</Text>
            <Text className="text-[8px] font-black uppercase tracking-[3.5px] -mt-1 opacity-40" style={{ color: themeColors.text }}>UNILIFE</Text>
          </View>
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => router.push("/new-post")} className="w-10 h-10 items-center justify-center rounded-2xl mr-3 bg-indigo-50">
              <Feather name="plus" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/notifications")} className="w-10 h-10 items-center justify-center rounded-2xl mr-3" style={{ backgroundColor: themeColors.iconBg }}>
              <View className="relative">
                <Feather name="heart" size={22} color={themeColors.text} />
                {unreadNotificationCount > 0 && <View className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />}
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/messenger")} className="w-10 h-10 items-center justify-center rounded-2xl" style={{ backgroundColor: themeColors.iconBg }}>
              <View className="relative">
                <Feather name="message-circle" size={22} color={themeColors.text} />
                {unreadChatCount > 0 && (
                  <View className="absolute -top-2 -right-2 bg-red-500 rounded-full min-w-[18px] h-[18px] items-center justify-center px-1 border-2 border-white shadow-sm">
                    <Text className="text-[8px] text-white font-black">{unreadChatCount}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          className="px-4 pt-6"
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refreshPosts} tintColor={theme.colors.primary} />}
        >
          {posts.length === 0 ? (
            <View className="items-center justify-center py-32 bg-white rounded-[50px] border border-dashed border-gray-100 mx-2">
              <Ionicons name="planet-outline" size={50} color={theme.colors.primary} />
              <Text className="text-xl font-black mt-4" style={{ color: themeColors.text }}>Empty Galaxy</Text>
            </View>
          ) : (
            posts.map((post) => (
              <Pressable
                key={post.id}
                onPress={() => openPostDetail(post.id)}
                className="mb-10 rounded-[45px] border shadow-xl mx-1"
                style={{ backgroundColor: themeColors.card, borderColor: themeColors.border }}
              >
                <View className="flex-row items-center justify-between px-6 py-5">
                  <TouchableOpacity
                    onPress={(event) => {
                      stopPropagation(event);
                      router.push({ pathname: "/user-profile", params: { userId: post.authorId } });
                    }}
                    className="flex-row items-center flex-1"
                  >
                    <Image source={{ uri: getFullImageUrl(post.author?.avatarUrl) }} className="w-11 h-11 rounded-[20px] mr-3 border-2 border-white shadow-sm" />
                    <View className="flex-1">
                      <Text className="font-black text-sm tracking-tight" style={{ color: themeColors.text }}>{post.author?.fullName || "User"}</Text>
                      <Text className="text-[9px] font-black text-violet-500 uppercase">{post.author?.faculty}</Text>
                    </View>
                  </TouchableOpacity>

                  {post.authorId !== userId && !isAdmin && !isUniAdmin && (
                    <View className="flex-row items-center">
                      {followingIds.includes(post.authorId) ? (
                        <TouchableOpacity
                          onPress={(event) => {
                            stopPropagation(event);
                            handleChatPress(post.authorId, post.author?.fullName, post.author?.avatarUrl);
                          }}
                          className="w-10 h-10 items-center justify-center rounded-2xl bg-indigo-50 mr-2"
                        >
                          <Ionicons name="chatbubble-ellipses" size={20} color={theme.colors.primary} />
                        </TouchableOpacity>
                      ) : null}

                      <TouchableOpacity
                        onPress={(event) => {
                          stopPropagation(event);
                          toggleFollow(post.authorId);
                        }}
                        className={`px-4 py-2 rounded-2xl ${followingIds.includes(post.authorId) ? "bg-gray-100" : "bg-violet-500"}`}
                      >
                        <Text className={`font-black text-[10px] uppercase ${followingIds.includes(post.authorId) ? "text-gray-500" : "text-white"}`}>
                          {followingIds.includes(post.authorId) ? "Following" : "Follow"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {post.authorId === userId && (
                    <TouchableOpacity
                      onPress={(event) => {
                        stopPropagation(event);
                        handlePostOptions(post);
                      }}
                      className="w-10 h-10 items-center justify-center rounded-full bg-gray-50/50"
                    >
                      <Feather name="more-horizontal" size={20} color={themeColors.subText} />
                    </TouchableOpacity>
                  )}
                </View>

                {post.content && (
                  <View className="px-7 pb-5">
                    <Text className="text-[13px] leading-6 font-medium" style={{ color: themeColors.text }}>{post.content}</Text>
                  </View>
                )}

                {post.media && post.media.length > 0 && (
                  <View className="px-4 pb-4">
                    <Image source={{ uri: getFullImageUrl(post.media[0].url) }} className="w-full rounded-[35px] bg-gray-100" style={{ aspectRatio: 1 }} resizeMode="cover" />
                  </View>
                )}

                <View className="px-7 py-6 flex-row items-center border-t" style={{ borderTopColor: themeColors.border }}>
                  <TouchableOpacity
                    onPress={(event) => {
                      stopPropagation(event);
                      toggleLike(post.id);
                    }}
                    className="flex-row items-center mr-10"
                  >
                    <Ionicons name={post.reactions?.some((reaction: any) => reaction.userId === userId) ? "heart" : "heart-outline"} size={28} color={post.reactions?.some((reaction: any) => reaction.userId === userId) ? "#EF4444" : themeColors.text} />
                    <Text className="ml-2.5 font-black text-sm" style={{ color: themeColors.text }}>{post._count?.reactions || 0}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={(event) => {
                      stopPropagation(event);
                      openPostDetail(post.id, true);
                    }}
                    className="flex-row items-center"
                  >
                    <Feather name="message-circle" size={26} color={themeColors.text} />
                    <Text className="ml-2.5 font-black text-sm" style={{ color: themeColors.text }}>{post._count?.comments || 0}</Text>
                  </TouchableOpacity>
                </View>
              </Pressable>
            ))
          )}
          <View className="h-24" />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
