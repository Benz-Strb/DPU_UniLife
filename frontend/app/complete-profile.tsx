import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { theme } from "@/constants/theme";
import { useUser } from "@/store/UserContext";
import * as ImagePicker from 'expo-image-picker';
import { FACULTY_DATA } from "@/constants/data";

const FACULTIES = Object.keys(FACULTY_DATA);

export default function CompleteProfileScreen() {
  const router = useRouter();
  const { name, setName, faculty, setFaculty, profileImage, setProfileImage, isDarkMode, syncProfile, themeColors } = useUser();
  const [showPicker, setShowPicker] = useState(false);

  const bgColor = themeColors.background;
  const cardColor = themeColors.card;
  const textColor = themeColors.text;
  const subTextColor = themeColors.subText;
  const borderColor = themeColors.border;

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('ขออภัย', 'เราต้องการสิทธิ์ในการเข้าถึงรูปภาพเพื่อตั้งรูปโปรไฟล์');
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

  const handleFinish = async () => {
    if (!name.trim()) {
      Alert.alert("กรุณาตั้งชื่อ", "กรุณาระบุชื่อที่ต้องการให้แสดงในแอป");
      return;
    }
    if (!faculty) {
      Alert.alert("กรุณาเลือกคณะ", "กรุณาเลือกคณะที่คุณสังกัดอยู่");
      return;
    }

    await syncProfile(name, faculty, profileImage);
    router.replace("/home");
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: bgColor }}>
      <ScrollView className="flex-1 px-10 py-10" showsVerticalScrollIndicator={false}>
        <View className="mb-10">
          <Text className="text-gray-400 text-[10px] font-black uppercase tracking-[4px] mb-2">Almost there</Text>
          <Text className="text-4xl font-black tracking-tighter" style={{ color: textColor }}>Setup Profile</Text>
          <Text className="text-violet-500 text-sm font-bold mt-1">บอกให้โลกรู้ว่าคุณคือใคร</Text>
        </View>

        <View className="items-center mb-10">
          <TouchableOpacity 
            onPress={pickImage}
            className="w-32 h-32 rounded-[48px] items-center justify-center border-4 p-1 rotate-3"
            style={{ backgroundColor: isDarkMode ? "#2D2D2D" : "#F5F3FF", borderColor: theme.colors.primary }}
          >
             <View className="w-full h-full rounded-[40px] bg-white items-center justify-center overflow-hidden">
                {profileImage ? (
                  <Image source={{ uri: profileImage }} className="w-full h-full" />
                ) : (
                  <Ionicons name="camera" size={40} color={theme.colors.primary} />
                )}
             </View>
             <View className="absolute -bottom-2 -right-2 bg-violet-500 w-10 h-10 rounded-2xl items-center justify-center border-4 border-white">
                <Ionicons name="add" size={20} color="white" />
             </View>
          </TouchableOpacity>
        </View>

        <View className="space-y-8">
          <View>
            <Text className="text-gray-400 text-[10px] font-black uppercase tracking-[2px] ml-1 mb-2">Display Name</Text>
            <View className="px-6 py-5 rounded-[28px] border flex-row items-center" style={{ backgroundColor: cardColor, borderColor: borderColor }}>
               <Ionicons name="person-outline" size={20} color={theme.colors.primary} />
               <TextInput 
                  className="flex-1 ml-4 font-bold"
                  style={{ color: textColor }}
                  placeholder="Your nickname or real name"
                  placeholderTextColor="#D1D5DB"
                  value={name}
                  onChangeText={setName}
               />
            </View>
          </View>

          <View className="mt-8">
            <Text className="text-gray-400 text-[10px] font-black uppercase tracking-[2px] ml-1 mb-2">Faculty Tag</Text>
            <TouchableOpacity 
              onPress={() => setShowPicker(!showPicker)}
              className="px-6 py-5 rounded-[28px] border flex-row justify-between items-center"
              style={{ backgroundColor: cardColor, borderColor: borderColor }}
            >
              <View className="flex-row items-center">
                 <Ionicons name="school-outline" size={20} color={theme.colors.secondary} />
                 <Text className="ml-4 font-bold" style={{ color: faculty ? textColor : "#D1D5DB" }}>
                   {faculty ? faculty : "Select your faculty"}
                 </Text>
              </View>
              <Ionicons name={showPicker ? "chevron-up" : "chevron-down"} size={20} color={theme.colors.primary} />
            </TouchableOpacity>

            {showPicker && (
              <View className="mt-3 rounded-3xl p-4 border overflow-hidden" style={{ backgroundColor: cardColor, borderColor: borderColor }}>
                <ScrollView style={{ maxHeight: 250 }}>
                  <View className="flex-row flex-wrap">
                    {FACULTIES.map((f) => (
                      <TouchableOpacity 
                        key={f}
                        onPress={() => {
                          setFaculty(f);
                          setShowPicker(false);
                        }}
                        className={`px-4 py-2 rounded-full m-1 border ${faculty === f ? 'bg-violet-500 border-violet-500' : (isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-100')}`}
                      >
                        <Text className={`text-[10px] font-bold ${faculty === f ? 'text-white' : subTextColor}`}>
                          {f}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity 
          onPress={handleFinish}
          className="w-full py-6 rounded-[32px] mt-12 mb-20 items-center shadow-lg shadow-violet-300"
          style={{ backgroundColor: theme.colors.primary }}
        >
          <Text className="text-white font-black uppercase tracking-[4px] text-xs">Start Experience</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
