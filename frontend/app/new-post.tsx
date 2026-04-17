import React, { useCallback, useMemo, useRef, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Image, StatusBar, Modal, Dimensions, PanResponder } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import { theme } from "@/constants/theme";
import { useUser } from "@/store/UserContext";
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync } from "expo-image-manipulator";
import { FACULTY_DATA } from "@/constants/data";

const FACULTIES = ["DPU", ...Object.keys(FACULTY_DATA)];
const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const CROP_FRAME_SIZE = screenWidth - 48;
const MAX_CROP_HEIGHT = screenHeight * 0.62;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;
const MAX_IMAGES = 10;

export default function NewPostScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tag: string; editPostId?: string; editContent?: string; editVisibility?: string }>();
  const isEditMode = !!params.editPostId;
  const { isDarkMode, faculty, addPost, updatePost, userId, isAdmin, isUniAdmin, themeColors } = useUser();
  const [content, setContent] = useState(params.editContent ?? "");
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  // Crop state (ทำงานกับรูปที่เลือก crop)
  const [cropTargetIndex, setCropTargetIndex] = useState<number | null>(null);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropScale, setCropScale] = useState(1);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const cropOffsetRef = useRef({ x: 0, y: 0 });

  const availableTags = useMemo(() => {
    if (isUniAdmin) return FACULTIES;
    if (isAdmin) return ["DPU", ...(faculty ? [faculty] : [])];
    return Object.keys(FACULTY_DATA);
  }, [isAdmin, isUniAdmin, faculty]);

  const initialTag = useMemo(() => {
    if (params.tag && availableTags.includes(params.tag)) return params.tag;
    if (isUniAdmin) return "DPU";
    if (faculty && availableTags.includes(faculty)) return faculty;
    return availableTags[0] || "DPU";
  }, [params.tag, isUniAdmin, faculty, availableTags]);

  const [selectedTags, setSelectedTags] = useState<string[]>([initialTag]);
  const [showTagPicker, setShowTagPicker] = useState(false);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? (prev.length > 1 ? prev.filter(t => t !== tag) : prev) : [...prev, tag]
    );
  };
  const [visibility, setVisibility] = useState<"PUBLIC" | "FOLLOWERS" | "PRIVATE">((params.editVisibility as any) ?? "PUBLIC");
  const [loading, setLoading] = useState(false);

  const VISIBILITY_OPTIONS: { value: "PUBLIC" | "FOLLOWERS" | "PRIVATE"; label: string; icon: string }[] = [
    { value: "PUBLIC", label: "Everyone", icon: "globe-outline" },
    { value: "FOLLOWERS", label: "Followers", icon: "people-outline" },
    { value: "PRIVATE", label: "Only me", icon: "lock-closed-outline" },
  ];

  const handlePost = async () => {
    if (isEditMode) {
      if (!content.trim()) {
        Alert.alert("Missing Content", "Please add some text.");
        return;
      }
      setLoading(true);
      try {
        await updatePost(params.editPostId!, { content, visibility });
        Alert.alert("Success", "Post updated!");
        router.back();
      } catch {
        Alert.alert("Error", "Failed to update post.");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (selectedImages.length === 0 && !content.trim()) {
      Alert.alert("Missing Content", "Please add an image or text.");
      return;
    }
    setLoading(true);
    try {
      const isOfficial = isAdmin || isUniAdmin;
      await addPost({
        userId,
        content,
        images: selectedImages,
        tag: selectedTags[0],
        tags: selectedTags,
        isOfficial,
        visibility,
      });
      Alert.alert("Success", isOfficial ? "Official Announcement shared!" : "Post shared!");
      router.back();
    } catch {
      Alert.alert("Error", "Failed to share post.");
    } finally {
      setLoading(false);
    }
  };

  const pickImages = async () => {
    if (selectedImages.length >= MAX_IMAGES) {
      Alert.alert("Limit reached", `You can add up to ${MAX_IMAGES} images.`);
      return;
    }
    const remaining = MAX_IMAGES - selectedImages.length;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 1,
    });
    if (!result.canceled) {
      const uris = result.assets.map(a => a.uri);
      setSelectedImages(prev => [...prev, ...uris].slice(0, MAX_IMAGES));
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  // Crop helpers
  const getBaseCropScale = useCallback(() => {
    if (!imageSize) return 1;
    // fit image width to frame — height follows naturally
    return CROP_FRAME_SIZE / imageSize.width;
  }, [imageSize]);

  const getDisplayedCropSize = useCallback((zoom = cropScale) => {
    if (!imageSize) return { width: CROP_FRAME_SIZE, height: CROP_FRAME_SIZE };
    const s = getBaseCropScale() * zoom;
    return { width: imageSize.width * s, height: imageSize.height * s };
  }, [cropScale, getBaseCropScale, imageSize]);

  const clampCropOffset = useCallback((offset: { x: number; y: number }, zoom = cropScale) => {
    const d = getDisplayedCropSize(zoom);
    const frameH = imageSize ? Math.min(MAX_CROP_HEIGHT, Math.round(CROP_FRAME_SIZE * (imageSize.height / imageSize.width))) : CROP_FRAME_SIZE;
    const maxX = Math.max(0, (d.width - CROP_FRAME_SIZE) / 2);
    const maxY = Math.max(0, (d.height - frameH) / 2);
    return { x: Math.min(maxX, Math.max(-maxX, offset.x)), y: Math.min(maxY, Math.max(-maxY, offset.y)) };
  }, [cropScale, getDisplayedCropSize, imageSize]);

  const openCropEditor = (index: number) => {
    const uri = selectedImages[index];
    Image.getSize(uri, (w, h) => {
      setImageSize({ width: w, height: h });
      setCropTargetIndex(index);
      const init = clampCropOffset({ x: 0, y: 0 }, 1);
      cropOffsetRef.current = init;
      setCropScale(1);
      setCropOffset(init);
      setShowCropModal(true);
    });
  };

  const applyCrop = async () => {
    if (cropTargetIndex === null || !imageSize) return;
    try {
      const baseScale = getBaseCropScale();
      const totalScale = baseScale * cropScale;
      const d = getDisplayedCropSize();
      const frameH = Math.min(MAX_CROP_HEIGHT, Math.round(CROP_FRAME_SIZE * (imageSize.height / imageSize.width)));
      const cropW = CROP_FRAME_SIZE / totalScale;
      const cropH = frameH / totalScale;
      const originX = ((d.width - CROP_FRAME_SIZE) / 2 - cropOffset.x) / totalScale;
      const originY = ((d.height - frameH) / 2 - cropOffset.y) / totalScale;
      const result = await manipulateAsync(
        selectedImages[cropTargetIndex],
        [{ crop: { originX: Math.max(0, originX), originY: Math.max(0, originY), width: Math.min(imageSize.width, cropW), height: Math.min(imageSize.height, cropH) } }],
        { compress: 1 }
      );
      setSelectedImages(prev => prev.map((uri, i) => i === cropTargetIndex ? result.uri : uri));
      setShowCropModal(false);
    } catch {
      Alert.alert("Error", "Could not crop the image.");
    }
  };

  const adjustCropZoom = (direction: 1 | -1) => {
    const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, cropScale + direction * ZOOM_STEP));
    const nextOffset = clampCropOffset(cropOffsetRef.current, next);
    cropOffsetRef.current = nextOffset;
    setCropScale(next);
    setCropOffset(nextOffset);
  };

  const resetCropEditor = () => {
    const reset = clampCropOffset({ x: 0, y: 0 }, 1);
    cropOffsetRef.current = reset;
    setCropScale(1);
    setCropOffset(reset);
  };

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (_, g) => {
      const next = clampCropOffset({ x: cropOffsetRef.current.x + g.dx, y: cropOffsetRef.current.y + g.dy });
      setCropOffset(next);
    },
    onPanResponderRelease: (_, g) => {
      const next = clampCropOffset({ x: cropOffsetRef.current.x + g.dx, y: cropOffsetRef.current.y + g.dy });
      cropOffsetRef.current = next;
      setCropOffset(next);
    },
  }), [clampCropOffset]);

  const cropDisplaySize = getDisplayedCropSize();
  const cropFrameHeight = imageSize
    ? Math.min(screenWidth - 48, Math.round((screenWidth - 48) * (imageSize.height / imageSize.width)))
    : screenWidth - 48;
  const canPost = isEditMode ? content.trim().length > 0 : (selectedImages.length > 0 || content.trim().length > 0);

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: themeColors.background }}>
      <Stack.Screen options={{ gestureEnabled: true, fullScreenGestureEnabled: false, gestureResponseDistance: { start: 100 } }} />
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />

      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4 border-b" style={{ backgroundColor: themeColors.card, borderBottomColor: themeColors.border }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={28} color={themeColors.text} />
        </TouchableOpacity>
        <Text className="text-lg font-black" style={{ color: themeColors.text }}>
          {isEditMode ? "Edit Post" : (isAdmin || isUniAdmin ? "Official Post" : "New Post")}
        </Text>
        <TouchableOpacity onPress={handlePost} disabled={loading || !canPost}>
          <Text className={`font-black text-base ${loading || !canPost ? "opacity-20" : ""}`} style={{ color: theme.colors.primary }}>
            {isEditMode ? (loading ? "Saving..." : "Save") : (loading ? "Posting..." : "Share")}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-5 py-5" showsVerticalScrollIndicator={false}>

        {/* Image section */}
        {!isEditMode && (
          <View className="mb-5">
            <View className="mb-3">
              <Text className="text-[10px] font-black uppercase tracking-[2px]" style={{ color: themeColors.subText }}>
                Photos ({selectedImages.length}/{MAX_IMAGES})
              </Text>
            </View>

            {selectedImages.length === 0 ? (
              <TouchableOpacity
                onPress={pickImages}
                className="w-full h-56 rounded-[28px] border-2 border-dashed items-center justify-center"
                style={{ borderColor: themeColors.border, backgroundColor: isDarkMode ? "#1E1E1E" : "#F9FAFB" }}
              >
                <Ionicons name="images-outline" size={44} color={theme.colors.primary} />
                <Text className="mt-3 font-bold text-[11px] uppercase tracking-[2px]" style={{ color: themeColors.subText }}>
                  Tap to add photos
                </Text>
                <Text className="mt-1 text-[10px]" style={{ color: themeColors.subText }}>Up to {MAX_IMAGES} images</Text>
              </TouchableOpacity>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1">
                {selectedImages.map((uri, i) => (
                  <View key={i} className="relative mx-1">
                    <Image
                      source={{ uri }}
                      className="rounded-[20px] bg-gray-100"
                      style={{ width: 140, height: 140 }}
                      resizeMode="cover"
                    />
                    {/* Remove */}
                    <TouchableOpacity
                      onPress={() => removeImage(i)}
                      className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/60 items-center justify-center"
                    >
                      <Ionicons name="close" size={15} color="white" />
                    </TouchableOpacity>
                    {/* Crop */}
                    <TouchableOpacity
                      onPress={() => openCropEditor(i)}
                      className="absolute bottom-1.5 left-1.5 flex-row items-center gap-1 bg-black/55 px-2 py-1 rounded-lg"
                    >
                      <Ionicons name="crop" size={11} color="white" />
                      <Text className="text-white text-[9px] font-black uppercase">Crop</Text>
                    </TouchableOpacity>
                    {/* Index badge */}
                    <View className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-black/55 items-center justify-center">
                      <Text className="text-white text-[9px] font-black">{i + 1}</Text>
                    </View>
                  </View>
                ))}
                {/* Add more button in row */}
                {selectedImages.length < MAX_IMAGES && (
                  <TouchableOpacity
                    onPress={pickImages}
                    className="mx-1 rounded-[20px] border-2 border-dashed items-center justify-center"
                    style={{ width: 140, height: 140, borderColor: themeColors.border, backgroundColor: isDarkMode ? "#1E1E1E" : "#F9FAFB" }}
                  >
                    <Ionicons name="add" size={28} color={theme.colors.primary} />
                    <Text className="text-[10px] font-bold mt-1" style={{ color: themeColors.subText }}>Add more</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}
          </View>
        )}

        {/* Tag picker */}
        {!isEditMode && (
          <View className="mb-5 rounded-[24px] border p-5" style={{ backgroundColor: themeColors.card, borderColor: themeColors.border }}>
            <Text className="text-[10px] font-black uppercase tracking-[2px] mb-3" style={{ color: themeColors.subText }}>Tag</Text>
            <TouchableOpacity
              onPress={() => setShowTagPicker(!showTagPicker)}
              className="flex-row flex-wrap items-center gap-1 min-h-[44px] px-3 py-2 rounded-2xl border"
              style={{ borderColor: themeColors.border, backgroundColor: isDarkMode ? "#1E1E1E" : "#F9FAFB" }}
            >
              {selectedTags.map(t => (
                <View key={t} className="bg-violet-500 px-3 py-1 rounded-full">
                  <Text className="text-white font-bold text-[10px] uppercase">#{t}</Text>
                </View>
              ))}
              <Ionicons name={showTagPicker ? "chevron-up" : "chevron-down"} size={16} color={theme.colors.primary} />
            </TouchableOpacity>
            {showTagPicker && (
              <View className="mt-2 p-2 rounded-2xl border flex-row flex-wrap" style={{ borderColor: themeColors.border }}>
                {availableTags.map((tag) => {
                  const active = selectedTags.includes(tag);
                  return (
                    <TouchableOpacity
                      key={tag}
                      onPress={() => toggleTag(tag)}
                      className={`px-4 py-2 rounded-full m-1 border`}
                      style={{ backgroundColor: active ? theme.colors.primary : (isDarkMode ? "#2D2D2D" : "#F9FAFB"), borderColor: active ? theme.colors.primary : themeColors.border }}
                    >
                      <Text className="text-[10px] font-bold" style={{ color: active ? "white" : themeColors.subText }}>
                        #{tag}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* Visibility picker */}
        <View className="mb-5 rounded-[24px] border p-5" style={{ backgroundColor: themeColors.card, borderColor: themeColors.border }}>
          <Text className="text-[10px] font-black uppercase tracking-[2px] mb-3" style={{ color: themeColors.subText }}>Who can see this?</Text>
          <View className="flex-row gap-2">
            {VISIBILITY_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setVisibility(opt.value)}
                className="flex-1 items-center py-2.5 rounded-2xl border"
                style={{
                  backgroundColor: visibility === opt.value ? theme.colors.primary : (isDarkMode ? "#2D2D2D" : "#F9FAFB"),
                  borderColor: visibility === opt.value ? theme.colors.primary : themeColors.border,
                }}
              >
                <Ionicons name={opt.icon as any} size={16} color={visibility === opt.value ? "white" : themeColors.subText} />
                <Text className="text-[9px] font-bold mt-1" style={{ color: visibility === opt.value ? "white" : themeColors.subText }}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Content input */}
        <View className="rounded-[24px] border p-5 mb-6" style={{ backgroundColor: themeColors.card, borderColor: themeColors.border }}>
          <Text className="text-[10px] font-black uppercase tracking-[2px] mb-3" style={{ color: themeColors.subText }}>Caption</Text>
          <TextInput
            placeholder="Write something..."
            placeholderTextColor={themeColors.subText}
            className="font-medium text-base min-h-24"
            style={{ color: themeColors.text }}
            multiline
            value={content}
            onChangeText={setContent}
          />
        </View>
      </ScrollView>

      {/* Crop Modal */}
      <Modal visible={showCropModal} transparent animationType="slide" onRequestClose={() => setShowCropModal(false)}>
        <View className="flex-1 bg-black">
          <View style={{ flex: 1 }}>
            <View className="flex-row items-center justify-between px-6 py-4" style={{ paddingTop: insets.top + 12 }}>
              <TouchableOpacity onPress={() => setShowCropModal(false)} className="px-4 py-2 rounded-full bg-white/10">
                <Text className="text-white font-bold">Cancel</Text>
              </TouchableOpacity>
              <Text className="text-white font-black text-base">
                Crop Photo {cropTargetIndex !== null ? `${cropTargetIndex + 1}/${selectedImages.length}` : ""}
              </Text>
              <TouchableOpacity onPress={applyCrop} className="px-4 py-2 rounded-full bg-violet-500">
                <Text className="text-white font-bold">Apply</Text>
              </TouchableOpacity>
            </View>

            <View className="flex-1 items-center justify-center px-6">
              <View
                {...panResponder.panHandlers}
                className="overflow-hidden rounded-[28px] bg-black"
                style={{ width: CROP_FRAME_SIZE, height: cropFrameHeight }}
              >
                {cropTargetIndex !== null && imageSize ? (
                  <Image
                    source={{ uri: selectedImages[cropTargetIndex] }}
                    style={{
                      width: cropDisplaySize.width,
                      height: cropDisplaySize.height,
                      transform: [{ translateX: cropOffset.x }, { translateY: cropOffset.y }],
                    }}
                    resizeMode="cover"
                  />
                ) : null}
              </View>
              <Text className="text-white/70 text-xs font-bold uppercase tracking-[2px] mt-5">Drag to reposition</Text>
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
              <Text className="text-center text-white/60 text-xs">Zoom {cropScale.toFixed(2)}x</Text>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
