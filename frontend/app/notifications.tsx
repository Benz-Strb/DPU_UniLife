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
    // 1. Mark as read immediately in UI and background
    if (!item.readAt) {
      await markNotificationAsRead(item.id);
    }

    // 2. Determine where to go based on notification type
    try {
      if (item.type === "FOLLOW") {
        router.push({ 
          pathname: "/user-profile", 
          params: { userId: item.senderId } 
        });
      } else if (item.refPostId) {
        // For LIKE, COMMENT, REPLY that have a post reference
        router.push({ 
          pathname: "/post-detail", 
          params: { postId: item.refPostId, single: "true" } 
        });
      } else if (item.senderId) {
        // Fallback to sender's profile
        router.push({ 
          pathname: "/user-profile", 
          params: { userId: item.senderId } 
        });
      }
    } catch (error) {
      console.error("Navigation error:", error);
    }
  };

  const groupNotifications = () => {
    const today: any[] = [];
    const yesterday: any[] = [];
    const earlier: any[] = [];

    const now = new Date();
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayDate = todayDate - 86400000;

    notificationList.forEach(item => {
      const itemDate = new Date(item.createdAt).getTime();
      if (itemDate >= todayDate) today.push(item);
      else if (itemDate >= yesterdayDate) yesterday.push(item);
      else earlier.push(item);
    });

    return { today, yesterday, earlier };
  };

  const groups = groupNotifications();

  return (
    <View className="flex-1" style={{ backgroundColor: themeColors.background }}>
      <Stack.Screen options={{ gestureEnabled: true }} />
      <StatusBar barStyle={themeColors.statusBar as any} />
      
      <SafeAreaView className="flex-1" edges={["top"]} style={{ backgroundColor: themeColors.background }}>
        <View className="flex-row items-center justify-center py-4 min-h-[60px]">
          {/* Back Button - Floating on the left */}
          <TouchableOpacity 
            onPress={() => router.back()}
            className="absolute left-6 w-10 h-10 rounded-2xl items-center justify-center shadow-sm z-10"
            style={{ backgroundColor: themeColors.card }}
          >
            <Ionicons name="chevron-back" size={24} color={themeColors.text} />
          </TouchableOpacity>
          
          {/* Title - Mathematically centered in the full-width view */}
          <Text className="text-xl font-black" style={{ color: themeColors.text }}>Notifications</Text>
        </View>

        <ScrollView 
          className="flex-1 px-6 pt-6" 
          contentContainerStyle={notificationList.length === 0 ? { flexGrow: 1 } : undefined}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
          }
        >
          {notificationList.length === 0 ? (
            <View className="flex-1 items-center justify-center min-h-[400px]">
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
              
              {groups.today.length > 0 && (
                <View className="mb-6">
                  <Text className="text-[12px] font-black uppercase tracking-widest mb-4 opacity-40 px-1" style={{ color: themeColors.text }}>Today</Text>
                  {groups.today.map((item) => (
                    <NotificationItem key={item.id} item={item} onPress={handleNotificationPress} themeColors={themeColors} />
                  ))}
                </View>
              )}

              {groups.yesterday.length > 0 && (
                <View className="mb-6">
                  <Text className="text-[12px] font-black uppercase tracking-widest mb-4 opacity-40 px-1" style={{ color: themeColors.text }}>Yesterday</Text>
                  {groups.yesterday.map((item) => (
                    <NotificationItem key={item.id} item={item} onPress={handleNotificationPress} themeColors={themeColors} />
                  ))}
                </View>
              )}

              {groups.earlier.length > 0 && (
                <View className="mb-6">
                  <Text className="text-[12px] font-black uppercase tracking-widest mb-4 opacity-40 px-1" style={{ color: themeColors.text }}>Earlier</Text>
                  {groups.earlier.map((item) => (
                    <NotificationItem key={item.id} item={item} onPress={handleNotificationPress} themeColors={themeColors} />
                  ))}
                </View>
              )}
            </>
          )}
          <View className="h-20" />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
