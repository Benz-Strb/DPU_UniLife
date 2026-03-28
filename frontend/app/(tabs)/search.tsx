import React, { useState } from "react";
import { View, Text, TextInput, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { theme } from "@/constants/theme";
import { useUser } from "@/store/UserContext";

export default function SearchScreen() {
  const router = useRouter();
  const { isDarkMode, posts, themeColors } = useUser();
  const [searchQuery, setSearchQuery] = useState("");

  const bgColor = themeColors.background;
  const cardColor = themeColors.card;
  const textColor = themeColors.text;
  const subTextColor = themeColors.subText;
  const borderColor = themeColors.border;

  const searchResults = searchQuery.trim() 
    ? posts.filter(p => 
        p.tags?.some(t => t.tag.name.toLowerCase().includes(searchQuery.toLowerCase())) || 
        (p.content && p.content.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : [];

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: bgColor }}>
      <View 
        className="px-6 py-4 border-b" 
        style={{ backgroundColor: cardColor, borderBottomColor: borderColor }}
      >
        <View 
          className="rounded-[24px] px-6 py-4 flex-row items-center border shadow-sm"
          style={{ backgroundColor: isDarkMode ? "#2D2D2D" : "#F9FAFB", borderColor: borderColor }}
        >
          <Ionicons name="search" size={20} color={theme.colors.primary} />
          <TextInput
            placeholder="ค้นหา #แท็ก หรือ เนื้อหา..."
            placeholderTextColor={subTextColor}
            className="ml-3 font-bold flex-1"
            style={{ color: textColor }}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== "" && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
               <Ionicons name="close-circle" size={18} color={subTextColor} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView className="flex-1 px-8 pt-6" showsVerticalScrollIndicator={false}>
        {searchQuery === "" ? (
          <>
            <Text className="text-[10px] font-black uppercase tracking-[2px] mb-6" style={{ color: subTextColor }}>แท็กยอดนิยม</Text>
            <View className="flex-row flex-wrap">
              {["CITE", "LAW", "CA", "CIBA", "DPUIC", "ARTS", "FA"].map((tag) => (
                <TouchableOpacity 
                  key={tag} 
                  onPress={() => router.push({ pathname: "/tag", params: { tagName: tag } } as any)}
                  className="px-6 py-3 rounded-full m-1 border"
                  style={{ backgroundColor: isDarkMode ? "#2D2D2D" : "#F5F3FF", borderColor: isDarkMode ? "#444" : "#DDD" }}
                >
                  <Text className="font-black text-[10px] uppercase tracking-wider" style={{ color: theme.colors.primary }}>#{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : (
          <View>
            <Text className="text-[10px] font-black uppercase tracking-[2px] mb-6" style={{ color: subTextColor }}>ผลการค้นหา ({searchResults.length})</Text>
            {searchResults.length === 0 ? (
              <View className="items-center py-20">
                 <Ionicons name="search-outline" size={48} color={subTextColor} />
                 <Text className="mt-4 font-bold" style={{ color: subTextColor }}>ไม่พบข้อมูลที่ตรงกัน</Text>
              </View>
            ) : (
              searchResults.map((post) => (
                <TouchableOpacity 
                  key={post.id} 
                  onPress={() => router.push({ pathname: "/tag", params: { tagName: post.tags?.[0]?.tag.name || "" } } as any)}
                  className="p-6 rounded-[32px] border shadow-sm mb-4"
                  style={{ backgroundColor: cardColor, borderColor: borderColor }}
                >
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="font-bold text-xs" style={{ color: textColor }}>{post.author.fullName}</Text>
                    {post.tags?.[0] && (
                      <View className="bg-violet-50 px-2 py-1 rounded-md">
                        <Text className="text-violet-500 text-[8px] font-black">#{post.tags[0].tag.name}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ color: textColor }} numberOfLines={2}>{post.content}</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
