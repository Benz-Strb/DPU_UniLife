import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { theme } from "@/constants/theme";
import { useUser } from "@/store/UserContext";
import * as ImagePicker from 'expo-image-picker';
import { FACULTY_DATA } from "@/constants/data";

const FACULTIES = ["DPU", ...Object.keys(FACULTY_DATA)];

export default function NewPostScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tag: string }>();
  const { isDarkMode, name, profileImage, faculty, addPost, userId, isAdmin, isUniAdmin, themeColors } = useUser();
  const [content, setContent] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState(params.tag || faculty);
  const [showTagPicker, setShowTagPicker] = useState(false);

  const bgColor = themeColors.background;
  const cardColor = themeColors.card;
  const textColor = themeColors.text;
  const subTextColor = themeColors.subText;
  const borderColor = themeColors.border;

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('ขออภัย', 'เราต้องการสิทธิ์ในการเข้าถึงรูปภาพของคุณเพื่อโพสต์รูป');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handlePost = () => {
    if (!selectedImage) {
      Alert.alert("จำเป็นต้องใส่รูปภาพ", "กรุณาเลือกรูปภาพอย่างน้อย 1 รูป");
      return;
    }
    if (!content.trim()) {
      Alert.alert("กรุณากรอกข้อความ", "แชร์เรื่องราวของคุณสักนิดก่อนโพสต์");
      return;
    }

    const autoOfficial = isAdmin && (isUniAdmin || (selectedTag !== "DPU" && selectedTag === faculty));

    const newPost = {
      id: Date.now(),
      userId: userId,
      user: autoOfficial ? (isUniAdmin ? name : `Official ${selectedTag}`) : name,
      userAvatar: profileImage, 
      image: selectedImage,
      content: content,
      tag: selectedTag,
      isOfficial: autoOfficial,
      timestamp: "Just now",
      likes: 0,
      isLiked: false,
      comments: [],
    };

    addPost(newPost);
    Alert.alert("สำเร็จ", autoOfficial ? "ประกาศของคุณถูกแชร์เรียบร้อยแล้ว" : "โพสต์ของคุณถูกแชร์เรียบร้อยแล้ว");
    router.back();
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: bgColor }}>
      <View 
        className="flex-row items-center justify-between px-6 py-4 border-b" 
        style={{ backgroundColor: cardColor, borderBottomColor: borderColor }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={32} color={textColor} />
        </TouchableOpacity>
        <Text className="text-lg font-black" style={{ color: textColor }}>
          {isAdmin && (isUniAdmin || (selectedTag !== "DPU" && selectedTag === faculty)) ? "Official Announcement" : "Create Post"}
        </Text>
        <TouchableOpacity onPress={handlePost} disabled={!selectedImage || !content}>
           <Text className={`font-black ${(!selectedImage || !content) ? 'opacity-20' : ''}`} style={{ color: theme.colors.primary }}>แชร์</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-8 py-6" showsVerticalScrollIndicator={false}>
        <View 
          className="rounded-[40px] overflow-hidden border shadow-sm p-8 mb-6"
          style={{ backgroundColor: cardColor, borderColor: borderColor }}
        >
           <View className="mb-6">
              <Text className="text-[10px] font-black uppercase tracking-[2px] mb-3" style={{ color: subTextColor }}>Select Image (Required)</Text>
              
              {selectedImage ? (
                <View className="relative">
                  <Image source={{ uri: selectedImage }} className="w-full h-60 rounded-[30px]" />
                  <TouchableOpacity 
                    className="absolute top-2 right-2 bg-black/50 p-2 rounded-full"
                    onPress={() => setSelectedImage(null)}
                  >
                    <Ionicons name="close" size={20} color="white" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity 
                  onPress={pickImage}
                  className="w-full h-60 rounded-[30px] border-2 border-dashed items-center justify-center"
                  style={{ borderColor: borderColor, backgroundColor: isDarkMode ? "#2D2D2D" : "#F9FAFB" }}
                >
                  <Ionicons name="image-outline" size={48} color={theme.colors.primary} />
                  <Text className="mt-4 font-bold text-[11px] uppercase tracking-[2px]" style={{ color: subTextColor }}>Choose from Gallery</Text>
                </TouchableOpacity>
              )}
           </View>

           <View className="mb-6">
              <Text className="text-[10px] font-black uppercase tracking-[2px] mb-3" style={{ color: subTextColor }}>Select Tag</Text>
              <TouchableOpacity 
                onPress={() => setShowTagPicker(!showTagPicker)}
                className="bg-violet-50 px-6 py-3 rounded-2xl border border-violet-100 flex-row justify-between items-center"
              >
                 <Text className="text-violet-500 font-bold text-xs uppercase">#{selectedTag}</Text>
                 <Ionicons name={showTagPicker ? "chevron-up" : "chevron-down"} size={16} color={theme.colors.primary} />
              </TouchableOpacity>

              {showTagPicker && (
                <View className="mt-2 p-2 rounded-2xl border flex-row flex-wrap" style={{ backgroundColor: cardColor, borderColor: borderColor }}>
                  {FACULTIES.map((tag) => (
                    <TouchableOpacity 
                      key={tag}
                      onPress={() => {
                        setSelectedTag(tag);
                        setShowTagPicker(false);
                      }}
                      className={`px-4 py-2 rounded-full m-1 border ${selectedTag === tag ? 'bg-violet-500 border-violet-500' : 'bg-gray-50 border-gray-100'}`}
                      style={selectedTag === tag ? {} : { backgroundColor: isDarkMode ? "#2D2D2D" : "#F9FAFB", borderColor: borderColor }}
                    >
                      <Text className={`text-[10px] font-bold ${selectedTag === tag ? 'text-white' : subTextColor}`}>
                        #{tag}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
           </View>

           <TextInput 
             placeholder="What's happening?"
             placeholderTextColor={subTextColor} 
             className="font-medium text-base min-h-24 text-start"
             style={{ color: textColor }}
             multiline
             textAlignVertical="top"
             value={content}
             onChangeText={setContent}
           />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
