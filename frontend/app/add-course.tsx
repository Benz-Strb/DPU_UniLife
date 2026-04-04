import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Alert, StatusBar } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { theme } from "@/constants/theme";
import { useUser } from "@/store/UserContext";
import { scheduleService } from "@/services/api";

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
  
  const [courseName, setCourseName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [schedules, setSchedules] = useState([
    { dayOfWeek: "MONDAY", startTime: "", endTime: "", room: "", instructor: "" }
  ]);

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

  const handleSave = async () => {
    if (!courseName) {
      Alert.alert("Error", "Please enter course name");
      return;
    }

    setLoading(true);
    try {
      await scheduleService.addCourse({
        userId: user?.id,
        courseName,
        courseCode,
        color: selectedColor,
        schedules
      });
      
      Alert.alert("Success", "Course added", [
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

                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row mb-4">
                  {DAYS.map(d => (
                    <TouchableOpacity key={d.value} onPress={() => updateSchedule(idx, 'dayOfWeek', d.value)} className={`mr-2 px-5 py-2 rounded-2xl border ${s.dayOfWeek === d.value ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-gray-100'}`}>
                      <Text className={`font-bold text-[11px] ${s.dayOfWeek === d.value ? 'text-white' : 'text-gray-400'}`}>{d.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <View className="flex-row space-x-3 mb-4">
                  <View className="flex-1">
                    <TextInput placeholder="Start Time" value={s.startTime} onChangeText={(v) => updateSchedule(idx, 'startTime', v)} className="bg-white p-4 rounded-2xl border border-gray-100 font-bold text-center" />
                  </View>
                  <View className="flex-1">
                    <TextInput placeholder="End Time" value={s.endTime} onChangeText={(v) => updateSchedule(idx, 'endTime', v)} className="bg-white p-4 rounded-2xl border border-gray-100 font-bold text-center" />
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
