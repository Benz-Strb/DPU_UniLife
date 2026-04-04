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
  Dimensions
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { theme } from "@/constants/theme";
import { useUser } from "@/store/UserContext";

const { height } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validateEmail = (email: string) => /^[0-9]{8}@dpu\.ac\.th$/.test(email.toLowerCase());

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert("Invalid Email", "Please use your student email (@dpu.ac.th)");
      return;
    }
    
    setLoading(true);
    try {
      const result = await login(email, password);
      if (!result.success) {
        Alert.alert("Login Failed", result.message || "Invalid email or password");
      }
    } catch (error: any) {
      Alert.alert("Error", "เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />
      
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1, minHeight: height }} showsVerticalScrollIndicator={false}>
          <View className="flex-1 px-8 pt-32 pb-10">
            
            <View className="items-center mb-16">
              <View className="w-20 h-20 rounded-[30px] items-center justify-center mb-6 bg-indigo-50 shadow-sm">
                <Ionicons name="school" size={40} color={theme.colors.primary} />
              </View>
              <Text className="text-4xl font-black text-gray-900 mb-1">UniLife</Text>
              <Text className="text-gray-400 font-bold uppercase text-[10px] tracking-[4px]">DPU Community</Text>
            </View>

            <View className="space-y-5">
              <View>
                <Text className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-2">Email</Text>
                <View className="flex-row items-center bg-gray-50 rounded-3xl px-5 py-4 border border-gray-100">
                  <Ionicons name="mail-outline" size={20} color={theme.colors.primary} />
                  <TextInput 
                    className="flex-1 ml-4 font-bold text-gray-800"
                    placeholder="Student Email"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>
              </View>

              <View>
                <Text className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 ml-2">Password</Text>
                <View className="flex-row items-center bg-gray-50 rounded-3xl px-5 py-4 border border-gray-100">
                  <Ionicons name="lock-closed-outline" size={20} color={theme.colors.primary} />
                  <TextInput 
                    className="flex-1 ml-4 font-bold text-gray-800"
                    placeholder="Password"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#9CA3AF" />
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
            </View>

            <View className="mt-auto items-center">
              <TouchableOpacity onPress={() => router.push("/signup")} className="bg-gray-50 px-8 py-3 rounded-full border border-gray-100">
                <Text className="text-gray-400 font-bold text-[12px]">NEW ACCOUNT? <Text className="text-indigo-600">SIGN UP</Text></Text>
              </TouchableOpacity>
            </View>
            
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
