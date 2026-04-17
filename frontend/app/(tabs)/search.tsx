import React, { useState, useEffect, useRef } from "react";
import { View, Text, TextInput, ScrollView, TouchableOpacity, Image, StatusBar, Dimensions, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { theme } from "@/constants/theme";
import { useUser } from "@/store/UserContext";
import { FACULTY_DATA } from "@/constants/data";
import { searchService, authService } from "@/services/api";
import SearchBar from "@/components/SearchBar";
import { getAvatarUrl, getImageUrl } from "@/utils/imageUtils";
import { tabRefreshEmitter } from "@/utils/tabRefresh";

const { width } = Dimensions.get('window');

const FACULTY_LIST = Object.entries(FACULTY_DATA).map(([id, name]) => {
  let iconName: any = 'school';
  let IconComponent: any = Ionicons;
  let iconColor = theme.colors.primary;
  
  switch(id) {
    case 'LAW': 
      iconName = 'scale-balance'; 
      IconComponent = MaterialCommunityIcons;
      iconColor = '#B45309'; // สีทอง/น้ำตาลเข้ม (คณะนิติศาสตร์)
      break;
    case 'CA': 
      iconName = 'video'; 
      IconComponent = FontAwesome5;
      iconColor = '#A855F7'; // สีม่วงเม็ดมะปราง (คณะนิเทศศาสตร์)
      break;
    case 'FA': 
      iconName = 'palette'; 
      IconComponent = FontAwesome5;
      iconColor = '#EA580C'; // สีแดงส้ม/อิฐ (คณะศิลปกรรมศาสตร์)
      break;
    case 'ARTS': 
      iconName = 'language'; 
      IconComponent = Ionicons;
      iconColor = '#D97706'; // สีทอง (คณะศิลปศาสตร์)
      break;
    case 'PA': 
      iconName = 'office-building'; 
      IconComponent = MaterialCommunityIcons;
      iconColor = '#78350F'; // สีน้ำตาล (คณะรัฐประศาสนศาสตร์)
      break;
    case 'HT': 
      iconName = 'airplane'; 
      IconComponent = Ionicons;
      iconColor = '#0EA5E9'; // สีฟ้าคราม (คณะการท่องเที่ยวและการโรงแรม)
      break;
    case 'MT': 
      iconName = 'microscope'; 
      IconComponent = FontAwesome5;
      iconColor = '#DB2777'; // สีชมพูเข้ม (คณะเทคนิคการแพทย์)
      break;
    case 'CIBA': 
      iconName = 'chart-line'; 
      IconComponent = FontAwesome5;
      iconColor = '#2563EB'; // สีน้ำเงิน/ฟ้า (วิทยาลัย CIBA)
      break;
    case 'CITE': 
      iconName = 'cog'; 
      IconComponent = FontAwesome5;
      iconColor = '#991B1B'; // สีเลือดหมู (วิทยาลัย CITE)
      break;
    case 'CIM': 
      iconName = 'leaf'; 
      IconComponent = FontAwesome5;
      iconColor = '#65A30D'; // สีเขียวมะกอก (วิทยาลัย CIM)
      break;
    case 'CADT': 
      iconName = 'plane-departure'; 
      IconComponent = FontAwesome5;
      iconColor = '#1E3A8A'; // สีน้ำเงินกรมท่า (วิทยาลัย CADT)
      break;
    case 'ANT': 
      iconName = 'gamepad'; 
      IconComponent = FontAwesome5;
      iconColor = '#4C1D95'; // สีม่วงเข้ม/ดำ (วิทยาลัย ANT)
      break;
    case 'CHW': 
      iconName = 'hand-holding-heart'; 
      IconComponent = FontAwesome5;
      iconColor = '#84CC16'; // สีเขียวมะนาว (วิทยาลัยเฮลท์ แอนด์ เวลเนส)
      break;
    case 'IC':
      iconName = 'globe-americas';
      IconComponent = FontAwesome5;
      iconColor = '#6366F1'; // สีม่วงฟ้า (วิทยาลัยนานาชาติ)
      break;
    default: 
      iconName = 'school';
      IconComponent = Ionicons;
      iconColor = theme.colors.primary;
  }

  return { id, name, icon: iconName, Component: IconComponent, color: iconColor };
});

export default function SearchScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const { themeColors, isDarkMode, userId } = useUser();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ users: any[]; posts: any[]; groups: any[] }>({ users: [], posts: [], groups: [] });
  const [suggestedUsers, setSuggestedUsers] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [history, setHistory] = useState<{ keyword: string; searchedAt: string }[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = () => scrollRef.current?.scrollTo({ y: 0, animated: true });
    tabRefreshEmitter.on("search", handler);
    return () => tabRefreshEmitter.off("search", handler);
  }, []);

  useEffect(() => {
    if (userId) searchService.getHistory(userId).then(setHistory);
  }, [userId]);

  useEffect(() => {
    authService.getSuggestedUsers(30).then(setSuggestedUsers);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!searchQuery.trim()) {
      setSearchResults({ users: [], posts: [], groups: [] });
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      const result = await searchService.search(searchQuery.trim(), "users", userId ?? undefined, 20);
      setSearchResults(result);
      setIsSearching(false);
      if (userId) searchService.getHistory(userId).then(setHistory);
    }, 400);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery, userId]);

  const handleDeleteKeyword = async (keyword: string) => {
    if (!userId) return;
    await searchService.deleteKeyword(userId, keyword);
    setHistory(prev => prev.filter(h => h.keyword !== keyword));
  };

  const handleClearHistory = async () => {
    if (!userId) return;
    await searchService.clearHistory(userId);
    setHistory([]);
  };

  const filteredUsers = (searchQuery.trim() ? searchResults.users : suggestedUsers)
    .filter(u => u.id !== userId);

  return (
    <View className="flex-1" style={{ backgroundColor: themeColors.background }}>
      <StatusBar barStyle={themeColors.statusBar as any} />
      
      <SafeAreaView className="flex-1" edges={['top']}>
        <View className="px-6 py-4">
          <Text className="text-3xl font-black mb-6 tracking-tight" style={{ color: themeColors.text }}>Discovery</Text>
          
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search friends or faculty..."
            themeColors={themeColors}
          />
        </View>

        <ScrollView ref={scrollRef} className="flex-1" showsVerticalScrollIndicator={false}>
          {/* Recent Searches */}
          {!searchQuery.trim() && history.length > 0 && (
            <View className="px-6 mb-6">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-[10px] font-black uppercase tracking-[2px] text-gray-400">Recent Searches</Text>
                <TouchableOpacity onPress={handleClearHistory}>
                  <Text className="text-[10px] font-bold text-violet-500">Clear all</Text>
                </TouchableOpacity>
              </View>
              <View className="flex-row flex-wrap gap-2">
                {history.map((h) => (
                  <View
                    key={h.keyword}
                    className="flex-row items-center rounded-full px-3 py-2 border"
                    style={{ backgroundColor: themeColors.card, borderColor: themeColors.border }}
                  >
                    <TouchableOpacity onPress={() => setSearchQuery(h.keyword)}>
                      <Text className="text-xs font-bold mr-2" style={{ color: themeColors.text }}>{h.keyword}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteKeyword(h.keyword)}>
                      <Ionicons name="close" size={12} color={themeColors.subText} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Browse Faculties */}
          <View className="mb-8">
            <View className="px-6 mb-4">
              <Text className="text-[10px] font-black uppercase tracking-[2px] text-gray-400">Browse Faculties</Text>
            </View>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4">
              {FACULTY_LIST.map((f) => (
                <TouchableOpacity 
                  key={f.id}
                  onPress={() => router.push({ pathname: "/tag", params: { tagName: f.id } } as any)}
                  className="mx-2 items-center"
                >
                  <View 
                    className="w-16 h-16 rounded-2xl items-center justify-center border-2 mb-2"
                    style={{ backgroundColor: themeColors.card, borderColor: themeColors.border }}
                  >
                    <f.Component name={f.icon as any} size={24} color={f.color} />
                  </View>
                  <Text className="text-[9px] font-black uppercase text-center" style={{ color: themeColors.subText }}>{f.id}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Community Members Grid */}
          <View className="px-6 pb-20">
            <View className="flex-row items-center justify-between mb-8">
              <View className="flex-row items-center">
                <View className="w-2 h-6 rounded-full bg-violet-500 mr-3" />
                <Text className="font-black text-xl tracking-tight" style={{ color: themeColors.text }}>
                  {searchQuery.trim() ? "ผลการค้นหา" : "แนะนำสำหรับคุณ"}
                </Text>
              </View>
              {isSearching
                ? <ActivityIndicator size="small" color={theme.colors.primary} />
                : <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{filteredUsers.length} คน</Text>
              }
            </View>

            {filteredUsers.length === 0 ? (
              <View className="items-center justify-center py-20 bg-gray-50/50 rounded-[40px] border border-dashed border-gray-200">
                <Ionicons name="people-outline" size={60} color="#CBD5E1" />
                <Text className="mt-4 font-black text-[10px] uppercase text-gray-400 tracking-widest">No members found</Text>
              </View>
            ) : (
              <View className="flex-row flex-wrap justify-between">
                {filteredUsers.map((user: any) => (
                  <TouchableOpacity 
                    key={user.id}
                    onPress={() => router.push({ pathname: "/user-profile", params: { userId: user.id } })}
                    activeOpacity={0.7}
                    className="mb-8 rounded-[40px] p-2"
                    style={{ 
                      width: (width - 64) / 2,
                      backgroundColor: themeColors.card,
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 10 },
                      shadowOpacity: 0.05,
                      shadowRadius: 15,
                      elevation: 5
                    }}
                  >
                    <View className="items-center pt-2">
                      <View 
                        className="w-28 h-28 rounded-[35px] items-center justify-center p-1"
                        style={{ backgroundColor: isDarkMode ? "#2D2D2D" : "#F5F3FF" }}
                      >
                        <Image 
                          source={{ uri: getAvatarUrl(user.avatarUrl, user.fullName) }} 
                          className="w-full h-full rounded-[30px]"
                        />
                      </View>
                      
                      {user.faculty && (
                        <View 
                          className="absolute bottom-[-10] bg-violet-500 px-3 py-1 rounded-full border-2 border-white shadow-sm"
                        >
                          <Text className="text-[8px] text-white font-black uppercase tracking-tighter">{user.faculty}</Text>
                        </View>
                      )}
                    </View>

                    <View className="items-center mt-5 mb-4 px-2">
                      <Text 
                        className="font-black text-sm text-center tracking-tight" 
                        numberOfLines={1} 
                        style={{ color: themeColors.text }}
                      >
                        {user.fullName}
                      </Text>
                      <View className="flex-row items-center mt-1">
                        <Ionicons name="sparkles" size={10} color="#A78BFA" />
                        <Text className="text-[9px] font-bold text-gray-400 uppercase tracking-widest ml-1">Member</Text>
                      </View>
                    </View>

                    <View 
                      className="mx-2 mb-2 py-2 rounded-2xl items-center"
                      style={{ backgroundColor: isDarkMode ? "#2D2D2D" : "#F8F9FF" }}
                    >
                      <Text className="text-[9px] font-black text-violet-500 uppercase">View Profile</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
