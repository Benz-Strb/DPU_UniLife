import React, { useState, useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, Alert, TextInput } from "react-native";
import ImageCarousel from "@/components/ImageCarousel";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { theme } from "@/constants/theme";
import { useUser } from "@/store/UserContext";
import { usePosts } from "@/hooks/usePosts";
import { LinearGradient } from "expo-linear-gradient";
import { FACULTY_DATA } from "@/constants/data";
import { authService } from "@/services/api";
import { getAvatarUrl, getImageUrl } from "@/utils/imageUtils";
import * as Haptics from "expo-haptics";

export default function GroupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { userId, toggleLike, themeColors, isDarkMode, user, isAdmin, isUniAdmin, getDirectChat } = useUser();
  const { posts, updateCommentsStatus, deletePost, togglePin, activeCommentPostId, setActiveCommentPostId, commentText, setCommentText, sendComment, toggleComments, handleCommentLongPress } = usePosts();

  const [selectedGroup, setSelectedGroup] = useState("DPU");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [expandedPosts, setExpandedPosts] = useState<Record<string, boolean>>({});

  React.useEffect(() => {
    if (isUniAdmin && selectedGroup !== "DPU") setSelectedGroup("DPU");
  }, [isUniAdmin]);

  const userFaculty = user?.faculty || "No Faculty";
  const fullName = selectedGroup === "DPU" ? "Dhurakij Pundit University" : (FACULTY_DATA[selectedGroup] || selectedGroup);


  const handleSupportChat = async () => {
    try {
      const query = selectedGroup === "DPU" ? { role: "SUPER_ADMIN" } : { faculty: selectedGroup };
      const admins = await authService.getAdmins(query);
      const targetAdmin = admins?.[0] ?? null;
      if (!targetAdmin) {
        Alert.alert("ไม่พบเจ้าหน้าที่", `ขณะนี้ยังไม่มีเจ้าหน้าที่จาก ${selectedGroup} ในระบบ`);
        return;
      }
      const convo = await getDirectChat(targetAdmin.id);
      if (convo) {
        router.push({
          pathname: "/chat-detail",
          params: { id: convo.id, userName: targetAdmin.fullName, userAvatar: getAvatarUrl(targetAdmin.avatarUrl, targetAdmin.fullName), userId: targetAdmin.id },
        });
      }
    } catch {
      Alert.alert("Error", "ไม่สามารถติดต่อเจ้าหน้าที่ได้ในขณะนี้");
    }
  };

  const handlePostOptions = (post: any) => {
    const canManage = post.authorId === userId || isUniAdmin || (isAdmin && post.facultyTag === userFaculty);
    if (!canManage) return;
    Alert.alert("จัดการประกาศ", "กรุณาเลือกรายการที่ต้องการ", [
      {
        text: post.commentsEnabled ? "ปิดการคอมเมนต์" : "เปิดการคอมเมนต์",
        onPress: () => updateCommentsStatus(post.id, !post.commentsEnabled),
      },
      {
        text: post.isPinned ? "เลิกปิ๊น" : "ปิ๊นประกาศ",
        onPress: () => togglePin(post.id, post.isPinned),
      },
      {
        text: "ลบประกาศ",
        style: "destructive",
        onPress: () =>
          Alert.alert("ยืนยันการลบ", "คุณต้องการลบประกาศนี้ถาวรใช่หรือไม่?", [
            { text: "ยกเลิก", style: "cancel" },
            { text: "ลบ", style: "destructive", onPress: () => deletePost(post.id) },
          ]),
      },
      { text: "ยกเลิก", style: "cancel" },
    ]);
  };

  const filteredPosts = useMemo(() => {
    const filtered = posts.filter((p) => {
      if (!p.isOfficial) return false;
      return selectedGroup === "DPU" ? p.facultyTag === "DPU" : p.facultyTag === selectedGroup;
    });
    return [...filtered].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [posts, selectedGroup]);

  const toggleGroup = (group: string) => {
    setSelectedGroup(group);
    setIsDropdownOpen(false);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: themeColors.background }}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} stickyHeaderIndices={[1]}>

        {/* ===== Hero Banner ===== */}
        <View className="h-[360px] w-full relative overflow-hidden">
          <LinearGradient
            colors={isDarkMode ? ["#2E1065", "#1E1B4B", "#0F172A"] : ["#4C1D95", "#6D28D9", "#7C3AED"]}
            style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
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
                className="bg-white w-28 h-28 rounded-[36px] items-center justify-center shadow-2xl border-4 border-violet-200"
              >
                <Text className="text-violet-700 font-black text-3xl tracking-tighter">{selectedGroup}</Text>
                {!isUniAdmin && (
                  <View className="absolute -bottom-2 -right-2 bg-violet-600 rounded-2xl p-1.5 border-2 border-white shadow-lg">
                    <Ionicons name="chevron-down" size={14} color="white" />
                  </View>
                )}
              </TouchableOpacity>

              {isDropdownOpen && (
                <View
                  className="absolute top-32 left-0 rounded-3xl shadow-2xl z-50 overflow-hidden w-28 border-2"
                  style={{ backgroundColor: themeColors.card, borderColor: theme.colors.primary }}
                >
                  {["DPU", userFaculty].map((g) => (
                    <TouchableOpacity
                      key={g}
                      onPress={() => toggleGroup(g)}
                      className={`p-3.5 items-center ${selectedGroup === g ? "bg-violet-600" : ""}`}
                    >
                      <Text className={`font-black text-sm ${selectedGroup === g ? "text-white" : "text-violet-600"}`}>{g}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View className="items-center mt-6">
              <View className="bg-black/20 px-5 py-2 rounded-2xl border border-white/10 mb-2">
                <Text className="text-white text-3xl font-black text-center tracking-tight">{selectedGroup} SPACE</Text>
              </View>
              <View className="bg-white/10 px-4 py-1.5 rounded-xl border border-white/5">
                <Text className="text-violet-100 text-xs font-bold text-center uppercase tracking-[1px]">{fullName}</Text>
              </View>
            </View>
          </SafeAreaView>
        </View>

        {/* ===== Feed label (sticky) ===== */}
        <View
          className="border-b px-5 flex-row items-center justify-between"
          style={{ backgroundColor: themeColors.card, borderBottomColor: themeColors.border, paddingTop: insets.top + 8, paddingBottom: 10 }}
        >
          <Text className="font-black uppercase text-[10px] tracking-widest" style={{ color: theme.colors.primary }}>
            {selectedGroup === "DPU" ? "University Feed" : "Faculty Feed"}
          </Text>
          {(isAdmin || isUniAdmin) && (
            <TouchableOpacity onPress={() => router.push("/new-post")} className="flex-row items-center gap-1 bg-violet-500 px-3 py-1.5 rounded-xl">
              <Feather name="plus" size={12} color="white" />
              <Text className="text-white font-black text-[10px] uppercase">Post</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ===== Post Cards ===== */}
        {filteredPosts.length === 0 ? (
          <View className="mx-4 mt-8 p-14 rounded-[40px] border items-center justify-center" style={{ backgroundColor: themeColors.card, borderColor: themeColors.border }}>
            <Ionicons name="newspaper-outline" size={44} color={themeColors.border} />
            <Text className="mt-4 font-bold text-center text-sm" style={{ color: themeColors.subText }}>ยังไม่มีโพสต์ใน {selectedGroup}</Text>
          </View>
        ) : (
          <View className="pb-24">
            {filteredPosts.map((post) => {
              const isLiked = post.reactions?.some((r: any) => r.userId === userId);
              const isExpanded = expandedPosts[post.id];
              const isLong = (post.content?.length ?? 0) > 120 || (post.content?.split("\n").length ?? 0) > 2;
              const canManage = post.authorId === userId || isUniAdmin || (isAdmin && post.facultyTag === userFaculty);

              return (
                <View
                  key={post.id}
                  className="border-b"
                  style={{ backgroundColor: themeColors.card, borderColor: themeColors.border }}
                >
                  {/* Author row */}
                  <View className="flex-row items-center justify-between px-4 pt-4 pb-3">
                    <TouchableOpacity
                      onPress={() => router.push({ pathname: "/user-profile", params: { userId: post.authorId } })}
                      className="flex-row items-center flex-1"
                    >
                      <Image
                        source={{ uri: getAvatarUrl(post.author?.avatarUrl, post.author?.fullName) }}
                        className="w-10 h-10 rounded-full mr-3 border border-gray-100"
                      />
                      <View className="flex-1">
                        <View className="flex-row items-center gap-1.5 flex-wrap">
                          <Text className="font-black text-[13px]" style={{ color: themeColors.text }}>{post.author?.fullName}</Text>
                          {post.author?.role !== "STUDENT" && (
                            <View className="bg-amber-100 px-1.5 py-0.5 rounded-md border border-amber-200">
                              <Text className="text-amber-700 text-[8px] font-black uppercase">{post.author?.role}</Text>
                            </View>
                          )}
                          {post.isPinned && (
                            <View className="bg-violet-100 px-1.5 py-0.5 rounded-md border border-violet-200">
                              <Text className="text-violet-600 text-[8px] font-black uppercase">Pinned</Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-[10px] font-medium" style={{ color: themeColors.subText }}>
                          {new Date(post.createdAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {canManage && (
                      <TouchableOpacity onPress={() => handlePostOptions(post)} className="w-8 h-8 items-center justify-center">
                        <Feather name="more-horizontal" size={20} color={themeColors.subText} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Full-width image carousel with double-tap to like */}
                  {post.media && post.media.length > 0 && (
                    <ImageCarousel
                      images={post.media.map((m: any) => ({ url: getImageUrl(m.url) ?? "" }))}
                      aspectRatio={4 / 5}
                      onDoubleTap={() => {
                        toggleLike(post.id);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      }}
                    />
                  )}

                  {/* Actions row */}
                  <View className="flex-row items-center px-4 pt-3 pb-2 gap-5">
                    <TouchableOpacity onPress={() => toggleLike(post.id)} className="flex-row items-center">
                      <Ionicons name={isLiked ? "heart" : "heart-outline"} size={26} color={isLiked ? "#EF4444" : themeColors.text} />
                      <Text className="ml-1.5 font-black text-sm" style={{ color: themeColors.text }}>{post._count?.reactions || 0}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => toggleComments(post.id)} className="flex-row items-center">
                      <Feather name="message-circle" size={24} color={activeCommentPostId === post.id ? theme.colors.primary : themeColors.text} />
                      <Text className="ml-1.5 font-black text-sm" style={{ color: themeColors.text }}>{post._count?.comments || 0}</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Caption */}
                  {post.content ? (
                    <View className="px-4 pb-3">
                      <Text className="text-[13px] leading-[22px]" style={{ color: themeColors.text }} numberOfLines={isExpanded ? undefined : 3}>
                        <Text className="font-black">{post.author?.fullName} </Text>
                        {post.content}
                      </Text>
                      {isLong && (
                        <TouchableOpacity onPress={() => setExpandedPosts((prev) => ({ ...prev, [post.id]: !prev[post.id] }))}>
                          <Text className="text-violet-500 font-bold text-[11px] mt-1">
                            {isExpanded ? "Show less" : "Show more"}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : null}

                  {/* Inline Comments */}
                  {activeCommentPostId === post.id && (
                    <View className="px-4 pb-4">
                      {post.comments && post.comments.length > 0 && (
                        <View className="mb-3 gap-3">
                          {post.comments.map((comment: any) => (
                            <TouchableOpacity
                              key={comment.id}
                              className="flex-row items-start"
                              onLongPress={() => handleCommentLongPress(post.id, comment)}
                              delayLongPress={400}
                              activeOpacity={0.85}
                            >
                              <Image
                                source={{ uri: getAvatarUrl(comment.author?.avatarUrl, comment.author?.fullName) }}
                                className="w-7 h-7 rounded-full mr-2 mt-0.5"
                              />
                              <View className="flex-1 rounded-2xl px-3 py-2" style={{ backgroundColor: themeColors.iconBg }}>
                                <Text className="font-black text-[11px] mb-0.5" style={{ color: themeColors.text }}>{comment.author?.fullName}</Text>
                                <Text className="text-[12px] leading-5" style={{ color: themeColors.text }}>{comment.content}</Text>
                              </View>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                      {post.commentsEnabled !== false && (
                        <View className="flex-row items-center gap-2">
                          <View className="flex-1 flex-row items-center rounded-full border px-3 py-1.5" style={{ borderColor: themeColors.border, backgroundColor: themeColors.iconBg }}>
                            <TextInput
                              value={commentText[post.id] ?? ""}
                              onChangeText={(t) => setCommentText(prev => ({ ...prev, [post.id]: t }))}
                              placeholder="Add a comment..."
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
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
