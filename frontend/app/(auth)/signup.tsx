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
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { theme } from "@/constants/theme";
import { useUser } from "@/store/UserContext";
import { FACULTY_DATA } from "@/constants/data";

const { height } = Dimensions.get('window');
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
  
  const [name, setNameInput] = useState("");
  const [email, setEmail] = useState("");
  const [faculty, setFacultyInput] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showFacultyPicker, setShowFacultyPicker] = useState(false);

  const handleSignUp = async () => {
    if (!name || !email || !faculty || !password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const response = await signUp({ email, name, password, faculty });
      if (response.success) {
        Alert.alert("Success", "Account created!", [{ text: "Login", onPress: () => router.push("/login") }]);
      }
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />
      <SafeAreaView className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
          <View className="px-8 pt-4 pb-10">
            <TouchableOpacity 
              onPress={() => router.canGoBack() ? router.back() : router.replace("/login")} 
              className="w-10 h-10 items-center justify-center bg-gray-50 rounded-2xl mb-6"
            >
              <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
            </TouchableOpacity>

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
            
            <TouchableOpacity onPress={handleSignUp} disabled={loading} className="rounded-3xl py-5 mt-8 items-center shadow-lg" style={{ backgroundColor: theme.colors.primary }}>
              {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-black text-lg">REGISTER</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push("/login")} className="mt-8 self-center">
              <Text className="text-gray-400 font-bold text-[12px]">HAVE AN ACCOUNT? <Text className="text-indigo-600">SIGN IN</Text></Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
