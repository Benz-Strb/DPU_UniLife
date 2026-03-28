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
  toggleLike: (postId: string) => void;
  addComment: (postId: string, commentText: string) => void;
  refreshPosts: () => Promise<void>;
  isRefreshing: boolean;
  conversations: Conversation[];
  sendMessage: (convoId: string, body: string) => Promise<void>;
  syncProfile: (name: string, faculty: string, img: string) => Promise<void>;
  updateProfile: (data: { fullName?: string; username?: string; bio?: string; avatarUrl?: string }) => Promise<void>;
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
  const [posts, setPosts] = useState<Post[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchPosts = async () => {
    try {
      const data = await postService.getPosts();
      setPosts(Array.isArray(data) ? data : []);
    } catch (e) { 
      setPosts([]); 
    }
  };

  const refreshPosts = async () => {
    setIsRefreshing(true);
    await fetchPosts();
    setIsRefreshing(false);
  };

  const fetchChats = async (currentUserId: string) => {
    try {
      const data = await chatService.getConversations(currentUserId);
      setConversations(Array.isArray(data) ? data : []);
    } catch (e) { 
      setConversations([]); 
    }
  };

  useEffect(() => {
    if (userId) {
      fetchPosts();
      fetchChats(userId);

      const interval = setInterval(() => {
        fetchPosts();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [userId]);

  const login = async (email: string, pass: string) => {
    try {
      console.log("Attempting login for:", email);
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
        authorId: userId
      });
      setPosts(prev => [newPost, ...prev]);
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
      if (updateData.fullName) setName(updateData.fullName);
      if (updateData.bio) setBio(updateData.bio);
      if (updateData.avatarUrl) setProfileImage(updateData.avatarUrl);
      
      if (user) {
        setUser({ ...user, ...updateData });
      }
      
      fetchPosts();
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
      posts, addPost, toggleLike, addComment,
      refreshPosts, isRefreshing,
      conversations, sendMessage, syncProfile, updateProfile
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
