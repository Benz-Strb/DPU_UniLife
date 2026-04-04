import { useState, useMemo, useCallback } from 'react';
import { useUser } from '@/store/UserContext';
import * as Haptics from 'expo-haptics';
import { handleApiError } from '@/services/errorHandler';

export function usePosts() {
  const { 
    posts, 
    toggleLike: contextToggleLike, 
    addComment: contextAddComment, 
    deletePost: contextDeletePost,
    updatePost: contextUpdatePost,
    userId,
    isRefreshing,
    refreshPosts
  } = useUser();

  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState<{ [key: string]: string }>({});

  // กรองเฉพาะโพสต์ของนักศึกษา
  const studentPosts = useMemo(() => {
    return posts.filter(p => p.author?.role === "STUDENT");
  }, [posts]);

  const toggleLike = useCallback(async (postId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await contextToggleLike(postId);
    } catch (error) {
      handleApiError(error);
    }
  }, [contextToggleLike]);

  const sendComment = useCallback(async (postId: string) => {
    const text = commentText[postId]?.trim();
    if (!text) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await contextAddComment(postId, text);
      setCommentText(prev => ({ ...prev, [postId]: "" }));
      setActiveCommentPostId(null);
    } catch (error) {
      handleApiError(error);
    }
  }, [commentText, contextAddComment]);

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

  return {
    posts: studentPosts,
    isRefreshing,
    refreshPosts,
    activeCommentPostId,
    setActiveCommentPostId,
    commentText,
    setCommentText,
    toggleLike,
    sendComment,
    deletePost,
    updateCommentsStatus,
    userId
  };
}
