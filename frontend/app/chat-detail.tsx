import React, { useState, useRef, useEffect } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { theme } from "@/constants/theme";
import { useUser } from "@/store/UserContext";
import { getAvatarUrl, getImageUrl } from "@/utils/imageUtils";
import { postService } from "@/services/api";
import socket from "@/services/socket";

export default function ChatDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ userName: string; userAvatar: string; userId: string; id: string; isGroup?: string }>();
  const { userName: nameFromParams, userAvatar: avatarFromParams, userId: targetUserId, id: convoIdFromParams, isGroup } = params;
  const isGroupChat = isGroup === "true";
  const { isDarkMode, userId, conversations, sendMessage, getDirectChat, setUser, setActiveChatId } = useUser();
  const [inputText, setInputText] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [activeConvoId, setActiveConvoId] = useState(convoIdFromParams);

  // เชื่อมต่อ Socket เมื่อเปิดหน้าแชท
  useEffect(() => {
    socket.connect();
    
    if (activeConvoId) {
      socket.emit("join_room", activeConvoId);
      setActiveChatId(activeConvoId); // แจ้ง Context ว่าเราอยู่ในห้องนี้
    }

    // ฟังข้อความใหม่จาก Socket
    socket.on("receive_message", (data) => {
      // เมื่อได้รับข้อความใหม่ ให้สั่ง Refresh รายการแชทใน Context
      // (Context ของเรามีการ Fetch ทุก 3 วินาทีอยู่แล้ว แต่ Socket จะช่วยให้เร็วขึ้น)
      // ในที่นี้ Socket จะเป็นตัวกระตุ้นให้เกิดการอัปเดต UI ทันที
    });

    return () => {
      socket.off("receive_message");
      if (activeConvoId) {
        socket.emit("leave_room", activeConvoId);
      }
      setActiveChatId(null); // ออกจากห้องแชทแล้ว
    };
  }, [activeConvoId]);

  // หา conversation จาก ID หรือจากผู้เข้าร่วม
  const currentConversation = conversations.find(c => 
    c.id === activeConvoId || 
    (targetUserId && c.type === "DIRECT" && c.participants.some(p => p.userId === targetUserId))
  );

  useEffect(() => {
    if (!activeConvoId && targetUserId) {
      getDirectChat(targetUserId).then(convo => {
        if (convo) setActiveConvoId(convo.id);
      });
    }
  }, [targetUserId]);

  const messages = currentConversation ? currentConversation.messages : [];

  const handleSendMessage = () => {
    if (inputText.trim() && activeConvoId) {
      const messageBody = inputText.trim();
      sendMessage(activeConvoId, messageBody);
      socket.emit("send_message", { convoId: activeConvoId, senderId: userId, body: messageBody, createdAt: new Date().toISOString() });
      setInputText("");
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow access to your photo library.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (result.canceled || !result.assets?.[0]) return;
    if (!activeConvoId) return;
    setIsUploadingImage(true);
    try {
      const uploadedUrl = await postService.uploadImage(result.assets[0].uri);
      await sendMessage(activeConvoId, "", uploadedUrl, "IMAGE");
      socket.emit("send_message", { convoId: activeConvoId, senderId: userId, body: "", attachmentUrl: uploadedUrl, attachmentType: "IMAGE", createdAt: new Date().toISOString() });
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      Alert.alert("Error", "Could not send image.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const bgColor = isDarkMode ? "#121212" : "#FFFFFF";
  const textColor = isDarkMode ? "#FFFFFF" : "#1F2937";
  const subTextColor = isDarkMode ? "#A0A0A0" : "#6B7280";
  const inputBgColor = isDarkMode ? "#2D2D2D" : "#F3F4F6";

  const recipient = currentConversation?.participants.find(p => p.userId !== userId)?.user;
  const userName = isGroupChat ? (nameFromParams || currentConversation?.title || "Group Chat") : (recipient?.fullName || nameFromParams || "Chat");
  const userAvatar = isGroupChat ? null : getAvatarUrl(recipient?.avatarUrl || avatarFromParams, userName);

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: bgColor }}>
      <Stack.Screen options={{ gestureEnabled: true, fullScreenGestureEnabled: false, gestureResponseDistance: 100 }} />
      <View className="flex-row items-center px-4 py-3 border-b" style={{ borderBottomColor: isDarkMode ? "#333" : "#F3F4F6" }}>
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="chevron-back" size={28} color={textColor} />
        </TouchableOpacity>
        {isGroupChat ? (
          <View className="w-9 h-9 rounded-full ml-2 items-center justify-center bg-violet-500">
            <Ionicons name="people" size={18} color="white" />
          </View>
        ) : (
          <Image source={{ uri: userAvatar! }} className="w-9 h-9 rounded-full ml-2" />
        )}
        <View className="ml-3 flex-1">
          <Text className="font-bold text-sm" style={{ color: textColor }}>{userName}</Text>
          <Text className="text-[10px]" style={{ color: theme.colors.primary }}>{isGroupChat ? `${currentConversation?.participants?.length ?? 0} members` : "Active now"}</Text>
        </View>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : undefined} 
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView 
          ref={scrollViewRef}
          className="flex-1 px-4 py-4"
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
        >
          {messages.map((msg, idx) => {
            const isMe = msg.senderId === userId;
            const hasImage = msg.attachmentType === "IMAGE" && msg.attachmentUrl;
            const imgUrl = hasImage ? getImageUrl(msg.attachmentUrl) : undefined;
            return (
              <View
                key={msg.id || idx}
                className={`mb-4 flex-row ${isMe ? "justify-end" : "justify-start"}`}
              >
                {!isMe && (
                  <Image
                    source={{ uri: isGroupChat ? getAvatarUrl(msg.sender?.avatarUrl, msg.sender?.fullName) : userAvatar! }}
                    className="w-7 h-7 rounded-full self-end mb-1 mr-2"
                  />
                )}
                <View className={`max-w-[75%] ${isMe ? "items-end" : "items-start"}`}>
                  {isGroupChat && !isMe && (
                    <Text className="text-[10px] font-bold text-violet-400 mb-1 ml-1">{msg.sender?.fullName ?? ""}</Text>
                  )}
                  {imgUrl ? (
                    <Image
                      source={{ uri: imgUrl }}
                      className={`w-56 h-56 rounded-2xl ${isMe ? "rounded-br-[4px]" : "rounded-bl-[4px]"}`}
                      resizeMode="cover"
                    />
                  ) : (
                    <View
                      className={`px-4 py-3 ${isMe ? "rounded-[24px] rounded-br-[4px]" : "rounded-[24px] rounded-bl-[4px]"}`}
                      style={{ backgroundColor: isMe ? theme.colors.primary : (isDarkMode ? "#333" : "#F3F4F6") }}
                    >
                      <Text className="text-sm font-medium" style={{ color: isMe ? "white" : textColor }}>
                        {msg.body}
                      </Text>
                    </View>
                  )}
                  <Text
                    className={`text-[8px] mt-1 ${isMe ? "text-right text-gray-400" : "text-gray-400"}`}
                  >
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

        <View className="p-4 flex-row items-center gap-2 border-t" style={{ borderTopColor: isDarkMode ? "#333" : "#F3F4F6" }}>
          <TouchableOpacity onPress={handlePickImage} disabled={isUploadingImage} className="w-10 h-10 items-center justify-center rounded-full" style={{ backgroundColor: inputBgColor }}>
            {isUploadingImage ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Ionicons name="image-outline" size={22} color={textColor} />
            )}
          </TouchableOpacity>
          <View className="flex-1 flex-row items-center rounded-full px-5 py-2" style={{ backgroundColor: inputBgColor }}>
            <TextInput
              placeholder="Message..."
              placeholderTextColor={subTextColor}
              className="flex-1 text-sm font-medium h-10"
              style={{ color: textColor }}
              value={inputText}
              onChangeText={setInputText}
              multiline
              returnKeyType="send"
              onSubmitEditing={handleSendMessage}
            />
            {inputText.trim() ? (
              <TouchableOpacity onPress={handleSendMessage}>
                <Text className="font-bold text-violet-500 ml-2">Send</Text>
              </TouchableOpacity>
            ) : (
              <Ionicons name="mic-outline" size={22} color={textColor} />
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
