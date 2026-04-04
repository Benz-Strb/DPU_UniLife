import React from "react";
import { View, Text, ScrollView, TouchableOpacity, Switch, StatusBar, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { theme } from "@/constants/theme";
import { useUser } from "@/store/UserContext";

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

  const SettingItem = ({ icon, label, value, onToggle, type = "switch", onPress }: any) => (
    <TouchableOpacity 
      onPress={onPress}
      disabled={type === "switch"}
      className="flex-row items-center justify-between py-5 border-b"
      style={{ borderBottomColor: themeColors.border }}
    >
      <View className="flex-row items-center">
        <View 
          className="w-11 h-11 rounded-2xl items-center justify-center mr-4" 
          style={{ backgroundColor: themeColors.iconBg }}
        >
          <Ionicons name={icon} size={22} color={theme.colors.primary} />
        </View>
        <Text className="font-bold text-sm" style={{ color: themeColors.text }}>{label}</Text>
      </View>
      {type === "switch" ? (
        <Switch 
          value={value} 
          onValueChange={onToggle}
          trackColor={{ false: "#D1D5DB", true: theme.colors.primaryLight }}
          thumbColor={value ? theme.colors.primary : "#F4F3F4"}
        />
      ) : (
        <Ionicons name="chevron-forward" size={20} color="#CBD5E1" />
      )}
    </TouchableOpacity>
  );

  return (
    <View className="flex-1" style={{ backgroundColor: themeColors.background }}>
      <StatusBar barStyle={themeColors.statusBar as any} />
      
      <SafeAreaView className="flex-1">
        <View className="flex-row items-center px-6 py-4">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="w-10 h-10 rounded-2xl items-center justify-center shadow-sm"
            style={{ backgroundColor: themeColors.card }}
          >
            <Ionicons name="chevron-back" size={24} color={themeColors.text} />
          </TouchableOpacity>
          <Text className="text-xl font-black ml-4" style={{ color: themeColors.text }}>Settings</Text>
        </View>

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
            />
            <SettingItem 
              icon="time-outline" 
              label="View Full Timetable" 
              type="link"
              onPress={() => router.push("/schedule")}
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
            />
            <SettingItem 
              icon="text-outline" 
              label="Font Size" 
              type="link"
              onPress={() => Alert.alert("Coming Soon", "Font size adjustment will be available in the next update.")}
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
            />
            <SettingItem 
              icon="mail-outline" 
              label="Email Updates" 
              value={false} 
              onToggle={() => Alert.alert("Feature unavailable", "Email updates are currently not available.")}
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
            />
            <SettingItem 
              icon="lock-closed-outline" 
              label="Privacy & Security" 
              type="link"
              onPress={() => Alert.alert("Privacy Settings", "Your profile is visible to all DPU students.")}
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
            />
            <SettingItem 
              icon="information-circle-outline" 
              label="About UniLife" 
              type="link" 
              onPress={() => Alert.alert("UniLife v1.0.0", "Built with ❤️ for DPU Students.")}
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
