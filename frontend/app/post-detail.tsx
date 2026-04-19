import React, { useEffect, useState, useRef } from "react";
import { View, Text, FlatList, TouchableOpacity, Image, StatusBar, ActivityIndicator, Dimensions, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import { theme } from "@/constants/theme";
import { useUser } from "@/store/UserContext";
import { usePosts } from "@/hooks/usePosts";
import { authService, postService } from "@/services/api";
import PostOptionsButton from "@/components/PostOptionsButton";
import { getAvatarUrl, getImageUrl } from "@/utils/imageUtils";
import ImageCarousel from "@/components/ImageCarousel";
import InlineComments from "@/components/InlineComments";

const { width } = Dimensions.get("window");

const dedupePostsById = (items: any[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (!item?.id || seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
};

function PostItem({
  post,
  themeColors,
  userId,
  toggleLike,
  isReposted,
  onRepost,
  onDeleted,
  replyTo,
  setReplyTo,
  commentText,
  setCommentText,
  sendComment,
  handleCommentLongPress
}: any) {
  const isLiked = post.reactions?.some((r: any) => r.userId === userId);
  const likeCount = post._count?.reactions ?? post.reactions?.length ?? 0;
  const commentCount = post._count?.comments ?? post.comments?.length ?? 0;
  const hasMedia = post.media && post.media.length > 0;

  return (
    <View style={{ borderBottomWidth: 1, borderBottomColor: themeColors.border }}>
      {/* Author */}
      <View className="flex-row items-center px-4 py-3">
        <Image source={{ uri: getAvatarUrl(post.author?.avatarUrl, post.author?.fullName) }} className="w-9 h-9 rounded-full" />
        <View className="ml-3 flex-1">
          <Text className="font-black text-sm" style={{ color: themeColors.text }}>{post.author?.fullName}</Text>
          <Text className="text-[10px]" style={{ color: themeColors.subText }}>{new Date(post.createdAt).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })}</Text>
        </View>
        <PostOptionsButton post={post} onDeleted={onDeleted} />
      </View>

      {/* Media */}
      {hasMedia && (
        post.media.length === 1 ? (
          <Image source={{ uri: getImageUrl(post.media[0].url) }} style={{ width, height: width }} resizeMode="cover" />
        ) : (
          <ImageCarousel
            images={post.media.map((m: any) => ({ url: getImageUrl(m.url) }))}
            onDoubleTap={() => toggleLike(post.id)}
          />
        )
      )}

      {/* Content */}
      {post.content ? (
        <View className="px-4 py-3">
          <Text className="text-sm leading-6" style={{ color: themeColors.text }}>{post.content}</Text>
        </View>
      ) : <View className="py-2" />}

      {/* Actions */}
      <View className="flex-row items-center px-4 pb-4 gap-5">
        <TouchableOpacity onPress={() => toggleLike(post.id)} className="flex-row items-center gap-1.5">
          <Ionicons name={isLiked ? "heart" : "heart-outline"} size={22} color={isLiked ? "#EC4899" : themeColors.subText} />
          <Text className="font-bold text-sm" style={{ color: themeColors.subText }}>{likeCount}</Text>
        </TouchableOpacity>
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="chatbubble-outline" size={20} color={themeColors.subText} />
          <Text className="font-bold text-sm" style={{ color: themeColors.subText }}>{commentCount}</Text>
        </View>
        <TouchableOpacity onPress={() => onRepost(post.id)} className="flex-row items-center gap-1.5">
          <Ionicons name="repeat" size={22} color={isReposted ? theme.colors.repost ?? "#10B981" : themeColors.subText} />
        </TouchableOpacity>
      </View>

      {/* Inline Comments */}
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
    </View>
  );
}

export default function PostDetailScreen() {
  const router = useRouter();
  const { postId, userId: profileUserId, single, mode } = useLocalSearchParams<{ postId: string; userId: string; single?: string; mode?: string }>();
  const isSingle = single === "true";
  const { themeColors, userId, posts: globalPosts, toggleLike: globalToggleLike } = useUser();
  const {
    replyTo,
    setReplyTo,
    commentText,
    setCommentText,
    sendComment,
    handleCommentLongPress,
  } = usePosts();
  
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [repostedIds, setRepostedIds] = useState<Set<string>>(new Set());
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (userId) {
      postService.getRepostedIds(userId).then(ids => setRepostedIds(new Set(ids)));
    }
  }, [userId]);

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
      // silent fail
    }
  };

  const handleToggleLike = async (postId: string) => {
    const previousPosts = posts;

    // 1. Immediate UI feedback for local state
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const reactions = p.reactions || [];
        const isLiked = reactions.some((r: any) => r.userId === userId);
        let newReactions;
        if (isLiked) {
          newReactions = reactions.filter((r: any) => r.userId !== userId);
        } else {
          newReactions = [...reactions, { userId, reaction: "LIKE" }];
        }
        return {
          ...p,
          reactions: newReactions,
          _count: { 
            ...p._count, 
            reactions: newReactions.length 
          }
        };
      }
      return p;
    }));

    // 2. Perform global sync
    try {
      await globalToggleLike(postId);
    } catch {
      setPosts(previousPosts);
    }
  };

  const handleDeleted = (postId: string) => {
    const remaining = posts.filter(p => p.id !== postId);
    if (remaining.length === 0) router.back();
    else setPosts(remaining);
  };

  useEffect(() => {
    if (isSingle || (postId && !profileUserId)) {
      if (!postId) return;
      postService.getPost(postId)
        .then(post => { if (post) setPosts([post]); })
        .finally(() => setLoading(false));
    } else {
      if (!profileUserId) {
        setLoading(false);
        return;
      }
      authService.getProfile(profileUserId)
        .then(data => {
          const author = { id: data.id, fullName: data.fullName, avatarUrl: data.avatarUrl, username: data.username };
          if (mode === "reposts") {
            const sorted = dedupePostsById(
              [...(data.postShares ?? [])]
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((s: any) => s.post)
              .filter(Boolean)
            );
            setPosts(sorted);
          } else {
            const userPosts: any[] = data.authoredPosts ?? [];
            const sorted = [...userPosts]
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map(p => ({ ...p, author: p.author ?? author }));
            setPosts(sorted);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [postId, profileUserId, isSingle]);

  useEffect(() => {
    if (posts.length === 0 || !postId) return;
    const index = posts.findIndex(p => p.id === postId);
    if (index > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index, animated: false });
      }, 100);
    }
  }, [posts, postId]);

  useEffect(() => {
    if (globalPosts.length === 0) return;

    setPosts(prev => prev.map(post => {
      const updatedPost = globalPosts.find(globalPost => globalPost.id === post.id);
      return updatedPost ?? post;
    }));
  }, [globalPosts]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: themeColors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: themeColors.background }}>
      <Stack.Screen options={{ gestureEnabled: true, fullScreenGestureEnabled: false, gestureResponseDistance: { start: 100 } }} />
      <StatusBar barStyle={themeColors.statusBar as any} />
      <SafeAreaView edges={["top"]} className="flex-1">
        {/* Header */}
        <View className="flex-row items-center px-6 py-4 border-b" style={{ borderBottomColor: themeColors.border }}>
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center rounded-2xl"
            style={{ backgroundColor: themeColors.card }}
          >
            <Ionicons name="chevron-back" size={24} color={themeColors.text} />
          </TouchableOpacity>
          <Text className="ml-4 font-black text-lg" style={{ color: themeColors.text }}>Posts</Text>
        </View>

        <FlatList
          ref={flatListRef}
          data={posts}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <PostItem
              post={item}
              themeColors={themeColors}
              userId={userId}
              toggleLike={handleToggleLike}
              isReposted={repostedIds.has(item.id)}
              onRepost={handleRepost}
              onDeleted={handleDeleted}
              replyTo={replyTo}
              setReplyTo={setReplyTo}
              commentText={commentText}
              setCommentText={setCommentText}
              sendComment={sendComment}
              handleCommentLongPress={handleCommentLongPress}
            />
          )}
          onScrollToIndexFailed={info => {
            setTimeout(() => {
              flatListRef.current?.scrollToIndex({ index: info.index, animated: false });
            }, 300);
          }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <Ionicons name="images-outline" size={48} color={themeColors.subText} />
              <Text className="font-bold mt-4" style={{ color: themeColors.subText }}>No posts</Text>
            </View>
          }
        />
      </SafeAreaView>
    </View>
  );
}
