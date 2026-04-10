import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  RefreshControl,
  Alert,
  TextInput,
} from "react-native";
import ImageCarousel from "@/components/ImageCarousel";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { theme } from "@/constants/theme";
import { useUser } from "@/store/UserContext";
import { usePosts } from "@/hooks/usePosts";
import { postService, reportService } from "@/services/api";
import { getAvatarUrl } from "@/utils/imageUtils";
import * as Haptics from "expo-haptics";

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
    isUniAdmin,
  } = useUser();

  const {
    posts: allPosts,
    isRefreshing,
    refreshPosts,
    toggleLike,
    deletePost,
    updateCommentsStatus,
    activeCommentPostId,
    commentText,
    setCommentText,
    sendComment,
    toggleComments,
    handleCommentLongPress,
    userId,
  } = usePosts();

  const [sharingPostId, setSharingPostId] = useState<string | null>(null);
  const [expandedPosts, setExpandedPosts] = useState<Record<string, boolean>>({});

  const posts = useMemo(() => allPosts.filter((p) => !p.isOfficial), [allPosts]);

  const handlePostOptions = (post: any) => {
    if (post.authorId !== userId) return;
    Alert.alert("จัดการโพสต์", "กรุณาเลือกรายการที่ต้องการ", [
      {
        text: post.commentsEnabled ? "ปิดการคอมเมนต์" : "เปิดการคอมเมนต์",
        onPress: () => updateCommentsStatus(post.id, !post.commentsEnabled),
      },
      {
        text: "ลบโพสต์",
        style: "destructive",
        onPress: () =>
          Alert.alert("ยืนยันการลบ", "คุณต้องการลบโพสต์นี้ถาวรใช่หรือไม่?", [
            { text: "ยกเลิก", style: "cancel" },
            { text: "ลบ", style: "destructive", onPress: () => deletePost(post.id) },
          ]),
      },
      { text: "ยกเลิก", style: "cancel" },
    ]);
  };

  const handleReportPost = (postId: string) => {
    Alert.alert("Report Post", "Why are you reporting this post?", [
      { text: "Spam", onPress: () => submitReport(postId, "Spam") },
      { text: "Inappropriate content", onPress: () => submitReport(postId, "Inappropriate content") },
      { text: "Harassment", onPress: () => submitReport(postId, "Harassment") },
      { text: "False information", onPress: () => submitReport(postId, "False information") },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const submitReport = async (postId: string, reason: string) => {
    try {
      await reportService.createReport({ reporterId: userId, targetType: "POST", targetPostId: postId, reason });
      Alert.alert("Reported", "Thank you. Our team will review this.");
    } catch {
      Alert.alert("Error", "Could not submit report.");
    }
  };

  const handleShare = async (postId: string) => {
    if (sharingPostId === postId) return;
    setSharingPostId(postId);
    try {
      await postService.sharePost(postId, userId);
      Alert.alert("Shared!", "Post shared to your timeline.");
    } catch {
      Alert.alert("Error", "Could not share this post.");
    } finally {
      setSharingPostId(null);
    }
  };

  const handleChatPress = async (targetId: string, targetName: string, targetAvatar: string | null) => {
    try {
      const convo = await getDirectChat(targetId);
      if (convo) {
        router.push({
          pathname: "/chat-detail",
          params: { id: convo.id, userName: targetName, userAvatar: getAvatarUrl(targetAvatar, targetName), userId: targetId },
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
        {/* Header */}
        <View
          className="flex-row justify-between items-center px-4 py-3 border-b"
          style={{ borderBottomColor: themeColors.border, backgroundColor: themeColors.card }}
        >
          <View>
            <Text className="text-3xl font-black italic tracking-tighter" style={{ color: theme.colors.primary }}>DPU</Text>
            <Text className="text-[8px] font-black uppercase tracking-[3.5px] -mt-1 opacity-40" style={{ color: themeColors.text }}>UNILIFE</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <TouchableOpacity onPress={() => router.push("/new-post")} className="w-9 h-9 items-center justify-center rounded-xl bg-indigo-50">
              <Feather name="plus" size={22} color={theme.colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/notifications")} className="w-9 h-9 items-center justify-center rounded-xl" style={{ backgroundColor: themeColors.iconBg }}>
              <View className="relative">
                <Feather name="heart" size={20} color={themeColors.text} />
                {unreadNotificationCount > 0 && <View className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />}
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/messenger")} className="w-9 h-9 items-center justify-center rounded-xl" style={{ backgroundColor: themeColors.iconBg }}>
              <View className="relative">
                <Feather name="message-circle" size={20} color={themeColors.text} />
                {unreadChatCount > 0 && (
                  <View className="absolute -top-1.5 -right-1.5 bg-red-500 rounded-full min-w-[16px] h-4 items-center justify-center px-0.5">
                    <Text className="text-[9px] text-white font-black">{unreadChatCount}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refreshPosts} tintColor={theme.colors.primary} />}
        >
          {posts.length === 0 ? (
            <View className="items-center justify-center py-32 mx-4 mt-6 rounded-[40px] border border-dashed border-gray-100" style={{ backgroundColor: themeColors.card }}>
              <Ionicons name="planet-outline" size={50} color={theme.colors.primary} />
              <Text className="text-xl font-black mt-4" style={{ color: themeColors.text }}>Empty Galaxy</Text>
            </View>
          ) : (
            posts.map((post) => {
              const isLiked = post.reactions?.some((r: any) => r.userId === userId);

              return (
                <View
                  key={post.id}
                  className="mb-3 border-b"
                  style={{ backgroundColor: themeColors.card, borderColor: themeColors.border }}
                >
                  {/* Author row */}
                  <View className="flex-row items-center justify-between px-4 pt-4 pb-3">
                    <TouchableOpacity
                      onPress={() => router.push({ pathname: "/user-profile", params: { userId: post.authorId } })}
                      className="flex-row items-center flex-1"
                    >
                      <Image
                        source={{ uri: getAvatarUrl(post.author?.avatarUrl, post.author?.fullName) }}
                        className="w-10 h-10 rounded-full mr-3 border border-gray-100"
                      />
                      <View className="flex-1">
                        <Text className="font-black text-[13px]" style={{ color: themeColors.text }}>{post.author?.fullName || "User"}</Text>
                        {post.author?.faculty ? (
                          <Text className="text-[10px] font-bold text-violet-500">{post.author.faculty}</Text>
                        ) : null}
                      </View>
                    </TouchableOpacity>

                    {/* Follow / Chat for non-owner */}
                    {post.authorId !== userId && !isAdmin && !isUniAdmin && (
                      <View className="flex-row items-center gap-2">
                        {followingIds.includes(post.authorId) && (
                          <TouchableOpacity
                            onPress={() => handleChatPress(post.authorId, post.author?.fullName ?? "", post.author?.avatarUrl ?? null)}
                            className="w-8 h-8 items-center justify-center rounded-xl bg-indigo-50"
                          >
                            <Ionicons name="chatbubble-ellipses" size={16} color={theme.colors.primary} />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          onPress={() => toggleFollow(post.authorId)}
                          className={`px-3 py-1.5 rounded-xl ${followingIds.includes(post.authorId) ? "bg-gray-100" : "bg-violet-500"}`}
                        >
                          <Text className={`font-black text-[10px] uppercase ${followingIds.includes(post.authorId) ? "text-gray-500" : "text-white"}`}>
                            {followingIds.includes(post.authorId) ? "Following" : "Follow"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Owner options */}
                    {post.authorId === userId ? (
                      <TouchableOpacity onPress={() => handlePostOptions(post)} className="w-8 h-8 items-center justify-center ml-1">
                        <Feather name="more-horizontal" size={20} color={themeColors.subText} />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity onPress={() => handleReportPost(post.id)} className="w-8 h-8 items-center justify-center ml-1">
                        <Feather name="flag" size={16} color={themeColors.subText} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Full-width image carousel with double-tap to like */}
                  {post.media && post.media.length > 0 && (
                    <ImageCarousel
                      images={post.media.map((m: any) => ({ url: getAvatarUrl(m.url) }))}
                      aspectRatio={1}
                      onDoubleTap={() => {
                        toggleLike(post.id);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      }}
                    />
                  )}

                  {/* Actions row */}
                  <View className="flex-row items-center px-4 pt-3 pb-2 gap-4">
                    <TouchableOpacity onPress={() => toggleLike(post.id)} className="flex-row items-center">
                      <Ionicons
                        name={isLiked ? "heart" : "heart-outline"}
                        size={26}
                        color={isLiked ? "#EF4444" : themeColors.text}
                      />
                      <Text className="ml-1.5 font-black text-sm" style={{ color: themeColors.text }}>{post._count?.reactions || 0}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => toggleComments(post.id)} className="flex-row items-center">
                      <Feather name="message-circle" size={24} color={activeCommentPostId === post.id ? theme.colors.primary : themeColors.text} />
                      <Text className="ml-1.5 font-black text-sm" style={{ color: themeColors.text }}>{post._count?.comments || 0}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => handleShare(post.id)} disabled={sharingPostId === post.id}>
                      <Feather name="share-2" size={22} color={sharingPostId === post.id ? "#CBD5E1" : themeColors.text} />
                    </TouchableOpacity>
                  </View>

                  {/* Caption */}
                  {post.content && (() => {
                    const isLong = (post.content?.length ?? 0) > 120 || (post.content?.split("\n").length ?? 0) > 2;
                    const isExpanded = expandedPosts[post.id];
                    return (
                      <View className="px-4 pb-3">
                        <Text className="text-[13px] leading-[22px]" style={{ color: themeColors.text }} numberOfLines={isExpanded ? undefined : 3}>
                          <Text className="font-black">{post.author?.fullName} </Text>
                          {post.content}
                        </Text>
                        {isLong && (
                          <TouchableOpacity onPress={() => setExpandedPosts(prev => ({ ...prev, [post.id]: !prev[post.id] }))}>
                            <Text className="text-violet-500 font-bold text-[11px] mt-1">
                              {isExpanded ? "Show less" : "Show more"}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })()}

                  {/* Inline Comments */}
                  {activeCommentPostId === post.id && (
                    <View className="px-4 pb-4">
                      {post.comments && post.comments.length > 0 && (
                        <View className="mb-3 gap-3">
                          {post.comments.map((comment: any) => (
                            <TouchableOpacity
                              key={comment.id}
                              className="flex-row items-start"
                              onLongPress={() => handleCommentLongPress(post.id, comment)}
                              delayLongPress={400}
                              activeOpacity={0.85}
                            >
                              <Image
                                source={{ uri: getAvatarUrl(comment.author?.avatarUrl, comment.author?.fullName) }}
                                className="w-7 h-7 rounded-full mr-2 mt-0.5"
                              />
                              <View className="flex-1 bg-gray-50 rounded-2xl px-3 py-2" style={{ backgroundColor: themeColors.iconBg }}>
                                <Text className="font-black text-[11px] mb-0.5" style={{ color: themeColors.text }}>{comment.author?.fullName}</Text>
                                <Text className="text-[12px] leading-5" style={{ color: themeColors.text }}>{comment.content}</Text>
                              </View>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                      {post.commentsEnabled !== false && (
                        <View className="flex-row items-center gap-2">
                          <Image source={{ uri: getAvatarUrl(undefined) }} className="w-7 h-7 rounded-full" />
                          <View className="flex-1 flex-row items-center rounded-full border px-3 py-1.5" style={{ borderColor: themeColors.border, backgroundColor: themeColors.iconBg }}>
                            <TextInput
                              value={commentText[post.id] ?? ""}
                              onChangeText={(t) => setCommentText(prev => ({ ...prev, [post.id]: t }))}
                              placeholder="Add a comment..."
                              placeholderTextColor={themeColors.subText}
                              style={{ flex: 1, fontSize: 12, color: themeColors.text }}
                              returnKeyType="send"
                              onSubmitEditing={() => sendComment(post.id)}
                            />
                            {(commentText[post.id]?.trim().length ?? 0) > 0 && (
                              <TouchableOpacity onPress={() => sendComment(post.id)}>
                                <Text className="text-violet-500 font-black text-[12px] ml-2">Post</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            })
          )}
          <View className="h-24" />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
