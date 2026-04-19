import React, { useState } from "react";
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
  Dimensions,
  Modal
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { theme } from "@/constants/theme";
import { useUser } from "@/store/UserContext";
import { authService } from "@/services/api";

const { height } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const { login, themeColors, isDarkMode } = useUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Forgot Password Modal State
  const [forgotVisible, setForgotVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const isDpuEmail = (email: string) => /@dpu\.ac\.th$/i.test(email.trim());
  const validateEmail = (email: string) => /^([0-9]{8}|admin)@dpu\.ac\.th$/.test(email.toLowerCase());

  const getThaiMessage = (message: string): string => {
    if (message.includes('User not registered')) return 'ไม่พบบัญชีนี้ในระบบ กรุณาสมัครใช้งานก่อน';
    if (message.includes('Invalid studentId or password') || message.includes('Invalid credentials')) return 'รหัสผ่านไม่ถูกต้อง';
    if (message.includes('not allowed to sign in') || message.includes('SUSPENDED')) return 'บัญชีนี้ถูกระงับการใช้งาน';
    if (message.includes('temporarily banned') || message.includes('banned')) {
      return 'บัญชีนี้ถูกแบนชั่วคราว กรุณาลองใหม่ภายหลัง';
    }
    if (message.includes('เกิดข้อผิดพลาด') || message.includes('connection') || message.includes('network')) {
      return 'เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่';
    }
    return message;
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("แจ้งเตือน", "กรุณากรอกอีเมลและรหัสผ่าน");
      return;
    }

    if (!isDpuEmail(email)) {
      Alert.alert("อีเมลไม่ถูกต้อง", "กรุณาใช้อีเมลของมหาวิทยาลัย (@dpu.ac.th)");
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert("อีเมลไม่ถูกต้อง", "รูปแบบอีเมลไม่ถูกต้อง ตัวอย่าง: 12345678@dpu.ac.th");
      return;
    }

    setLoading(true);
    try {
      const result = await login(email, password);
      if (!result.success) {
        const msg = result.message || "Invalid credentials";
        Alert.alert("เข้าสู่ระบบไม่สำเร็จ", getThaiMessage(msg));
      }
    } catch (error: any) {
      Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถเชื่อมต่อได้ กรุณาลองใหม่");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetEmail || !newPassword || !confirmPassword) {
      Alert.alert("แจ้งเตือน", "กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }
    if (!validateEmail(resetEmail)) {
      Alert.alert("อีเมลไม่ถูกต้อง", "กรุณาใช้อีเมลของมหาวิทยาลัย เช่น 12345678@dpu.ac.th");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("รหัสผ่านสั้นเกินไป", "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("รหัสผ่านไม่ตรงกัน", "กรุณากรอกรหัสผ่านให้ตรงกัน");
      return;
    }
    setResetLoading(true);
    try {
      const result = await authService.resetPassword(resetEmail, newPassword);
      if (result.success) {
        Alert.alert("สำเร็จ", "เปลี่ยนรหัสผ่านเรียบร้อยแล้ว กรุณาเข้าสู่ระบบอีกครั้ง", [
          { text: "ตกลง", onPress: () => {
            setForgotVisible(false);
            setResetEmail("");
            setNewPassword("");
            setConfirmPassword("");
          }}
        ]);
      } else {
        Alert.alert("ไม่สำเร็จ", result.message || "เกิดข้อผิดพลาด");
      }
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <View className="flex-1" style={{ backgroundColor: themeColors.background }}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1, minHeight: height }} showsVerticalScrollIndicator={false}>
          <View className="flex-1 px-8 pt-32 pb-10">
            
            <View className="items-center mb-16">
              <View className="w-20 h-20 rounded-[30px] items-center justify-center mb-6 bg-indigo-50 shadow-sm">
                <Ionicons name="school" size={40} color={theme.colors.primary} />
              </View>
              <Text className="text-4xl font-black mb-1" style={{ color: themeColors.text }}>UniLife</Text>
              <Text className="font-bold uppercase text-[10px] tracking-[4px]" style={{ color: themeColors.subText }}>DPU Community</Text>
            </View>

            <View className="space-y-5">
              <View>
                <Text className="text-[10px] font-black uppercase tracking-widest mb-2 ml-2" style={{ color: themeColors.subText }}>Email</Text>
                <View className="flex-row items-center rounded-3xl px-5 py-4 border" style={{ backgroundColor: themeColors.card, borderColor: themeColors.border }}>
                  <Ionicons name="mail-outline" size={20} color={theme.colors.primary} />
                  <TextInput
                    className="flex-1 ml-4 font-bold"
                    placeholder="Student Email"
                    placeholderTextColor={themeColors.subText}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    style={{ color: themeColors.text }}
                  />
                </View>
              </View>

              <View>
                <Text className="text-[10px] font-black uppercase tracking-widest mb-2 ml-2" style={{ color: themeColors.subText }}>Password</Text>
                <View className="flex-row items-center rounded-3xl px-5 py-4 border" style={{ backgroundColor: themeColors.card, borderColor: themeColors.border }}>
                  <Ionicons name="lock-closed-outline" size={20} color={theme.colors.primary} />
                  <TextInput
                    className="flex-1 ml-4 font-bold"
                    placeholder="Password"
                    placeholderTextColor={themeColors.subText}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                    style={{ color: themeColors.text }}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color={themeColors.subText} />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                onPress={handleLogin}
                disabled={loading}
                className="rounded-3xl py-5 mt-6 flex-row items-center justify-center shadow-lg"
                style={{ backgroundColor: theme.colors.primary }}
              >
                {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-black text-lg">Login</Text>}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setForgotVisible(true)} className="items-center mt-4">
                <Text className="text-indigo-500 font-bold text-[13px]">Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            <View className="mt-auto items-center">
              <TouchableOpacity onPress={() => router.push("/signup")} className="px-8 py-3 rounded-full border" style={{ backgroundColor: themeColors.card, borderColor: themeColors.border }}>
                <Text className="font-bold text-[12px]" style={{ color: themeColors.subText }}>NEW ACCOUNT? <Text className="text-indigo-600">SIGN UP</Text></Text>
              </TouchableOpacity>
            </View>
            
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      {/* Forgot Password Modal */}
      <Modal visible={forgotVisible} animationType="slide" transparent onRequestClose={() => setForgotVisible(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" }}>
          <View className="rounded-t-[32px] px-8 pt-8 pb-12" style={{ backgroundColor: themeColors.card }}>
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-2xl font-black" style={{ color: themeColors.text }}>Reset Password</Text>
              <TouchableOpacity onPress={() => setForgotVisible(false)}>
                <Ionicons name="close-circle" size={28} color={themeColors.subText} />
              </TouchableOpacity>
            </View>

            <Text className="text-[10px] font-black uppercase tracking-widest mb-2 ml-2" style={{ color: themeColors.subText }}>Email</Text>
            <View className="flex-row items-center rounded-3xl px-5 py-4 border mb-4" style={{ backgroundColor: themeColors.background, borderColor: themeColors.border }}>
              <Ionicons name="mail-outline" size={20} color={theme.colors.primary} />
              <TextInput
                className="flex-1 ml-4 font-bold"
                placeholder="Student Email"
                placeholderTextColor={themeColors.subText}
                value={resetEmail}
                onChangeText={setResetEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                style={{ color: themeColors.text }}
              />
            </View>

            <Text className="text-[10px] font-black uppercase tracking-widest mb-2 ml-2" style={{ color: themeColors.subText }}>New Password</Text>
            <View className="flex-row items-center rounded-3xl px-5 py-4 border mb-4" style={{ backgroundColor: themeColors.background, borderColor: themeColors.border }}>
              <Ionicons name="lock-closed-outline" size={20} color={theme.colors.primary} />
              <TextInput
                className="flex-1 ml-4 font-bold"
                placeholder="New Password"
                placeholderTextColor={themeColors.subText}
                secureTextEntry={!showNewPassword}
                value={newPassword}
                onChangeText={setNewPassword}
                style={{ color: themeColors.text }}
              />
              <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                <Ionicons name={showNewPassword ? "eye-off" : "eye"} size={20} color={themeColors.subText} />
              </TouchableOpacity>
            </View>

            <Text className="text-[10px] font-black uppercase tracking-widest mb-2 ml-2" style={{ color: themeColors.subText }}>Confirm Password</Text>
            <View className="flex-row items-center rounded-3xl px-5 py-4 border mb-6" style={{ backgroundColor: themeColors.background, borderColor: themeColors.border }}>
              <Ionicons name="lock-closed-outline" size={20} color={theme.colors.primary} />
              <TextInput
                className="flex-1 ml-4 font-bold"
                placeholder="Confirm Password"
                placeholderTextColor={themeColors.subText}
                secureTextEntry={!showNewPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                style={{ color: themeColors.text }}
              />
            </View>

            <TouchableOpacity
              onPress={handleResetPassword}
              disabled={resetLoading}
              className="rounded-3xl py-5 flex-row items-center justify-center shadow-lg"
              style={{ backgroundColor: theme.colors.primary }}
            >
              {resetLoading ? <ActivityIndicator color="white" /> : <Text className="text-white font-black text-lg">Reset Password</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
