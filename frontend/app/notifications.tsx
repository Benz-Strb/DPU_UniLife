import React, { useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, StatusBar, Image, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { theme } from "@/constants/theme";
import { useUser } from "@/store/UserContext";
import { getAvatarUrl } from "@/utils/imageUtils";

export default function NotificationScreen() {
  const router = useRouter();
  const { 
    isDarkMode, 
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

  const getNotificationText = (item: any) => {
    const senderName = item.sender?.fullName || "Someone";
    switch (item.type) {
      case 'LIKE': return `${senderName} liked your post`;
      case 'COMMENT': return `${senderName} commented on your post`;
      case 'FOLLOW': return `${senderName} started following you`;
      case 'REPLY': return `${senderName} replied to your comment`;
      default: return item.body || item.title;
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'LIKE': return { name: 'heart', color: '#EF4444' };
      case 'COMMENT': return { name: 'chatbubble', color: '#3B82F6' };
      case 'FOLLOW': return { name: 'person-add', color: '#10B981' };
      case 'REPLY': return { name: 'return-down-forward', color: '#8B5CF6' };
      default: return { name: 'notifications', color: theme.colors.primary };
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: themeColors.background }}>
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
              
              {notificationList.map((item) => {
                const icon = getIcon(item.type);
                const isRead = item.isRead;
                
                return (
                  <TouchableOpacity 
                    key={item.id}
                    onPress={() => handleNotificationPress(item)}
                    className="flex-row items-center p-4 mb-4 rounded-[28px] border"
                    style={{ 
                      backgroundColor: themeColors.card, 
                      borderColor: isRead ? themeColors.border : theme.colors.primaryLight,
                      opacity: isRead ? 0.7 : 1,
                      elevation: isRead ? 0 : 2
                    }}
                  >
                    <View className="relative">
                      <Image 
                        source={{ uri: getAvatarUrl(item.sender?.avatarUrl, item.sender?.fullName) }} 
                        className="w-12 h-12 rounded-full mr-4" 
                      />
                      <View 
                        className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full items-center justify-center border-2"
                        style={{ borderColor: themeColors.card }}
                        style={{ backgroundColor: icon.color }}
                      >
                        <Ionicons name={icon.name as any} size={12} color="white" />
                      </View>
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs font-medium leading-4" style={{ color: themeColors.text }}>
                        {getNotificationText(item)}
                      </Text>
                      <Text className="text-[9px] font-bold text-gray-400 mt-1 uppercase tracking-tighter">
                        {new Date(item.createdAt).toLocaleString()}
                      </Text>
                    </View>
                    {!isRead && (
                      <View className="w-2.5 h-2.5 rounded-full ml-2 bg-violet-500" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </>
          )}
          <View className="h-20" />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
