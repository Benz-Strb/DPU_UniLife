import axios from "axios";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { User, Post, Comment, Conversation, Message } from "@/types/backend";

const API_PORT = "8080";
const EMULATOR_BASE_URL = `http://10.0.2.2:${API_PORT}`;
const IOS_SIMULATOR_BASE_URL = `http://127.0.0.1:${API_PORT}`;
const LOCALHOST_BASE_URL = `http://localhost:${API_PORT}`;

const normalizeBaseUrl = (value?: string | null) => value?.trim().replace(/\/+$/, "");

const getExpoHostBaseUrl = () => {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.expoGoConfig?.debuggerHost ||
    Constants.manifest2?.extra?.expoClient?.hostUri;

  if (!hostUri) {
    return null;
  }

  const host = hostUri.split(":")[0]?.trim();
  if (!host) {
    return null;
  }

  return `http://${host}:${API_PORT}`;
};

const resolveBaseUrl = () => {
  const envBaseUrl = normalizeBaseUrl(process.env.EXPO_PUBLIC_API_URL);
  if (envBaseUrl) {
    return envBaseUrl;
  }

  const expoHostBaseUrl = getExpoHostBaseUrl();
  if (expoHostBaseUrl) {
    return expoHostBaseUrl;
  }

  if (Platform.OS === "android") {
    return EMULATOR_BASE_URL;
  }

  if (Platform.OS === "ios") {
    return IOS_SIMULATOR_BASE_URL;
  }

  return LOCALHOST_BASE_URL;
};

export const BASE_URL = resolveBaseUrl();

console.log(`[API] Using base URL: ${BASE_URL}`);

const API = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const authService = {
  login: async (email: string, pass: string) => {
    try {
      
      const studentId = email.split("@")[0]; 
      
      const response = await API.post("/auth/login", { 
        studentId, 
        password: pass 
      });

      return { success: true, user: response.data.user };
    } catch (e: any) {
      console.error("Auth Login Error", e.response?.data || e.message);
      throw e;
    }
  },
  signUp: async (userData: any) => {
    try {
      
      const generatedUsername = userData.name.toLowerCase().replace(/\s+/g, '_');
      
      const response = await API.post("/auth/register", {
        email: userData.email,
        fullName: userData.name,
        username: generatedUsername,
        password: userData.password,
        faculty: userData.faculty
      });
      return { success: true, user: response.data.user };
    } catch (e: any) {
      console.error("Auth Register Error", e.response?.data || e.message);
      throw e;
    }
  },
  getProfile: async (userId: string) => {
    try {
      const response = await API.get(`/auth/profile/${userId}`);
      return response.data;
    } catch (e) {
      console.error("Get Profile Error", e);
      throw e;
    }
  },
  updateProfile: async (userId: string, data: any) => {
    try {
      const response = await API.patch(`/auth/profile/${userId}`, data);
      return response.data;
    } catch (e) {
      console.error("Update Profile API Error", e);
      throw e;
    }
  }
};

export const postService = {
  getPosts: async (): Promise<Post[]> => {
    try {
      const response = await API.get("/posts");
      return response.data;
    } catch (e) {
      console.error("Get Posts Error", e);
      return [];
    }
  },
  createPost: async (postData: any): Promise<Post> => {
    try {
      const response = await API.post("/posts", {
        authorId: postData.authorId,
        content: postData.content,
        image: postData.image,
        facultyTag: postData.facultyTag,
        groupId: postData.groupId,
        visibility: postData.visibility
      });
      return response.data;
    } catch (e) {
      console.error("Create Post Error", e);
      throw e;
    }
  },
  toggleLike: async (postId: string, userId: string) => {
    try {
      const response = await API.post(`/posts/${postId}/like`, { userId });
      return response.data;
    } catch (e) {
      console.error("Like Post Error", e);
      throw e;
    }
  },
  addComment: async (postId: string, authorId: string, content: string): Promise<Comment> => {
    try {
      const response = await API.post(`/posts/${postId}/comments`, { authorId, content });
      return response.data;
    } catch (e) {
      console.error("Add Comment Error", e);
      throw e;
    }
  },
  uploadImage: async (fileUri: string): Promise<string> => {
    try {
      const formData = new FormData();
      const filename = fileUri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename || '');
      const type = match ? `image/${match[1]}` : `image`;

      formData.append('image', {
        uri: fileUri,
        name: filename,
        type,
      } as any);

      const response = await API.post("/posts/upload", formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data.imageUrl;
    } catch (e) {
      console.error("Upload Image Error", e);
      throw e;
    }
  }
};

export const chatService = {
  getConversations: async (userId: string): Promise<Conversation[]> => {
    try {
      const response = await API.get(`/chats/${userId}`);
      return response.data;
    } catch (e) {
      console.error("Get Chats Error", e);
      return [];
    }
  },
  getOrCreateDirectChat: async (userId: string, targetId: string): Promise<Conversation> => {
    try {
      const response = await API.post("/chats/direct", { userId, targetId });
      return response.data;
    } catch (e) {
      console.error("Get/Create Direct Chat Error", e);
      throw e;
    }
  },
  sendMessage: async (convoId: string, senderId: string, body: string): Promise<Message> => {
    try {
      const response = await API.post(`/chats/${convoId}/messages`, { senderId, body });
      return response.data;
    } catch (e) {
      console.error("Send Message Error", e);
      throw e;
    }
  },
  markAsRead: async (convoId: string, userId: string, messageId: string) => {
    try {
      const response = await API.patch(`/chats/${convoId}/read`, { userId, messageId });
      return response.data;
    } catch (e) {
      console.error("Mark Chat Read Error", e);
    }
  }
};

export const notificationService = {
  getNotifications: async (userId: string) => {
    try {
      const response = await API.get(`/notifications/${userId}`);
      return response.data;
    } catch (e) {
      console.error("Get Notifications Error", e);
      return { data: [], unreadCount: 0 };
    }
  },
  markAsRead: async (notifId: string) => {
    try {
      const response = await API.patch(`/notifications/${notifId}/read`);
      return response.data;
    } catch (e) {
      console.error("Mark Notif Read Error", e);
    }
  },
  markAllAsRead: async (userId: string) => {
    try {
      const response = await API.patch(`/notifications/user/${userId}/read-all`);
      return response.data;
    } catch (e) {
      console.error("Mark All Notif Read Error", e);
    }
  }
};

export const followService = {
  toggleFollow: async (followerId: string, followingId: string) => {
    try {
      const response = await API.post("/follows/toggle", { followerId, followingId });
      return response.data;
    } catch (e) {
      console.error("Toggle Follow Error", e);
      throw e;
    }
  },
  checkStatus: async (followerId: string, followingId: string) => {
    try {
      const response = await API.get("/follows/status", { params: { followerId, followingId } });
      return response.data;
    } catch (e) {
      console.error("Check Follow Status Error", e);
      return { followed: false };
    }
  }
};

export const scheduleService = {
  getSchedule: async (userId: string) => {
    try {
      const response = await API.get("/schedule", { params: { userId } });
      return response.data;
    } catch (e) {
      console.error("Get Schedule Error", e);
      return [];
    }
  },
  addCourse: async (data: any) => {
    try {
      const response = await API.post("/schedule", data);
      return response.data;
    } catch (e) {
      console.error("Add Course Error", e);
      throw e;
    }
  },
  deleteCourse: async (id: string) => {
    try {
      await API.delete(`/schedule/${id}`);
      return true;
    } catch (e) {
      console.error("Delete Course Error", e);
      throw e;
    }
  }
};


