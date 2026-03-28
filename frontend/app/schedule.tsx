import React from "react";
import { Text, View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "@/constants/theme";

export default function ScheduleScreen() {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-6 py-4">
        <Text className="text-2xl font-black" style={{ color: theme.colors.primary }}>My Schedule</Text>
        <Text className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-1">Academic Year 2026</Text>
      </View>

      <ScrollView className="flex-1 px-6 pt-4" showsVerticalScrollIndicator={false}>
        {[1, 2, 3, 4].map((idx) => (
          <View key={idx} className="mb-6 flex-row">
            <View className="w-16 items-center">
              <View className="w-10 h-10 bg-gray-50 rounded-full items-center justify-center border border-gray-100">
                <View className="w-4 h-4 rounded-full bg-gray-200" />
              </View>
              <View className="w-[2px] flex-1 bg-gray-100 my-2" />
            </View>
            <View 
              className="flex-1 bg-gray-50/50 p-6 rounded-[30px] border border-gray-50 shadow-sm"
            >
              <View className="w-1/2 h-4 bg-gray-200 rounded-full mb-3" />
              <View className="w-3/4 h-2 bg-gray-100 rounded-full" />
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
