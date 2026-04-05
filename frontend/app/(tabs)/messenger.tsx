import React from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, TextInput, StatusBar, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { theme } from "@/constants/theme";
import { useUser } from "@/store/UserContext";
import { BASE_URL } from "@/services/api";

export default function MessengerScreen() {
  const router = useRouter();
  const { isDarkMode, conversations, userId, themeColors, deleteConversation } = useUser();

  const getFullImageUrl = (url: string | null | undefined, name: string) => {
    if (!url) return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=7C3AED&color=fff`;
    if (url.startsWith('http')) return url;
    return `${BASE_URL}${url}`;
  };

  const handleDeleteConversation = (convoId: string, name: string) => {
    Alert.alert(
      "Delete Chat",
      `Are you sure you want to delete the chat with ${name}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            try {
              await deleteConversation(convoId);
            } catch (e) {
              Alert.alert("Error", "Could not delete the chat.");
            }
          } 
        }
      ]
    );
  };

  const bgColor = themeColors.background;
  const cardColor = themeColors.card;
  const textColor = themeColors.text;
  const subTextColor = themeColors.subText;
  const borderColor = themeColors.border;

  return (
    <View className="flex-1" style={{ backgroundColor: bgColor }}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      
      <SafeAreaView className="flex-1">
        <View className="flex-row items-center justify-between px-6 py-4">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="w-10 h-10 rounded-2xl items-center justify-center bg-white shadow-sm"
          >
            <Ionicons name="chevron-back" size={24} color={textColor} />
          </TouchableOpacity>
          <Text className="text-xl font-black" style={{ color: textColor }}>Messages</Text>
          <TouchableOpacity className="w-10 h-10 rounded-2xl items-center justify-center bg-white shadow-sm">
            <Ionicons name="create-outline" size={22} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        <View className="px-6 py-2">
          <View 
            className="flex-row items-center px-5 py-3 rounded-2xl border border-white"
            style={{ backgroundColor: cardColor, shadowColor: "#000", shadowOpacity: 0.02, elevation: 1 }}
          >
            <Ionicons name="search" size={20} color="#94A3B8" />
            <TextInput 
              placeholder="Search conversations..."
              className="flex-1 ml-3 font-bold text-sm"
              placeholderTextColor="#94A3B8"
              style={{ color: textColor }}
            />
          </View>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="px-6 pt-4 pb-20">
            {conversations.length === 0 ? (
              <View className="items-center justify-center py-20">
                <Ionicons name="chatbubbles-outline" size={48} color="#D1D5DB" />
                <Text className="mt-4 font-bold text-gray-400">No messages yet</Text>
              </View>
            ) : (
              conversations.map((convo) => {
                const otherParticipant = convo.participants?.find(p => p.userId !== userId)?.user;
                const lastMsg = convo.messages && convo.messages.length > 0 ? convo.messages[convo.messages.length - 1] : null;
                const participantName = otherParticipant?.fullName || "User";
                const participantAvatar = getFullImageUrl(otherParticipant?.avatarUrl, participantName);

                return (
                  <TouchableOpacity 
                    key={convo.id}
                    onPress={() => router.push({
                      pathname: "/chat-detail",
                      params: { 
                        id: convo.id,
                        userName: participantName, 
                        userAvatar: participantAvatar,
                        userId: otherParticipant?.id 
                      }
                    })}
                    onLongPress={() => handleDeleteConversation(convo.id, participantName)}
                    className="flex-row items-center mb-6 p-4 rounded-[30px] border border-white"
                    style={{ backgroundColor: cardColor, shadowColor: "#000", shadowOpacity: 0.03, elevation: 2 }}
                  >
                    <Image source={{ uri: participantAvatar }} className="w-14 h-14 rounded-[20px]" />
                    <View className="flex-1 ml-4">
                      <View className="flex-row justify-between items-center mb-1">
                        <Text className="font-black text-sm" style={{ color: textColor }}>{participantName}</Text>
                        <Text className="text-[10px] font-bold text-gray-400">{lastMsg ? new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}</Text>
                      </View>
                      <Text className="text-xs font-medium" style={{ color: subTextColor }} numberOfLines={1}>
                        {lastMsg ? lastMsg.body : "No messages yet"}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
