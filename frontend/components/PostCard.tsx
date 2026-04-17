import React, { useState } from "react";
import { View, Text, TouchableOpacity, Image, Alert, Dimensions } from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import ImageCarousel from "./ImageCarousel";
import PostActionBar from "./PostActionBar";
import PostOptionsButton from "./PostOptionsButton";
import ExpandableText from "./ExpandableText";
import InlineComments from "./InlineComments";
import { getAvatarUrl, getImageUrl } from "@/utils/imageUtils";
import { postService, reportService } from "@/services/api";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface PostCardProps {
  post: any;
  userId: string;
  themeColors: any;
  toggleLike: (postId: string, reaction?: string) => void;
  deletePost: (postId: string) => Promise<void>;
  followingIds: string[];
  toggleFollow: (targetId: string) => Promise<void>;
  isAdmin?: boolean;
  isUniAdmin?: boolean;
  showComments?: boolean;
  // Comment props (needed if showComments is true)
  replyTo?: any;
  setReplyTo?: (r: any) => void;
  commentText?: Record<string, string>;
  setCommentText?: (fn: (prev: Record<string, string>) => Record<string, string>) => void;
  sendComment?: (postId: string) => void;
  toggleComments?: (postId: string) => void;
  activeCommentPostId?: string;
  handleCommentLongPress?: (postId: string, comment: any) => void;
  // Repost logic
  repostedIds?: Set<string>;
  handleRepost?: (postId: string) => void;
}

export default function PostCard({
  post,
  userId,
  themeColors,
  toggleLike,
  deletePost,
  followingIds,
  toggleFollow,
  isAdmin,
  isUniAdmin,
  showComments = false,
  replyTo,
  setReplyTo,
  commentText,
  setCommentText,
  sendComment,
  toggleComments,
  activeCommentPostId,
  handleCommentLongPress,
  repostedIds = new Set(),
  handleRepost,
  showDate = false,
}: PostCardProps & { showDate?: boolean }) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);

  const isLiked = post.reactions?.some((r: any) => r.userId === userId);
  const isReposted = repostedIds.has(post.id);

  const goToPostDetail = () => {
    router.push({ pathname: "/post-detail", params: { postId: post.id, single: "true" } });
  };

  const handleReportPost = () => {
    Alert.alert("Report Post", "Why are you reporting this post?", [
      { text: "Spam", onPress: () => submitReport("Spam") },
      { text: "Inappropriate content", onPress: () => submitReport("Inappropriate content") },
      { text: "Harassment", onPress: () => submitReport("Harassment") },
      { text: "False information", onPress: () => submitReport("False information") },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const submitReport = async (reason: string) => {
    try {
      await reportService.createReport({ 
        reporterId: userId, 
        targetType: "POST", 
        targetPostId: post.id, 
        reason 
      });
      Alert.alert("Reported", "Thank you. Our team will review this.");
    } catch {
      Alert.alert("Error", "Could not submit report.");
    }
  };

  return (
    <View
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
            <View className="flex-row items-center gap-1.5 flex-wrap">
              <Text className="font-black text-[13px]" style={{ color: themeColors.text }}>
                {post.author?.fullName || "User"}
              </Text>
              
              {/* Role badge */}
              {post.author?.role && post.author.role !== "STUDENT" && (
                <View className="bg-amber-100 px-1.5 py-0.5 rounded-md border border-amber-200">
                  <Text className="text-amber-700 text-[8px] font-black uppercase">{post.author.role}</Text>
                </View>
              )}

              {/* Pinned badge */}
              {post.isPinned && (
                <View className="bg-violet-100 px-1.5 py-0.5 rounded-md border border-violet-200">
                  <Text className="text-violet-600 text-[8px] font-black uppercase">Pinned</Text>
                </View>
              )}
            </View>

            {showDate ? (
              <Text className="text-[10px] font-medium" style={{ color: themeColors.subText }}>
                {new Date(post.createdAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
              </Text>
            ) : post.author?.faculty ? (
              <Text className="text-[10px] font-bold text-violet-500">{post.author.faculty}</Text>
            ) : null}
          </View>
        </TouchableOpacity>

        {/* Follow button */}
        {post.authorId !== userId && !isAdmin && !isUniAdmin && !followingIds.includes(post.authorId) && (
          <TouchableOpacity
            onPress={() => toggleFollow(post.authorId)}
            className="px-3 py-1.5 rounded-xl bg-violet-500 mr-1"
          >
            <Text className="font-black text-[10px] uppercase text-white">Follow</Text>
          </TouchableOpacity>
        )}

        {/* Options button (Handles both Author and Admins now) */}
        <PostOptionsButton
          post={post}
          onDeleted={(id) => deletePost(id)}
          extraOptions={post.authorId !== userId ? [
            { text: "Report", style: "destructive", onPress: handleReportPost }
          ] : []}
        />
      </View>

      {/* Media Carousel */}
      {post.media && post.media.length > 0 && (
        <ImageCarousel
          images={post.media.map((m: any) => ({ url: getImageUrl(m.url) }))}
          aspectRatio={1}
          onDoubleTap={() => {
            toggleLike(post.id);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }}
          onSingleTap={goToPostDetail}
        />
      )}

      {/* Actions row */}
      <PostActionBar
        isLiked={isLiked}
        likeCount={post._count?.reactions || 0}
        commentCount={post._count?.comments || 0}
        isReposted={isReposted}
        isCommentActive={activeCommentPostId === post.id}
        onLike={() => toggleLike(post.id)}
        onToggleComments={() => toggleComments ? toggleComments(post.id) : goToPostDetail()}
        onRepost={() => handleRepost ? handleRepost(post.id) : null}
        themeColors={themeColors}
      />

      {/* Caption */}
      {post.content && (
        <TouchableOpacity 
          activeOpacity={0.9} 
          onPress={goToPostDetail}
        >
          <ExpandableText
            content={post.content}
            authorName={post.author?.fullName}
            isExpanded={isExpanded}
            onToggle={() => setIsExpanded(!isExpanded)}
            themeColors={themeColors}
          />
        </TouchableOpacity>
      )}

      {/* Inline Comments (only if explicitly enabled, e.g., in PostDetail or if toggled on Home) */}
      {(showComments || activeCommentPostId === post.id) && 
       setReplyTo && commentText && setCommentText && sendComment && (
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
}
