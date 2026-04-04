import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Image, StatusBar } from "react-native";
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
  const { isDarkMode, faculty, addPost, userId, isAdmin, isUniAdmin, themeColors } = useUser();
  const [content, setContent] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState(params.tag || faculty || "DPU");
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const handlePost = async () => {
    if (!selectedImage && !content.trim()) {
      Alert.alert("Missing Content", "Please add an image or text.");
      return;
    }

    setLoading(true);
    try {
      const autoOfficial = isAdmin && (isUniAdmin || (selectedTag !== "DPU" && selectedTag === faculty));
      await addPost({ userId, content, image: selectedImage, tag: selectedTag, isOfficial: autoOfficial });
      Alert.alert("Success", "Post shared!");
      router.back();
    } catch (error) {
      Alert.alert("Error", "Failed to share post.");
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled) setSelectedImage(result.assets[0].uri);
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: themeColors.background }}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      <View className="flex-row items-center justify-between px-6 py-4 border-b" style={{ backgroundColor: themeColors.card, borderBottomColor: themeColors.border }}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="close" size={32} color={themeColors.text} /></TouchableOpacity>
        <Text className="text-lg font-black" style={{ color: themeColors.text }}>{isAdmin ? "Official Post" : "New Post"}</Text>
        <TouchableOpacity onPress={handlePost} disabled={loading || (!selectedImage && !content)}>
           <Text className={`font-black ${(loading || (!selectedImage && !content)) ? 'opacity-20' : ''}`} style={{ color: theme.colors.primary }}>Share</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-8 py-6" showsVerticalScrollIndicator={false}>
        <View className="rounded-[40px] border shadow-sm p-8 mb-6" style={{ backgroundColor: themeColors.card, borderColor: themeColors.border }}>
           <View className="mb-6">
              <Text className="text-[10px] font-black uppercase tracking-[2px] mb-3" style={{ color: themeColors.subText }}>Image</Text>
              {selectedImage ? (
                <View className="relative">
                  <Image source={{ uri: selectedImage }} className="w-full h-60 rounded-[30px]" />
                  <TouchableOpacity className="absolute top-2 right-2 bg-black/50 p-2 rounded-full" onPress={() => setSelectedImage(null)}><Ionicons name="close" size={20} color="white" /></TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity onPress={pickImage} className="w-full h-60 rounded-[30px] border-2 border-dashed items-center justify-center" style={{ borderColor: themeColors.border, backgroundColor: isDarkMode ? "#2D2D2D" : "#F9FAFB" }}>
                  <Ionicons name="image-outline" size={48} color={theme.colors.primary} />
                  <Text className="mt-4 font-bold text-[10px] uppercase tracking-[2px]" style={{ color: themeColors.subText }}>Gallery</Text>
                </TouchableOpacity>
              )}
           </View>

           <View className="mb-6">
              <Text className="text-[10px] font-black uppercase tracking-[2px] mb-3" style={{ color: themeColors.subText }}>Tag</Text>
              <TouchableOpacity onPress={() => setShowTagPicker(!showTagPicker)} className="bg-violet-50 px-6 py-3 rounded-2xl border border-violet-100 flex-row justify-between items-center">
                 <Text className="text-violet-500 font-bold text-xs uppercase">#{selectedTag}</Text>
                 <Ionicons name={showTagPicker ? "chevron-up" : "chevron-down"} size={16} color={theme.colors.primary} />
              </TouchableOpacity>
              {showTagPicker && (
                <View className="mt-2 p-2 rounded-2xl border flex-row flex-wrap" style={{ backgroundColor: themeColors.card, borderColor: themeColors.border }}>
                  {FACULTIES.map((tag) => (
                    <TouchableOpacity key={tag} onPress={() => { setSelectedTag(tag); setShowTagPicker(false); }} className={`px-4 py-2 rounded-full m-1 border ${selectedTag === tag ? 'bg-violet-500 border-violet-500' : 'bg-gray-50 border-gray-100'}`} style={selectedTag === tag ? {} : { backgroundColor: isDarkMode ? "#2D2D2D" : "#F9FAFB", borderColor: themeColors.border }}>
                      <Text className={`text-[10px] font-bold ${selectedTag === tag ? 'text-white' : themeColors.subText}`}>#{tag}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
           </View>

           <TextInput placeholder="Write something..." placeholderTextColor={themeColors.subText} className="font-medium text-base min-h-24" style={{ color: themeColors.text }} multiline value={content} onChangeText={setContent} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
