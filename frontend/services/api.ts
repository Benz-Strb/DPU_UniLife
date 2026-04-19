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

// เลือก base URL ของ backend ให้เหมาะกับ env ปัจจุบัน เช่น Expo Go, emulator หรือ localhost
const resolveBaseUrl = () => {
  const envBaseUrl = normalizeBaseUrl(process.env.EXPO_PUBLIC_API_URL);
  if (envBaseUrl) {
    return envBaseUrl;
  }

  // ลองหา IP จาก Expo Host ก่อน (สำคัญที่สุดสำหรับมือถือจริง)
  const expoHostBaseUrl = getExpoHostBaseUrl();
  if (expoHostBaseUrl) {
    console.log(`[API] Detected Expo host: ${expoHostBaseUrl}`);
    return expoHostBaseUrl;
  }

  // ถ้าเป็น Android Emulator ทั่วไป
  if (Platform.OS === "android") {
    return EMULATOR_BASE_URL;
  }

  // ถ้าเป็น iOS Simulator หรือรันผ่าน Web/Desktop
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

export const adminService = {
  updateUserStatus: async (userId: string, status: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED', actorId: string) => {
    try {
      const response = await API.patch(`/auth/users/${userId}/status`, { status, actorId });
      return response.data;
    } catch (e) {
      console.error("Update User Status Error", e);
      throw e;
    }
  },
};

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
      // ถ้าเป็น 401 (รหัสผิด/ไม่พบผู้ใช้) ให้ส่งค่ากลับไปแจ้งเตือนปกติ ไม่ต้อง throw error
      if (e.response?.status === 401) {
        return { 
          success: false, 
          message: e.response.data?.message || "Invalid studentId or password" 
        };
      }
      
      // กรณีอื่นๆ เช่น Server ล่ม ให้เก็บไว้ตรวจสอบ
      console.warn("Network or Server Error:", e.message);
      return { success: false, message: "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่" };
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
  resetPassword: async (email: string, newPassword: string) => {
    try {
      const response = await API.patch("/auth/reset-password", { email, newPassword });
      return { success: true, message: response.data.message };
    } catch (e: any) {
      return { success: false, message: e.response?.data?.message || "เกิดข้อผิดพลาด กรุณาลองใหม่" };
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
  },
  getSuggestedUsers: async (limit = 30): Promise<any[]> => {
    try {
      const response = await API.get("/auth/users", { params: { limit, role: "STUDENT" } });
      const users: any[] = response.data.users ?? response.data ?? [];
      // สุ่มลำดับ
      return users.sort(() => Math.random() - 0.5);
    } catch (e) {
      return [];
    }
  },
  getAdmins: async (query: { faculty?: string; role?: string }) => {
    try {
      const response = await API.get("/auth/admins", { params: query });
      return response.data;
    } catch (e) {
      console.error("Get Admins Error", e);
      return [];
    }
  },
};

export const postService = {
  getPost: async (postId: string): Promise<any> => {
    const response = await API.get(`/posts/${postId}`);
    return response.data;
  },
  getPosts: async (): Promise<Post[]> => {
    try {
      const response = await API.get("/posts");
      return response.data;
    } catch (e) {
      console.error("Get Posts Error", e);
      return [];
    }
  },
  getAIFeed: async (userId: string): Promise<Post[]> => {
    try {
      const response = await API.get("/posts/ai-feed", { params: { userId } });
      return response.data;
    } catch (e) {
      console.error("Get AI Feed Error", e);
      return [];
    }
  },
  createPost: async (postData: any): Promise<Post> => {
    try {
      const response = await API.post("/posts", {
        authorId: postData.authorId,
        content: postData.content,
        images: postData.images,
        facultyTag: postData.facultyTag,
        isOfficial: postData.isOfficial,
        groupId: postData.groupId,
        visibility: postData.visibility
      });
      return response.data;
    } catch (e) {
      console.error("Create Post Error", e);
      throw e;
    }
  },
  toggleLike: async (postId: string, userId: string, reaction = "LIKE") => {
    try {
      const response = await API.post(`/posts/${postId}/like`, { userId, reaction });
      return response.data;
    } catch (e) {
      console.error("Like Post Error", e);
      throw e;
    }
  },
  addComment: async (postId: string, authorId: string, content: string, parentId?: string): Promise<Comment> => {
    try {
      const response = await API.post(`/posts/${postId}/comments`, { authorId, content, ...(parentId ? { parentId } : {}) });
      return response.data;
    } catch (e) {
      console.error("Add Comment Error", e);
      throw e;
    }
  },
  sharePost: async (postId: string, userId: string, sharedToText?: string) => {
    try {
      const response = await API.post(`/posts/${postId}/share`, { userId, sharedToText });
      return response.data;
    } catch (e) {
      console.error("Share Post Error", e);
      throw e;
    }
  },
  unrepostPost: async (postId: string, userId: string) => {
    try {
      await API.delete(`/posts/${postId}/share`, { params: { userId } });
    } catch (e) {
      console.error("Unrepost Error", e);
      throw e;
    }
  },
  deleteComment: async (postId: string, commentId: string, userId: string) => {
    try {
      await API.delete(`/posts/${postId}/comments/${commentId}`, { data: { userId } });
      return true;
    } catch (e) {
      console.error("Delete Comment Error", e);
      throw e;
    }
  },
  deletePost: async (postId: string) => {
    try {
      await API.delete(`/posts/${postId}`);
      return true;
    } catch (e) {
      console.error("Delete Post Error", e);
      throw e;
    }
  },
  updatePost: async (postId: string, data: any) => {
    try {
      const response = await API.patch(`/posts/${postId}`, data);
      return response.data;
    } catch (e) {
      console.error("Update Post Error", e);
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
  sendMessage: async (convoId: string, senderId: string, body: string, attachmentUrl?: string, attachmentType?: string): Promise<Message> => {
    try {
      const payload: any = { senderId, body };
      if (attachmentUrl) { payload.attachmentUrl = attachmentUrl; payload.attachmentType = attachmentType ?? "IMAGE"; }
      const response = await API.post(`/chats/${convoId}/messages`, payload);
      return response.data;
    } catch (e) {
      console.error("Send Message Error", e);
      throw e;
    }
  },
  markAsRead: async (convoId: string, userId: string): Promise<void> => {
    try {
      await API.patch(`/chats/${convoId}/read`, { userId });
    } catch (e) {
      console.error("Mark As Read Error", e);
    }
  },
  updateSettings: async (convoId: string, userId: string, data: { title?: string; avatarUrl?: string }) => {
    const response = await API.patch(`/chats/${convoId}/settings`, { userId, ...data });
    return response.data;
  },
  toggleMute: async (convoId: string, userId: string): Promise<boolean> => {
    const response = await API.patch(`/chats/${convoId}/mute`, { userId });
    return response.data.isMuted;
  },
  addMember: async (convoId: string, userId: string, targetUserId: string) => {
    const response = await API.post(`/chats/${convoId}/members`, { userId, targetUserId });
    return response.data;
  },
  removeMember: async (convoId: string, userId: string, targetUserId: string) => {
    await API.delete(`/chats/${convoId}/members/${targetUserId}`, { params: { userId } });
  },
  deleteConversation: async (convoId: string, userId: string) => {
    try {
      await API.delete(`/chats/${convoId}`, { params: { userId } });
      return true;
    } catch (e) {
      console.error("Delete Conversation Error", e);
      throw e;
    }
  },
  createGroupChat: async (userId: string, title: string, participantIds: string[]): Promise<Conversation> => {
    try {
      const response = await API.post("/chats", {
        type: "GROUP",
        title,
        createdById: userId,
        participantIds,
      });
      return response.data;
    } catch (e) {
      console.error("Create Group Chat Error", e);
      throw e;
    }
  },
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
  getFollowingIds: async (userId: string): Promise<string[]> => {
    try {
      const response = await API.get(`/follows/ids/${userId}`);
      return response.data;
    } catch (e) {
      console.error("Get Following IDs Error", e);
      return [];
    }
  }
};

export const reportService = {
  createReport: async (data: {
    reporterId: string;
    targetType: string;
    reason: string;
    detail?: string;
    targetUserId?: string;
    targetPostId?: string;
    targetCommentId?: string;
    targetMessageId?: string;
    targetGroupId?: string;
  }) => {
    try {
      const response = await API.post("/reports", data);
      return response.data;
    } catch (e) {
      console.error("Create Report Error", e);
      throw e;
    }
  },
  getReports: async (params?: { status?: string; page?: number; limit?: number }) => {
    try {
      const response = await API.get("/reports", { params });
      return response.data;
    } catch (e) {
      console.error("Get Reports Error", e);
      throw e;
    }
  },
};

export const tagService = {
  getTags: async () => {
    try {
      const response = await API.get("/tags");
      return response.data;
    } catch (e) {
      console.error("Get Tags Error", e);
      return [];
    }
  },
  getTagPosts: async (name: string, page = 1, limit = 20) => {
    try {
      const response = await API.get(`/tags/${encodeURIComponent(name)}/posts`, { params: { page, limit } });
      return response.data;
    } catch (e) {
      console.error("Get Tag Posts Error", e);
      throw e;
    }
  },
};

export const searchService = {
  search: async (q: string, type: "all" | "users" | "posts" | "groups" = "all", userId?: string, limit = 10) => {
    try {
      const response = await API.get("/search", { params: { q, type, userId, limit } });
      return response.data;
    } catch (e) {
      console.error("Search Error", e);
      return { q, users: [], posts: [], groups: [] };
    }
  },
  getHistory: async (userId: string): Promise<{ keyword: string; searchedAt: string }[]> => {
    try {
      const response = await API.get(`/search/history/${userId}`);
      return response.data;
    } catch (e) {
      return [];
    }
  },
  clearHistory: async (userId: string) => {
    try { await API.delete(`/search/history/${userId}`); } catch {}
  },
  deleteKeyword: async (userId: string, keyword: string) => {
    try { await API.delete(`/search/history/${userId}/${encodeURIComponent(keyword)}`); } catch {}
  },
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
  },
};


