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
import { FACULTY_DATA } from "@/constants/data";

const { width, height } = Dimensions.get('window');

const FACULTIES = Object.keys(FACULTY_DATA);

const InputField = ({ label, icon, placeholder, value, onChangeText, secure = false, keyboardType = "default" }: any) => (
  <View className="mb-5">
    <Text className="text-[11px] font-black uppercase tracking-[2px] text-gray-400 mb-2 ml-2">
      {label}
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
      <Ionicons name={icon} size={22} color={theme.colors.primary} className="opacity-80" />
      <TextInput 
        className="flex-1 ml-4 font-semibold text-gray-800 text-base"
        placeholder={placeholder}
        placeholderTextColor="#A1A1AA"
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
  const { signUp, setName, setFaculty } = useUser();
  
  const [name, setNameInput] = useState("");
  const [email, setEmail] = useState("");
  const [faculty, setFacultyInput] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showFacultyPicker, setShowFacultyPicker] = useState(false);

  const validateEmail = (email: string) => /^[0-9]{8}@dpu\.ac\.th$/.test(email.toLowerCase());
  const validatePassword = (pass: string) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(pass);
  const validateEnglishName = (name: string) => /^[A-Za-z\s]+$/.test(name);

  const handleSignUp = async () => {
    if (!name || !email || !faculty || !password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (!validateEnglishName(name)) {
      Alert.alert("Invalid Name", "Full Name must be in English only.");
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert("Invalid Email", "Please use your student ID email (e.g., 64000000@dpu.ac.th)");
      return;
    }

    if (!validatePassword(password)) {
      Alert.alert("Weak Password", "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number.");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Password Mismatch", "Passwords do not match. Please re-enter your password.");
      return;
    }

    setLoading(true);
    try {
      const response = await signUp({ 
        email, 
        name, 
        password,
        faculty: faculty
      });
      
      if (response.success) {
        Alert.alert("Success", "Account created successfully!");
        router.push("/login");
      } else {
        Alert.alert("Error", "Sign up failed.");
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || "Could not connect to the university server.";
      Alert.alert("Error", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" />
      
      <View 
        className="absolute w-[500px] h-[500px] rounded-full opacity-10"
        style={{ 
          backgroundColor: theme.colors.primary, 
          top: -200, 
          left: -150,
        }} 
      />
      <View 
        className="absolute w-[300px] h-[300px] rounded-full opacity-[0.15]"
        style={{ 
          backgroundColor: theme.colors.secondary, 
          bottom: -50, 
          right: -100,
        }} 
      />

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
        <ScrollView contentContainerStyle={{ flexGrow: 1, minHeight: height }} showsVerticalScrollIndicator={false}>
          <View className="flex-1 px-8 pt-16 pb-10">
            
            <TouchableOpacity 
              onPress={() => router.back()} 
              className="w-12 h-12 items-center justify-center bg-white/80 rounded-full mb-8"
              style={{
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 5,
                elevation: 3,
              }}
            >
              <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
            </TouchableOpacity>

            <View className="mb-10">
              <Text className="text-4xl font-black text-gray-900 mb-2 tracking-tight">Create Account</Text>
              <Text className="text-gray-500 font-medium text-base">Join our DPU community today</Text>
            </View>

            <View>
              <InputField label="Full Name (English Only)" icon="person" placeholder="e.g. Somchai Jaidee" value={name} onChangeText={setNameInput} />
              <InputField label="Student Email" icon="mail" placeholder="@dpu.ac.th" value={email} onChangeText={setEmail} keyboardType="email-address" />
              
              <View className="mb-5">
                <Text className="text-[11px] font-black uppercase tracking-[2px] text-gray-400 mb-2 ml-2">
                  Faculty
                </Text>
                <TouchableOpacity 
                  onPress={() => setShowFacultyPicker(!showFacultyPicker)}
                  className="flex-row items-center bg-white/80 rounded-3xl px-5 py-4 border border-gray-100"
                  style={{
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.05,
                    shadowRadius: 10,
                    elevation: 2,
                  }}
                >
                  <Ionicons name="briefcase" size={22} color={theme.colors.primary} className="opacity-80" />
                  <View className="flex-1 ml-4">
                    <Text className={`font-semibold text-base ${faculty ? 'text-gray-800' : 'text-gray-400'}`}>
                      {faculty ? faculty : "Select your faculty"}
                    </Text>
                  </View>
                  <Ionicons name={showFacultyPicker ? "chevron-up" : "chevron-down"} size={20} color={theme.colors.primary} />
                </TouchableOpacity>

                {showFacultyPicker && (
                  <View 
                    className="mt-3 rounded-3xl p-4 bg-white border border-gray-100 shadow-xl"
                    style={{ maxHeight: 300, elevation: 10 }}
                  >
                    <ScrollView nestedScrollEnabled={true}>
                      <View className="flex-row flex-wrap justify-center">
                        {FACULTIES.map((f) => (
                          <TouchableOpacity 
                            key={f}
                            onPress={() => {
                              setFacultyInput(f);
                              setShowFacultyPicker(false);
                            }}
                            className={`px-4 py-2 rounded-full m-1 border ${faculty === f ? 'bg-violet-500 border-violet-500' : 'bg-gray-50 border-gray-100'}`}
                          >
                            <Text className={`text-[11px] font-bold ${faculty === f ? 'text-white' : 'text-gray-500'}`}>
                              {f}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                )}
              </View>

              <InputField label="Password" icon="lock-closed" placeholder="••••••••" value={password} onChangeText={setPassword} secure={true} />
              <InputField label="Confirm Password" icon="checkmark-circle" placeholder="••••••••" value={confirmPassword} onChangeText={setConfirmPassword} secure={true} />
              
              <View className="px-2 mb-8 mt-2 bg-purple-50/50 p-4 rounded-2xl border border-purple-100">
                <Text className="text-xs text-gray-500 font-medium leading-5">
                  <Text style={{color: theme.colors.primary, fontWeight: 'bold'}}>Requirements: </Text>
                  - Use <Text className="font-bold">Student ID@dpu.ac.th</Text>{"\n"}
                  - Password: <Text className="font-bold">8+ chars</Text> with <Text className="font-bold">A-Z, a-z, and 0-9</Text>
                </Text>
              </View>

              <TouchableOpacity 
                onPress={handleSignUp}
                disabled={loading}
                className="rounded-3xl py-4 flex-row items-center justify-center"
                style={{ 
                  backgroundColor: theme.colors.primary,
                  shadowColor: theme.colors.primary,
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.4,
                  shadowRadius: 15,
                  elevation: 8,
                }}
              >
                {loading ? <ActivityIndicator color="white" /> : (
                  <>
                    <Text className="text-white font-black text-lg mr-2 tracking-wide">CREATE ACCOUNT</Text>
                    <Ionicons name="sparkles" size={22} color="white" />
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View className="mt-auto pt-8 items-center">
              <View className="flex-row items-center bg-white/50 px-6 py-3 rounded-full">
                <Text className="text-gray-500 font-medium">Already have an account? </Text>
                <TouchableOpacity onPress={() => router.push("/login")}>
                  <Text className="font-black ml-1" style={{ color: theme.colors.primary }}>Sign In</Text>
                </TouchableOpacity>
              </View>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
