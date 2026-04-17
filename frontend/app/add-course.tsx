import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Alert, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, Stack } from "expo-router";
import { theme } from "@/constants/theme";
import { useUser } from "@/store/UserContext";
import { scheduleService } from "@/services/api";
import { scheduleCourseReminders } from "@/services/notificationHelper";
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

const COLORS = ["#4F46E5", "#06B6D4", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

export default function AddCourseScreen() {
  const router = useRouter();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [existingCourses, setExistingCourses] = useState<any[]>([]);
  
  const [courseName, setCourseName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [schedules, setSchedules] = useState([
    { dayOfWeek: "MONDAY", startTime: "", endTime: "", room: "", instructor: "" }
  ]);

  // โหลดตารางเรียนที่มีอยู่เพื่อเตรียมตรวจสอบ Overlap
  useEffect(() => {
    const loadData = async () => {
      if (user?.id) {
        try {
          const data = await scheduleService.getSchedule(user.id);
          setExistingCourses(data);
        } catch (e) { console.error(e); }
      }
    };
    loadData();
  }, [user?.id]);

  const addNewTimeSlot = () => {
    setSchedules([...schedules, { dayOfWeek: "MONDAY", startTime: "", endTime: "", room: "", instructor: "" }]);
  };

  const removeTimeSlot = (index: number) => {
    if (schedules.length > 1) {
      setSchedules(schedules.filter((_, i) => i !== index));
    }
  };

  const updateSchedule = (index: number, field: string, value: string) => {
    const newSchedules = [...schedules];
    (newSchedules[index] as any)[field] = value;
    setSchedules(newSchedules);
  };

  // แปลง "HH:mm" เป็นนาทีรวมเพื่อให้เปรียบเทียบง่าย
  const timeToMinutes = (timeStr: string) => {
    const [hrs, mins] = timeStr.split(':').map(Number);
    return hrs * 60 + mins;
  };

  const handleSave = async () => {
    if (!courseName) {
      Alert.alert("Error", "Please enter course name");
      return;
    }

    // --- Overlap Detection Logic ---
    for (const newSession of schedules) {
      if (!newSession.startTime || !newSession.endTime) continue;
      
      const newStart = timeToMinutes(newSession.startTime);
      const newEnd = timeToMinutes(newSession.endTime);

      if (newStart >= newEnd) {
        Alert.alert("Invalid Time", "End time must be after start time");
        return;
      }

      // ตรวจสอบกับตารางเรียนที่มีอยู่แล้วในระบบ
      for (const course of existingCourses) {
        for (const session of course.schedules) {
          if (session.dayOfWeek === newSession.dayOfWeek) {
            const existingStart = timeToMinutes(session.startTime);
            const existingEnd = timeToMinutes(session.endTime);

            // เช็คว่าคาบเวลาซ้อนทับกันหรือไม่
            if (newStart < existingEnd && newEnd > existingStart) {
              Alert.alert(
                "Schedule Conflict",
                `This slot conflicts with "${course.courseName}" on ${newSession.dayOfWeek.toLowerCase()}.`
              );
              return;
            }
          }
        }
      }
    }
    // -------------------------------

    setLoading(true);
    try {
      await scheduleService.addCourse({
        userId: user?.id,
        courseName,
        courseCode,
        color: selectedColor,
        schedules
      });
      
      // ตั้งเวลาแจ้งเตือน
      await scheduleCourseReminders(courseName, schedules);
      
      Alert.alert("Success", "Course added and reminders set!", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (error) {
      Alert.alert("Error", "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen options={{ gestureEnabled: true, fullScreenGestureEnabled: false, gestureResponseDistance: { start: 100 } }} />
      <StatusBar barStyle="dark-content" />
      <SafeAreaView className="flex-1">
        <View className="flex-row items-center px-6 py-4">
          <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 rounded-2xl items-center justify-center bg-gray-50">
            <Ionicons name="close" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <Text className="text-xl font-black ml-4">Add Course</Text>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
          <ScrollView className="flex-1 px-6 pt-2" showsVerticalScrollIndicator={false}>
            <View className="mb-8">
              <Text className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Course Info</Text>
              <TextInput placeholder="Course Name" value={courseName} onChangeText={setCourseName} className="bg-gray-50 p-5 rounded-[25px] border border-gray-100 font-bold mb-4" />
              <TextInput placeholder="Course Code" value={courseCode} onChangeText={setCourseCode} className="bg-gray-50 p-5 rounded-[25px] border border-gray-100 font-bold mb-4" />
              <View className="flex-row justify-between px-2">
                {COLORS.map(c => (
                  <TouchableOpacity key={c} onPress={() => setSelectedColor(c)} style={{ backgroundColor: c }} className={`w-9 h-9 rounded-full border-4 ${selectedColor === c ? 'border-gray-200' : 'border-transparent'}`} />
                ))}
              </View>
            </View>

            <Text className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Sessions</Text>
            {schedules.map((s, idx) => (
              <View key={idx} className="bg-gray-50/50 p-6 rounded-[35px] border border-gray-100 mb-6">
                <View className="flex-row justify-between items-center mb-4">
                  <Text className="font-black text-[10px] uppercase text-indigo-600">Session {idx + 1}</Text>
                  {schedules.length > 1 && (
                    <TouchableOpacity onPress={() => removeTimeSlot(idx)} className="w-8 h-8 items-center justify-center bg-red-50 rounded-full">
                      <Ionicons name="trash" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>

                <TabSelector
                  options={DAYS}
                  selected={s.dayOfWeek}
                  onSelect={(v) => updateSchedule(idx, "dayOfWeek", v)}
                  containerClassName="mb-4"
                />

                <View className="flex-row space-x-3 mb-4">
                  <View className="flex-1">
                    <TextInput placeholder="09:00" value={s.startTime} onChangeText={(v) => updateSchedule(idx, 'startTime', v)} className="bg-white p-4 rounded-2xl border border-gray-100 font-bold text-center" keyboardType="numbers-and-punctuation" />
                  </View>
                  <View className="flex-1">
                    <TextInput placeholder="12:00" value={s.endTime} onChangeText={(v) => updateSchedule(idx, 'endTime', v)} className="bg-white p-4 rounded-2xl border border-gray-100 font-bold text-center" keyboardType="numbers-and-punctuation" />
                  </View>
                </View>

                <TextInput placeholder="Room" value={s.room} onChangeText={(v) => updateSchedule(idx, 'room', v)} className="bg-white p-4 rounded-2xl border border-gray-100 font-bold mb-3" />
                <TextInput placeholder="Instructor" value={s.instructor} onChangeText={(v) => updateSchedule(idx, 'instructor', v)} className="bg-white p-4 rounded-2xl border border-gray-100 font-bold" />
              </View>
            ))}

            <TouchableOpacity onPress={addNewTimeSlot} className="flex-row items-center justify-center py-4 border-2 border-dashed border-gray-200 rounded-[30px] mb-8">
              <Ionicons name="add-circle" size={24} color={theme.colors.primary} />
              <Text className="ml-2 font-black text-indigo-600 text-[11px] uppercase">Add Session</Text>
            </TouchableOpacity>

            <TouchableOpacity disabled={loading} onPress={handleSave} className="py-5 rounded-[30px] items-center shadow-lg mb-10" style={{ backgroundColor: theme.colors.primary }}>
              <Text className="text-white font-black text-lg">{loading ? "Saving..." : "Save Course"}</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
