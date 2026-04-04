import React, { useState } from "react";
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  TextInput, 
  StatusBar, 
  Dimensions,
  RefreshControl,
  Alert
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { theme } from "@/constants/theme";
import { useUser } from "@/store/UserContext";
import { BASE_URL } from "@/services/api";

const { width } = Dimensions.get("window");

const DEFAULT_AVATAR = `https://ui-avatars.com/api/?name=${encodeURIComponent('User')}&background=7C3AED&color=fff`;
const getFullImageUrl = (url: string | null | undefined) => {
  if (!url) return DEFAULT_AVATAR;
  if (url.startsWith('http')) return url;
  return `${BASE_URL}${url}`;
};

export default function HomeScreen() {
  const router = useRouter();
  const { 
    isDarkMode, 
    posts, 
    toggleLike, 
    addComment, 
    userId, 
    name, 
    themeColors, 
    refreshPosts, 
    isRefreshing,
    followingIds,
    toggleFollow,
    getDirectChat,
    unreadChatCount,
    unreadNotificationCount
  } = useUser();
  const { deletePost, updatePost } = useUser();
  const [commentText, setCommentText] = useState<{ [key: string]: string }>({});
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);

  const handlePostOptions = (post: any) => {
    const isOwner = post.authorId === userId;
    
    if (!isOwner) return;

    Alert.alert(
      "Post Options",
      "Choose an action for your post",
      [
        {
          text: post.commentsEnabled ? "Disable Comments" : "Enable Comments",
          onPress: () => updatePost(post.id, { commentsEnabled: !post.commentsEnabled })
        },
        {
          text: "Delete Post",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Delete Post",
              "Are you sure you want to delete this post permanently?",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => deletePost(post.id) }
              ]
            );
          }
        },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  const handleSendComment = (postId: string) => {
    if (commentText[postId]?.trim()) {
      addComment(postId, commentText[postId]);
      setCommentText({ ...commentText, [postId]: "" });
      setActiveCommentPostId(null); // ซ่อนช่องคอมเมนต์ทันทีที่ส่ง
    }
  };

  const handleChatPress = async (targetId: string, targetName: string, targetAvatar: string | null) => {
    const convo = await getDirectChat(targetId);
    if (convo) {
      router.push({
        pathname: "/chat-detail",
        params: { 
          id: convo.id, 
          userName: targetName, 
          userAvatar: getFullImageUrl(targetAvatar),
          userId: targetId
        }
      });
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: themeColors.background }}>
      <StatusBar barStyle={themeColors.statusBar as any} />
      
      <SafeAreaView className="flex-1" edges={['top']}>
        {/* Modern Header */}
        <View 
          className="flex-row justify-between items-center px-6 py-4 border-b" 
          style={{ borderBottomColor: themeColors.border, backgroundColor: themeColors.card }}
        >
          <View>
            <Text className="text-3xl font-black italic tracking-tighter" style={{ color: theme.colors.primary }}>
              DPU
            </Text>
            <Text className="text-[8px] font-black uppercase tracking-[3.5px] -mt-1 opacity-40" style={{ color: themeColors.text }}>UNILIFE</Text>
          </View>
          <View className="flex-row items-center">
            <TouchableOpacity 
              onPress={() => router.push("/new-post")} 
              className="w-10 h-10 items-center justify-center rounded-2xl mr-3 shadow-sm"
              style={{ backgroundColor: theme.colors.primaryLight }}
            >
              <Feather name="plus" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => router.push("/notifications")} 
              className="w-10 h-10 items-center justify-center rounded-2xl mr-3"
              style={{ backgroundColor: themeColors.iconBg }}
            >
              <View className="relative">
                <Feather name="heart" size={22} color={themeColors.text} />
                {unreadNotificationCount > 0 && (
                  <View className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
                )}
              </View>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => router.push("/messenger")}
              className="w-10 h-10 items-center justify-center rounded-2xl"
              style={{ backgroundColor: themeColors.iconBg }}
            >
              <View className="relative">
                <Feather name="message-circle" size={22} color={themeColors.text} />
                {unreadChatCount > 0 && (
                  <View 
                    className="absolute -top-2 -right-2 bg-red-500 rounded-full min-w-[18px] h-[18px] items-center justify-center px-1 border-2 border-white shadow-sm"
                  >
                    <Text className="text-[8px] text-white font-black">{unreadChatCount}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView 
          showsVerticalScrollIndicator={false}
          className="px-4 pt-6"
          refreshControl={
            <RefreshControl 
              refreshing={isRefreshing} 
              onRefresh={refreshPosts} 
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
        >
          {posts.filter(p => p.author?.role === "STUDENT").length === 0 ? (
            <View className="items-center justify-center py-32 bg-white rounded-[50px] border border-dashed border-gray-100 shadow-sm mx-2">
              <View className="w-24 h-24 rounded-[40px] bg-violet-50 items-center justify-center mb-6">
                <Ionicons name="planet-outline" size={50} color={theme.colors.primary} />
              </View>
              <Text className="text-xl font-black" style={{ color: themeColors.text }}>Empty Galaxy</Text>
              <Text className="text-center mt-2 font-medium px-10 leading-5" style={{ color: themeColors.subText }}>
                Start exploring faculties or post something to see life on campus!
              </Text>
            </View>
          ) : (
            posts.filter(p => p.author?.role === "STUDENT").map((post) => (
              <View 
                key={post.id} 
                className="mb-10 rounded-[45px] overflow-hidden border shadow-xl mx-1"
                style={{ 
                  backgroundColor: themeColors.card, 
                  borderColor: themeColors.border,
                  elevation: 8,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 15 },
                  shadowOpacity: 0.06,
                  shadowRadius: 25
                }}
              >
                {/* Post Header */}
                <View className="flex-row items-center justify-between px-6 py-5">
                  <View className="flex-row items-center flex-1">
                    <TouchableOpacity 
                      onPress={() => router.push({ pathname: "/user-profile", params: { userId: post.authorId } })}
                      className="relative"
                    >
                      <Image 
                        source={{ uri: getFullImageUrl(post.author?.avatarUrl) }} 
                        className="w-11 h-11 rounded-[20px] mr-3 border-2 border-white shadow-sm" 
                      />
                      <View className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white" />
                    </TouchableOpacity>
                    <View className="flex-1">
                      <Text className="font-black text-sm tracking-tight" style={{ color: themeColors.text }}>{post.author?.fullName || "User"}</Text>
                      <View className="flex-row items-center mt-0.5">
                        {post.author?.faculty && (
                          <Text className="text-[9px] font-black text-violet-500 uppercase mr-2">{post.author.faculty}</Text>
                        )}
                        <Text className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">{new Date(post.createdAt).toLocaleDateString()}</Text>
                      </View>
                    </View>
                  </View>
                  
                  {/* ย้ายป้าย Follow มาไว้มุมขวาบน */}
                  {post.authorId !== userId ? (
                    <View className="flex-row items-center">
                      {followingIds.includes(post.authorId) ? (
                        <TouchableOpacity onPress={() => handleChatPress(post.authorId, post.author?.fullName || "User", post.author?.avatarUrl || null)} className="bg-gray-100 px-4 py-2 rounded-2xl">
                          <Text className="font-black text-[10px] text-gray-500 uppercase">Message</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity onPress={() => toggleFollow(post.authorId)} className="bg-violet-500 px-4 py-2 rounded-2xl shadow-sm">
                          <Text className="font-black text-[10px] text-white uppercase">Follow</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : (
                    <TouchableOpacity 
                      onPress={() => handlePostOptions(post)}
                      className="w-10 h-10 items-center justify-center rounded-full bg-gray-50/50"
                    >
                      <Feather name="more-horizontal" size={20} color={themeColors.subText} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Post Content */}
                {post.content && (
                  <View className="px-7 pb-5">
                    <Text className="text-[13px] leading-6 font-medium" style={{ color: themeColors.text }}>{post.content}</Text>
                  </View>
                )}

                {/* Post Media (Aspect 1:1) */}
                {post.media && post.media.length > 0 && (
                  <View className="px-4 pb-4">
                    <View className="rounded-[35px] overflow-hidden bg-gray-100" style={{ aspectRatio: 1 }}>
                      <Image 
                        source={{ uri: getFullImageUrl(post.media[0].url) }} 
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                    </View>
                  </View>
                )}

                {/* Actions: Like & Comment Count */}
                <View className="px-7 py-6 flex-row items-center border-t" style={{ borderTopColor: themeColors.border }}>
                  <TouchableOpacity 
                    onPress={() => toggleLike(post.id)} 
                    className="flex-row items-center mr-10"
                  >
                    <Ionicons 
                      name={post.reactions?.some(r => r.userId === userId) ? "heart" : "heart-outline"} 
                      size={28} 
                      color={post.reactions?.some(r => r.userId === userId) ? "#EF4444" : themeColors.text} 
                    />
                    <Text className="ml-2.5 font-black text-sm" style={{ color: themeColors.text }}>{post._count?.reactions || 0}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    onPress={() => setActiveCommentPostId(activeCommentPostId === post.id ? null : post.id)}
                    className="flex-row items-center"
                  >
                    <Feather name="message-circle" size={26} color={themeColors.text} />
                    <Text className="ml-2.5 font-black text-sm" style={{ color: themeColors.text }}>{post._count?.comments || 0}</Text>
                  </TouchableOpacity>
                </View>

                {/* Comments Section */}
                {post.comments && post.comments.length > 0 && (
                  <View className="px-7 pb-4">
                    {post.comments.slice(-2).map((comment, idx) => (
                      <View key={comment.id || idx} className="flex-row mb-2">
                        <Text className="font-black text-xs mr-2" style={{ color: themeColors.text }}>{comment.author?.fullName || "User"}</Text>
                        <Text className="text-xs flex-1" style={{ color: themeColors.subText }} numberOfLines={2}>{comment.content}</Text>
                      </View>
                    ))}
                    {post.comments.length > 2 && (
                      <TouchableOpacity className="mt-1">
                        <Text className="text-[10px] font-black text-violet-500 uppercase tracking-widest">View all {post.comments.length} comments</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Comment Input (Conditional) */}
                {activeCommentPostId === post.id && (
                  <View className="px-6 pb-6 pt-2">
                    <View 
                      className="flex-row items-center px-4 py-2 rounded-[25px] border"
                      style={{ backgroundColor: isDarkMode ? "#1E1E1E" : "#F8F9FE", borderColor: themeColors.border }}
                    >
                      <Image 
                        source={{ uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'Me')}&background=7C3AED&color=fff` }} 
                        className="w-7 h-7 rounded-full mr-3" 
                      />
                      
                      <TextInput 
                        placeholder="Add a thought..."
                        placeholderTextColor={isDarkMode ? "#555" : "#94A3B8"}
                        className="flex-1 text-xs font-bold py-2"
                        style={{ color: themeColors.text }}
                        value={commentText[post.id] || ""}
                        onChangeText={(text) => setCommentText({ ...commentText, [post.id]: text })}
                        autoFocus={true}
                        returnKeyType="send"
                        onSubmitEditing={() => handleSendComment(post.id)}
                        onBlur={() => {
                          setTimeout(() => {
                            setActiveCommentPostId(null);
                          }, 150);
                        }}
                      />
                    </View>
                  </View>
                )}
              </View>
            ))
          )}
          <View className="h-24" />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
