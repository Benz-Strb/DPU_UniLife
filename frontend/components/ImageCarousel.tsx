import React, { useRef, useState } from "react";
import { View, Image, ScrollView, Dimensions, Pressable, Animated, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface Props {
  images: { url: string }[];
  aspectRatio?: number;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
}

export default function ImageCarousel({ images, aspectRatio = 1, onDoubleTap, onLongPress }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const lastTapRef = useRef<number>(0);
  const heartAnim = useRef(new Animated.Value(0)).current;

  if (!images || images.length === 0) return null;

  const imageHeight = SCREEN_WIDTH / aspectRatio;

  const handleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      lastTapRef.current = 0;
      onDoubleTap?.();
      heartAnim.setValue(0);
      Animated.sequence([
        Animated.spring(heartAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 5 }),
        Animated.delay(600),
        Animated.timing(heartAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      lastTapRef.current = now;
    }
  };

  const handleScroll = (e: any) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveIndex(index);
  };

  return (
    <View>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleScroll}
        scrollEnabled={images.length > 1}
      >
        {images.map((img, i) => (
          <Pressable
            key={i}
            onPress={handleTap}
            onLongPress={onLongPress}
            delayLongPress={400}
          >
            <Image
              source={{ uri: img.url }}
              style={{ width: SCREEN_WIDTH, height: imageHeight, backgroundColor: "#F3F4F6" }}
              resizeMode="cover"
            />
          </Pressable>
        ))}
      </ScrollView>

      {/* Heart burst */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          alignItems: "center", justifyContent: "center",
          opacity: heartAnim,
          transform: [{ scale: heartAnim }],
        }}
      >
        <Ionicons name="heart" size={90} color="white" style={{ opacity: 0.9 }} />
      </Animated.View>

      {/* Counter badge top-right */}
      {images.length > 1 && (
        <View
          style={{
            position: "absolute", top: 10, right: 10,
            backgroundColor: "rgba(0,0,0,0.55)",
            paddingHorizontal: 8, paddingVertical: 3,
            borderRadius: 10, flexDirection: "row", alignItems: "center", gap: 3,
          }}
        >
          <Ionicons name="images-outline" size={11} color="white" />
          <Text style={{ color: "white", fontSize: 11, fontWeight: "800" }}>
            {activeIndex + 1}/{images.length}
          </Text>
        </View>
      )}

      {/* Dot indicators */}
      {images.length > 1 && (
        <View
          style={{
            position: "absolute", bottom: 10, left: 0, right: 0,
            flexDirection: "row", justifyContent: "center", gap: 4,
          }}
        >
          {images.map((_, i) => (
            <View
              key={i}
              style={{
                width: i === activeIndex ? 16 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: i === activeIndex ? "white" : "rgba(255,255,255,0.5)",
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
}
