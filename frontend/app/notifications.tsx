import React, { useEffect } from "react";
import { View, Text, TouchableOpacity, StatusBar, RefreshControl } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, Stack } from "expo-router";
import { theme } from "@/constants/theme";
import { useUser } from "@/store/UserContext";
import NotificationItem from "@/components/NotificationItem";

export default function NotificationScreen() {
  const router = useRouter();
  const {
    notificationList,
    fetchNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    themeColors
  } = useUser();
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchNotifications();
    setIsRefreshing(false);
  };


  const handleNotificationPress = async (item: any) => {
    if (!item.isRead) await markNotificationAsRead(item.id);

    if (item.type === "FOLLOW") {
      router.push({ pathname: "/user-profile", params: { userId: item.senderId } });
    } else if ((item.type === "LIKE" || item.type === "COMMENT" || item.type === "REPLY") && item.refPostId) {
      router.push({ pathname: "/post-detail", params: { postId: item.refPostId } } as any);
    } else if (item.senderId) {
      router.push({ pathname: "/user-profile", params: { userId: item.senderId } });
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: themeColors.background }}>
      <Stack.Screen options={{ gestureEnabled: true }} />
      <StatusBar barStyle={themeColors.statusBar as any} />
      
      <SafeAreaView className="flex-1">
        <View className="flex-row items-center justify-between px-6 py-4">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="w-10 h-10 rounded-2xl items-center justify-center bg-white shadow-sm"
            style={{ backgroundColor: themeColors.card }}
          >
            <Ionicons name="chevron-back" size={24} color={themeColors.text} />
          </TouchableOpacity>
          <Text className="text-xl font-black" style={{ color: themeColors.text }}>Notifications</Text>
          <TouchableOpacity 
            onPress={markAllNotificationsAsRead}
            className="w-10 h-10 rounded-2xl items-center justify-center bg-white shadow-sm"
            style={{ backgroundColor: themeColors.card }}
          >
            <Ionicons name="checkmark-done" size={20} color={themeColors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView 
          className="flex-1 px-6 pt-6" 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
          }
        >
          {notificationList.length === 0 ? (
            <View className="items-center justify-center py-32">
              <View className="w-24 h-24 rounded-[35px] items-center justify-center mb-6" style={{ backgroundColor: themeColors.iconBg }}>
                <Ionicons name="notifications-off-outline" size={44} color={themeColors.subText} />
              </View>
              <Text className="text-xl font-black" style={{ color: themeColors.subText }}>No Notifications</Text>
            </View>
          ) : (
            <>
              <View className="flex-row justify-between items-center mb-6 px-1">
                <Text className="text-[10px] font-black uppercase tracking-[2px] text-gray-400">Activity</Text>
                <TouchableOpacity onPress={markAllNotificationsAsRead}>
                  <Text className="text-[10px] font-black uppercase text-violet-500">Clear All</Text>
                </TouchableOpacity>
              </View>
              
              {notificationList.map((item) => (
                <NotificationItem
                  key={item.id}
                  item={item}
                  onPress={handleNotificationPress}
                  themeColors={themeColors}
                />
              ))}
            </>
          )}
          <View className="h-20" />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
