import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, Stack } from "expo-router";
import { theme } from "@/constants/theme";
import { useUser } from "@/store/UserContext";
import * as ImagePicker from 'expo-image-picker';

export default function EditProfileScreen() {
  const router = useRouter();
  const { name, bio, isDarkMode, profileImage, setProfileImage, themeColors, user, updateProfile } = useUser();
  const [username, setUsernameInput] = useState(user?.username || "");
  const [fullName, setFullNameInput] = useState(name);
  const [bioInput, setBioInput] = useState(bio);

  const handleSave = async () => {
    if (!fullName.trim() || !username.trim()) {
      Alert.alert("Error", "Required fields missing");
      return;
    }

    await updateProfile({
      fullName,
      username: username.toLowerCase().replace(/\s+/g, '_'),
      bio: bioInput,
      avatarUrl: profileImage
    });

    Alert.alert("Success", "Profile updated");
    router.back();
  };

  const pickImage = async () => {
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
      <Stack.Screen options={{ gestureEnabled: true, fullScreenGestureEnabled: false, gestureResponseDistance: { start: 100 } }} />
      <View
        className="flex-row items-center px-6 py-4 border-b" 
        style={{ backgroundColor: themeColors.card, borderBottomColor: themeColors.border }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={themeColors.text} />
        </TouchableOpacity>
        <Text className="text-lg font-black ml-4" style={{ color: themeColors.text }}>Edit Profile</Text>
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

        <View className="space-y-6">
          <View>
            <Text className="text-[10px] font-black uppercase tracking-[2px] mb-2 ml-2" style={{ color: themeColors.subText }}>Full Name</Text>
            <TextInput 
              className="px-6 py-4 rounded-3xl border font-bold"
              style={{ backgroundColor: themeColors.card, borderColor: themeColors.border, color: themeColors.text }}
              value={fullName}
              onChangeText={setFullNameInput}
              placeholder="Full Name"
            />
          </View>

          <View className="mt-4">
            <Text className="text-[10px] font-black uppercase tracking-[2px] mb-2 ml-2" style={{ color: themeColors.subText }}>Username</Text>
            <TextInput 
              className="px-6 py-4 rounded-3xl border font-bold"
              style={{ backgroundColor: themeColors.card, borderColor: themeColors.border, color: themeColors.text }}
              value={username}
              onChangeText={setUsernameInput}
              placeholder="Username"
              autoCapitalize="none"
            />
          </View>

          <View className="mt-4">
            <Text className="text-[10px] font-black uppercase tracking-[2px] mb-2 ml-2" style={{ color: themeColors.subText }}>Bio</Text>
            <TextInput 
              className="px-6 py-4 rounded-3xl border font-bold h-24"
              style={{ backgroundColor: themeColors.card, borderColor: themeColors.border, color: themeColors.text }}
              value={bioInput}
              onChangeText={setBioInput}
              placeholder="Write a bio..."
              multiline
            />
          </View>
        </View>

        <TouchableOpacity 
          onPress={handleSave}
          className="w-full py-5 rounded-[24px] mt-12 mb-10 items-center shadow-md"
          style={{ backgroundColor: theme.colors.primary }}
        >
          <Text className="text-white font-black uppercase text-xs tracking-widest">Save Changes</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
