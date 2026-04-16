import React, { useMemo, useState, useEffect, useRef } from "react";
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
import PostActionBar from "@/components/PostActionBar";
import InlineComments from "@/components/InlineComments";
import EmptyState from "@/components/EmptyState";
import ExpandableText from "@/components/ExpandableText";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { theme } from "@/constants/theme";
import { useUser } from "@/store/UserContext";
import { usePosts } from "@/hooks/usePosts";
import { postService, reportService } from "@/services/api";
import { getAvatarUrl } from "@/utils/imageUtils";
import { tabRefreshEmitter } from "@/utils/tabRefresh";
import * as Haptics from "expo-haptics";

export default function HomeScreen() {
  const router = useRouter();
  const {
    themeColors,
    unreadChatCount,
    unreadNotificationCount,
    followingIds,
    toggleFollow,
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
    replyTo,
    setReplyTo,
    sendComment,
    toggleComments,
    handleCommentLongPress,
    userId,
  } = usePosts();

  const scrollRef = useRef<ScrollView>(null);
  const refreshRef = useRef(refreshPosts);
  refreshRef.current = refreshPosts;

  useEffect(() => {
    const handler = () => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      refreshRef.current();
    };
    tabRefreshEmitter.on("home", handler);
    return () => tabRefreshEmitter.off("home", handler);
  }, []);

  const [repostedIds, setRepostedIds] = useState<Set<string>>(new Set());
  const [expandedPosts, setExpandedPosts] = useState<Record<string, boolean>>({});

  const posts = useMemo(() => allPosts.filter((p) => !p.isOfficial), [allPosts]);

  const handlePostOptions = (post: any) => {
    if (post.authorId !== userId) return;
    Alert.alert("จัดการโพสต์", "กรุณาเลือกรายการที่ต้องการ", [
      {
        text: "แก้ไขโพสต์",
        onPress: () => router.push({
          pathname: "/new-post",
          params: {
            editPostId: post.id,
            editContent: post.content ?? "",
            editVisibility: post.visibility ?? "PUBLIC",
          },
        }),
      },
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

  const handleRepost = async (postId: string) => {
    const isReposted = repostedIds.has(postId);
    try {
      if (isReposted) {
        await postService.unrepostPost(postId, userId);
        setRepostedIds(prev => { const next = new Set(prev); next.delete(postId); return next; });
      } else {
        await postService.sharePost(postId, userId);
        setRepostedIds(prev => new Set(prev).add(postId));
      }
    } catch {
      Alert.alert("Error", "Could not repost.");
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
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refreshPosts} tintColor={theme.colors.primary} />}
        >
          {posts.length === 0 ? (
            <View className="mx-4 mt-6 rounded-[40px] border border-dashed border-gray-100" style={{ backgroundColor: themeColors.card }}>
              <EmptyState icon="planet-outline" title="Empty Galaxy" themeColors={themeColors} />
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

                    {/* Follow button — show only when NOT following */}
                    {post.authorId !== userId && !isAdmin && !isUniAdmin && !followingIds.includes(post.authorId) && (
                      <TouchableOpacity
                        onPress={() => toggleFollow(post.authorId)}
                        className="px-3 py-1.5 rounded-xl bg-violet-500 mr-1"
                      >
                        <Text className="font-black text-[10px] uppercase text-white">Follow</Text>
                      </TouchableOpacity>
                    )}

                    {/* 3-dot options */}
                    <TouchableOpacity
                      onPress={() => {
                        if (post.authorId === userId) {
                          handlePostOptions(post);
                        } else {
                          Alert.alert("Post Options", undefined, [
                            { text: "Report", style: "destructive", onPress: () => handleReportPost(post.id) },
                            { text: "Cancel", style: "cancel" },
                          ]);
                        }
                      }}
                      className="w-8 h-8 items-center justify-center ml-1"
                    >
                      <Feather name="more-horizontal" size={20} color={themeColors.subText} />
                    </TouchableOpacity>
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
                  <PostActionBar
                    isLiked={isLiked}
                    likeCount={post._count?.reactions || 0}
                    commentCount={post._count?.comments || 0}
                    isReposted={repostedIds.has(post.id)}
                    isCommentActive={activeCommentPostId === post.id}
                    onLike={() => toggleLike(post.id)}
                    onToggleComments={() => toggleComments(post.id)}
                    onRepost={() => handleRepost(post.id)}
                    themeColors={themeColors}
                  />

                  {/* Caption */}
                  {post.content && (
                    <ExpandableText
                      content={post.content}
                      authorName={post.author?.fullName}
                      isExpanded={!!expandedPosts[post.id]}
                      onToggle={() => setExpandedPosts(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                      themeColors={themeColors}
                    />
                  )}

                  {/* Inline Comments */}
                  {activeCommentPostId === post.id && (
                    <InlineComments
                      post={post}
                      themeColors={themeColors}
                      replyTo={replyTo}
                      setReplyTo={setReplyTo}
                      commentText={commentText}
                      setCommentText={setCommentText}
                      sendComment={sendComment}
                      onCommentLongPress={handleCommentLongPress}
                    />
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
