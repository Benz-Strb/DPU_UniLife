import React, { useState, useEffect } from "react";
import { View, Text, TextInput, ScrollView, TouchableOpacity, Image, StatusBar, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, Stack } from "expo-router";
import { theme } from "@/constants/theme";
import { useUser } from "@/store/UserContext";
import { searchService, chatService } from "@/services/api";
import { getAvatarUrl } from "@/utils/imageUtils";

export default function NewGroupScreen() {
  const router = useRouter();
  const { userId, themeColors } = useUser();

  const [groupName, setGroupName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      const result = await searchService.search(searchQuery.trim(), "users", userId ?? undefined, 20);
      setSearchResults(result.users?.filter((u: any) => u.id !== userId) ?? []);
      setIsSearching(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const toggleUser = (user: any) => {
    setSelectedUsers(prev =>
      prev.some(u => u.id === user.id)
        ? prev.filter(u => u.id !== user.id)
        : [...prev, user]
    );
  };

  const handleCreate = async () => {
    if (!groupName.trim()) { Alert.alert("กรุณาตั้งชื่อกลุ่ม"); return; }
    if (selectedUsers.length < 1) { Alert.alert("กรุณาเลือกสมาชิกอย่างน้อย 1 คน"); return; }
    setIsCreating(true);
    try {
      const response = await chatService.createGroupChat(
        userId,
        groupName.trim(),
        selectedUsers.map(u => u.id)
      );
      router.replace({
        pathname: "/chat-detail",
        params: {
          id: response.id,
          userName: groupName.trim(),
          userAvatar: "",
          userId: "",
          isGroup: "true",
        },
      });
    } catch {
      Alert.alert("Error", "ไม่สามารถสร้างกลุ่มได้");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: themeColors.background }}>
      <Stack.Screen options={{ gestureEnabled: true, fullScreenGestureEnabled: false, gestureResponseDistance: 100 }} />
      <StatusBar barStyle={themeColors.statusBar as any} />
      <SafeAreaView className="flex-1" edges={["top"]}>

        {/* Header */}
        <View className="flex-row items-center justify-between px-6 py-4">
          <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center rounded-2xl" style={{ backgroundColor: themeColors.card }}>
            <Ionicons name="chevron-back" size={24} color={themeColors.text} />
          </TouchableOpacity>
          <Text className="text-lg font-black" style={{ color: themeColors.text }}>New Group</Text>
          <TouchableOpacity
            onPress={handleCreate}
            disabled={isCreating}
            className="px-4 py-2 rounded-2xl bg-violet-500"
          >
            <Text className="text-white font-black text-xs uppercase tracking-widest">
              {isCreating ? "Creating..." : "Create"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Group Name Input */}
        <View className="px-6 mb-4">
          <View className="flex-row items-center px-4 py-3 rounded-2xl border" style={{ backgroundColor: themeColors.card, borderColor: themeColors.border }}>
            <View className="w-9 h-9 rounded-xl bg-violet-500 items-center justify-center mr-3">
              <Ionicons name="people" size={18} color="white" />
            </View>
            <TextInput
              placeholder="Group name..."
              placeholderTextColor={themeColors.subText}
              value={groupName}
              onChangeText={setGroupName}
              className="flex-1 font-bold text-sm"
              style={{ color: themeColors.text }}
            />
          </View>
        </View>

        {/* Selected Members */}
        {selectedUsers.length > 0 && (
          <View className="px-6 mb-4">
            <Text className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">{selectedUsers.length} Selected</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-3">
              {selectedUsers.map(user => (
                <TouchableOpacity key={user.id} onPress={() => toggleUser(user)} className="items-center mr-3">
                  <View className="relative">
                    <Image source={{ uri: getAvatarUrl(user.avatarUrl, user.fullName) }} className="w-12 h-12 rounded-2xl" />
                    <View className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 items-center justify-center">
                      <Ionicons name="close" size={10} color="white" />
                    </View>
                  </View>
                  <Text className="text-[9px] font-bold mt-1 text-center w-14" style={{ color: themeColors.subText }} numberOfLines={1}>{user.fullName}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Search */}
        <View className="px-6 mb-3">
          <View className="flex-row items-center px-4 py-3 rounded-2xl border" style={{ backgroundColor: themeColors.card, borderColor: themeColors.border }}>
            <Ionicons name="search" size={18} color={themeColors.subText} />
            <TextInput
              placeholder="Search people..."
              placeholderTextColor={themeColors.subText}
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="flex-1 ml-3 font-bold text-sm"
              style={{ color: themeColors.text }}
            />
            {isSearching && <ActivityIndicator size="small" color={theme.colors.primary} />}
          </View>
        </View>

        {/* Results */}
        <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
          {searchResults.map(user => {
            const isSelected = selectedUsers.some(u => u.id === user.id);
            return (
              <TouchableOpacity
                key={user.id}
                onPress={() => toggleUser(user)}
                className="flex-row items-center mb-3 p-3 rounded-2xl"
                style={{ backgroundColor: themeColors.card }}
              >
                <Image source={{ uri: getAvatarUrl(user.avatarUrl, user.fullName) }} className="w-11 h-11 rounded-xl" />
                <View className="flex-1 ml-3">
                  <Text className="font-black text-sm" style={{ color: themeColors.text }}>{user.fullName}</Text>
                  <Text className="text-xs" style={{ color: themeColors.subText }}>@{user.username}</Text>
                </View>
                <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${isSelected ? "bg-violet-500 border-violet-500" : "border-gray-300"}`}>
                  {isSelected && <Ionicons name="checkmark" size={12} color="white" />}
                </View>
              </TouchableOpacity>
            );
          })}
          {searchQuery.trim() && !isSearching && searchResults.length === 0 && (
            <Text className="text-center text-gray-400 text-sm mt-10">No users found</Text>
          )}
          {!searchQuery.trim() && (
            <Text className="text-center text-gray-400 text-sm mt-10">Search for people to add</Text>
          )}
          <View className="h-20" />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
