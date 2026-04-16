import React, { useEffect, useState } from "react";
import { Text, View, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, Stack } from "expo-router";
import { theme } from "@/constants/theme";
import { scheduleService } from "@/services/api";
import { useUser } from "@/store/UserContext";
import TabSelector from "@/components/TabSelector";

const DAYS = [
  { label: "Mon", value: "MONDAY" },
  { label: "Tue", value: "TUESDAY" },
  { label: "Wed", value: "WEDNESDAY" },
  { label: "Thu", value: "THURSDAY" },
  { label: "Fri", value: "FRIDAY" },
  { label: "Sat", value: "SATURDAY" },
  { label: "Sun", value: "SUNDAY" },
];

export default function ScheduleScreen() {
  const router = useRouter();
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDay, setSelectedDay] = useState(DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1].value);
  const [scheduleData, setScheduleData] = useState<any[]>([]);

  const fetchSchedule = async () => {
    if (!user?.id) return;
    try {
      const data = await scheduleService.getSchedule(user.id);
      setScheduleData(data);
    } catch (error) {
      console.error("Fetch Schedule Error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, [user?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSchedule();
  };

  const handleDeleteCourse = (courseId: string, courseName: string) => {
    Alert.alert(
      "Delete Course",
      `Are you sure you want to remove "${courseName}" from your semester schedule?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            try {
              await scheduleService.deleteCourse(courseId);
              fetchSchedule();
            } catch (error) {
              Alert.alert("Error", "Failed to delete course");
            }
          }
        }
      ]
    );
  };

  // Filter schedules for the selected day
  const dailySchedules = scheduleData.flatMap(course => 
    (course.schedules || [])
      .filter((s: any) => s.dayOfWeek === selectedDay)
      .map((s: any) => ({ 
        ...s, 
        courseId: course.id, 
        courseName: course.courseName, 
        courseCode: course.courseCode, 
        color: course.color 
      }))
  ).sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <SafeAreaView className="flex-1 bg-white">
      <Stack.Screen options={{ gestureEnabled: true, fullScreenGestureEnabled: false, gestureResponseDistance: 100 }} />
      {/* Header */}
      <View className="px-6 py-4 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="mr-4 w-10 h-10 bg-gray-50 rounded-2xl items-center justify-center border border-gray-100"
          >
            <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <View>
            <Text className="text-2xl font-black" style={{ color: theme.colors.primary }}>My Timetable</Text>
            <Text className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Semester 1/2026</Text>
          </View>
        </View>
        <TouchableOpacity 
          onPress={() => router.push('/add-course')}
          className="w-10 h-10 rounded-2xl bg-indigo-50 items-center justify-center"
        >
          <Ionicons name="add" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Day Selector */}
      <View className="px-6 mb-4">
        <TabSelector options={DAYS} selected={selectedDay} onSelect={setSelectedDay} />
      </View>

      {/* Schedule List */}
      <ScrollView 
        className="flex-1 px-6 pt-2" 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} className="mt-10" />
        ) : dailySchedules.length > 0 ? (
          dailySchedules.map((item, idx) => (
            <View key={item.id} className="mb-6 flex-row">
              {/* Timeline */}
              <View className="w-16 items-center">
                <Text className="text-[12px] font-bold text-gray-400">{item.startTime}</Text>
                <View className="w-[2px] flex-1 bg-gray-100 my-2" />
                <Text className="text-[10px] text-gray-300">{item.endTime}</Text>
              </View>

              {/* Card */}
              <TouchableOpacity 
                onLongPress={() => handleDeleteCourse(item.courseId, item.courseName)}
                className="flex-1 p-5 rounded-[30px] border border-gray-50 shadow-sm"
                style={{ backgroundColor: item.color || '#F9FAFB' }}
              >
                <View className="flex-row justify-between items-start mb-1">
                  <Text className="text-white font-black text-lg flex-1 mr-2" style={{ textShadowColor: 'rgba(0,0,0,0.1)', textShadowOffset: {width: 0, height: 1}, textShadowRadius: 2 }}>
                    {item.courseName}
                  </Text>
                  <TouchableOpacity onPress={() => handleDeleteCourse(item.courseId, item.courseName)}>
                    <Ionicons name="trash-outline" size={16} color="white" />
                  </TouchableOpacity>
                </View>
                
                <Text className="text-white/80 font-bold text-[11px] mb-4">
                  {item.courseCode}
                </Text>
                
                <View className="flex-row justify-between items-end">
                  <View className="bg-white/20 px-4 py-1.5 rounded-2xl">
                    <Text className="text-white text-[10px] font-bold">
                      📍 Room: {item.room || 'TBA'}
                    </Text>
                  </View>
                  <Text className="text-white/60 text-[10px] italic">
                    {item.instructor}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View className="flex-1 items-center justify-center mt-20 p-10 bg-gray-50 rounded-[40px] border border-dashed border-gray-200">
            <Ionicons name="calendar-outline" size={48} color="#E2E8F0" />
            <Text className="text-gray-400 font-bold text-lg mt-4">No classes for {selectedDay.toLowerCase()}</Text>
            <TouchableOpacity 
              onPress={() => router.push('/add-course')}
              className="mt-4 px-6 py-2 bg-indigo-600 rounded-full"
            >
              <Text className="text-white font-bold">Add Course</Text>
            </TouchableOpacity>
          </View>
        )}
        <View className="h-10" />
      </ScrollView>
    </SafeAreaView>
  );
}
