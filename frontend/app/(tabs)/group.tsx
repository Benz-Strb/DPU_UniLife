import React, { useState, useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { theme } from "@/constants/theme";
import { useUser } from "@/store/UserContext";
import { usePosts } from "@/hooks/usePosts";
import { LinearGradient } from "expo-linear-gradient";
import { FACULTY_DATA } from "@/constants/data";
import { authService, BASE_URL } from "@/services/api";

export default function GroupScreen() {
  const router = useRouter();
  const { userId, toggleLike, themeColors, isDarkMode, user, isAdmin, isUniAdmin, getDirectChat } = useUser();
  const { posts, updateCommentsStatus, deletePost, togglePin } = usePosts();
  
  // [SPACE_LOGIC] แยกหน้าจอแอดมิน (Super Admin ล็อกที่ DPU)
  const [selectedGroup, setSelectedGroup] = useState(isUniAdmin ? "DPU" : "DPU");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [expandedPosts, setExpandedPosts] = useState<{ [key: string]: boolean }>({});

  React.useEffect(() => {
    if (isUniAdmin && selectedGroup !== "DPU") {
      setSelectedGroup("DPU");
    }
  }, [isUniAdmin]);

  const lastTap = React.useRef<{ [key: string]: number }>({});

  // [SUPPORT_CHAT] ระบบค้นหาแอดมินเพื่อเริ่มการสนทนา
  const handleSupportChat = async () => {
    try {
      console.log(`[SupportChat] Searching admin for: ${selectedGroup}`);
      const query = selectedGroup === "DPU" 
        ? { role: "SUPER_ADMIN" } 
        : { faculty: selectedGroup };
        
      const admins = await authService.getAdmins(query);
      const targetAdmin = admins && admins.length > 0 ? admins[0] : null;

      if (!targetAdmin) {
        Alert.alert("ไม่พบเจ้าหน้าที่", `ขณะนี้ยังไม่มีเจ้าหน้าที่จาก ${selectedGroup} ในระบบ`);
        return;
      }

      const convo = await getDirectChat(targetAdmin.id);
      if (convo) {
        router.push({
          pathname: "/chat-detail",
          params: { 
            id: convo.id, 
            userName: targetAdmin.fullName, 
            userAvatar: getFullImageUrl(targetAdmin.avatarUrl), 
            userId: targetAdmin.id 
          }
        });
      }
    } catch (error) {
      Alert.alert("Error", "ไม่สามารถติดต่อเจ้าหน้าที่ได้ในขณะนี้");
    }
  };

  const toggleExpand = (postId: string) => {
    setExpandedPosts(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  const handleImagePress = (postId: string) => {
    const now = Date.now();
    const DOUBLE_PRESS_DELAY = 300;
    
    if (lastTap.current[postId] && (now - lastTap.current[postId]) < DOUBLE_PRESS_DELAY) {
      toggleLike(postId);
      delete lastTap.current[postId];
    } else {
      lastTap.current[postId] = now;
      setTimeout(() => {
        if (lastTap.current[postId] === now) {
          delete lastTap.current[postId];
        }
      }, DOUBLE_PRESS_DELAY);
    }
  };

  const userFaculty = user?.faculty || "No Faculty";
  const bgColor = themeColors.background;
  const cardColor = themeColors.card;
  const textColor = themeColors.text;
  const subTextColor = themeColors.subText;
  const borderColor = themeColors.border;

  const fullName = selectedGroup === "DPU" ? "Dhurakij Pundit University" : (FACULTY_DATA[selectedGroup] || selectedGroup);

  const handlePostOptions = (post: any) => {
    if (post.authorId !== userId && !isUniAdmin && !(isAdmin && post.facultyTag === userFaculty)) return;

    Alert.alert(
      "จัดการประกาศ",
      "กรุณาเลือกรายการที่ต้องการ",
      [
        {
          text: post.commentsEnabled ? "ปิดการคอมเมนต์" : "เปิดการคอมเมนต์",
          onPress: () => updateCommentsStatus(post.id, !post.commentsEnabled)
        },
        {
          text: "ลบประกาศ",
          style: "destructive",
          onPress: () => {
            Alert.alert("ยืนยันการลบ", "คุณต้องการลบประกาศนี้ถาวรใช่หรือไม่?", [
              { text: "ยกเลิก", style: "cancel" },
              { text: "ลบ", style: "destructive", onPress: () => deletePost(post.id) }
            ]);
          }
        },
        { text: "ยกเลิก", style: "cancel" }
      ]
    );
  };

  // [SPACE_FILTER] กรองประกาศแยกตาม DPU หรือ คณะที่เลือก
  const filteredPosts = useMemo(() => {
    const filtered = posts.filter(p => {
      if (!p.isOfficial) return false;
      if (selectedGroup === "DPU") {
        return p.facultyTag === "DPU";
      }
      return p.facultyTag === selectedGroup;
    });

    return [...filtered].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [posts, selectedGroup]);

  const toggleGroup = (group: string) => {
    setSelectedGroup(group);
    setIsDropdownOpen(false);
  };

  const getFullImageUrl = (url: string | null | undefined) => {
    if (!url) return undefined;
    if (url.startsWith('http')) return url;
    return `${BASE_URL}${url}`;
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
            {!isAdmin && !isUniAdmin && (
              <View className="absolute top-12 right-7">
                <TouchableOpacity 
                  onPress={handleSupportChat}
                  className="w-12 h-12 rounded-2xl items-center justify-center bg-white/20 border border-white/30"
                >
                  <Ionicons name="chatbubble-ellipses" size={24} color="white" />
                </TouchableOpacity>
              </View>
            )}

            <View className="relative">
              <TouchableOpacity 
                onPress={() => !isUniAdmin && setIsDropdownOpen(!isDropdownOpen)}
                activeOpacity={isUniAdmin ? 1 : 0.7}
                className="bg-white w-32 h-32 rounded-[40px] items-center justify-center shadow-2xl border-4 border-violet-200"
              >
                  <Text className="text-violet-700 font-black text-4xl tracking-tighter">{selectedGroup}</Text>
                  {!isUniAdmin && (
                    <View className="absolute -bottom-2 -right-2 bg-violet-600 rounded-2xl p-2 border-2 border-white shadow-lg">
                      <Ionicons name="chevron-down" size={16} color="white" />
                    </View>
                  )}
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
                  <TouchableOpacity 
                    onPress={() => toggleGroup(userFaculty)}
                    className={`p-4 items-center ${selectedGroup === userFaculty ? 'bg-violet-600' : ''}`}
                  >
                    <Text className={`font-black ${selectedGroup === userFaculty ? 'text-white' : 'text-violet-600'}`}>{userFaculty}</Text>
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
              <Text className="mt-6 font-bold text-center" style={{ color: subTextColor }}>ยังไม่มีโพสต์ใน {selectedGroup}</Text>
            </View>
          ) : (
            filteredPosts.map((post) => {
              const isExpanded = expandedPosts[post.id];
              const contentLines = post.content?.split('\n').length || 0;
              const isLongContent = (post.content?.length || 0) > 100 || contentLines > 2;

              return (
                <View 
                  key={post.id} 
                  className="rounded-[40px] overflow-hidden border mb-10 shadow-sm"
                  style={{ backgroundColor: cardColor, borderColor: borderColor }}
                >
                  <View className="flex-row items-center justify-between p-4">
                    <View className="flex-row items-center flex-1">
                        <Image source={{ uri: getFullImageUrl(post.author?.avatarUrl) || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author?.fullName || 'U')}` }} className="w-8 h-8 rounded-full mr-3" />
                        <View className="flex-1">
                          <View className="flex-row items-center flex-wrap">
                              <Text className="font-bold text-[11px] mr-2" style={{ color: textColor }}>{post.author?.fullName}</Text>
                              {post.author?.role !== "STUDENT" && (
                                <View className="bg-amber-100 px-1.5 py-0.5 rounded-md mr-1 border border-amber-200">
                                  <Text className="text-amber-700 text-[7px] font-bold uppercase">{post.author?.role}</Text>
                                </View>
                              )}
                          </View>
                          <Text className="text-[9px]" style={{ color: subTextColor }}>{new Date(post.createdAt).toLocaleDateString()}</Text>
                        </View>
                    </View>

                    {(post.authorId === userId || isUniAdmin || (isAdmin && post.facultyTag === userFaculty)) && (
                      <TouchableOpacity 
                          onPress={() => handlePostOptions(post)}
                          className="w-8 h-8 items-center justify-center rounded-full bg-gray-50/50"
                      >
                          <Feather name="more-horizontal" size={18} color={subTextColor} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {post.media && post.media.length > 0 && (
                    <TouchableOpacity 
                      activeOpacity={0.9}
                      onPress={() => handleImagePress(post.id)}
                    >
                      <Image 
                        source={{ uri: getFullImageUrl(post.media[0].url) }} 
                        className="w-full bg-gray-50" 
                        style={{ aspectRatio: 4/5 }} 
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  )}

                  <View className="p-6">
                    <View>
                      <Text 
                        className="text-xs mb-2 leading-5" 
                        style={{ color: textColor }}
                        numberOfLines={isExpanded ? undefined : 2}
                      >
                        {post.content}
                      </Text>
                      
                      {isLongContent && (
                        <TouchableOpacity onPress={() => toggleExpand(post.id)} className="mb-4">
                          <Text className="text-violet-500 font-bold text-[10px] uppercase">
                            {isExpanded ? "Show Less" : "Show More"}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>

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
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}
