import React, { useCallback, useMemo, useRef, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Image, StatusBar, Modal, Dimensions, PanResponder } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { theme } from "@/constants/theme";
import { useUser } from "@/store/UserContext";
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync } from "expo-image-manipulator";
import { FACULTY_DATA } from "@/constants/data";

const FACULTIES = ["DPU", ...Object.keys(FACULTY_DATA)];
const { width: screenWidth } = Dimensions.get("window");
const CROP_FRAME_SIZE = screenWidth - 48;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;

export default function NewPostScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tag: string }>();
  const { isDarkMode, faculty, addPost, userId, isAdmin, isUniAdmin, themeColors } = useUser();
  const [content, setContent] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [showFullImage, setShowFullImage] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropScale, setCropScale] = useState(1);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const cropOffsetRef = useRef({ x: 0, y: 0 });
  
  // Filter available tags based on user role and requirements
  const availableTags = useMemo(() => {
    if (isUniAdmin) {
      // Super Admin: เห็นทุกอย่าง (DPU + ทุกคณะ)
      return FACULTIES;
    }
    if (isAdmin) {
      // Admin คณะ: เห็นคณะตัวเอง และ DPU (เพื่อให้ประกาศลงส่วนกลางได้)
      const tags = ["DPU"];
      if (faculty) tags.push(faculty);
      return tags;
    }
    // นักศึกษาทั่วไป: เห็นทุกคณะ แต่ห้ามเห็น DPU
    return Object.keys(FACULTY_DATA);
  }, [isAdmin, isUniAdmin, faculty]);

  // Default tag: 
  // - ถ้าเป็น UniAdmin ให้เริ่มที่ DPU 
  // - ถ้าเป็น Admin คณะ/นักศึกษา ให้เริ่มที่คณะตัวเอง (ถ้ามี) หรือคณะแรกในลิสต์
  const initialTag = useMemo(() => {
    if (params.tag && availableTags.includes(params.tag)) return params.tag;
    if (isUniAdmin) return "DPU";
    if (faculty && availableTags.includes(faculty)) return faculty;
    return availableTags[0] || "DPU";
  }, [params.tag, isUniAdmin, faculty, availableTags]);

  const [selectedTag, setSelectedTag] = useState(initialTag);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const handlePost = async () => {
    if (!selectedImage && !content.trim()) {
      Alert.alert("Missing Content", "Please add an image or text.");
      return;
    }

    setLoading(true);
    try {
      // Official posts are only from Admins (Super or Faculty)
      const isOfficial = isAdmin || isUniAdmin;
      
      await addPost({ 
        userId, 
        content, 
        image: selectedImage, 
        tag: selectedTag, 
        isOfficial: isOfficial 
      });
      
      Alert.alert("Success", isOfficial ? "Official Announcement shared!" : "Post shared!");
      router.back();
    } catch {
      Alert.alert("Error", "Failed to share post.");
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      setSelectedImage(asset.uri);
      setImageSize({ width: asset.width || 1, height: asset.height || 1 });
    }
  };

  const getBaseCropScale = useCallback(() => {
    if (!imageSize) return 1;
    return Math.max(CROP_FRAME_SIZE / imageSize.width, CROP_FRAME_SIZE / imageSize.height);
  }, [imageSize]);

  const getDisplayedCropSize = useCallback((zoom = cropScale) => {
    if (!imageSize) return { width: CROP_FRAME_SIZE, height: CROP_FRAME_SIZE };
    const baseScale = getBaseCropScale();
    const totalScale = baseScale * zoom;
    return {
      width: imageSize.width * totalScale,
      height: imageSize.height * totalScale,
    };
  }, [cropScale, getBaseCropScale, imageSize]);

  const clampCropOffset = useCallback((offset: { x: number; y: number }, zoom = cropScale) => {
    const displayed = getDisplayedCropSize(zoom);
    const maxX = Math.max(0, (displayed.width - CROP_FRAME_SIZE) / 2);
    const maxY = Math.max(0, (displayed.height - CROP_FRAME_SIZE) / 2);

    return {
      x: Math.min(maxX, Math.max(-maxX, offset.x)),
      y: Math.min(maxY, Math.max(-maxY, offset.y)),
    };
  }, [cropScale, getDisplayedCropSize]);

  const openCropEditor = () => {
    if (!selectedImage || !imageSize) return;
    const initialOffset = clampCropOffset({ x: 0, y: 0 }, 1);
    cropOffsetRef.current = initialOffset;
    setCropScale(1);
    setCropOffset(initialOffset);
    setShowCropModal(true);
  };

  const adjustCropZoom = (direction: 1 | -1) => {
    const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, cropScale + direction * ZOOM_STEP));
    const nextOffset = clampCropOffset(cropOffsetRef.current, nextZoom);
    cropOffsetRef.current = nextOffset;
    setCropScale(nextZoom);
    setCropOffset(nextOffset);
  };

  const resetCropEditor = () => {
    const resetOffset = clampCropOffset({ x: 0, y: 0 }, 1);
    cropOffsetRef.current = resetOffset;
    setCropScale(1);
    setCropOffset(resetOffset);
  };

  const applyCrop = async () => {
    if (!selectedImage || !imageSize) return;

    try {
      const baseScale = getBaseCropScale();
      const totalScale = baseScale * cropScale;
      const displayed = getDisplayedCropSize();
      const cropWidth = CROP_FRAME_SIZE / totalScale;
      const cropHeight = CROP_FRAME_SIZE / totalScale;
      const originX = ((displayed.width - CROP_FRAME_SIZE) / 2 - cropOffset.x) / totalScale;
      const originY = ((displayed.height - CROP_FRAME_SIZE) / 2 - cropOffset.y) / totalScale;

      const result = await manipulateAsync(
        selectedImage,
        [
          {
            crop: {
              originX: Math.max(0, Math.min(imageSize.width - cropWidth, originX)),
              originY: Math.max(0, Math.min(imageSize.height - cropHeight, originY)),
              width: Math.min(imageSize.width, cropWidth),
              height: Math.min(imageSize.height, cropHeight),
            },
          },
        ],
        { compress: 1 }
      );

      setSelectedImage(result.uri);
      setImageSize({ width: result.width, height: result.height });
      setShowCropModal(false);
    } catch {
      Alert.alert("Error", "Could not crop the image.");
    }
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderMove: (_, gestureState) => {
          const nextOffset = clampCropOffset({
            x: cropOffsetRef.current.x + gestureState.dx,
            y: cropOffsetRef.current.y + gestureState.dy,
          });
          setCropOffset(nextOffset);
        },
        onPanResponderRelease: (_, gestureState) => {
          const nextOffset = clampCropOffset({
            x: cropOffsetRef.current.x + gestureState.dx,
            y: cropOffsetRef.current.y + gestureState.dy,
          });
          cropOffsetRef.current = nextOffset;
          setCropOffset(nextOffset);
        },
      }),
    [clampCropOffset]
  );

  const cropDisplaySize = getDisplayedCropSize();

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: themeColors.background }}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      <View className="flex-row items-center justify-between px-6 py-4 border-b" style={{ backgroundColor: themeColors.card, borderBottomColor: themeColors.border }}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="close" size={32} color={themeColors.text} /></TouchableOpacity>
        <Text className="text-lg font-black" style={{ color: themeColors.text }}>{isAdmin || isUniAdmin ? "Official Post" : "New Post"}</Text>
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
                  <TouchableOpacity activeOpacity={0.9} onPress={() => setShowFullImage(true)}>
                    <Image
                      source={{ uri: selectedImage }}
                      className="w-full rounded-[30px] bg-gray-100"
                      style={{ aspectRatio: imageSize ? imageSize.width / imageSize.height : 1 }}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                  <TouchableOpacity className="absolute top-2 right-2 bg-black/50 p-2 rounded-full" onPress={() => { setSelectedImage(null); setImageSize(null); }}>
                    <Ionicons name="close" size={20} color="white" />
                  </TouchableOpacity>
                  <TouchableOpacity className="absolute top-2 left-2 bg-black/50 px-3 py-2 rounded-full flex-row items-center" onPress={openCropEditor}>
                    <Ionicons name="crop" size={16} color="white" />
                    <Text className="text-white text-[10px] font-black uppercase ml-1.5 tracking-wider">Crop</Text>
                  </TouchableOpacity>
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
                  {availableTags.map((tag) => (
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

      <Modal visible={showFullImage} transparent animationType="fade" onRequestClose={() => setShowFullImage(false)}>
        <View className="flex-1 bg-black/95 items-center justify-center">
          <TouchableOpacity className="absolute inset-0" activeOpacity={1} onPress={() => setShowFullImage(false)} />
          {selectedImage && (
            <Image
              source={{ uri: selectedImage }}
              style={{ width: "100%", height: "100%" }}
              resizeMode="contain"
            />
          )}
          <TouchableOpacity className="absolute top-12 right-6 bg-black/60 p-3 rounded-full" onPress={() => setShowFullImage(false)}>
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </Modal>

      <Modal visible={showCropModal} transparent animationType="slide" onRequestClose={() => setShowCropModal(false)}>
        <View className="flex-1 bg-black">
          <SafeAreaView className="flex-1">
            <View className="flex-row items-center justify-between px-6 py-4">
              <TouchableOpacity onPress={() => setShowCropModal(false)} className="px-4 py-2 rounded-full bg-white/10">
                <Text className="text-white font-bold">Cancel</Text>
              </TouchableOpacity>
              <Text className="text-white font-black text-base">Crop Image</Text>
              <TouchableOpacity onPress={applyCrop} className="px-4 py-2 rounded-full bg-violet-500">
                <Text className="text-white font-bold">Apply</Text>
              </TouchableOpacity>
            </View>

            <View className="flex-1 items-center justify-center px-6">
              <View
                className="overflow-hidden rounded-[28px] bg-black"
                style={{ width: CROP_FRAME_SIZE, height: CROP_FRAME_SIZE }}
              >
                {selectedImage && imageSize ? (
                  <View className="flex-1 items-center justify-center" {...panResponder.panHandlers}>
                    <Image
                      source={{ uri: selectedImage }}
                      style={{
                        width: cropDisplaySize.width,
                        height: cropDisplaySize.height,
                        transform: [{ translateX: cropOffset.x }, { translateY: cropOffset.y }],
                      }}
                      resizeMode="cover"
                    />
                  </View>
                ) : null}
              </View>
              <Text className="text-white/70 text-xs font-bold uppercase tracking-[2px] mt-5">
                Drag image to reposition
              </Text>
            </View>

            <View className="px-6 pb-8">
              <View className="flex-row items-center justify-center mb-4">
                <TouchableOpacity onPress={() => adjustCropZoom(-1)} className="w-12 h-12 rounded-full items-center justify-center bg-white/10 mr-4">
                  <Ionicons name="remove" size={22} color="white" />
                </TouchableOpacity>
                <TouchableOpacity onPress={resetCropEditor} className="px-5 h-12 rounded-full items-center justify-center bg-white/10 mr-4">
                  <Text className="text-white font-bold uppercase text-xs tracking-[1.5px]">Reset</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => adjustCropZoom(1)} className="w-12 h-12 rounded-full items-center justify-center bg-white/10">
                  <Ionicons name="add" size={22} color="white" />
                </TouchableOpacity>
              </View>
              <Text className="text-center text-white/60 text-xs">
                Zoom {cropScale.toFixed(2)}x
              </Text>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
