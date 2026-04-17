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
import PostOptionsButton from "@/components/PostOptionsButton";
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

  const [aiFeedPosts, setAiFeedPosts] = useState<any[]>([]);
  const [aiFeedLoading, setAiFeedLoading] = useState(true);
  const [aiFeedReady, setAiFeedReady] = useState(false);

  const fetchAIFeed = async () => {
    if (!userId) return;
    setAiFeedLoading(true);
    try {
      const data = await postService.getAIFeed(userId);
      setAiFeedPosts(data.filter((p: any) => !p.isOfficial));
      setAiFeedReady(true);
    } catch {
      setAiFeedReady(false);
    } finally {
      setAiFeedLoading(false);
    }
  };

  useEffect(() => {
    fetchAIFeed();
  }, [userId]);

  useEffect(() => {
    const handler = () => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      refreshRef.current();
      fetchAIFeed();
    };
    tabRefreshEmitter.on("home", handler);
    return () => tabRefreshEmitter.off("home", handler);
  }, []);

  const [repostedIds, setRepostedIds] = useState<Set<string>>(new Set());
  const [expandedPosts, setExpandedPosts] = useState<Record<string, boolean>>({});

  const regularPosts = useMemo(() => allPosts.filter((p) => !p.isOfficial), [allPosts]);
  const posts = aiFeedReady ? aiFeedPosts : regularPosts;

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
            {aiFeedLoading ? (
              <Text className="text-[8px] font-bold text-indigo-400 mt-0.5">✦ AI กำลังจัดเรียง...</Text>
            ) : aiFeedReady ? (
              <Text className="text-[8px] font-bold text-indigo-400 mt-0.5">✦ AI จัดเรียงให้แล้ว</Text>
            ) : null}
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
                    {post.authorId === userId ? (
                      <PostOptionsButton
                        post={post}
                        onDeleted={(postId) => setAiFeedPosts(prev => prev.filter(p => p.id !== postId))}
                      />
                    ) : (
                      <TouchableOpacity
                        onPress={() => Alert.alert("Post Options", undefined, [
                          { text: "Report", style: "destructive", onPress: () => handleReportPost(post.id) },
                          { text: "Cancel", style: "cancel" },
                        ])}
                        className="w-8 h-8 items-center justify-center ml-1"
                      >
                        <Feather name="more-horizontal" size={20} color={themeColors.subText} />
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
