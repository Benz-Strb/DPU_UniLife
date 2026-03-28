import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { theme } from "@/constants/theme";
import { useUser } from "@/store/UserContext";
import * as ImagePicker from 'expo-image-picker';

export default function EditProfileScreen() {
  const router = useRouter();
  const { name, bio, isDarkMode, profileImage, setProfileImage, themeColors, user, updateProfile } = useUser();
  const [username, setUsernameInput] = useState(user?.username || "");
  const [fullName, setFullNameInput] = useState(name);
  const [bioInput, setBioInput] = useState(bio);

  const validateEnglishOnly = (text: string) => /^[A-Za-z0-9_\s]+$/.test(text);

  const handleSave = async () => {
    if (!fullName.trim() || !username.trim()) {
      Alert.alert("Error", "Name and Username are required.");
      return;
    }

    if (!validateEnglishOnly(fullName)) {
      Alert.alert("Invalid Name", "Full Name must be in English only.");
      return;
    }

    if (!validateEnglishOnly(username)) {
      Alert.alert("Invalid Username", "Username must be in English and can only contain letters, numbers, and underscores.");
      return;
    }

    await updateProfile({
      fullName,
      username: username.toLowerCase().replace(/\s+/g, '_'),
      bio: bioInput,
      avatarUrl: profileImage
    });

    Alert.alert("Success", "Profile updated successfully!");
    router.back();
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('ขออภัย', 'เราต้องการสิทธิ์ในการเข้าถึงรูปภาพของคุณเพื่อเปลี่ยนรูปโปรไฟล์');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
    }
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: themeColors.background }}>
      <View 
        className="flex-row items-center px-6 py-4 border-b" 
        style={{ backgroundColor: themeColors.card, borderBottomColor: themeColors.border }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={themeColors.text} />
        </TouchableOpacity>
        <Text className="text-lg font-black ml-4" style={{ color: themeColors.text }}>Edit profile</Text>
      </View>

      <ScrollView className="flex-1 px-8 py-6" showsVerticalScrollIndicator={false}>
        <View className="items-center mb-10">
          <TouchableOpacity 
            onPress={pickImage}
            className="w-28 h-28 rounded-full items-center justify-center border-4 p-1"
            style={{ backgroundColor: themeColors.iconBg, borderColor: themeColors.border }}
          >
             <View className="w-full h-full rounded-full bg-white items-center justify-center overflow-hidden">
                {profileImage ? (
                  <Image source={{ uri: profileImage }} className="w-full h-full" />
                ) : (
                  <Ionicons name="camera" size={32} color={theme.colors.primaryLight} />
                )}
             </View>
             <View className="absolute bottom-0 right-0 bg-violet-500 w-8 h-8 rounded-full items-center justify-center border-2 border-white">
                <Ionicons name="pencil" size={14} color="white" />
             </View>
          </TouchableOpacity>
        </View>

        <View className="space-y-8">
          <View>
            <View className="flex-row items-center mb-2 ml-1">
              <Ionicons name="person-outline" size={16} color={theme.colors.primary} />
              <Text className="text-[10px] font-black uppercase tracking-[2px] ml-2" style={{ color: themeColors.subText }}>Full Name (English Only)</Text>
            </View>
            <TextInput 
              className="px-6 py-4 rounded-3xl border font-bold"
              style={{ backgroundColor: themeColors.card, borderColor: themeColors.border, color: themeColors.text }}
              value={fullName}
              onChangeText={setFullNameInput}
              placeholder="Your Full Name"
              placeholderTextColor={themeColors.subText}
            />
          </View>

          <View className="mt-6">
            <View className="flex-row items-center mb-2 ml-1">
              <Ionicons name="at-circle-outline" size={16} color={theme.colors.primary} />
              <Text className="text-[10px] font-black uppercase tracking-[2px] ml-2" style={{ color: themeColors.subText }}>Username (English Only)</Text>
            </View>
            <TextInput 
              className="px-6 py-4 rounded-3xl border font-bold"
              style={{ backgroundColor: themeColors.card, borderColor: themeColors.border, color: themeColors.text }}
              value={username}
              onChangeText={setUsernameInput}
              placeholder="username"
              placeholderTextColor={themeColors.subText}
              autoCapitalize="none"
            />
          </View>

          <View className="mt-6">
            <View className="flex-row items-center mb-2 ml-1">
              <Ionicons name="document-text-outline" size={16} color={theme.colors.primary} />
              <Text className="text-[10px] font-black uppercase tracking-[2px] ml-2" style={{ color: themeColors.subText }}>About You</Text>
            </View>
            <TextInput 
              className="px-6 py-4 rounded-3xl border font-bold h-24"
              style={{ backgroundColor: themeColors.card, borderColor: themeColors.border, color: themeColors.text }}
              value={bioInput}
              onChangeText={setBioInput}
              placeholder="Write a bio..."
              placeholderTextColor={themeColors.subText}
              multiline
            />
          </View>
        </View>

        <TouchableOpacity 
          onPress={handleSave}
          className="w-full py-5 rounded-[24px] mt-12 mb-10 items-center shadow-md"
          style={{ backgroundColor: theme.colors.primary }}
        >
          <Text className="text-white font-black tracking-widest uppercase text-xs">Save Changes</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
