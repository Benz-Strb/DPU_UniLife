import React, { useState } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";

const { width } = Dimensions.get("window");

export default function SignUpScreen() {
  const navigation = useNavigation<any>();
  
  // States for Multi-step Form
  const [step, setStep] = useState(1); // 1: Google Button, 2: Email Input, 3: Password Creation
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Pastel Colors
  const pastelPurple = "#E0BBE4";
  const pastelBlue = "#B2E2F2";
  const deepPurple = "#5a2d81";

  const handleVerifyEmail = () => {
    const dpuEmailRegex = /^[a-zA-Z0-9._%+-]+@dpu\.ac\.th$/;
    
    if (!email) {
      Alert.alert("ข้อผิดพลาด", "กรุณากรอกอีเมลของคุณ");
      return;
    }

    if (!dpuEmailRegex.test(email.toLowerCase())) {
      Alert.alert(
        "อีเมลไม่ถูกต้อง", 
        "กรุณาใช้อีเมล @dpu.ac.th เท่านั้น เพื่อลงทะเบียนเข้าใช้งาน"
      );
      return;
    }

    // ผ่านขั้นตอนตรวจสอบอีเมล ไปยังขั้นตอนตั้งรหัสผ่าน
    setStep(3);
  };

  const handleFinishSignUp = () => {
    if (!password || !confirmPassword) {
      Alert.alert("ข้อผิดพลาด", "กรุณากรอกรหัสผ่านให้ครบถ้วน");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("รหัสผ่านไม่ตรงกัน", "กรุณาตรวจสอบและกรอกรหัสผ่านให้ตรงกันทั้งสองช่อง");
      return;
    }

    if (password.length < 6) {
      Alert.alert("รหัสผ่านสั้นเกินไป", "กรุณาตั้งรหัสผ่านอย่างน้อย 6 ตัวอักษร");
      return;
    }

    // ลงทะเบียนเสร็จสิ้น
    Alert.alert(
      "ลงทะเบียนสำเร็จ", 
      "บัญชีของคุณพร้อมใช้งานแล้ว กรุณาเข้าสู่ระบบด้วยรหัสนักศึกษาและรหัสผ่านที่คุณตั้งไว้",
      [{ text: "ตกลง", onPress: () => navigation.navigate("Login") }]
    );
  };

  const handleBack = () => {
    if (step === 3) setStep(2);
    else if (step === 2) setStep(1);
    else navigation.goBack();
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar style="dark" />
      
      {/* Cool Aura Background */}
      <View className="absolute top-[-50] left-[-50] w-[300] h-[300] rounded-full opacity-20" style={{ backgroundColor: pastelBlue }} />
      <View className="absolute bottom-[-100] right-[-50] w-[400] h-[400] rounded-full opacity-30" style={{ backgroundColor: pastelPurple }} />

      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1"
        >
          <ScrollView 
            contentContainerStyle={{ flexGrow: 1 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            className="flex-1"
          >
            <View className="flex-1 px-8 py-10 justify-center">
              
              {/* Back Button */}
              <TouchableOpacity 
                onPress={handleBack}
                className="absolute top-12 left-8 w-12 h-12 rounded-2xl items-center justify-center bg-slate-50 border border-slate-100"
              >
                <Ionicons name="chevron-back" size={24} color={deepPurple} />
              </TouchableOpacity>

              {step === 1 && (
                <View>
                  <View className="mb-12">
                    <Text className="text-4xl font-black leading-[50px] tracking-tight" style={{ color: "#1A202C" }}>
                      เริ่มต้นใช้งาน{"\n"}
                      <Text style={{ color: "#7B61FF" }}>ครั้งแรก</Text>
                    </Text>
                    <Text className="text-lg mt-4 font-bold opacity-30 tracking-wide">
                      ลงทะเบียนด้วยอีเมลมหาวิทยาลัยเพื่อยืนยันตัวตนของคุณ
                    </Text>
                  </View>

                  <TouchableOpacity 
                    onPress={() => setStep(2)}
                    activeOpacity={0.9}
                    style={{ shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 15, elevation: 5 }}
                  >
                    <View className="bg-white border-2 border-slate-100 rounded-[30px] py-6 px-8 flex-row items-center justify-center">
                      <FontAwesome5 name="google" size={24} color="#DB4437" className="mr-4" />
                      <Text className="text-slate-800 text-lg font-black tracking-tight">
                        ลงทะเบียนผ่าน Google
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <View className="mt-8 items-center">
                    <Text className="text-slate-400 text-sm font-bold text-center leading-5">
                      * โปรดใช้บัญชี <Text style={{ color: "#7B61FF" }}>@dpu.ac.th</Text> เท่านั้น{"\n"}
                      เพื่อรับสิทธิการเข้าใช้งานแอปพลิเคชัน
                    </Text>
                  </View>
                </View>
              )}

              {step === 2 && (
                <View>
                  <View className="mb-8 items-center">
                    <View className="w-16 h-16 bg-slate-50 rounded-full items-center justify-center mb-6">
                      <FontAwesome5 name="google" size={30} color="#DB4437" />
                    </View>
                    <Text className="text-2xl font-black text-slate-800">เลือกบัญชีของคุณ</Text>
                    <Text className="text-slate-400 font-bold mt-2 text-center">ใช้อีเมลมหาวิทยาลัยเพื่อยืนยันตัวตน</Text>
                  </View>

                  <View className="space-y-4">
                    <View 
                      className="flex-row items-center rounded-3xl px-6 py-5 bg-slate-100 border-2 border-slate-200 focus:border-[#7B61FF]"
                    >
                      <Ionicons name="mail-outline" size={20} color="#7B61FF" className="mr-3" />
                      <TextInput
                        placeholder="example@dpu.ac.th"
                        placeholderTextColor="#A0AEC0"
                        className="flex-1 text-slate-800 text-base font-bold"
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        autoFocus
                      />
                    </View>

                    <TouchableOpacity 
                      onPress={handleVerifyEmail}
                      className="mt-6 bg-slate-800 py-5 rounded-3xl items-center"
                      activeOpacity={0.8}
                    >
                      <Text className="text-white text-lg font-black">เชื่อมต่ออีเมล</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {step === 3 && (
                <View>
                  <View className="mb-10">
                    <Text className="text-4xl font-black leading-[50px] tracking-tight" style={{ color: "#1A202C" }}>
                      สร้าง{"\n"}
                      <Text style={{ color: "#7B61FF" }}>รหัสผ่านใหม่</Text>
                    </Text>
                    <Text className="text-lg mt-3 font-bold opacity-30 tracking-wide">
                      ตั้งรหัสผ่านเพื่อใช้เข้าคู่กับรหัสนักศึกษาของคุณในครั้งถัดไป
                    </Text>
                  </View>

                  <View className="space-y-4">
                    {/* Create Password */}
                    <View className="mb-4">
                      <Text className="text-xs font-black uppercase tracking-[2px] opacity-40 mb-2 ml-1">สร้างรหัสผ่าน</Text>
                      <View className="flex-row items-center rounded-3xl px-6 py-5 bg-slate-100 border-2 border-slate-200">
                        <Ionicons name="lock-closed-outline" size={20} color="#7B61FF" className="mr-3" />
                        <TextInput
                          placeholder="อย่างน้อย 6 ตัวอักษร"
                          placeholderTextColor="#A0AEC0"
                          className="flex-1 text-slate-800 text-base font-bold"
                          secureTextEntry={!showPassword}
                          value={password}
                          onChangeText={setPassword}
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                          <Ionicons name={showPassword ? "eye" : "eye-off"} size={20} color="#A0AEC0" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Confirm Password */}
                    <View className="mb-8">
                      <Text className="text-xs font-black uppercase tracking-[2px] opacity-40 mb-2 ml-1">ยืนยันรหัสผ่านอีกครั้ง</Text>
                      <View className="flex-row items-center rounded-3xl px-6 py-5 bg-slate-100 border-2 border-slate-200">
                        <Ionicons name="shield-checkmark-outline" size={20} color="#70D6FF" className="mr-3" />
                        <TextInput
                          placeholder="กรอกรหัสผ่านเดิมอีกครั้ง"
                          placeholderTextColor="#A0AEC0"
                          className="flex-1 text-slate-800 text-base font-bold"
                          secureTextEntry={!showConfirmPassword}
                          value={confirmPassword}
                          onChangeText={setConfirmPassword}
                        />
                        <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                          <Ionicons name={showConfirmPassword ? "eye" : "eye-off"} size={20} color="#A0AEC0" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <TouchableOpacity 
                      onPress={handleFinishSignUp}
                      className="mt-4 bg-[#7B61FF] py-5 rounded-3xl items-center shadow-lg"
                      style={{ shadowColor: "#7B61FF", shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 }}
                      activeOpacity={0.8}
                    >
                      <Text className="text-white text-lg font-black">เสร็จสิ้นการลงทะเบียน</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {step === 1 && (
                <View className="mt-10 mb-10 items-center">
                  <TouchableOpacity onPress={() => navigation.navigate("Login")}>
                    <Text className="text-sm font-bold opacity-40">
                      มีบัญชีอยู่แล้ว? <Text style={{ color: "#7B61FF" }}>เข้าสู่ระบบที่นี่</Text>
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
