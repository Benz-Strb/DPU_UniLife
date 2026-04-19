import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, Image, StatusBar, RefreshControl, ActivityIndicator, Alert } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import { theme } from "@/constants/theme";
import { useUser } from "@/store/UserContext";
import { tagService, postService, reportService } from "@/services/api";
import { getAvatarUrl } from "@/utils/imageUtils";
import ImageCarousel from "@/components/ImageCarousel";
import InlineComments from "@/components/InlineComments";
import ExpandableText from "@/components/ExpandableText";
import PostActionBar from "@/components/PostActionBar";
import EmptyState from "@/components/EmptyState";

export default function TagScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tagName: string }>();
  const tagName = params.tagName || "DPU";
  const { userId, toggleLike, themeColors, followingIds, toggleFollow, isAdmin, isUniAdmin } = useUser();

  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [repostedIds, setRepostedIds] = useState<Set<string>>(new Set());
  const [expandedPosts, setExpandedPosts] = useState<Record<string, boolean>>({});
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [replyTo, setReplyTo] = useState<{ postId: string; commentId: string; authorName: string } | null>(null);

  const fetchPosts = useCallback(async () => {
    try {
      const data = await tagService.getTagPosts(tagName);
      setPosts(Array.isArray(data) ? data : (data.posts ?? []));
    } catch (e) {
      console.error("Failed to fetch tag posts", e);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [tagName]);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const onRefresh = () => { setIsRefreshing(true); fetchPosts(); };

  useEffect(() => {
    if (!userId) return;
    postService.getRepostedIds(userId).then(ids => setRepostedIds(new Set(ids)));
  }, [userId]);

  const handleLike = async (postId: string) => {
    await toggleLike(postId);
    fetchPosts();
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

  const handleReport = (postId: string) => {
    Alert.alert("Report Post", "Why are you reporting this post?", [
      { text: "Spam", onPress: () => submitReport(postId, "Spam") },
      { text: "Inappropriate content", onPress: () => submitReport(postId, "Inappropriate content") },
      { text: "Harassment", onPress: () => submitReport(postId, "Harassment") },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const toggleComments = (postId: string) => {
    setActiveCommentPostId(prev => prev === postId ? null : postId);
  };

  const sendComment = async (postId: string) => {
    const text = commentText[postId]?.trim();
    if (!text) return;
    const parentId = replyTo?.postId === postId ? replyTo.commentId : undefined;
    try {
      await postService.addComment(postId, userId, text, parentId);
      setCommentText(prev => ({ ...prev, [postId]: "" }));
      setReplyTo(null);
      fetchPosts();
    } catch {
      Alert.alert("Error", "Could not post comment.");
    }
  };

  const submitReport = async (postId: string, reason: string) => {
    try {
      await reportService.createReport({ reporterId: userId, targetType: "POST", targetPostId: postId, reason });
      Alert.alert("Reported", "Thank you. Our team will review this.");
    } catch {
      Alert.alert("Error", "Could not submit report.");
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: themeColors.background }}>
      <Stack.Screen options={{ gestureEnabled: true }} />
      <StatusBar barStyle={themeColors.statusBar as any} />

      <SafeAreaView className="flex-1" edges={['top']}>
        {/* Header */}
        <View
          className="flex-row items-center px-6 py-4 border-b"
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
            className="flex-1"
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
            }
          >
            {posts.length === 0 ? (
              <View className="mx-4 mt-6 rounded-[40px] border border-dashed" style={{ backgroundColor: themeColors.iconBg, borderColor: themeColors.border }}>
                <EmptyState icon="planet-outline" title={`No posts in #${tagName} Space`} themeColors={themeColors} />
              </View>
            ) : (
              posts.map((post) => {
                const isLiked = post.reactions?.some((r: any) => r.userId === userId);
                const isExpanded = expandedPosts[post.id];

                return (
                  <View
                    key={post.id}
                    className="mb-3 border-b"
                    style={{ backgroundColor: themeColors.card, borderColor: themeColors.border }}
                  >
                    {/* Author row */}
                    <View className="flex-row items-center justify-between px-4 pt-4 pb-3">
                      <TouchableOpacity
                        onPress={() => router.push({ pathname: "/user-profile", params: { userId: post.author?.id } })}
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

                      {post.author?.id !== userId && !isAdmin && !isUniAdmin && !followingIds.includes(post.author?.id) && (
                        <TouchableOpacity
                          onPress={() => toggleFollow(post.author?.id)}
                          className="px-3 py-1.5 rounded-xl bg-violet-500 mr-1"
                        >
                          <Text className="font-black text-[10px] uppercase text-white">Follow</Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        onPress={() => Alert.alert("Post Options", undefined, [
                          { text: "Report", style: "destructive", onPress: () => handleReport(post.id) },
                          { text: "Cancel", style: "cancel" },
                        ])}
                        className="w-8 h-8 items-center justify-center ml-1"
                      >
                        <Feather name="more-horizontal" size={20} color={themeColors.subText} />
                      </TouchableOpacity>
                    </View>

                    {/* Media */}
                    {post.media && post.media.length > 0 && (
                      <ImageCarousel
                        images={post.media.map((m: any) => ({ url: getAvatarUrl(m.url) }))}
                        aspectRatio={1}
                        onDoubleTap={() => handleLike(post.id)}
                      />
                    )}

                    {/* Actions row */}
                    <PostActionBar
                      isLiked={isLiked}
                      likeCount={post._count?.reactions || 0}
                      commentCount={post._count?.comments || 0}
                      isReposted={repostedIds.has(post.id)}
                      isCommentActive={activeCommentPostId === post.id}
                      onLike={() => handleLike(post.id)}
                      onToggleComments={() => toggleComments(post.id)}
                      onRepost={() => handleRepost(post.id)}
                      themeColors={themeColors}
                    />

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
                      />
                    )}

                    {/* Caption */}
                    {post.content && (
                      <ExpandableText
                        content={post.content}
                        authorName={post.author?.fullName}
                        isExpanded={!!isExpanded}
                        onToggle={() => setExpandedPosts(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                        themeColors={themeColors}
                      />
                    )}
                  </View>
                );
              })
            )}
            <View className="h-24" />
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}
