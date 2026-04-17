import React, { useState, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, Image,
  Switch, Alert, ScrollView, ActivityIndicator, Modal, FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { theme } from "@/constants/theme";
import { useUser } from "@/store/UserContext";
import { chatService, postService, searchService } from "@/services/api";
import { getAvatarUrl, getImageUrl } from "@/utils/imageUtils";

export default function ChatSettingsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ convoId: string; isGroup?: string }>();
  const convoId = Array.isArray(params.convoId) ? params.convoId[0] : params.convoId;
  const isGroup = (Array.isArray(params.isGroup) ? params.isGroup[0] : params.isGroup) === "true";

  const { conversations, userId, themeColors, updateConversation, refreshChats } = useUser();

  const conversation = conversations.find(c => c.id === convoId);
  const myParticipant = conversation?.participants.find(p => p.userId === userId);

  const [title, setTitle] = useState(conversation?.title ?? "");
  const [isMuted, setIsMuted] = useState(myParticipant?.isMuted ?? false);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Add member modal
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);

  const currentMemberIds = new Set(conversation?.participants.map(p => p.userId) ?? []);
  const currentAvatar = avatarUri ?? (conversation?.avatarUrl ? getImageUrl(conversation.avatarUrl) : null);

  // Search users to add
  useEffect(() => {
    if (!addModalVisible) { setSearchQuery(""); setSearchResults([]); return; }
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchService.search(searchQuery.trim(), "users", userId, 20);
        const users = (res.users ?? res.results ?? []).filter((u: any) => !currentMemberIds.has(u.id));
        setSearchResults(users);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery, addModalVisible]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (!result.canceled) setAvatarUri(result.assets[0].uri);
  };

  const handleSave = async () => {
    if (!convoId) return;
    setSaving(true);
    try {
      let uploadedAvatarUrl: string | undefined;
      if (avatarUri) uploadedAvatarUrl = await postService.uploadImage(avatarUri);

      const data: { title?: string; avatarUrl?: string } = {};
      if (title.trim()) data.title = title.trim();
      if (uploadedAvatarUrl !== undefined) data.avatarUrl = uploadedAvatarUrl;

      if (Object.keys(data).length > 0) {
        await chatService.updateSettings(convoId, userId, data);
        updateConversation(convoId, data);
      }

      Alert.alert("บันทึกแล้ว", "ตั้งค่าแชทถูกอัปเดตเรียบร้อย");
      router.back();
    } catch {
      Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกการตั้งค่าได้");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleMute = async () => {
    if (!convoId) return;
    try {
      const newMuted = await chatService.toggleMute(convoId, userId);
      setIsMuted(newMuted);
      await refreshChats();
    } catch {
      Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถเปลี่ยนการแจ้งเตือนได้");
    }
  };

  const handleAddMember = async (targetUser: any) => {
    if (!convoId) return;
    setAddingId(targetUser.id);
    try {
      await chatService.addMember(convoId, userId, targetUser.id);
      await refreshChats();
      setSearchResults(prev => prev.filter(u => u.id !== targetUser.id));
    } catch {
      Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถเพิ่มสมาชิกได้");
    } finally {
      setAddingId(null);
    }
  };

  const handleRemoveMember = (target: any) => {
    const isSelf = target.userId === userId;
    Alert.alert(
      isSelf ? "ออกจากกลุ่ม" : "ลบสมาชิก",
      isSelf
        ? "คุณต้องการออกจากกลุ่มนี้ใช่หรือไม่?"
        : `ต้องการลบ ${target.user.fullName} ออกจากกลุ่มใช่หรือไม่?`,
      [
        { text: "ยกเลิก", style: "cancel" },
        {
          text: isSelf ? "ออกจากกลุ่ม" : "ลบ",
          style: "destructive",
          onPress: async () => {
            try {
              await chatService.removeMember(convoId!, userId, target.userId);
              await refreshChats();
              if (isSelf) router.replace("/(tabs)/messenger" as any);
            } catch {
              Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถดำเนินการได้");
            }
          },
        },
      ]
    );
  };

  if (!conversation) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: themeColors.background }}>
        <Stack.Screen options={{ gestureEnabled: true, gestureResponseDistance: { start: 100 } }} />
        <Ionicons name="alert-circle-outline" size={48} color={themeColors.subText} />
        <Text className="mt-3 font-bold" style={{ color: themeColors.text }}>ไม่พบข้อมูลแชท</Text>
        <Text className="text-xs mt-1" style={{ color: themeColors.subText }}>convoId: {convoId || "ไม่มี"}</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4 px-6 py-2 rounded-xl bg-violet-500">
          <Text className="text-white font-bold">กลับ</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: themeColors.background }}>
      <Stack.Screen options={{ gestureEnabled: true, fullScreenGestureEnabled: false, gestureResponseDistance: { start: 100 } }} />

      {/* Header */}
      <SafeAreaView edges={["top"]}>
        <View
          className="flex-row items-center justify-between px-4 py-3 border-b"
          style={{ borderBottomColor: themeColors.border, backgroundColor: themeColors.card }}
        >
          <TouchableOpacity onPress={() => router.back()} className="w-9 h-9 items-center justify-center">
            <Ionicons name="chevron-back" size={26} color={themeColors.text} />
          </TouchableOpacity>
          <Text className="text-base font-black" style={{ color: themeColors.text }}>ตั้งค่าแชท</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving} className="px-3 py-1.5 rounded-xl bg-violet-500">
            {saving
              ? <ActivityIndicator size="small" color="white" />
              : <Text className="text-white font-black text-xs">บันทึก</Text>
            }
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Avatar — group only */}
        {isGroup && (
          <View className="items-center pt-8 pb-6">
            <TouchableOpacity onPress={pickImage} className="relative">
              {currentAvatar ? (
                <Image source={{ uri: currentAvatar }} className="w-24 h-24 rounded-full" />
              ) : (
                <View className="w-24 h-24 rounded-full bg-violet-500 items-center justify-center">
                  <Ionicons name="people" size={40} color="white" />
                </View>
              )}
              <View
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full items-center justify-center border-2"
                style={{ backgroundColor: theme.colors.primary, borderColor: themeColors.background }}
              >
                <Ionicons name="camera" size={14} color="white" />
              </View>
            </TouchableOpacity>
            <Text className="mt-3 text-xs font-bold" style={{ color: themeColors.subText }}>
              กดเพื่อเปลี่ยนรูปกลุ่ม
            </Text>
          </View>
        )}

        {/* Name */}
        <View className="mx-4 mt-6">
          <Text className="text-[10px] font-black uppercase tracking-[2px] mb-2" style={{ color: themeColors.subText }}>
            {isGroup ? "ชื่อกลุ่ม" : "ชื่อแชท"}
          </Text>
          <View
            className="flex-row items-center rounded-2xl px-4 py-3 border"
            style={{ backgroundColor: themeColors.card, borderColor: themeColors.border }}
          >
            <Ionicons name="pencil-outline" size={16} color={themeColors.subText} style={{ marginRight: 10 }} />
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={isGroup ? "ชื่อกลุ่ม..." : "ชื่อแชท..."}
              placeholderTextColor={themeColors.subText}
              style={{ flex: 1, color: themeColors.text, fontSize: 14, fontWeight: "600" }}
              maxLength={60}
            />
          </View>
        </View>

        {/* Notifications */}
        <View className="mx-4 mt-6">
          <Text className="text-[10px] font-black uppercase tracking-[2px] mb-2" style={{ color: themeColors.subText }}>
            การแจ้งเตือน
          </Text>
          <View
            className="flex-row items-center justify-between rounded-2xl px-4 py-4 border"
            style={{ backgroundColor: themeColors.card, borderColor: themeColors.border }}
          >
            <View className="flex-row items-center gap-3">
              <Ionicons
                name={isMuted ? "notifications-off-outline" : "notifications-outline"}
                size={20}
                color={isMuted ? themeColors.subText : theme.colors.primary}
              />
              <View>
                <Text className="font-bold text-sm" style={{ color: themeColors.text }}>
                  {isMuted ? "ปิดการแจ้งเตือน" : "เปิดการแจ้งเตือน"}
                </Text>
                <Text className="text-[11px]" style={{ color: themeColors.subText }}>
                  {isMuted ? "คุณจะไม่ได้รับการแจ้งเตือนจากแชทนี้" : "คุณจะได้รับการแจ้งเตือนทุกข้อความ"}
                </Text>
              </View>
            </View>
            <Switch
              value={!isMuted}
              onValueChange={handleToggleMute}
              trackColor={{ false: themeColors.border, true: theme.colors.primary }}
              thumbColor="white"
            />
          </View>
        </View>

        {/* Members — group only */}
        {isGroup && (
          <View className="mx-4 mt-6 mb-10">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-[10px] font-black uppercase tracking-[2px]" style={{ color: themeColors.subText }}>
                สมาชิก ({conversation.participants.length})
              </Text>
              <TouchableOpacity
                onPress={() => setAddModalVisible(true)}
                className="flex-row items-center gap-1 px-3 py-1 rounded-xl bg-violet-500"
              >
                <Ionicons name="person-add-outline" size={13} color="white" />
                <Text className="text-white font-black text-[11px]">เพิ่ม</Text>
              </TouchableOpacity>
            </View>

            <View
              className="rounded-2xl border overflow-hidden"
              style={{ backgroundColor: themeColors.card, borderColor: themeColors.border }}
            >
              {conversation.participants.map((p, idx) => (
                <View
                  key={p.userId}
                  className="flex-row items-center px-4 py-3"
                  style={{ borderTopWidth: idx === 0 ? 0 : 1, borderTopColor: themeColors.border }}
                >
                  <Image
                    source={{ uri: getAvatarUrl(p.user.avatarUrl, p.user.fullName) }}
                    className="w-9 h-9 rounded-full mr-3"
                  />
                  <Text className="font-bold text-sm flex-1" style={{ color: themeColors.text }}>
                    {p.user.fullName}
                    {p.userId === userId
                      ? <Text className="font-normal text-xs" style={{ color: themeColors.subText }}> (คุณ)</Text>
                      : null}
                  </Text>
                  {/* ลบสมาชิก / ออกจากกลุ่ม */}
                  <TouchableOpacity
                    onPress={() => handleRemoveMember(p)}
                    className="w-8 h-8 items-center justify-center rounded-full"
                    style={{ backgroundColor: p.userId === userId ? "transparent" : "#FEE2E2" }}
                  >
                    <Ionicons
                      name={p.userId === userId ? "exit-outline" : "close"}
                      size={16}
                      color={p.userId === userId ? themeColors.subText : "#EF4444"}
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {!isGroup && <View className="h-10" />}
      </ScrollView>

      {/* Add Member Modal */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View className="flex-1" style={{ backgroundColor: themeColors.background }}>
          {/* Modal Header */}
          <SafeAreaView edges={["top"]}>
            <View
              className="flex-row items-center justify-between px-4 py-3 border-b"
              style={{ borderBottomColor: themeColors.border, backgroundColor: themeColors.card }}
            >
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <Text className="font-bold" style={{ color: themeColors.subText }}>ยกเลิก</Text>
              </TouchableOpacity>
              <Text className="font-black text-base" style={{ color: themeColors.text }}>เพิ่มสมาชิก</Text>
              <View className="w-14" />
            </View>
          </SafeAreaView>

          {/* Search Box */}
          <View
            className="mx-4 mt-4 flex-row items-center rounded-2xl px-4 py-2.5 border"
            style={{ backgroundColor: themeColors.card, borderColor: themeColors.border }}
          >
            <Ionicons name="search-outline" size={18} color={themeColors.subText} style={{ marginRight: 8 }} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="ค้นหาชื่อหรือรหัสนักศึกษา..."
              placeholderTextColor={themeColors.subText}
              style={{ flex: 1, color: themeColors.text, fontSize: 14 }}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={18} color={themeColors.subText} />
              </TouchableOpacity>
            )}
          </View>

          {/* Results */}
          {searching ? (
            <ActivityIndicator className="mt-8" size="large" color={theme.colors.primary} />
          ) : searchQuery.trim() === "" ? (
            <View className="flex-1 items-center justify-center">
              <Ionicons name="search-outline" size={48} color={themeColors.subText} />
              <Text className="mt-3 text-sm font-bold" style={{ color: themeColors.subText }}>
                พิมพ์ชื่อเพื่อค้นหา
              </Text>
            </View>
          ) : searchResults.length === 0 ? (
            <View className="flex-1 items-center justify-center">
              <Ionicons name="person-outline" size={48} color={themeColors.subText} />
              <Text className="mt-3 text-sm font-bold" style={{ color: themeColors.subText }}>
                ไม่พบผู้ใช้
              </Text>
            </View>
          ) : (
            <FlatList
              data={searchResults}
              keyExtractor={item => item.id}
              contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 }}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              renderItem={({ item }) => (
                <View
                  className="flex-row items-center px-4 py-3 rounded-2xl border"
                  style={{ backgroundColor: themeColors.card, borderColor: themeColors.border }}
                >
                  <Image
                    source={{ uri: getAvatarUrl(item.avatarUrl, item.fullName) }}
                    className="w-10 h-10 rounded-full mr-3"
                  />
                  <View className="flex-1">
                    <Text className="font-bold text-sm" style={{ color: themeColors.text }}>
                      {item.fullName}
                    </Text>
                    {item.faculty ? (
                      <Text className="text-[11px] font-bold text-violet-500">{item.faculty}</Text>
                    ) : null}
                  </View>
                  <TouchableOpacity
                    onPress={() => handleAddMember(item)}
                    disabled={addingId === item.id}
                    className="px-4 py-1.5 rounded-xl bg-violet-500"
                  >
                    {addingId === item.id
                      ? <ActivityIndicator size="small" color="white" />
                      : <Text className="text-white font-black text-xs">เพิ่ม</Text>
                    }
                  </TouchableOpacity>
                </View>
              )}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}
