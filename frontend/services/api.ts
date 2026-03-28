import axios from "axios";
import { User, Post, Comment, Conversation, Message } from "@/types/backend";

export const BASE_URL = "http://192.168.1.109:8080"; 

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
        password: userData.password
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
      const response = await API.post("/posts", postData);
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
  sendMessage: async (convoId: string, senderId: string, body: string): Promise<Message> => {
    try {
      const response = await API.post(`/chats/${convoId}/messages`, { senderId, body });
      return response.data;
    } catch (e) {
      console.error("Send Message Error", e);
      throw e;
    }
  }
};
