import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StatusBar, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, Stack } from "expo-router";
import { useUser } from "@/store/UserContext";
import SettingItem from "@/components/SettingItem";
import ScreenHeader from "@/components/ScreenHeader";

export default function SettingsScreen() {
  const router = useRouter();
  const { isDarkMode, toggleTheme, notifications, setNotifications, logout, themeColors } = useUser();

  const handleLogout = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Sign Out", 
          style: "destructive",
          onPress: () => logout()
        }
      ]
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: themeColors.background }}>
      <Stack.Screen options={{ gestureEnabled: true, fullScreenGestureEnabled: false, gestureResponseDistance: { start: 100 } }} />
      <StatusBar barStyle={themeColors.statusBar as any} />
      
      <SafeAreaView className="flex-1" edges={["top"]} style={{ backgroundColor: themeColors.background }}>
        <ScreenHeader title="Settings" onBack={() => router.back()} themeColors={themeColors} />

        <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
          {/* Academic Section */}
          <Text className="text-[10px] font-black uppercase tracking-[3px] text-gray-400 mb-4 ml-2">Academic</Text>
          <View
            className="rounded-[35px] px-6 mb-8 border border-white/5"
            style={{ backgroundColor: themeColors.card, shadowColor: "#000", shadowOpacity: 0.02, elevation: 2 }}
          >
            <SettingItem
              icon="calendar-outline"
              label="Manage Semester Schedule"
              type="link"
              onPress={() => router.push("/add-course")}
              themeColors={themeColors}
            />
            <SettingItem
              icon="time-outline"
              label="View Full Timetable"
              type="link"
              onPress={() => router.push("/schedule")}
              themeColors={themeColors}
            />
          </View>

          <Text className="text-[10px] font-black uppercase tracking-[3px] text-gray-400 mb-4 ml-2">Appearance</Text>
          <View
            className="rounded-[35px] px-6 mb-8 border border-white/5"
            style={{ backgroundColor: themeColors.card, shadowColor: "#000", shadowOpacity: 0.02, elevation: 2 }}
          >
            <SettingItem
              icon="moon-outline"
              label="Dark Mode"
              value={isDarkMode}
              onToggle={toggleTheme}
              themeColors={themeColors}
            />
            <SettingItem
              icon="text-outline"
              label="Font Size"
              type="link"
              onPress={() => Alert.alert("Coming Soon", "Font size adjustment will be available in the next update.")}
              themeColors={themeColors}
            />
          </View>

          <Text className="text-[10px] font-black uppercase tracking-[3px] text-gray-400 mb-4 ml-2">Notifications</Text>
          <View
            className="rounded-[35px] px-6 mb-8 border border-white/5"
            style={{ backgroundColor: themeColors.card, shadowColor: "#000", shadowOpacity: 0.02, elevation: 2 }}
          >
            <SettingItem
              icon="notifications-outline"
              label="Push Notifications"
              value={notifications}
              onToggle={setNotifications}
              themeColors={themeColors}
            />
            <SettingItem
              icon="mail-outline"
              label="Email Updates"
              value={false}
              onToggle={() => Alert.alert("Feature unavailable", "Email updates are currently not available.")}
              themeColors={themeColors}
            />
          </View>

          <Text className="text-[10px] font-black uppercase tracking-[3px] text-gray-400 mb-4 ml-2">Account</Text>
          <View
            className="rounded-[35px] px-6 mb-8 border border-white/5"
            style={{ backgroundColor: themeColors.card, shadowColor: "#000", shadowOpacity: 0.02, elevation: 2 }}
          >
            <SettingItem
              icon="person-outline"
              label="Edit Profile"
              type="link"
              onPress={() => router.push("/edit-profile")}
              themeColors={themeColors}
            />
            <SettingItem
              icon="lock-closed-outline"
              label="Privacy & Security"
              type="link"
              onPress={() => Alert.alert("Privacy Settings", "Your profile is visible to all DPU students.")}
              themeColors={themeColors}
            />
          </View>

          <Text className="text-[10px] font-black uppercase tracking-[3px] text-gray-400 mb-4 ml-2">Support</Text>
          <View
            className="rounded-[35px] px-6 mb-10 border border-white/5"
            style={{ backgroundColor: themeColors.card, shadowColor: "#000", shadowOpacity: 0.02, elevation: 2 }}
          >
            <SettingItem
              icon="help-circle-outline"
              label="Help Center"
              type="link"
              onPress={() => Alert.alert("Support", "Please contact support@dpu.ac.th")}
              themeColors={themeColors}
            />
            <SettingItem
              icon="information-circle-outline"
              label="About UniLife"
              type="link"
              onPress={() => Alert.alert("UniLife v1.0.0", "Built with ❤️ for DPU Students.")}
              themeColors={themeColors}
            />
            <TouchableOpacity 
              className="py-5 items-center"
              onPress={handleLogout}
            >
              <Text className="font-black text-red-500">Sign Out</Text>
            </TouchableOpacity>
          </View>
          
          <View className="h-20" />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
