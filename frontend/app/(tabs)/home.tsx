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
import PostCard from "@/components/PostCard";
import EmptyState from "@/components/EmptyState";
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

  const [aiFeedLoading, setAiFeedLoading] = useState(false);
  const [aiFeedReady, setAiFeedReady] = useState(false);

  const fetchAIFeed = async () => {
    if (!userId) return;
    setAiFeedLoading(true);
    try {
      await refreshPosts(true);
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
      fetchAIFeed();
    };
    tabRefreshEmitter.on("home", handler);
    return () => tabRefreshEmitter.off("home", handler);
  }, []);

  const [repostedIds, setRepostedIds] = useState<Set<string>>(new Set());
  const [expandedPosts, setExpandedPosts] = useState<Record<string, boolean>>({});

  const handleRepost = async (postId: string) => {
    const isReposted = repostedIds.has(postId);
    try {
      if (isReposted) {
        await postService.unrepostPost(postId, userId);
        setRepostedIds((prev) => {
          const next = new Set(prev);
          next.delete(postId);
          return next;
        });
      } else {
        await postService.sharePost(postId, userId);
        setRepostedIds((prev) => new Set(prev).add(postId));
      }
    } catch {
      Alert.alert("Error", "Could not repost.");
    }
  };

  const posts = useMemo(() => allPosts.filter((p) => !p.isOfficial), [allPosts]);

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

  const goToPostDetail = (postId: string) => {
    router.push({ pathname: "/post-detail", params: { postId, single: "true" } });
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
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={fetchAIFeed} tintColor={theme.colors.primary} />}
        >
          {posts.length === 0 ? (
            <View className="mx-4 mt-6 rounded-[40px] border border-dashed border-gray-100" style={{ backgroundColor: themeColors.card }}>
              <EmptyState icon="planet-outline" title="Empty Galaxy" themeColors={themeColors} />
            </View>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                userId={userId}
                themeColors={themeColors}
                toggleLike={toggleLike}
                deletePost={deletePost}
                followingIds={followingIds}
                toggleFollow={toggleFollow}
                isAdmin={isAdmin}
                isUniAdmin={isUniAdmin}
                replyTo={replyTo}
                setReplyTo={setReplyTo}
                commentText={commentText}
                setCommentText={setCommentText}
                sendComment={sendComment}
                toggleComments={toggleComments}
                activeCommentPostId={activeCommentPostId}
                handleCommentLongPress={handleCommentLongPress}
                repostedIds={repostedIds}
                handleRepost={handleRepost}
              />
            ))
          )}
          <View className="h-24" />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
