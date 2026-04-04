import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { authService, postService, chatService } from "@/services/api";
import { theme } from "@/constants/theme";
import { User, Post, Comment, Conversation, Message, UserRole } from "@/types/backend";

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
  login: (email: string, pass: string) => Promise<boolean>;
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
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
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

  const fetchPosts = async () => {
    try {
      const data = await postService.getPosts();
      setPosts(Array.isArray(data) ? data : []);
    } catch (e) { 
      setPosts([]); 
    }
  };

  const fetchNotifications = async () => {
    if (!userId) return;
    try {
      const { notificationService } = require("@/services/api");
      const result = await notificationService.getNotifications(userId);
      if (result && result.data) {
        setNotificationList(result.data);
        setUnreadNotificationCount(result.unreadCount || 0);
      }
    } catch (e) { console.error("Fetch Notifications Error", e); }
  };

  const markNotificationAsRead = async (notifId: string) => {
    try {
      const { notificationService } = require("@/services/api");
      await notificationService.markAsRead(notifId);
      fetchNotifications();
    } catch (e) { console.error(e); }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      const { notificationService } = require("@/services/api");
      await notificationService.markAllAsRead(userId);
      fetchNotifications();
    } catch (e) { console.error(e); }
  };

  const fetchFollowing = async (id: string) => {
    try {
      // ในความเป็นจริงควรมี API getFollowing แต่ตอนนี้เราจะจำลองจาก user data ถ้ามี
      // หรือใช้ข้อมูลจากการกด toggle follow
    } catch (e) { console.error(e); }
  };

  const refreshPosts = async () => {
    setIsRefreshing(true);
    await fetchPosts();
    setIsRefreshing(false);
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
    } catch (e) { 
      setConversations([]); 
    }
  };

  useEffect(() => {
    if (userId) {
      fetchPosts();
      fetchChats(userId);
      fetchNotifications();
      fetchFollowing(userId);

      const postInterval = setInterval(() => {
        fetchPosts();
      }, 10000);

      const chatInterval = setInterval(() => {
        fetchChats(userId);
        fetchNotifications();
      }, 3000); // ดึงข้อมูลแชทและแจ้งเตือนทุก 3 วินาที

      return () => {
        clearInterval(postInterval);
        clearInterval(chatInterval);
      };
    }
  }, [userId]);

  const login = async (email: string, pass: string) => {
    try {
      console.log("Attempting login for:", email);
      const { authService, followService } = require("@/services/api");
      const response = await authService.login(email, pass);
      console.log("Login response:", response);
      if (response.success && response.user && response.user.id) {
        const u = response.user as User;
        console.log("Login successful, setting user:", u.id);
        setUserId(u.id);
        setUser(u);
        setName(u.fullName);
        setBio(u.bio || "");
        setProfileImage(u.avatarUrl || "");
        setIsAdmin(u.role === UserRole.ADMIN || u.role === UserRole.SUPER_ADMIN);
        setIsUniAdmin(u.role === UserRole.SUPER_ADMIN);
        
        // ดึงรายการ following (ถ้ามี API) 
        // เบื้องต้นอาจจะยังว่างอยู่
        
        fetchPosts();
        fetchChats(u.id);
        
        return true;
      }
      return false;
    } catch (e) {
      console.error("Login Error in Context:", e);
      return false;
    }
  };

  const toggleFollow = async (targetId: string) => {
    if (!userId) return;
    
    // Optimistic Update
    const isFollowing = followingIds.includes(targetId);
    if (isFollowing) {
      setFollowingIds(prev => prev.filter(id => id !== targetId));
    } else {
      setFollowingIds(prev => [...prev, targetId]);
    }

    try {
      const { followService } = require("@/services/api");
      const result = await followService.toggleFollow(userId, targetId);
      // Update state อีกครั้งตามผลลัพธ์จริงจาก server
      if (result.followed) {
        setFollowingIds(prev => [...new Set([...prev, targetId])]);
      } else {
        setFollowingIds(prev => prev.filter(id => id !== targetId));
      }
    } catch (e) {
      console.error(e);
      // Revert state if error
      if (isFollowing) {
        setFollowingIds(prev => [...prev, targetId]);
      } else {
        setFollowingIds(prev => prev.filter(id => id !== targetId));
      }
    }
  };

  const getDirectChat = async (targetId: string) => {
    try {
      const { chatService } = require("@/services/api");
      const convo = await chatService.getOrCreateDirectChat(userId, targetId);
      fetchChats(userId); // Refresh chat list
      return convo;
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  const signUp = async (userData: any) => {
    try {
      const response = await authService.signUp(userData);
      if (response.success && response.user) {
        const u = response.user as User;
        setUserId(u.id);
        setUser(u);
        setName(u.fullName);
        fetchPosts();
      }
      return response;
    } catch (e) {
      console.error(e);
      throw e;
    }
  };

  const logout = () => {
    setUserId("");
    setUser(null);
    setIsAdmin(false);
    setIsUniAdmin(false);
  };

  const addPost = async (postData: any) => {
    try {
      let finalImageUrl = postData.image;
      
      if (postData.image && postData.image.startsWith('file')) {
        finalImageUrl = await postService.uploadImage(postData.image);
      }

      const newPost = await postService.createPost({
        ...postData,
        image: finalImageUrl,
        authorId: userId,
        facultyTag: postData.tag
      });
      setPosts(prev => [newPost, ...prev]);
    } catch (e) { console.error(e); }
  };

  const deletePost = async (postId: string) => {
    try {
      await postService.deletePost(postId);
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch (e) { console.error(e); }
  };

  const updatePost = async (postId: string, data: any) => {
    try {
      const updatedPost = await postService.updatePost(postId, data);
      setPosts(prev => prev.map(p => p.id === postId ? updatedPost : p));
    } catch (e) { console.error(e); }
  };

  const toggleLike = async (postId: string) => {
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        const isLiked = post.reactions?.some(r => r.userId === userId);
        const newReactions = isLiked
          ? post.reactions.filter(r => r.userId !== userId)
          : [...(post.reactions || []), { postId, userId, reaction: "LIKE" as any }];
        
        return {
          ...post,
          reactions: newReactions,
          _count: {
            comments: post._count?.comments ?? 0,
            reactions: newReactions.length
          }
        } as Post;
      }
      return post;
    }));

    try {
      await postService.toggleLike(postId, userId);
    } catch (e) { 
      console.error(e); 
      fetchPosts();
    }
  };

  const addComment = async (postId: string, commentText: string) => {
    const tempComment: Comment = {
      id: "temp-" + Date.now(),
      postId,
      authorId: userId,
      author: { fullName: name } as any,
      content: commentText,
      createdAt: new Date().toISOString()
    };

    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          comments: [...(post.comments || []), tempComment],
          _count: {
            comments: (post._count?.comments ?? 0) + 1,
            reactions: post._count?.reactions ?? 0
          }
        } as Post;
      }
      return post;
    }));

    try {
      await postService.addComment(postId, userId, commentText);
      setTimeout(fetchPosts, 500); 
    } catch (e) { 
      console.error(e); 
      fetchPosts();
    }
  };

  const sendMessage = async (convoId: string, body: string) => {
    try {
      await chatService.sendMessage(convoId, userId, body);
      fetchChats(userId);
    } catch (e) { console.error(e); }
  };

  const syncProfile = async (updatedName: string, updatedFaculty: string, updatedImage: string) => {
    try {
      fetchPosts(); 
    } catch (e) { console.error("Sync Profile Error", e); }
  };

  const updateProfile = async (updateData: any) => {
    try {
      let finalAvatarUrl = updateData.avatarUrl;

      // ถ้าเป็นรูปจากเครื่องให้ Upload ก่อน
      if (finalAvatarUrl && finalAvatarUrl.startsWith('file')) {
        const { postService } = require("@/services/api");
        finalAvatarUrl = await postService.uploadImage(finalAvatarUrl);
      }

      const { authService } = require("@/services/api");
      const response = await authService.updateProfile(userId, {
        ...updateData,
        avatarUrl: finalAvatarUrl
      });

      if (updateData.fullName) setName(updateData.fullName);
      if (updateData.bio) setBio(updateData.bio);
      if (finalAvatarUrl) setProfileImage(finalAvatarUrl);
      
      if (user) {
        setUser({ ...user, ...updateData, avatarUrl: finalAvatarUrl });
      }
      
      fetchPosts(); // เพื่อให้อัปเดตรูปในหน้า Feed
    } catch (e) { console.error("Update Profile Error", e); }
  };

  const toggleTheme = () => setIsDarkMode(prev => !prev);
  const themeColors = isDarkMode ? theme.dark : theme.light;

  return (
    <UserContext.Provider value={{ 
      userId, user, setUser,
      faculty, setFaculty, 
      name, setName, 
      bio, setBio,
      profileImage, setProfileImage,
      isDarkMode, toggleTheme,
      themeColors,
      notifications, setNotifications,
      notificationList, addNotification: (n) => setNotificationList(prev => [n, ...prev]),
      isAdmin, isUniAdmin, login, signUp, logout,
      posts, addPost, deletePost, updatePost, toggleLike, addComment,
      refreshPosts, isRefreshing,
      conversations, sendMessage, syncProfile, updateProfile,
      followingIds, toggleFollow, getDirectChat,
      unreadChatCount, unreadNotificationCount,
      fetchNotifications, markNotificationAsRead, markAllNotificationsAsRead
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
