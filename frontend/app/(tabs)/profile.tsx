import React from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, Dimensions, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { theme } from "@/constants/theme";
import { useUser } from "@/store/UserContext";

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 4) / 3;

export default function ProfileScreen() {
  const router = useRouter();
  const { isDarkMode, name, bio, profileImage, posts, userId, themeColors, user } = useUser();

  const myPosts = posts.filter(p => p.authorId === userId);

  return (
    <View className="flex-1" style={{ backgroundColor: themeColors.background }}>
      <StatusBar barStyle={themeColors.statusBar as any} />
      
      <SafeAreaView className="flex-1" edges={['top']}>
        <View className="flex-row items-center justify-between px-6 py-4">
          <Text className="text-xl font-black tracking-tight" style={{ color: themeColors.text }}>Profile</Text>
          <TouchableOpacity 
            onPress={() => router.push("/settings")}
            className="w-10 h-10 items-center justify-center rounded-2xl"
            style={{ backgroundColor: themeColors.iconBg }}
          >
            <Ionicons name="settings-outline" size={22} color={themeColors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="px-6 pt-4 pb-8">
            <View className="flex-row items-center mb-6">
              <View 
                className="w-24 h-24 rounded-[32px] items-center justify-center shadow-sm border"
                style={{ 
                  backgroundColor: themeColors.card, 
                  borderColor: themeColors.border,
                  elevation: 2 
                }}
              >
                <Image 
                  source={{ uri: profileImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=7C3AED&color=fff` }} 
                  className="w-full h-full rounded-[28px]" 
                />
              </View>

              <View className="flex-1 flex-row justify-content pr-4">
                <View className="items-center px-4">
                  <Text className="text-xl font-black" style={{ color: themeColors.text }}>{myPosts.length}</Text>
                  <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Posts</Text>
                </View>
              </View>
            </View>

            <View className="mb-6">
              <Text className="text-2xl font-black tracking-tight" style={{ color: themeColors.text }}>{name || "User"}</Text>
              
              <View className="flex-row items-center mt-1">
                <View 
                  className="px-2.5 py-1 rounded-lg"
                  style={{ backgroundColor: isDarkMode ? "#2D2D2D" : "#F5F3FF" }}
                >
                  <Text 
                    className="text-[10px] font-black uppercase tracking-[1px]"
                    style={{ color: theme.colors.primary }}
                  >
                    {user?.role || "STUDENT"}
                  </Text>
                </View>
              </View>

              <Text className="text-sm mt-4 leading-5 font-medium" style={{ color: themeColors.subText }}>
                {bio || "Your campus life, shared. Tap 'Edit Profile' to share your story."}
              </Text>
            </View>

            <TouchableOpacity 
              onPress={() => router.push("/edit-profile")}
              className="w-full py-3.5 rounded-2xl items-center border"
              style={{ 
                backgroundColor: themeColors.card,
                borderColor: themeColors.border 
              }}
            >
              <Text className="font-bold text-sm" style={{ color: themeColors.text }}>Edit Profile</Text>
            </TouchableOpacity>
          </View>

          <View className="px-6 mb-4 flex-row items-center">
            <View className="w-1.5 h-4 rounded-full bg-purple-600 mr-3" />
            <Text className="text-[11px] font-black uppercase tracking-[2px] text-gray-400">Your Posts</Text>
          </View>

          <View className="flex-row flex-wrap px-0.5">
            {myPosts.length === 0 ? (
              <View className="w-full py-24 items-center justify-center">
                <View 
                  className="w-16 h-16 rounded-[24px] items-center justify-center mb-4"
                  style={{ backgroundColor: themeColors.iconBg }}
                >
                  <Ionicons name="images-outline" size={30} color={isDarkMode ? "#444" : "#CBD5E1"} />
                </View>
                <Text className="text-gray-300 font-black text-[10px] uppercase tracking-[2px]">Nothing shared yet</Text>
              </View>
            ) : (
              myPosts.map((post, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={{ 
                    width: COLUMN_WIDTH, 
                    height: COLUMN_WIDTH, 
                    margin: 0.6,
                    borderRadius: 4,
                    overflow: 'hidden'
                  }}
                >
                  <Image 
                    source={{ uri: (post.media && post.media.length > 0) ? post.media[0].url : "https://via.placeholder.com/300?text=Post" }} 
                    className="w-full h-full bg-gray-50" 
                  />
                  {(!post.media || post.media.length === 0) && (
                    <View 
                      className="absolute inset-0 items-center justify-center px-3"
                      style={{ backgroundColor: isDarkMode ? "rgba(45, 45, 45, 0.8)" : "rgba(245, 243, 255, 0.8)" }}
                    >
                       <Text 
                        className="text-[8px] font-black text-center uppercase" 
                        style={{ color: theme.colors.primary }}
                        numberOfLines={3}
                       >
                         {post.content}
                       </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))
            )}
          </View>
          <View className="h-24" />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
