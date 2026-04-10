import React, { createContext, useContext, useState, ReactNode, useEffect, useRef } from "react";
import { View, Text, Animated, TouchableOpacity, Image, Platform, Dimensions } from "react-native";
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
  addNotification: (notif: any) => void;
  isAdmin: boolean;
  isUniAdmin: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; message?: string }>;
  signUp: (userData: any) => Promise<any>;
  logout: () => void;
  posts: Post[];
  addPost: (postData: any) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
  updatePost: (postId: string, data: any) => Promise<void>;
  toggleLike: (postId: string) => void;
  addComment: (postId: string, commentText: string) => void;
  refreshPosts: () => Promise<void>;
  isRefreshing: boolean;
  conversations: Conversation[];
  sendMessage: (convoId: string, body: string) => Promise<void>;
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
}

const UserContext = createContext<UserContextType | undefined>(undefined);

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

  const fetchPosts = async () => {
    try {
      const data = await postService.getPosts();
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
        if (myParticipant && c.messages && c.messages.length > 0) {
          const lastMsg = c.messages[c.messages.length - 1];
          if (lastMsg.senderId !== currentUserId) {
             if (!myParticipant.lastReadAt || new Date(myParticipant.lastReadAt) < new Date(lastMsg.createdAt)) {
               count++;
             }
          }
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

      socket.on("connect", onConnect);
      socket.on("new_notification", onNewNotification);
      socket.on("reconnect", () => socket.emit("register_user", userId));

      if (socket.connected) onConnect(); else socket.connect();

      fetchPosts();
      fetchChats(userId);
      fetchNotifications();
      
      const interval = setInterval(() => fetchChats(userId), 10000); // Polling ห่างขึ้นเพื่อลดภาระ

      return () => {
        clearInterval(interval);
        socket.off("connect", onConnect);
        socket.off("new_notification", onNewNotification);
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
  };

  const toggleLike = async (postId: string) => {
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        const isLiked = post.reactions?.some(r => r.userId === userId);
        const newReactions = isLiked
          ? post.reactions.filter(r => r.userId !== userId)
          : [...(post.reactions || []), { postId, userId, reaction: "LIKE" as any }];
        return { ...post, reactions: newReactions, _count: { ...post._count, reactions: newReactions.length } } as Post;
      }
      return post;
    }));
    try { await postService.toggleLike(postId, userId); } catch (e) { fetchPosts(); }
  };

  const addComment = async (postId: string, commentText: string) => {
    try {
      await postService.addComment(postId, userId, commentText);
      fetchPosts();
    } catch (e) { console.error(e); }
  };

  const sendMessage = async (convoId: string, body: string) => {
    try {
      await chatService.sendMessage(convoId, userId, body);
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

  return (
    <UserContext.Provider value={{ 
      userId, user, setUser, faculty, setFaculty, name, setName, bio, setBio,
      profileImage, setProfileImage, isDarkMode, toggleTheme: () => setIsDarkMode(!isDarkMode), themeColors,
      notifications, setNotifications, notificationList, addNotification: (n) => setNotificationList(prev => [n, ...prev]),
      isAdmin, isUniAdmin, login, signUp: async (data) => authService.signUp(data), logout, 
      posts, addPost: async (data) => {
        const rawImages: string[] = Array.isArray(data.images) ? data.images : [];
        const uploadedImages = await Promise.all(
          rawImages.map((img: string) => img.startsWith('file') ? postService.uploadImage(img) : Promise.resolve(img))
        );
        const p = await postService.createPost({ ...data, images: uploadedImages, authorId: userId, facultyTag: data.tag });
        setPosts(prev => [p, ...prev]);
      },
      deletePost: async (id) => { await postService.deletePost(id); setPosts(prev => prev.filter(p => p.id !== id)); },
      updatePost: async (id, data) => { const p = await postService.updatePost(id, data); setPosts(prev => prev.map(old => old.id === id ? p : old)); },
      toggleLike, addComment, refreshPosts: async () => { setIsRefreshing(true); await fetchPosts(); setIsRefreshing(false); }, 
      isRefreshing, conversations, sendMessage, syncProfile: async () => { fetchPosts(); }, updateProfile,
      followingIds, toggleFollow, getDirectChat: async (tid) => { const c = await chatService.getOrCreateDirectChat(userId, tid); fetchChats(userId); return c; },
      unreadChatCount, unreadNotificationCount,
      fetchNotifications, 
      markNotificationAsRead: async (id) => { await notificationService.markAsRead(id); fetchNotifications(); },
      markAllNotificationsAsRead: async () => { await notificationService.markAllAsRead(userId); fetchNotifications(); },
      setActiveChatId,
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
        <Animated.View 
          pointerEvents="auto"
          className="absolute left-4 right-4 bg-white rounded-[24px] p-2 pr-4 flex-row items-center z-[99999]"
          style={{ 
            top: 0,
            transform: [{ translateY: toastAnim }],
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.4,
            shadowRadius: 12,
            elevation: 20,
            borderWidth: 2,
            borderColor: '#F3F4F6', // ขอบสีเทาอ่อนที่ชัดเจนขึ้น
          }}
        >
          <View className="relative">
            <View 
              className="w-14 h-14 rounded-full overflow-hidden border-2"
              style={{ borderColor: getToastConfig(toastData.type).color + '20' }}
            >
              <Image 
                source={{ uri: toastData.sender?.avatarUrl ? (toastData.sender.avatarUrl.startsWith('http') ? toastData.sender.avatarUrl : `${BASE_URL}${toastData.sender.avatarUrl}`) : "https://ui-avatars.com/api/?name=User&background=7C3AED&color=fff" }}
                className="w-full h-full bg-gray-100"
              />
            </View>
            <View 
              className="absolute -bottom-1 -right-1 rounded-full border-2 border-white w-6 h-6 items-center justify-center shadow-sm"
              style={{ backgroundColor: getToastConfig(toastData.type).color }}
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
              <Text className="font-extrabold text-gray-900 text-[15px]" numberOfLines={1}>
                {toastData.sender?.fullName || "System Notification"}
              </Text>
              <View className="w-1 h-1 rounded-full bg-gray-300 mx-1.5" />
              <Text className="text-gray-400 text-[11px] font-bold">Just now</Text>
            </View>
            <Text className="text-gray-600 font-medium text-[13px]" numberOfLines={1}>
              {toastData.type === "MESSAGE" ? toastData.body : getToastConfig(toastData.type).label}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setShowToast(false)}
            className="bg-gray-50 w-9 h-9 items-center justify-center rounded-full border border-gray-100"
          >
            <Ionicons name="close-outline" size={20} color="#CBD5E1" />
          </TouchableOpacity>
        </Animated.View>
      )}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) { throw new Error("useUser must be used within a UserProvider"); }
  return context;
}
