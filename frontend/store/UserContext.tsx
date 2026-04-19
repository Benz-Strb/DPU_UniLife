import React, { createContext, useContext, useState, ReactNode, useEffect, useRef } from "react";
import { View, Text, Animated, TouchableOpacity, Image, Platform, Dimensions, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authService, postService, chatService, notificationService, followService, BASE_URL } from "@/services/api";
import { theme } from "@/constants/theme";
import { User, Post, Comment, Conversation, Message, UserRole } from "@/types/backend";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

const { width } = Dimensions.get("window");

// Helper สำหรับเลือกสีและไอคอนตามประเภท (ย้ายไว้นอก Component เพื่อความชัวร์)
const getToastConfig = (type: string) => {
  switch (type) {
    case "LIKE": return { icon: "heart", color: "#EC4899", label: "Liked your post" };
    case "COMMENT": return { icon: "chatbubble-ellipses", color: "#10B981", label: "Commented on your post" };
    case "FOLLOW": return { icon: "person-add", color: "#3B82F6", label: "Started following you" };
    case "MESSAGE": return { icon: "mail", color: "#8B5CF6", label: "Sent you a message" };
    default: return { icon: "notifications", color: "#6B7280", label: "New update" };
  }
};

interface UserContextType {
  userId: string;
  user: User | null;
  setUser: (user: User | null) => void;
  faculty: string;
  setFaculty: (faculty: string) => void;
  name: string;
  setName: (name: string) => void;
  bio: string;
  setBio: (bio: string) => void;
  profileImage: string;
  setProfileImage: (img: string) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  themeColors: (typeof theme)["light"];
  notifications: boolean;
  setNotifications: (val: boolean) => void;
  notificationList: any[];
  isAdmin: boolean;
  isUniAdmin: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; message?: string }>;
  signUp: (userData: any) => Promise<any>;
  logout: () => void;
  posts: Post[];
  addPost: (postData: any) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
  updatePost: (postId: string, data: any) => Promise<void>;
  toggleLike: (postId: string, reaction?: string) => Promise<void>;
  refreshPosts: (useAI?: boolean) => Promise<void>;
  isRefreshing: boolean;
  conversations: Conversation[];
  sendMessage: (convoId: string, body: string, attachmentUrl?: string, attachmentType?: string) => Promise<void>;
  syncProfile: (name: string, faculty: string, img: string) => Promise<void>;
  updateProfile: (data: { fullName?: string; username?: string; bio?: string; avatarUrl?: string }) => Promise<void>;
  followingIds: string[];
  toggleFollow: (targetId: string) => Promise<void>;
  getDirectChat: (targetId: string) => Promise<Conversation | null>;
  unreadChatCount: number;
  unreadNotificationCount: number;
  fetchNotifications: () => Promise<void>;
  markNotificationAsRead: (notifId: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  setActiveChatId: (id: string | null) => void;
  deleteConversation: (convoId: string) => Promise<void>;
  refreshChats: () => Promise<void>;
  updateConversation: (convoId: string, data: { title?: string; avatarUrl?: string }) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

// State กลางของแอปสำหรับจัดการข้อมูลผู้ใช้, ฟีดโพสต์, แชต, การแจ้งเตือน และการเชื่อมต่อ realtime
export function UserProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [faculty, setFaculty] = useState("");
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isUniAdmin, setIsUniAdmin] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [notificationList, setNotificationList] = useState<any[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [posts, setPosts] = useState<Post[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  // โหลด session ที่บันทึกไว้ตอนเปิดแอป
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const stored = await AsyncStorage.getItem("user_session");
        if (stored) {
          const u: User = JSON.parse(stored);
          setUserId(u.id);
          setUser(u);
          setName(u.fullName);
          setFaculty(u.faculty || "");
          setBio(u.bio || "");
          setProfileImage(u.avatarUrl || "");
          setIsAdmin(u.role === UserRole.ADMIN || u.role === UserRole.SUPER_ADMIN);
          setIsUniAdmin(u.role === UserRole.SUPER_ADMIN);
        }
      } catch (e) {
        console.error("Restore session error", e);
      } finally {
        setIsLoadingSession(false);
      }
    };
    restoreSession();
  }, []);

  // Active Chat State for suppressing toasts
  const [activeChatId, _setActiveChatId] = useState<string | null>(null);
  const activeChatIdRef = useRef<string | null>(null);

  const setActiveChatId = (id: string | null) => {
    _setActiveChatId(id);
    activeChatIdRef.current = id;
  };

  // Toast States
  const [showToast, setShowToast] = useState(false);
  const [toastData, setToastData] = useState<any>(null);
  const toastAnim = useRef(new Animated.Value(-150)).current;
  const socketRef = useRef<any>(null);

  const triggerToast = (data: any) => {
    setToastData(data);
    setShowToast(true);
    
    // เด้งไวและนุ่มนวล (Premium Feel)
    Animated.spring(toastAnim, {
      toValue: Platform.OS === 'android' ? 50 : 60,
      useNativeDriver: true,
      tension: 50,
      friction: 8
    }).start();

    // หายไปใน 4 วินาที
    setTimeout(() => {
      Animated.timing(toastAnim, {
        toValue: -150,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        setShowToast(false);
        setToastData(null);
      });
    }, 4000);
  };

  const fetchPosts = async (useAI = false) => {
    try {
      let data;
      if (useAI && userId) {
        data = await postService.getAIFeed(userId);
      } else {
        data = await postService.getPosts();
      }
      setPosts(Array.isArray(data) ? data : []);
    } catch (e) { setPosts([]); }
  };

  const fetchNotifications = async () => {
    if (!userId) return;
    try {
      const result = await notificationService.getNotifications(userId);
      if (result && result.data) {
        const filteredData = result.data.filter((n: any) => n.type !== "MESSAGE");
        setNotificationList(filteredData);
        setUnreadNotificationCount(filteredData.filter((n: any) => !n.readAt).length);
      }
    } catch (e) { console.error("Fetch Notifications Error", e); }
  };

  const fetchChats = async (currentUserId: string) => {
    try {
      const data = await chatService.getConversations(currentUserId);
      const convos = Array.isArray(data) ? data : [];
      setConversations(convos);
      
      let count = 0;
      convos.forEach(c => {
        const myParticipant = c.participants.find(p => p.userId === currentUserId);
        if (myParticipant && c.messages) {
          const lastReadAt = myParticipant.lastReadAt ? new Date(myParticipant.lastReadAt) : null;
          c.messages.forEach((msg: any) => {
            if (msg.senderId !== currentUserId) {
              if (!lastReadAt || new Date(msg.createdAt) > lastReadAt) {
                count++;
              }
            }
          });
        }
      });
      setUnreadChatCount(count);
    } catch (e) { setConversations([]); }
  };

  useEffect(() => {
    if (userId) {
      const socket = require("@/services/socket").default;
      socketRef.current = socket;

      const onConnect = () => {
        console.log("[SOCKET] UI Ready. ID:", socket.id);
        socket.emit("register_user", userId);
      };

      const onNewNotification = (notif: any) => {
        console.log("[SOCKET] New Notification Received:", notif.type);
        
        // Update relevant data based on notification type
        if (notif.type === "MESSAGE") {
          fetchChats(userId);
          
          // ถ้าเป็นข้อความในห้องที่กำลังเปิดอยู่ ไม่ต้องโชว์ Toast
          if (notif.refConversationId === activeChatIdRef.current) {
            console.log("[SOCKET] Skip toast for active chat room");
            return;
          }
        } else {
          // Add to local notification list if not a message
          setNotificationList(prev => [notif, ...prev]);
          setUnreadNotificationCount(prev => prev + 1);
        }
        
        // Global heads-up toast for ALL notifications
        triggerToast(notif);
      };

      const onPostUpdate = (updatedPost: Post) => {
        console.log("[SOCKET] Post Update Received:", updatedPost.id);
        setPosts(prev => prev.map(p => p.id === updatedPost.id ? updatedPost : p));
      };

      socket.on("connect", onConnect);
      socket.on("new_notification", onNewNotification);
      socket.on("post_update", onPostUpdate);
      socket.on("reconnect", () => socket.emit("register_user", userId));

      if (socket.connected) onConnect(); else socket.connect();

      fetchPosts();
      fetchChats(userId);
      fetchNotifications();
      followService.getFollowingIds(userId).then(ids => setFollowingIds(ids || []));
      
      const interval = setInterval(() => fetchChats(userId), 10000); // Polling ห่างขึ้นเพื่อลดภาระ

      return () => {
        clearInterval(interval);
        socket.off("connect", onConnect);
        socket.off("new_notification", onNewNotification);
        socket.off("post_update", onPostUpdate);
      };
    }
  }, [userId]);

  const login = async (email: string, pass: string) => {
    try {
      const response = await authService.login(email, pass);
      if (response.success && response.user && response.user.id) {
        const u = response.user as User;
        setUserId(u.id);
        setUser(u);
        setName(u.fullName);
        setFaculty(u.faculty || "");
        setBio(u.bio || "");
        setProfileImage(u.avatarUrl || "");
        setIsAdmin(u.role === UserRole.ADMIN || u.role === UserRole.SUPER_ADMIN);
        setIsUniAdmin(u.role === UserRole.SUPER_ADMIN);
        await AsyncStorage.setItem("user_session", JSON.stringify(u));
        return { success: true };
      }
      return { success: false, message: response.message || "Invalid credentials" };
    } catch (e: any) { return { success: false, message: "เกิดข้อผิดพลาดในการเชื่อมต่อ" }; }
  };

  const logout = () => {
    if (socketRef.current) socketRef.current.disconnect();
    setUserId("");
    setUser(null);
    setIsAdmin(false);
    setIsUniAdmin(false);
    AsyncStorage.removeItem("user_session");
  };

  const toggleLike = async (postId: string, reaction = "LIKE") => {
    const previousPosts = posts;
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        const existing = post.reactions?.find(r => r.userId === userId);
        let newReactions;
        if (existing && existing.reaction === reaction) {
          newReactions = post.reactions.filter(r => r.userId !== userId);
        } else if (existing) {
          newReactions = post.reactions.map(r => r.userId === userId ? { ...r, reaction } : r);
        } else {
          newReactions = [...(post.reactions || []), { postId, userId, reaction: reaction as any }];
        }
        return { 
          ...post, 
          reactions: newReactions, 
          _count: { 
            ...(post._count || { comments: 0 }), 
            reactions: newReactions.length 
          } 
        } as Post;
      }
      return post;
    }));
    try {
      await postService.toggleLike(postId, userId, reaction);
    } catch (e) {
      setPosts(previousPosts);
      throw e;
    }
  };

  const sendMessage = async (convoId: string, body: string, attachmentUrl?: string, attachmentType?: string) => {
    try {
      await chatService.sendMessage(convoId, userId, body, attachmentUrl, attachmentType);
      fetchChats(userId);
    } catch (e) { console.error(e); }
  };

  const updateProfile = async (updateData: any) => {
    try {
      let finalAvatarUrl = updateData.avatarUrl;
      if (finalAvatarUrl && finalAvatarUrl.startsWith('file')) {
        finalAvatarUrl = await postService.uploadImage(finalAvatarUrl);
      }
      await authService.updateProfile(userId, { ...updateData, avatarUrl: finalAvatarUrl });
      if (updateData.fullName) setName(updateData.fullName);
      if (updateData.bio) setBio(updateData.bio);
      if (finalAvatarUrl) setProfileImage(finalAvatarUrl);
      if (user) setUser({ ...user, ...updateData, avatarUrl: finalAvatarUrl });
      fetchPosts();
    } catch (e) { console.error("Update Profile Error", e); }
  };

  const toggleFollow = async (targetId: string) => {
    if (!userId || !targetId) return;
    const isFollowing = followingIds.includes(targetId);
    setFollowingIds(prev => isFollowing ? prev.filter(id => id !== targetId) : [...prev, targetId]);
    try {
      await followService.toggleFollow(userId, targetId);
      const ids = await followService.getFollowingIds(userId);
      setFollowingIds(ids || []);
    } catch (e) {
      setFollowingIds(prev => isFollowing ? [...prev, targetId] : prev.filter(id => id !== targetId));
    }
  };

  const themeColors = isDarkMode ? theme.dark : theme.light;

  if (isLoadingSession) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: themeColors.background }}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }

  return (
    <UserContext.Provider value={{
      userId, user, setUser, faculty, setFaculty, name, setName, bio, setBio,
      profileImage, setProfileImage, isDarkMode, toggleTheme: () => setIsDarkMode(!isDarkMode), themeColors,
      notifications, setNotifications, notificationList,
      isAdmin, isUniAdmin, login, signUp: async (data) => authService.signUp(data), logout,
      posts, addPost: async (data) => {
        const rawImages: string[] = Array.isArray(data.images) ? data.images : [];
        const uploadedImages = await Promise.all(
          rawImages.map((img: string) => img.startsWith('file') ? postService.uploadImage(img) : Promise.resolve(img))
        );
        const p = await postService.createPost({ ...data, images: uploadedImages, authorId: userId, facultyTag: data.tag, tags: data.tags ?? [data.tag] });
        setPosts(prev => [p, ...prev]);
      },
      deletePost: async (id) => { await postService.deletePost(id); setPosts(prev => prev.filter(p => p.id !== id)); },
      updatePost: async (id, data) => { const p = await postService.updatePost(id, data); setPosts(prev => prev.map(old => old.id === id ? p : old)); },
      toggleLike, 
      refreshPosts: async (useAI = false) => { 
        setIsRefreshing(true); 
        await fetchPosts(useAI); 
        setIsRefreshing(false); 
      }, 
      isRefreshing, conversations, sendMessage, syncProfile: async () => { fetchPosts(); }, updateProfile,
      followingIds, toggleFollow, getDirectChat: async (tid) => { const c = await chatService.getOrCreateDirectChat(userId, tid); fetchChats(userId); return c; },
      unreadChatCount, unreadNotificationCount,
      fetchNotifications, 
      markNotificationAsRead: async (id) => { await notificationService.markAsRead(id); fetchNotifications(); },
      markAllNotificationsAsRead: async () => { await notificationService.markAllAsRead(userId); fetchNotifications(); },
      setActiveChatId,
      refreshChats: async () => { if (userId) await fetchChats(userId); },
      updateConversation: (convoId, data) => {
        setConversations(prev => prev.map(c => c.id === convoId ? { ...c, ...data } : c));
      },
      deleteConversation: async (convoId) => {
        try {
          await chatService.deleteConversation(convoId, userId);
          setConversations(prev => prev.filter(c => c.id !== convoId));
        } catch (e) {
          console.error("Delete Chat Error", e);
          throw e;
        }
      }
    }}>
      {children}
      
      {/* GLOBAL HEADS-UP TOAST */}
      {showToast && toastData && (
        <View 
          pointerEvents="box-none"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center', zIndex: 99999 }}
        >
          <Animated.View
            pointerEvents="auto"
            className="rounded-[24px] p-2 pr-4 flex-row items-center"
            style={{
              width: width * 0.92,
              transform: [{ translateY: toastAnim }],
              backgroundColor: themeColors.card,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.4,
              shadowRadius: 12,
              elevation: 20,
              borderWidth: 2,
              borderColor: themeColors.border,
            }}
          >
            <View className="relative">
              <View 
                className="w-14 h-14 rounded-full overflow-hidden border-2"
                style={{ borderColor: getToastConfig(toastData.type).color + '20' }}
              >
                <Image 
                  source={{ uri: toastData.sender?.avatarUrl ? (toastData.sender.avatarUrl.startsWith('http') ? toastData.sender.avatarUrl : `${BASE_URL}${toastData.sender.avatarUrl}`) : "https://ui-avatars.com/api/?name=User&background=7C3AED&color=fff" }}
                  style={{ width: "100%", height: "100%", backgroundColor: themeColors.iconBg }}
                />
              </View>
              <View 
                className="absolute -bottom-1 -right-1 rounded-full border-2 w-6 h-6 items-center justify-center shadow-sm"
                style={{ borderColor: themeColors.card, backgroundColor: getToastConfig(toastData.type).color }}
              >
                <Ionicons name={getToastConfig(toastData.type).icon as any} size={12} color="white" />
              </View>
            </View>

            <TouchableOpacity 
              className="flex-1 ml-4 h-full justify-center"
              activeOpacity={0.8}
              onPress={() => { 
                setShowToast(false); 
                if (toastData.type === "MESSAGE") {
                  router.push("/messenger");
                } else {
                  router.push("/notifications");
                }
              }}
            >
              <View className="flex-row items-center mb-0.5">
                <Text className="font-extrabold text-[15px]" style={{ color: themeColors.text }} numberOfLines={1}>
                  {toastData.sender?.fullName || "System Notification"}
                </Text>
                <View className="w-1 h-1 rounded-full mx-1.5" style={{ backgroundColor: themeColors.subText }} />
                <Text className="text-[11px] font-bold" style={{ color: themeColors.subText }}>Just now</Text>
              </View>
              <Text className="font-medium text-[13px]" style={{ color: themeColors.subText }} numberOfLines={1}>
                {toastData.type === "MESSAGE" ? toastData.body : getToastConfig(toastData.type).label}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) { throw new Error("useUser must be used within a UserProvider"); }
  return context;
}
