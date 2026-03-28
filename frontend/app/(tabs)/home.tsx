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
  RefreshControl
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
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
    isRefreshing 
  } = useUser();
  const [commentText, setCommentText] = useState<{ [key: string]: string }>({});

  const handleSendComment = (postId: string) => {
    if (commentText[postId]?.trim()) {
      addComment(postId, commentText[postId]);
      setCommentText({ ...commentText, [postId]: "" });
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: themeColors.background }}>
      <StatusBar barStyle={themeColors.statusBar as any} />
      
      <SafeAreaView className="flex-1" edges={['top']}>
        <View 
          className="flex-row justify-between items-center px-5 py-3 border-b" 
          style={{ borderBottomColor: themeColors.border }}
        >
          <Text className="text-2xl font-black italic tracking-tighter" style={{ color: theme.colors.primary }}>
            UniLife
          </Text>
          <View className="flex-row items-center">
            <TouchableOpacity onPress={() => router.push("/new-post")} className="mr-5">
              <Ionicons name="add-circle-outline" size={28} color={themeColors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/notifications")} className="mr-5">
              <Ionicons name="heart-outline" size={28} color={themeColors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/messenger")}>
              <View className="relative">
                <Ionicons name="chatbubble-ellipses-outline" size={26} color={themeColors.text} />
                <View className="absolute -top-1 -right-1 bg-red-500 w-4 h-4 rounded-full items-center justify-center border-2 border-white">
                  <Text className="text-[8px] text-white font-black">2</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={isRefreshing} 
              onRefresh={refreshPosts} 
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          }
        >
          {posts.length === 0 ? (
            <View className="items-center justify-center py-20 px-10">
              <Ionicons name="planet-outline" size={80} color={isDarkMode ? "#2D2D2D" : "#E5E7EB"} />
              <Text className="text-xl font-black mt-6" style={{ color: themeColors.subText }}>Welcome to UniLife</Text>
              <Text className="text-center mt-2 font-medium" style={{ color: themeColors.subText }}>
                Follow some friends or start posting to see what's happening on campus!
              </Text>
            </View>
          ) : (
            posts.map((post) => (
              <View key={post.id} className="mb-4">
                <View className="flex-row items-center justify-between px-4 py-3">
                  <View className="flex-row items-center">
                    <Image 
                      source={{ uri: getFullImageUrl(post.author?.avatarUrl) }} 
                      className="w-9 h-9 rounded-full mr-3 border border-gray-100" 
                    />
                    <View>
                      <Text className="font-black text-sm" style={{ color: themeColors.text }}>{post.author?.fullName || "User"}</Text>
                      <Text className="text-[10px] font-bold uppercase tracking-tighter" style={{ color: themeColors.subText }}>DPU • {new Date(post.createdAt).toLocaleDateString()}</Text>
                    </View>
                  </View>
                </View>

                {post.media && post.media.length > 0 ? (
                  <Image 
                    source={{ uri: getFullImageUrl(post.media[0].url) }} 
                    style={{ width: width, height: width }} 
                    className="bg-gray-100"
                  />
                ) : (
                  <View 
                    className="px-8 py-12 items-center justify-center"
                    style={{ backgroundColor: isDarkMode ? "#1E1E1E" : "#F5F3FF" }}
                  >
                    <Text 
                      className="text-lg font-bold text-center"
                      style={{ color: isDarkMode ? "#EDE9FE" : "#5B21B6" }}
                    >
                      {post.content}
                    </Text>
                  </View>
                )}

                <View className="flex-row justify-between items-center px-4 pt-3 pb-2">
                  <View className="flex-row items-center">
                    <TouchableOpacity onPress={() => toggleLike(post.id)} className="mr-4">
                      <Ionicons 
                        name={post.reactions?.some(r => r.userId === userId) ? "heart" : "heart-outline"} 
                        size={28} 
                        color={post.reactions?.some(r => r.userId === userId) ? "#EF4444" : themeColors.text} 
                      />
                    </TouchableOpacity>
                    <TouchableOpacity>
                      <Ionicons name="chatbubble-outline" size={26} color={themeColors.text} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View className="px-4">
                  <Text className="font-black text-sm mb-1" style={{ color: themeColors.text }}>
                    {(post.reactions?.length || 0).toLocaleString()} likes
                  </Text>
                  <View className="flex-row flex-wrap">
                    <Text className="font-black text-sm mr-2" style={{ color: themeColors.text }}>{post.author?.fullName || "User"}</Text>
                    <Text className="text-sm flex-1" style={{ color: themeColors.text }}>{post.content}</Text>
                  </View>
                  
                  {post.comments && post.comments.length > 0 && (
                    <TouchableOpacity className="mt-1">
                      <Text className="text-sm font-medium" style={{ color: themeColors.subText }}>
                        View all {post.comments.length} comments
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View className="flex-row items-center px-4 mt-2">
                  <Image 
                    source={{ uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'Me')}&background=random` }} 
                    className="w-6 h-6 rounded-full mr-2" 
                  />
                  <TextInput 
                    placeholder="Add a comment..."
                    placeholderTextColor={isDarkMode ? "#666" : "#94A3B8"}
                    className="flex-1 text-xs font-medium py-2"
                    style={{ color: themeColors.text }}
                    value={commentText[post.id] || ""}
                    onChangeText={(text) => setCommentText({ ...commentText, [post.id]: text })}
                  />
                  <TouchableOpacity onPress={() => handleSendComment(post.id)}>
                    <Text 
                      className="font-black text-xs" 
                      style={{ color: theme.colors.primary, opacity: commentText[post.id] ? 1 : 0.4 }}
                    >
                      Post
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
          <View className="h-20" />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
