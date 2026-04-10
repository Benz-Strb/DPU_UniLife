import React, { useState, useEffect, useRef } from "react";
import { View, Text, ScrollView, Image, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, StatusBar, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useUser } from "@/store/UserContext";
import { BASE_URL } from "@/services/api";
import * as Haptics from 'expo-haptics';

export default function PostDetailScreen() {
  const router = useRouter();
  const { id, focusComments } = useLocalSearchParams<{ id: string; focusComments?: string }>();
  const { posts, userId, toggleLike, addComment, themeColors } = useUser();
  const [commentText, setCommentText] = useState("");
  const [showFullImage, setShowFullImage] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const shouldFocusComments = focusComments === "1";

  const post = posts.find(p => p.id === id);
  const commentCount = post?.comments?.length ?? 0;

  useEffect(() => {
    if (!shouldFocusComments || !post) return;

    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 250);

    return () => clearTimeout(timer);
  }, [commentCount, post, shouldFocusComments]);

  if (!post) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: themeColors.background }}>
        <Text style={{ color: themeColors.text }}>Post not found</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4 bg-violet-500 px-6 py-2 rounded-full">
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isLiked = post.reactions?.some(r => r.userId === userId);

  const getFullImageUrl = (url: string | null | undefined) => {
    if (!url) return undefined;
    if (url.startsWith('http')) return url;
    return `${BASE_URL}${url}`;
  };

  const handleSendComment = () => {
    if (!commentText.trim()) return;
    addComment(post.id, commentText);
    setCommentText("");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: themeColors.background }}>
      <StatusBar barStyle={themeColors.text === "#FFFFFF" ? "light-content" : "dark-content"} />
      <SafeAreaView edges={['top']} className="flex-1">
        
        {/* Custom Header */}
        <View className="flex-row items-center justify-between px-6 py-4 border-b" style={{ borderBottomColor: themeColors.border }}>
          <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center rounded-full bg-gray-100">
            <Ionicons name="chevron-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text className="text-lg font-black" style={{ color: themeColors.text }}>Post View</Text>
          <View className="w-10" />
        </View>

        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="flex-1"
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        >
          <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} className="flex-1">
            
            {/* Author Info */}
            <View className="flex-row items-center p-6">
              <Image 
                source={{ uri: getFullImageUrl(post.author?.avatarUrl) || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author?.fullName || 'U')}` }} 
                className="w-12 h-12 rounded-full mr-4" 
              />
              <View className="flex-1">
                <Text className="font-black text-base" style={{ color: themeColors.text }}>{post.author?.fullName}</Text>
                <Text className="text-xs text-gray-400">@{post.author?.username} • {new Date(post.createdAt).toLocaleDateString()}</Text>
              </View>
            </View>

            {/* Post Media */}
            {post.media && post.media.length > 0 && (
              <View className="px-4">
                <TouchableOpacity activeOpacity={0.9} onPress={() => setShowFullImage(true)}>
                  <Image
                    source={{ uri: getFullImageUrl(post.media[0].url) }}
                    className="w-full h-96 rounded-[40px] bg-gray-50"
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              </View>
            )}

            {/* Content */}
            <View className="p-8">
              <Text className="text-base leading-7 font-medium" style={{ color: themeColors.text }}>{post.content}</Text>
              
              <View className="flex-row items-center mt-8 pt-6 border-t" style={{ borderTopColor: themeColors.border }}>
                <TouchableOpacity onPress={() => { toggleLike(post.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }} className="flex-row items-center mr-8">
                  <Ionicons name={isLiked ? "heart" : "heart-outline"} size={28} color={isLiked ? "#EF4444" : themeColors.text} />
                  <Text className="ml-2 font-black text-lg" style={{ color: themeColors.text }}>{post._count?.reactions || 0}</Text>
                </TouchableOpacity>
                <View className="flex-row items-center">
                  <Feather name="message-circle" size={26} color={themeColors.text} />
                  <Text className="ml-2 font-black text-lg" style={{ color: themeColors.text }}>{post._count?.comments || 0}</Text>
                </View>
              </View>
            </View>

            {/* Comments List */}
            <View className="px-8 pb-10">
              <Text className="font-black text-lg mb-6" style={{ color: themeColors.text }}>Comments</Text>
              {post.comments && post.comments.length > 0 ? (
                post.comments.map((comment) => (
                  <View key={comment.id} className="flex-row mb-6">
                    <Image 
                      source={{ uri: getFullImageUrl(comment.author?.avatarUrl) || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.author?.fullName || 'U')}` }} 
                      className="w-10 h-10 rounded-full mr-4" 
                    />
                    <View className="flex-1 bg-gray-50 p-4 rounded-2xl">
                      <Text className="font-bold text-xs mb-1" style={{ color: "#111827" }}>{comment.author?.fullName}</Text>
                      <Text className="text-sm leading-5 text-gray-600">{comment.content}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <View className="py-10 items-center border-2 border-dashed border-gray-100 rounded-3xl">
                  <Ionicons name="chatbubble-outline" size={32} color="#CBD5E1" />
                  <Text className="text-gray-400 mt-4 font-bold">No comments yet</Text>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Comment Input */}
          <View className="p-6 border-t flex-row items-center" style={{ borderTopColor: themeColors.border, backgroundColor: themeColors.card }}>
            <TextInput 
              className="flex-1 h-12 px-6 rounded-full bg-gray-100 mr-4 font-bold"
              placeholder="Add a comment..."
              value={commentText}
              onChangeText={setCommentText}
              placeholderTextColor="#9CA3AF"
              autoFocus={shouldFocusComments}
            />
            <TouchableOpacity 
              onPress={handleSendComment}
              className="w-12 h-12 bg-violet-500 rounded-full items-center justify-center shadow-lg"
            >
              <Ionicons name="send" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <Modal visible={showFullImage} transparent animationType="fade" onRequestClose={() => setShowFullImage(false)}>
        <View className="flex-1 bg-black/95 items-center justify-center">
          <TouchableOpacity className="absolute inset-0" activeOpacity={1} onPress={() => setShowFullImage(false)} />
          {post.media && post.media.length > 0 && (
            <Image
              source={{ uri: getFullImageUrl(post.media[0].url) }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="contain"
            />
          )}
          <TouchableOpacity className="absolute top-12 right-6 bg-black/60 p-3 rounded-full" onPress={() => setShowFullImage(false)}>
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}
