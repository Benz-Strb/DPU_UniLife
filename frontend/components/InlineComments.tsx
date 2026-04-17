import React from "react";
import { View, Text, TouchableOpacity, Image, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/constants/theme";
import { getAvatarUrl } from "@/utils/imageUtils";

interface ReplyTo {
  postId: string;
  commentId: string;
  authorName: string;
}

interface InlineCommentsProps {
  post: any;
  themeColors: any;
  replyTo: ReplyTo | null;
  setReplyTo: (r: ReplyTo | null) => void;
  commentText: Record<string, string>;
  setCommentText: (fn: (prev: Record<string, string>) => Record<string, string>) => void;
  sendComment: (postId: string) => void;
  onCommentLongPress?: (postId: string, comment: any) => void;
}

export default function InlineComments({
  post, themeColors, replyTo, setReplyTo, commentText, setCommentText, sendComment, onCommentLongPress,
}: InlineCommentsProps) {
  return (
    <View className="px-4 pb-4">
      {post.comments && post.comments.length > 0 && (
        <View className="mb-3 gap-3">
          {post.comments.filter((c: any) => !c.parentId).map((comment: any) => {
            const replies = post.comments.filter((r: any) => r.parentId === comment.id);
            return (
              <View key={comment.id}>
                <TouchableOpacity
                  className="flex-row items-start"
                  onLongPress={onCommentLongPress ? () => onCommentLongPress(post.id, comment) : undefined}
                  delayLongPress={400}
                  activeOpacity={0.85}
                >
                  <Image
                    source={{ uri: getAvatarUrl(comment.author?.avatarUrl, comment.author?.fullName) }}
                    className="w-7 h-7 rounded-full mr-2 mt-0.5"
                  />
                  <View className="flex-1">
                    <View className="rounded-2xl px-3 py-2" style={{ backgroundColor: themeColors.iconBg }}>
                      <Text className="font-black text-[11px] mb-0.5" style={{ color: themeColors.text }}>{comment.author?.fullName}</Text>
                      <Text className="text-[12px] leading-5" style={{ color: themeColors.text }}>{comment.content}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setReplyTo({ postId: post.id, commentId: comment.id, authorName: comment.author?.fullName ?? "User" })}
                      className="ml-2 mt-1"
                    >
                      <Text className="text-[10px] font-bold" style={{ color: themeColors.subText }}>Reply</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>

                {replies.map((reply: any) => (
                  <TouchableOpacity
                    key={reply.id}
                    className="flex-row items-start ml-9 mt-2"
                    onLongPress={onCommentLongPress ? () => onCommentLongPress(post.id, reply) : undefined}
                    delayLongPress={400}
                    activeOpacity={0.85}
                  >
                    <Image
                      source={{ uri: getAvatarUrl(reply.author?.avatarUrl, reply.author?.fullName) }}
                      className="w-6 h-6 rounded-full mr-2 mt-0.5"
                    />
                    <View className="flex-1 rounded-2xl px-3 py-2" style={{ backgroundColor: themeColors.iconBg }}>
                      <Text className="font-black text-[10px] mb-0.5" style={{ color: themeColors.text }}>{reply.author?.fullName}</Text>
                      <Text className="text-[12px] leading-5" style={{ color: themeColors.text }}>{reply.content}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            );
          })}
        </View>
      )}

      {post.commentsEnabled !== false && (
        <View>
          {replyTo?.postId === post.id && (
            <View className="flex-row items-center mb-2 px-1">
              <Text className="text-[11px] font-bold" style={{ color: theme.colors.primary }}>
                Replying to @{replyTo?.authorName}
              </Text>
              <TouchableOpacity onPress={() => setReplyTo(null)} className="ml-2">
                <Ionicons name="close-circle" size={14} color={themeColors.subText} />
              </TouchableOpacity>
            </View>
          )}
          <View className="flex-row items-center gap-2">
            <Image source={{ uri: getAvatarUrl(undefined) }} className="w-7 h-7 rounded-full" />
            <View
              className="flex-1 flex-row items-center rounded-full border px-3 py-1.5"
              style={{ borderColor: themeColors.border, backgroundColor: themeColors.iconBg }}
            >
              <TextInput
                value={commentText[post.id] ?? ""}
                onChangeText={(t) => setCommentText(prev => ({ ...prev, [post.id]: t }))}
                placeholder={replyTo?.postId === post.id ? `Reply to @${replyTo?.authorName}...` : "Add a comment..."}
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
        </View>
      )}
    </View>
  );
}
