import React, { useState, useRef, useEffect } from "react";
import { View, Text, ScrollView, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Modal, StatusBar, Dimensions } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS } from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { theme } from "@/constants/theme";
import { useUser } from "@/store/UserContext";
import { getAvatarUrl, getImageUrl } from "@/utils/imageUtils";
import { postService, chatService } from "@/services/api";
import socket from "@/services/socket";

export default function ChatDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ userName: string; userAvatar: string; userId: string; id: string; isGroup?: string }>();
  const { userName: nameFromParams, userAvatar: avatarFromParams, userId: targetUserId, id: convoIdFromParams, isGroup } = params;
  const isGroupChat = isGroup === "true";
  const { isDarkMode, themeColors, userId, conversations, sendMessage, getDirectChat, setUser, setActiveChatId, refreshChats } = useUser();
  const [inputText, setInputText] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const screenHeight = Dimensions.get("screen").height;

  // Shared values for image viewer
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const dismissImage = () => setSelectedImage(null);

  const openImage = (url: string) => {
    scale.value = 1;
    savedScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
    setSelectedImage(url);
  };

  const closeImageModal = () => {
    translateY.value = withTiming(screenHeight, { duration: 250 }, () => {
      runOnJS(dismissImage)();
    });
  };

  // Double tap: zoom in / zoom out
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        scale.value = withSpring(1);
        savedScale.value = 1;
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        scale.value = withSpring(2.5);
        savedScale.value = 2.5;
      }
    });

  // Pinch to zoom
  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.max(1, savedScale.value * e.scale);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  // Pan: drag image when zoomed, or swipe down to close when not zoomed
  const pan = Gesture.Pan()
    .minPointers(1)
    .maxPointers(1)
    .onUpdate((e) => {
      if (scale.value > 1) {
        translateX.value = savedTranslateX.value + e.translationX;
        translateY.value = savedTranslateY.value + e.translationY;
      } else if (e.translationY > 0) {
        translateY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (scale.value <= 1) {
        if (e.translationY > 80 || e.velocityY > 500) {
          translateY.value = withTiming(screenHeight, { duration: 250 }, () => {
            runOnJS(dismissImage)();
          });
        } else {
          translateY.value = withSpring(0);
        }
      } else {
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      }
    });

  const imageGesture = Gesture.Simultaneous(pinch, Gesture.Race(doubleTap, pan));

  const imageAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));
  const scrollViewRef = useRef<ScrollView>(null);
  const [activeConvoId, setActiveConvoId] = useState(convoIdFromParams);

  // mark-as-read helper — อัปเดต lastReadAt แล้ว refresh badge
  const markRead = async (convoId: string) => {
    await chatService.markAsRead(convoId, userId);
    await refreshChats();
  };

  // เชื่อมต่อ Socket เมื่อเปิดหน้าแชท
  useEffect(() => {
    socket.connect();

    if (activeConvoId) {
      socket.emit("join_room", activeConvoId);
      setActiveChatId(activeConvoId);
      markRead(activeConvoId); // ล้าง badge ทันทีที่เปิดแชท
    }

    // เมื่อได้รับข้อความใหม่ขณะอยู่ในหน้านี้ → mark as read ทันที
    socket.on("receive_message", (_data: any) => {
      if (activeConvoId) markRead(activeConvoId);
    });

    return () => {
      socket.off("receive_message");
      if (activeConvoId) {
        socket.emit("leave_room", activeConvoId);
      }
      setActiveChatId(null);
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


  const recipient = currentConversation?.participants.find(p => p.userId !== userId)?.user;
  const userName = isGroupChat ? (currentConversation?.title || nameFromParams || "Group Chat") : (recipient?.fullName || nameFromParams || "Chat");
  const userAvatar = isGroupChat ? null : getAvatarUrl(recipient?.avatarUrl || avatarFromParams, userName);

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: themeColors.background }}>
      <Stack.Screen options={{ gestureEnabled: true, fullScreenGestureEnabled: false, gestureResponseDistance: { start: 100 } }} />
      <View className="flex-row items-center px-4 py-3 border-b" style={{ borderBottomColor: themeColors.border }}>
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="chevron-back" size={28} color={themeColors.text} />
        </TouchableOpacity>

        {/* กดชื่อ/รูปเพื่อเปิด chat-settings */}
        <TouchableOpacity
          className="flex-row items-center flex-1 ml-2"
          onPress={() => {
            if (!activeConvoId) return;
            router.push(`/chat-settings?convoId=${activeConvoId}&isGroup=${isGroupChat ? "true" : "false"}` as any);
          }}
          activeOpacity={0.7}
        >
          {isGroupChat ? (
            currentConversation?.avatarUrl ? (
              <Image source={{ uri: getImageUrl(currentConversation.avatarUrl) }} className="w-9 h-9 rounded-full" />
            ) : (
              <View className="w-9 h-9 rounded-full items-center justify-center bg-violet-500">
                <Ionicons name="people" size={18} color="white" />
              </View>
            )
          ) : (
            <Image source={{ uri: userAvatar! }} className="w-9 h-9 rounded-full" />
          )}
          <View className="ml-3 flex-1">
            <Text className="font-bold text-sm" style={{ color: themeColors.text }}>{userName}</Text>
            <Text className="text-[10px]" style={{ color: theme.colors.primary }}>
              {isGroupChat ? `${currentConversation?.participants?.length ?? 0} members` : "Active now"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={themeColors.border} style={{ marginRight: 4 }} />
        </TouchableOpacity>
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
                    <TouchableOpacity onPress={() => openImage(imgUrl)} activeOpacity={0.9}>
                      <Image
                        source={{ uri: imgUrl }}
                        className={`w-56 h-56 rounded-2xl ${isMe ? "rounded-br-[4px]" : "rounded-bl-[4px]"}`}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  ) : (
                    <View
                      className={`px-4 py-3 ${isMe ? "rounded-[24px] rounded-br-[4px]" : "rounded-[24px] rounded-bl-[4px]"}`}
                      style={{ backgroundColor: isMe ? theme.colors.primary : themeColors.card }}
                    >
                      <Text className="text-sm font-medium" style={{ color: isMe ? "#FFFFFF" : themeColors.text }}>
                        {msg.body}
                      </Text>
                    </View>
                  )}
                  <Text
                    className={`text-[8px] mt-1 ${isMe ? "text-right" : ""}`}
                    style={{ color: themeColors.subText }}
                  >
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

        <View className="p-4 flex-row items-center gap-2 border-t" style={{ borderTopColor: themeColors.border }}>
          <TouchableOpacity onPress={handlePickImage} disabled={isUploadingImage} className="w-10 h-10 items-center justify-center rounded-full" style={{ backgroundColor: themeColors.card }}>
            {isUploadingImage ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Ionicons name="image-outline" size={22} color={themeColors.text} />
            )}
          </TouchableOpacity>
          <View className="flex-1 flex-row items-center rounded-full px-5 py-2" style={{ backgroundColor: themeColors.card }}>
            <TextInput
              placeholder="Message..."
              placeholderTextColor={themeColors.subText}
              className="flex-1 text-sm font-medium h-10"
              style={{ color: themeColors.text }}
              value={inputText}
              onChangeText={setInputText}
              multiline
              returnKeyType="send"
              onSubmitEditing={handleSendMessage}
            />
            {inputText.trim() && (
              <TouchableOpacity onPress={handleSendMessage} className="ml-2">
                <Ionicons name="send" size={22} color="#8b5cf6" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
      <Modal visible={!!selectedImage} transparent animationType="fade" onRequestClose={closeImageModal}>
        <StatusBar backgroundColor="black" barStyle="light-content" />
        <View className="flex-1 bg-black">
          <TouchableOpacity
            className="absolute top-12 right-4 z-10 w-10 h-10 items-center justify-center rounded-full bg-black/50"
            onPress={closeImageModal}
          >
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
          {selectedImage && (
            <GestureDetector gesture={imageGesture}>
              <Animated.View style={[{ flex: 1 }, imageAnimatedStyle]}>
                <Image
                  source={{ uri: selectedImage }}
                  style={{ flex: 1 }}
                  resizeMode="contain"
                />
              </Animated.View>
            </GestureDetector>
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}
