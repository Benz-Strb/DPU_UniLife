import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { theme } from "@/constants/theme";
import { useUser } from "@/store/UserContext";
import { LinearGradient } from "expo-linear-gradient";
import { FACULTY_DATA } from "@/constants/data";

export default function GroupScreen() {
  const router = useRouter();
  const { faculty, userId, posts, toggleLike, themeColors, isDarkMode } = useUser();
  const [selectedGroup, setSelectedGroup] = useState(faculty);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const bgColor = themeColors.background;
  const cardColor = themeColors.card;
  const textColor = themeColors.text;
  const subTextColor = themeColors.subText;
  const borderColor = themeColors.border;

  const fullName = selectedGroup === "DPU" ? "Dhurakij Pundit University" : (FACULTY_DATA[selectedGroup] || selectedGroup);
  const filteredPosts = posts.filter(p => p.group?.name === selectedGroup);

  const toggleGroup = (group: string) => {
    setSelectedGroup(group);
    setIsDropdownOpen(false);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: bgColor }}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} stickyHeaderIndices={[1]}>
        
        <View className="h-[400px] w-full relative overflow-hidden">
          <LinearGradient
            colors={isDarkMode ? ['#2E1065', '#1E1B4B', '#0F172A'] : ['#4C1D95', '#6D28D9', '#7C3AED']}
            style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
          />
          
          <View className="absolute -top-20 -right-20 w-64 h-64 bg-white/5 rounded-full" />
          <View className="absolute -bottom-10 -left-10 w-40 h-40 bg-black/10 rounded-full" />

          <SafeAreaView className="flex-1 items-center justify-center px-8">
            <View className="relative">
              <TouchableOpacity 
                onPress={() => setIsDropdownOpen(!isDropdownOpen)}
                className="bg-white w-32 h-32 rounded-[40px] items-center justify-center shadow-2xl border-4 border-violet-200"
              >
                  <Text className="text-violet-700 font-black text-4xl tracking-tighter">{selectedGroup}</Text>
                  <View className="absolute -bottom-2 -right-2 bg-violet-600 rounded-2xl p-2 border-2 border-white shadow-lg">
                    <Ionicons name="chevron-down" size={16} color="white" />
                  </View>
              </TouchableOpacity>

              {isDropdownOpen && (
                <View 
                   className="absolute top-36 left-0 right-0 rounded-3xl shadow-2xl z-50 overflow-hidden w-32 border-2"
                   style={{ backgroundColor: cardColor, borderColor: theme.colors.primary }}
                >
                  <TouchableOpacity 
                    onPress={() => toggleGroup("DPU")}
                    className={`p-4 items-center ${selectedGroup === "DPU" ? 'bg-violet-600' : ''}`}
                  >
                    <Text className={`font-black ${selectedGroup === "DPU" ? 'text-white' : 'text-violet-600'}`}>DPU</Text>
                  </TouchableOpacity>
                  <View className="h-[1px]" style={{ backgroundColor: borderColor }} />
                  <TouchableOpacity 
                    onPress={() => toggleGroup(faculty)}
                    className={`p-4 items-center ${selectedGroup === faculty ? 'bg-violet-600' : ''}`}
                  >
                    <Text className={`font-black ${selectedGroup === faculty ? 'text-white' : 'text-violet-600'}`}>{faculty}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View className="items-center mt-8">
              <View className="bg-black/20 px-6 py-2 rounded-2xl border border-white/10 mb-3">
                 <Text className="text-white text-4xl font-black text-center tracking-tight" style={{ textShadowColor: 'rgba(0, 0, 0, 0.75)', textShadowOffset: {width: -1, height: 1}, textShadowRadius: 10 }}>
                   {selectedGroup} SPACE
                 </Text>
              </View>
              
              <View className="bg-white/10 px-4 py-2 rounded-xl border border-white/5">
                <Text className="text-violet-100 text-xs font-bold text-center uppercase tracking-[1px]">
                  {fullName}
                </Text>
              </View>
            </View>
          </SafeAreaView>
        </View>

        <View 
          className="border-b flex-row px-8 py-5 justify-around items-center"
          style={{ backgroundColor: cardColor, borderBottomColor: borderColor }}
        >
          <Text className="font-black uppercase text-[10px] tracking-widest" style={{ color: theme.colors.primary }}>
            {selectedGroup === "DPU" ? "University Feed" : "Faculty Feed"}
          </Text>
        </View>

        <View className="px-8 pt-8 pb-20">
          {filteredPosts.length === 0 ? (
            <View className="p-16 rounded-[48px] border shadow-sm items-center justify-center" style={{ backgroundColor: cardColor, borderColor: borderColor }}>
              <Ionicons name="newspaper-outline" size={48} color={borderColor} />
              <Text className="mt-6 font-bold text-center" style={{ color: subTextColor }}>ยังไม่มีโพสต์</Text>
            </View>
          ) : (
            filteredPosts.map((post) => (
              <View 
                key={post.id} 
                className="rounded-[40px] overflow-hidden border mb-10 shadow-sm"
                style={{ backgroundColor: cardColor, borderColor: post.group?.isOfficial ? theme.colors.primary : borderColor }}
              >
                <View className="flex-row items-center p-4">
                   <Image source={{ uri: post.author?.avatarUrl }} className="w-8 h-8 rounded-full mr-3" />
                   <View className="flex-1">
                     <View className="flex-row items-center">
                        <Text className="font-bold text-[11px] mr-2" style={{ color: textColor }}>{post.author?.fullName}</Text>
                        {post.author?.role !== "STUDENT" && (
                          <View className="bg-amber-100 px-1.5 py-0.5 rounded-md mr-1 border border-amber-200">
                            <Text className="text-amber-700 text-[7px] font-bold uppercase">{post.author?.role}</Text>
                          </View>
                        )}
                        {post.group?.name && post.group.name !== "DPU" && (
                          <View className="bg-violet-100 px-1.5 py-0.5 rounded-md border border-violet-200">
                            <Text className="text-violet-700 text-[7px] font-bold uppercase">{post.group.name}</Text>
                          </View>
                        )}
                     </View>
                     <Text className="text-[9px]" style={{ color: subTextColor }}>{new Date(post.createdAt).toLocaleDateString()}</Text>
                   </View>
                   {post.group?.isOfficial && (
                     <View className="bg-red-500 px-3 py-1 rounded-full">
                        <Text className="text-white text-[8px] font-black">NEWS</Text>
                     </View>
                   )}
                </View>
                {post.media && post.media.length > 0 && (
                  <Image source={{ uri: post.media[0].url }} className="w-full h-64" />
                )}
                <View className="p-6">
                   <Text className="text-xs mb-4" style={{ color: textColor }}>{post.content}</Text>
                   <TouchableOpacity onPress={() => toggleLike(post.id)} className="flex-row items-center">
                      <Ionicons 
                        name={post.reactions?.some(r => r.userId === userId) ? "heart" : "heart-outline"} 
                        size={20} 
                        color={post.reactions?.some(r => r.userId === userId) ? "#EF4444" : textColor} 
                      />
                      <Text className="ml-2 font-bold text-xs" style={{ color: textColor }}>
                        {post._count?.reactions || 0}
                      </Text>
                   </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
