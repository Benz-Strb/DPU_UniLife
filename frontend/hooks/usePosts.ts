import { useState, useMemo, useCallback } from 'react';
import { Alert } from 'react-native';
import { useUser } from '@/store/UserContext';
import * as Haptics from 'expo-haptics';
import { handleApiError } from '@/services/errorHandler';
import { postService, reportService } from '@/services/api';

// Hook รวม business logic ของโพสต์เพื่อให้หน้าต่างๆ เรียกใช้ action เดียวกันได้
export function usePosts() {
  const {
    posts,
    toggleLike: contextToggleLike,
    deletePost: contextDeletePost,
    updatePost: contextUpdatePost,
    userId,
    isAdmin,
    isUniAdmin,
    isRefreshing,
    refreshPosts
  } = useUser();

  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState<{ [key: string]: string }>({});
  const [replyTo, setReplyTo] = useState<{ postId: string; commentId: string; authorName: string } | null>(null);

  const allPosts = useMemo(() => posts, [posts]);

  const toggleLike = useCallback(async (postId: string, reaction = "LIKE") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await contextToggleLike(postId, reaction);
    } catch (error) {
      handleApiError(error);
    }
  }, [contextToggleLike]);

  const sendComment = useCallback(async (postId: string) => {
    const text = commentText[postId]?.trim();
    if (!text) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const parentId = replyTo?.postId === postId ? replyTo.commentId : undefined;
    try {
      await postService.addComment(postId, userId, text, parentId);
      await refreshPosts();
      setCommentText(prev => ({ ...prev, [postId]: "" }));
      setReplyTo(null);
    } catch (error) {
      handleApiError(error);
    }
  }, [commentText, replyTo, userId, refreshPosts]);

  const deletePost = useCallback(async (postId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    try {
      await contextDeletePost(postId);
    } catch (error) {
      handleApiError(error);
    }
  }, [contextDeletePost]);

  const updateCommentsStatus = useCallback(async (postId: string, enabled: boolean) => {
    try {
      await contextUpdatePost(postId, { commentsEnabled: enabled });
    } catch (error) {
      handleApiError(error);
    }
  }, [contextUpdatePost]);

  const togglePin = useCallback(async (postId: string, currentPinned: boolean) => {
    try {
      await contextUpdatePost(postId, { isPinned: !currentPinned });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      handleApiError(error);
    }
  }, [contextUpdatePost]);

  const toggleComments = useCallback((postId: string) => {
    setActiveCommentPostId(prev => prev === postId ? null : postId);
  }, []);

  const handleDeleteComment = useCallback((postId: string, commentId: string) => {
    Alert.alert("Delete Comment", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try {
            await postService.deleteComment(postId, commentId, userId);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await refreshPosts();
          } catch {
            Alert.alert("Error", "Could not delete comment.");
          }
        },
      },
    ]);
  }, [userId, refreshPosts]);

  const handleCommentLongPress = useCallback((postId: string, comment: any) => {
    const isCommentOwner = comment.authorId === userId;
    const canDelete = isCommentOwner || isAdmin || isUniAdmin;
    const options: any[] = [];
    if (canDelete) {
      options.push({
        text: "Delete Comment", style: "destructive",
        onPress: () => handleDeleteComment(postId, comment.id),
      });
    }
    if (!isCommentOwner) {
      options.push({
        text: "Report Comment",
        onPress: async () => {
          try {
            await reportService.createReport({ reporterId: userId, targetType: "COMMENT", targetCommentId: comment.id, reason: "Inappropriate content" });
            Alert.alert("Reported", "Thank you. Our team will review this.");
          } catch {
            Alert.alert("Error", "Could not submit report.");
          }
        },
      });
    }
    options.push({ text: "Cancel", style: "cancel" });
    if (options.length > 1) Alert.alert("Comment Options", undefined, options);
  }, [userId, isAdmin, isUniAdmin, handleDeleteComment]);

  return {
    posts: allPosts,
    isRefreshing,
    refreshPosts,
    activeCommentPostId,
    setActiveCommentPostId,
    commentText,
    setCommentText,
    replyTo,
    setReplyTo,
    toggleLike,
    sendComment,
    deletePost,
    updateCommentsStatus,
    togglePin,
    toggleComments,
    handleDeleteComment,
    handleCommentLongPress,
    userId
  };
}
