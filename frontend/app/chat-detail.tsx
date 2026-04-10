import React, { useState, useRef, useEffect } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { theme } from "@/constants/theme";
import { useUser } from "@/store/UserContext";
import { getAvatarUrl } from "@/utils/imageUtils";
import socket from "@/services/socket";

export default function ChatDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ userName: string; userAvatar: string; userId: string; id: string }>();
  const { userName: nameFromParams, userAvatar: avatarFromParams, userId: targetUserId, id: convoIdFromParams } = params;
  const { isDarkMode, userId, conversations, sendMessage, getDirectChat, setUser, setActiveChatId } = useUser();
  const [inputText, setInputText] = useState("");
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
      
      // ส่งผ่าน Socket ไปบอกคนในห้อง
      socket.emit("send_message", {
        convoId: activeConvoId,
        senderId: userId,
        body: messageBody,
        createdAt: new Date().toISOString()
      });

      setInputText("");
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const bgColor = isDarkMode ? "#121212" : "#FFFFFF";
  const textColor = isDarkMode ? "#FFFFFF" : "#1F2937";
  const subTextColor = isDarkMode ? "#A0A0A0" : "#6B7280";
  const inputBgColor = isDarkMode ? "#2D2D2D" : "#F3F4F6";

  const recipient = currentConversation?.participants.find(p => p.userId !== userId)?.user;
  const userName = recipient?.fullName || nameFromParams || "Chat";
  const userAvatar = getAvatarUrl(recipient?.avatarUrl || avatarFromParams, userName);

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: bgColor }}>
      <View className="flex-row items-center px-4 py-3 border-b" style={{ borderBottomColor: isDarkMode ? "#333" : "#F3F4F6" }}>
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="chevron-back" size={28} color={textColor} />
        </TouchableOpacity>
        <Image source={{ uri: userAvatar }} className="w-9 h-9 rounded-full ml-2" />
        <View className="ml-3 flex-1">
          <Text className="font-bold text-sm" style={{ color: textColor }}>{userName}</Text>
          <Text className="text-[10px]" style={{ color: theme.colors.primary }}>Active now</Text>
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
            return (
              <View 
                key={msg.id || idx} 
                className={`mb-4 flex-row ${isMe ? "justify-end" : "justify-start"}`}
              >
                {!isMe && (
                  <Image source={{ uri: userAvatar }} className="w-7 h-7 rounded-full self-end mb-1 mr-2" />
                )}
                <View 
                  className={`max-w-[75%] px-4 py-3 ${isMe ? "rounded-[24px] rounded-br-[4px]" : "rounded-[24px] rounded-bl-[4px]"}`}
                  style={{ backgroundColor: isMe ? theme.colors.primary : (isDarkMode ? "#333" : "#F3F4F6") }}
                >
                  <Text className="text-sm font-medium" style={{ color: isMe ? "white" : textColor }}>
                    {msg.body}
                  </Text>
                  <Text 
                    className={`text-[8px] mt-1 ${isMe ? "text-violet-200" : "text-gray-400"}`}
                    style={{ textAlign: isMe ? "right" : "left" }}
                  >
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

        <View className="p-4 flex-row items-center border-t" style={{ borderTopColor: isDarkMode ? "#333" : "#F3F4F6" }}>
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
