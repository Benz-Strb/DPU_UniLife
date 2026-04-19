import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { theme } from "@/constants/theme";
import { useUser } from "@/store/UserContext";
import { authService } from "@/services/api";
import { FACULTY_DATA } from "@/constants/data";

const FACULTIES = Object.keys(FACULTY_DATA);

const InputField = ({ label, icon, placeholder, value, onChangeText, secure = false, keyboardType = "default" }: any) => (
  <View className="mb-4">
    <Text className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-2">{label}</Text>
    <View className="flex-row items-center bg-gray-50 rounded-3xl px-5 py-4 border border-gray-100">
      <Ionicons name={icon} size={20} color={theme.colors.primary} />
      <TextInput
        className="flex-1 ml-4 font-bold text-gray-800"
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secure}
        autoCapitalize="none"
        keyboardType={keyboardType}
      />
    </View>
  </View>
);

export default function SignUpScreen() {
  const router = useRouter();
  const { signUp } = useUser();

  // Step 1 state
  const [name, setNameInput] = useState("");
  const [email, setEmail] = useState("");
  const [faculty, setFacultyInput] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showFacultyPicker, setShowFacultyPicker] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);

  // Step 2 state
  const [step, setStep] = useState<1 | 2>(1);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const otpRefs = useRef<(TextInput | null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const startCountdown = () => {
    setCountdown(60);
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(timerRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const validateStep1 = () => {
    if (!name || !email || !faculty || !password || !confirmPassword) {
      Alert.alert("แจ้งเตือน", "กรุณากรอกข้อมูลให้ครบถ้วน");
      return false;
    }
    if (!/^(\d{8}|admin)@dpu\.ac\.th$/i.test(email)) {
      Alert.alert("อีเมลไม่ถูกต้อง", "กรุณาใช้อีเมลของมหาวิทยาลัย เช่น 12345678@dpu.ac.th");
      return false;
    }
    if (password.length < 6) {
      Alert.alert("รหัสผ่านสั้นเกินไป", "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert("รหัสผ่านไม่ตรงกัน", "กรุณากรอกรหัสผ่านให้ตรงกัน");
      return false;
    }
    return true;
  };

  const handleSendOtp = async () => {
    if (!validateStep1()) return;
    setSendingOtp(true);
    try {
      const result = await authService.sendOtp(email);
      if (result.success) {
        setStep(2);
        startCountdown();
      } else {
        Alert.alert("ไม่สำเร็จ", result.message);
      }
    } finally {
      setSendingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    setSendingOtp(true);
    try {
      const result = await authService.sendOtp(email);
      if (result.success) {
        setOtp(["", "", "", "", "", ""]);
        otpRefs.current[0]?.focus();
        startCountdown();
      } else {
        Alert.alert("ไม่สำเร็จ", result.message);
      }
    } finally {
      setSendingOtp(false);
    }
  };

  const handleOtpChange = (text: string, index: number) => {
    const digit = text.replace(/[^0-9]/g, "").slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    if (digit && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleRegister = async () => {
    const otpCode = otp.join("");
    if (otpCode.length < 6) {
      Alert.alert("แจ้งเตือน", "กรุณากรอก OTP ให้ครบ 6 หลัก");
      return;
    }
    setLoading(true);
    try {
      const response = await signUp({ email, name, password, faculty, otp: otpCode });
      if (response.success) {
        Alert.alert("สำเร็จ", "สมัครสมาชิกเรียบร้อยแล้ว", [{ text: "เข้าสู่ระบบ", onPress: () => router.push("/login") }]);
      }
    } catch (error: any) {
      Alert.alert("ไม่สำเร็จ", error.response?.data?.message || "สมัครสมาชิกไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />
      <SafeAreaView className="flex-1" edges={["top"]} style={{ backgroundColor: "white" }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
          <View className="px-8 pt-4 pb-10">
            <TouchableOpacity
              onPress={() => step === 2 ? setStep(1) : (router.canGoBack() ? router.back() : router.replace("/login"))}
              className="w-10 h-10 items-center justify-center bg-gray-50 rounded-2xl mb-6"
            >
              <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
            </TouchableOpacity>

            {step === 1 ? (
              <>
                <View className="mb-8">
                  <Text className="text-3xl font-black text-gray-900">Create Account</Text>
                  <Text className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-1">Join DPU UniLife</Text>
                </View>

                <InputField label="Full Name (English)" icon="person-outline" placeholder="Full Name" value={name} onChangeText={setNameInput} />
                <InputField label="Student Email" icon="mail-outline" placeholder="Email (@dpu.ac.th)" value={email} onChangeText={setEmail} keyboardType="email-address" />

                <View className="mb-4">
                  <Text className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-2">Faculty</Text>
                  <TouchableOpacity onPress={() => setShowFacultyPicker(!showFacultyPicker)} className="flex-row items-center bg-gray-50 rounded-3xl px-5 py-4 border border-gray-100">
                    <Ionicons name="briefcase-outline" size={20} color={theme.colors.primary} />
                    <Text className={`flex-1 ml-4 font-bold ${faculty ? 'text-gray-800' : 'text-gray-400'}`}>{faculty || "Select Faculty"}</Text>
                    <Ionicons name="chevron-down" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                  {showFacultyPicker && (
                    <View className="mt-2 rounded-3xl p-4 bg-gray-50 border border-gray-100" style={{ maxHeight: 200 }}>
                      <ScrollView nestedScrollEnabled={true}>
                        {FACULTIES.map(f => (
                          <TouchableOpacity key={f} onPress={() => { setFacultyInput(f); setShowFacultyPicker(false); }} className="py-3 border-b border-gray-100">
                            <Text className="font-bold text-gray-600 text-center">{f}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                <InputField label="Password" icon="lock-closed-outline" placeholder="Password" value={password} onChangeText={setPassword} secure={true} />
                <InputField label="Confirm Password" icon="checkmark-circle-outline" placeholder="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} secure={true} />

                <TouchableOpacity onPress={handleSendOtp} disabled={sendingOtp} className="rounded-3xl py-5 mt-8 items-center shadow-lg" style={{ backgroundColor: theme.colors.primary }}>
                  {sendingOtp ? <ActivityIndicator color="white" /> : <Text className="text-white font-black text-lg">NEXT</Text>}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => router.push("/login")} className="mt-8 self-center">
                  <Text className="text-gray-400 font-bold text-[12px]">HAVE AN ACCOUNT? <Text className="text-indigo-600">SIGN IN</Text></Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View className="mb-8">
                  <Text className="text-3xl font-black text-gray-900">Verify Email</Text>
                  <Text className="text-gray-400 font-medium text-[13px] mt-2">ส่ง OTP ไปที่</Text>
                  <Text className="font-black text-indigo-600 text-[14px]">{email}</Text>
                </View>

                <View className="flex-row justify-between mb-8">
                  {otp.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={ref => { otpRefs.current[index] = ref; }}
                      value={digit}
                      onChangeText={text => handleOtpChange(text, index)}
                      onKeyPress={e => handleOtpKeyPress(e, index)}
                      keyboardType="number-pad"
                      maxLength={1}
                      className="text-center font-black text-2xl text-gray-900 rounded-2xl border-2"
                      style={{
                        width: 48, height: 60,
                        borderColor: digit ? theme.colors.primary : "#E5E7EB",
                        backgroundColor: digit ? "#EDE9FE" : "#F9FAFB",
                      }}
                    />
                  ))}
                </View>

                <TouchableOpacity onPress={handleRegister} disabled={loading} className="rounded-3xl py-5 items-center shadow-lg" style={{ backgroundColor: theme.colors.primary }}>
                  {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-black text-lg">REGISTER</Text>}
                </TouchableOpacity>

                <TouchableOpacity onPress={handleResendOtp} disabled={countdown > 0 || sendingOtp} className="mt-6 self-center">
                  {sendingOtp
                    ? <ActivityIndicator size="small" color={theme.colors.primary} />
                    : <Text className="font-bold text-[13px]" style={{ color: countdown > 0 ? "#9CA3AF" : theme.colors.primary }}>
                        {countdown > 0 ? `ส่ง OTP ใหม่ได้ใน ${countdown}s` : "ส่ง OTP ใหม่"}
                      </Text>
                  }
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
