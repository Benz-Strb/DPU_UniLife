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

type Session = {
  courseName: string;
  courseCode: string;
  color: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room: string;
  instructor: string;
};

export default function AddCourseScreen() {
  const router = useRouter();
  const { user, themeColors, isDarkMode } = useUser();
  const [loading, setLoading] = useState(false);
  const [existingCourses, setExistingCourses] = useState<any[]>([]);

  const [sessions, setSessions] = useState<Session[]>([
    { courseName: "", courseCode: "", color: COLORS[0], dayOfWeek: "MONDAY", startTime: "", endTime: "", room: "", instructor: "" }
  ]);

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

  const addSession = () => {
    setSessions([...sessions, { courseName: "", courseCode: "", color: COLORS[sessions.length % COLORS.length], dayOfWeek: "MONDAY", startTime: "", endTime: "", room: "", instructor: "" }]);
  };

  const removeSession = (index: number) => {
    if (sessions.length > 1) {
      setSessions(sessions.filter((_, i) => i !== index));
    }
  };

  const updateSession = (index: number, field: keyof Session, value: string) => {
    const updated = [...sessions];
    updated[index] = { ...updated[index], [field]: value };
    setSessions(updated);
  };

  const timeToMinutes = (timeStr: string) => {
    const [hrs, mins] = timeStr.split(':').map(Number);
    return hrs * 60 + mins;
  };

  const handleSave = async () => {
    for (let i = 0; i < sessions.length; i++) {
      const s = sessions[i];
      if (!s.courseName.trim()) {
        Alert.alert("Error", `Please enter course name for Session ${i + 1}`);
        return;
      }
      if (!s.startTime || !s.endTime) continue;

      const newStart = timeToMinutes(s.startTime);
      const newEnd = timeToMinutes(s.endTime);

      if (newStart >= newEnd) {
        Alert.alert("Invalid Time", `Session ${i + 1}: End time must be after start time`);
        return;
      }

      for (const course of existingCourses) {
        if (course.dayOfWeek === s.dayOfWeek && course.startTime && course.endTime) {
          const existingStart = timeToMinutes(course.startTime);
          const existingEnd = timeToMinutes(course.endTime);
          if (newStart < existingEnd && newEnd > existingStart) {
            Alert.alert(
              "Schedule Conflict",
              `Course ${i + 1} conflicts with "${course.courseName}" on ${s.dayOfWeek.toLowerCase()}.`
            );
            return;
          }
        }
      }
    }

    setLoading(true);
    try {
      for (const s of sessions) {
        await scheduleService.addCourse({
          userId: user?.id,
          courseName: s.courseName,
          courseCode: s.courseCode,
          color: s.color,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          room: s.room,
          instructor: s.instructor,
        });
        await scheduleCourseReminders(s.courseName, [{ dayOfWeek: s.dayOfWeek, startTime: s.startTime, endTime: s.endTime }]);
      }

      Alert.alert("Success", `${sessions.length > 1 ? `${sessions.length} courses` : "Course"} added!`, [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (error) {
      Alert.alert("Error", "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: themeColors.background }}>
      <Stack.Screen options={{ gestureEnabled: true, fullScreenGestureEnabled: false, gestureResponseDistance: { start: 100 } }} />
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      <SafeAreaView className="flex-1" edges={["top"]} style={{ backgroundColor: themeColors.background }}>
        <View className="flex-row items-center px-6 py-4">
          <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 rounded-2xl items-center justify-center" style={{ backgroundColor: themeColors.card }}>
            <Ionicons name="close" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          <Text className="text-xl font-black ml-4" style={{ color: themeColors.text }}>Add Course</Text>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
          <ScrollView className="flex-1 px-6 pt-2" showsVerticalScrollIndicator={false}>

            {sessions.map((s, idx) => (
              <View key={idx} className="p-6 rounded-[35px] border mb-6" style={{ backgroundColor: themeColors.card, borderColor: themeColors.border }}>
                {/* Card header */}
                <View className="flex-row justify-between items-center mb-4">
                  <Text className="font-black text-[10px] uppercase text-indigo-500">Course {idx + 1}</Text>
                  {sessions.length > 1 && (
                    <TouchableOpacity onPress={() => removeSession(idx)} className="w-8 h-8 items-center justify-center rounded-full bg-red-50">
                      <Ionicons name="trash" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Course name & code */}
                <TextInput
                  placeholder="Course Name"
                  placeholderTextColor={themeColors.subText}
                  value={s.courseName}
                  onChangeText={(v) => updateSession(idx, "courseName", v)}
                  className="p-4 rounded-2xl border font-bold mb-3"
                  style={{ backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }}
                />
                <TextInput
                  placeholder="Course Code (optional)"
                  placeholderTextColor={themeColors.subText}
                  value={s.courseCode}
                  onChangeText={(v) => updateSession(idx, "courseCode", v)}
                  className="p-4 rounded-2xl border font-bold mb-4"
                  style={{ backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }}
                />

                {/* Color picker */}
                <View className="flex-row justify-between px-1 mb-4">
                  {COLORS.map(c => (
                    <TouchableOpacity
                      key={c}
                      onPress={() => updateSession(idx, "color", c)}
                      style={{ backgroundColor: c, borderColor: s.color === c ? themeColors.subText : 'transparent' }}
                      className="w-8 h-8 rounded-full border-4"
                    />
                  ))}
                </View>

                {/* Day selector */}
                <TabSelector
                  options={DAYS}
                  selected={s.dayOfWeek}
                  onSelect={(v) => updateSession(idx, "dayOfWeek", v)}
                  containerClassName="mb-4"
                />

                {/* Time */}
                <View className="flex-row space-x-3 mb-3">
                  <View className="flex-1">
                    <TextInput
                      placeholder="09:00"
                      placeholderTextColor={themeColors.subText}
                      value={s.startTime}
                      onChangeText={(v) => updateSession(idx, "startTime", v)}
                      className="p-4 rounded-2xl border font-bold text-center"
                      style={{ backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }}
                      keyboardType="numbers-and-punctuation"
                    />
                  </View>
                  <View className="flex-1">
                    <TextInput
                      placeholder="12:00"
                      placeholderTextColor={themeColors.subText}
                      value={s.endTime}
                      onChangeText={(v) => updateSession(idx, "endTime", v)}
                      className="p-4 rounded-2xl border font-bold text-center"
                      style={{ backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }}
                      keyboardType="numbers-and-punctuation"
                    />
                  </View>
                </View>

                {/* Room & Instructor */}
                <TextInput
                  placeholder="Room"
                  placeholderTextColor={themeColors.subText}
                  value={s.room}
                  onChangeText={(v) => updateSession(idx, "room", v)}
                  className="p-4 rounded-2xl border font-bold mb-3"
                  style={{ backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }}
                />
                <TextInput
                  placeholder="Instructor"
                  placeholderTextColor={themeColors.subText}
                  value={s.instructor}
                  onChangeText={(v) => updateSession(idx, "instructor", v)}
                  className="p-4 rounded-2xl border font-bold"
                  style={{ backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.text }}
                />
              </View>
            ))}

            <TouchableOpacity onPress={addSession} className="flex-row items-center justify-center py-4 border-2 border-dashed rounded-[30px] mb-8" style={{ borderColor: themeColors.border }}>
              <Ionicons name="add-circle" size={24} color={theme.colors.primary} />
              <Text className="ml-2 font-black text-indigo-500 text-[11px] uppercase">Add Course</Text>
            </TouchableOpacity>

            <TouchableOpacity disabled={loading} onPress={handleSave} className="py-5 rounded-[30px] items-center shadow-lg mb-10" style={{ backgroundColor: theme.colors.primary }}>
              <Text className="text-white font-black text-lg">{loading ? "Saving..." : "Save"}</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
