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

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validateEmail = (email: string) => /^[0-9]{8}@dpu\.ac\.th$/.test(email.toLowerCase());
  const validatePassword = (pass: string) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(pass);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert("Invalid Email", "Please use your student ID email (e.g., 64000000@dpu.ac.th)");
      return;
    }

    if (!validatePassword(password)) {
      Alert.alert("Invalid Password", "Password must be at least 8 characters long and contain uppercase, lowercase, and numbers.");
      return;
    }
    
    setLoading(true);
    try {
      const success = await login(email, password);
      if (!success) {
        Alert.alert("Login Failed", "Invalid student ID or password. Please check your credentials and try again.");
      }
    } catch (error: any) {
      console.error("Login Screen Error:", error);
      const errorMsg = error.response?.data?.message || "Something went wrong. Please check your connection and try again.";
      Alert.alert("Error", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />
      
      <View 
        className="absolute w-96 h-96 rounded-full opacity-20"
        style={{ 
          backgroundColor: theme.colors.primary, 
          top: -100, 
          right: -100,
          transform: [{ scale: 1.5 }]
        }} 
      />
      <View 
        className="absolute w-64 h-64 rounded-full opacity-10"
        style={{ 
          backgroundColor: theme.colors.secondary, 
          top: 150, 
          left: -100,
        }} 
      />

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1, minHeight: height }} showsVerticalScrollIndicator={false}>
          <View className="flex-1 px-8 pt-24 pb-10">
            
            <View className="items-center mb-14 mt-10">
              <View 
                className="w-24 h-24 rounded-[35px] items-center justify-center mb-6"
                style={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  shadowColor: theme.colors.primary,
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: 0.15,
                  shadowRadius: 20,
                  elevation: 10,
                }}
              >
                <Ionicons name="school" size={48} color={theme.colors.primary} />
              </View>
              <Text className="text-4xl font-black text-gray-900 mb-2 tracking-tight">UniLife</Text>
              <Text className="text-gray-500 text-center font-medium text-base">
                Your Campus, Connected.
              </Text>
            </View>

            <View className="space-y-6">
              <View>
                <Text className="text-[11px] font-black uppercase tracking-[2px] text-gray-400 mb-2 ml-2">
                  Student Email
                </Text>
                <View 
                  className="flex-row items-center bg-white/80 rounded-3xl px-5 py-4 border border-gray-100"
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.05,
                    shadowRadius: 10,
                    elevation: 2,
                  }}
                >
                  <Ionicons name="mail" size={22} color={theme.colors.primary} className="opacity-80" />
                  <TextInput 
                    className="flex-1 ml-4 font-semibold text-gray-800 text-base"
                    placeholder="@dpu.ac.th"
                    placeholderTextColor="#A1A1AA"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>
              </View>

              <View>
                <Text className="text-[11px] font-black uppercase tracking-[2px] text-gray-400 mb-2 ml-2 mt-2">
                  Password
                </Text>
                <View 
                  className="flex-row items-center bg-white/80 rounded-3xl px-5 py-4 border border-gray-100"
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.05,
                    shadowRadius: 10,
                    elevation: 2,
                  }}
                >
                  <Ionicons name="lock-closed" size={22} color={theme.colors.primary} className="opacity-80" />
                  <TextInput 
                    className="flex-1 ml-4 font-semibold text-gray-800 text-base"
                    placeholder="••••••••"
                    placeholderTextColor="#A1A1AA"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons 
                      name={showPassword ? "eye-off" : "eye"} 
                      size={22} 
                      color="#9CA3AF" 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity className="align-end self-end mt-2 pr-2">
                <Text className="font-bold text-sm" style={{ color: theme.colors.primary }}>Forgot Password?</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={handleLogin}
                disabled={loading}
                className="rounded-3xl py-4 mt-6 flex-row items-center justify-center"
                style={{ 
                  backgroundColor: theme.colors.primary,
                  shadowColor: theme.colors.primary,
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.4,
                  shadowRadius: 15,
                  elevation: 8,
                }}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Text className="text-white font-black text-lg mr-2 tracking-wide">LOGIN</Text>
                    <Ionicons name="arrow-forward" size={22} color="white" />
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View className="mt-auto pt-10 pb-6 items-center">
              <View className="flex-row items-center bg-white/50 px-6 py-3 rounded-full">
                <Text className="text-gray-500 font-medium">New to UniLife? </Text>
                <TouchableOpacity onPress={() => router.push("/signup")}>
                  <Text className="font-black ml-1" style={{ color: theme.colors.primary }}>Create Account</Text>
                </TouchableOpacity>
              </View>
            </View>
            
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
