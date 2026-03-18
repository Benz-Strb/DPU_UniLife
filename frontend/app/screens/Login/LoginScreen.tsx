import React, { useState } from "react";
import {
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const [studentId, setStudentId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const pastelPurple = "#E0BBE4";
  const pastelBlue = "#B2E2F2";
  const deepPurple = "#5a2d81";
  const coolBlue = "#70D6FF";

  const handleLogin = () => {
    if (!studentId || studentId.length < 5) {
      Alert.alert("ข้อมูลไม่ถูกต้อง", "กรุณากรอกรหัสนักศึกษาให้ถูกต้อง");
      return;
    }
    if (!password) {
      Alert.alert("ข้อผิดพลาด", "กรุณากรอกรหัสผ่าน");
      return;
    }
    navigation.navigate("Main");
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />

      {/* Cool Aura Background Decorations */}
      <View
        className="absolute top-[-100] right-[-50] w-[300] h-[300] rounded-full opacity-30"
        style={{ backgroundColor: pastelPurple }}
      />
      <View
        className="absolute bottom-[10%] left-[-100] w-[400] h-[400] rounded-full opacity-20"
        style={{ backgroundColor: pastelBlue }}
      />

      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            className="px-8"
          >
            {/* Header Section */}
            <View className="pt-12 pb-10">
              <View className="flex-row items-center mb-6">
                <View
                  className="w-12 h-12 rounded-2xl items-center justify-center rotate-12"
                  style={{
                    backgroundColor: deepPurple,
                    shadowColor: deepPurple,
                    shadowOpacity: 0.3,
                    shadowRadius: 10,
                    elevation: 5,
                  }}
                >
                  <Ionicons name="flash" size={24} color="white" />
                </View>
                <Text
                  className="ml-4 text-xl font-black tracking-tighter"
                  style={{ color: deepPurple }}
                >
                  ยินดี <Text style={{ color: coolBlue }}>ต้อนรับ</Text>
                </Text>
              </View>

              <Text
                className="text-5xl font-black leading-[50px] tracking-tight"
                style={{ color: "#1A202C" }}
              >
                DPU{"\n"}
                <Text style={{ color: "#7B61FF" }}>UNILIFE</Text>
              </Text>
              <Text className="text-lg mt-4 font-bold opacity-30 tracking-wide">
                เข้าสู่ระบบด้วยรหัสนักศึกษาของคุณ
              </Text>
            </View>

            {/* Form Section */}
            <View className="mt-4 space-y-6">
              {/* Input: Student ID */}
              <View className="mb-6">
                <View className="flex-row items-center mb-2 ml-1">
                  <Text className="text-xs font-black uppercase tracking-[2px] opacity-40">
                    รหัสนักศึกษา
                  </Text>
                </View>
                <View
                  className="flex-row items-center rounded-3xl px-6 py-5 bg-slate-100 border-2 border-slate-200 focus:border-[#7B61FF]"
                  style={{
                    shadowColor: "#000",
                    shadowOpacity: 0.05,
                    shadowRadius: 10,
                    elevation: 2,
                  }}
                >
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color="#7B61FF"
                    className="mr-3"
                  />
                  <TextInput
                    placeholder="กรอกรหัสนักศึกษา"
                    placeholderTextColor="#A0AEC0"
                    className="flex-1 text-slate-800 text-base font-bold"
                    value={studentId}
                    onChangeText={setStudentId}
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              {/* Input: Password */}
              <View className="mb-8">
                <View className="flex-row justify-between items-center mb-2 ml-1">
                  <Text className="text-xs font-black uppercase tracking-[2px] opacity-40">
                    รหัสผ่าน
                  </Text>
                </View>
                <View
                  className="flex-row items-center rounded-3xl px-6 py-5 bg-slate-100 border-2 border-slate-200 focus:border-[#70D6FF]"
                  style={{
                    shadowColor: "#000",
                    shadowOpacity: 0.05,
                    shadowRadius: 10,
                    elevation: 2,
                  }}
                >
                  <Ionicons
                    name="key-outline"
                    size={20}
                    color="#70D6FF"
                    className="mr-3"
                  />
                  <TextInput
                    placeholder="••••••••"
                    placeholderTextColor="#A0AEC0"
                    className="flex-1 text-slate-800 text-base font-bold"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons
                      name={showPassword ? "eye" : "eye-off"}
                      size={20}
                      color="#A0AEC0"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Login Button */}
              <TouchableOpacity
                onPress={handleLogin}
                activeOpacity={0.9}
                style={{
                  shadowColor: "#7B61FF",
                  shadowOpacity: 0.4,
                  shadowRadius: 15,
                  elevation: 8,
                }}
              >
                <LinearGradient
                  colors={["#7B61FF", "#70D6FF"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    borderRadius: 24,
                    paddingVertical: 20,
                    alignItems: "center",
                  }}
                >
                  <View className="flex-row items-center">
                    <Text className="text-white text-lg font-black tracking-widest uppercase mr-2">
                      เข้าสู่ระบบ
                    </Text>
                    <Ionicons name="arrow-forward" size={20} color="white" />
                  </View>
                </LinearGradient>
              </TouchableOpacity>

              {/* SignUp Link */}
              <TouchableOpacity
                className="mt-6 self-center"
                onPress={() => navigation.navigate("SignUp")}
              >
                <Text className="text-sm font-bold opacity-40">
                  ยังไม่มีบัญชี?{" "}
                  <Text style={{ color: "#7B61FF" }}>ลงทะเบียนครั้งแรก</Text>
                </Text>
              </TouchableOpacity>
            </View>

            {/* Bottom Branding */}
            <View className="mt-auto pt-10 pb-6 items-center flex-row justify-center space-x-2">
              <View
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: pastelPurple }}
              />
              <Text className="text-[#1A202C] text-[10px] font-black tracking-[4px] opacity-20 uppercase">
                DPU DHURAKIJ PUNDIT
              </Text>
              <View
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: pastelBlue }}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
