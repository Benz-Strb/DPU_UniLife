import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { theme } from "@/constants/theme";
import { useUser } from "@/store/UserContext";

export default function NotificationScreen() {
  const router = useRouter();
  const { isDarkMode, notificationList } = useUser();

  const bgColor = isDarkMode ? "#121212" : "#F8F9FE";
  const cardColor = isDarkMode ? "#1E1E1E" : "#FFFFFF";
  const textColor = isDarkMode ? "#FFFFFF" : "#1F2937";
  const subTextColor = isDarkMode ? "#A0A0A0" : "#6B7280";
  const borderColor = isDarkMode ? "#333333" : "#F1F5F9";

  const getIcon = (type: string) => {
    switch (type) {
      case 'like': return { name: 'heart', color: '#EF4444' };
      case 'comment': return { name: 'chatbubble', color: '#3B82F6' };
      case 'message': return { name: 'mail', color: '#7C3AED' };
      case 'system': return { name: 'megaphone', color: '#F59E0B' };
      default: return { name: 'notifications', color: theme.colors.primary };
    }
  };

  const NotificationItem = ({ item }: { item: any }) => {
    const icon = getIcon(item.type);
    return (
      <TouchableOpacity 
        className="flex-row items-center p-5 mb-4 rounded-[35px] border border-white"
        style={{ 
          backgroundColor: cardColor, 
          shadowColor: "#000", 
          shadowOpacity: 0.03, 
          elevation: 2 
        }}
      >
        <View className="w-14 h-14 rounded-2xl items-center justify-center mr-4" style={{ backgroundColor: `${icon.color}15` }}>
          <Ionicons name={icon.name as any} size={24} color={icon.color} />
        </View>
        <View className="flex-1">
          <View className="flex-row justify-between items-center mb-1">
            <Text className="font-black text-sm" style={{ color: textColor }}>{item.title}</Text>
            <Text className="text-[10px] font-bold text-gray-400">{item.timestamp}</Text>
          </View>
          <Text className="text-xs font-medium" style={{ color: subTextColor }} numberOfLines={2}>{item.description}</Text>
        </View>
        {!item.isRead && <View className="w-2 h-2 rounded-full ml-2" style={{ backgroundColor: theme.colors.primary }} />}
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: bgColor }}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      
      <SafeAreaView className="flex-1">
        <View className="flex-row items-center justify-between px-6 py-4">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="w-10 h-10 rounded-2xl items-center justify-center bg-white shadow-sm"
          >
            <Ionicons name="chevron-back" size={24} color={textColor} />
          </TouchableOpacity>
          <Text className="text-xl font-black" style={{ color: textColor }}>Notifications</Text>
          <TouchableOpacity className="w-10 h-10 rounded-2xl items-center justify-center bg-white shadow-sm">
            <Ionicons name="ellipsis-horizontal" size={20} color={textColor} />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
          {notificationList.length === 0 ? (
            <View className="items-center justify-center py-32">
              <View className="w-24 h-24 rounded-[35px] bg-gray-50 items-center justify-center mb-6">
                <Ionicons name="notifications-off-outline" size={44} color="#CBD5E1" />
              </View>
              <Text className="text-xl font-black text-gray-300">No Notifications</Text>
              <Text className="text-center mt-2 px-10 text-gray-400 font-medium">
                When you get likes, comments or messages, they will appear here.
              </Text>
            </View>
          ) : (
            <>
              <Text className="text-[10px] font-black uppercase tracking-[2px] text-gray-400 mb-6 ml-2">Recent</Text>
              {notificationList.map((item) => (
                <NotificationItem key={item.id} item={item} />
              ))}
            </>
          )}
          <View className="h-20" />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
