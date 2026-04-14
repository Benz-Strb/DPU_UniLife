import axios from "axios";

const BASE_URL = "http://localhost:8080";

export const API = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

export const authService = {
  login: (input: string, password: string) => {
    const studentId = input.includes("@") ? input.split("@")[0] : input;
    return API.post("/auth/login", { studentId, password }).then(r => r.data);
  },
};

export const adminService = {
  getDashboard: () =>
    API.get("/admin/dashboard").then(r => r.data),
  getUsers: (params?: { page?: number; limit?: number; q?: string; role?: string }) =>
    API.get("/auth/users", { params }).then(r => r.data),
  updateUserStatus: (userId: string, status: string, actorId: string) =>
    API.patch(`/auth/users/${userId}/status`, { status, actorId }).then(r => r.data),
  updateUserRole: (userId: string, role: string, actorId: string) =>
    API.patch(`/auth/users/${userId}/role`, { role, actorId }).then(r => r.data),
  banUser: (userId: string, days: number, actorId: string) =>
    API.post(`/admin/users/${userId}/ban`, { days, actorId }).then(r => r.data),
  getLoginLogs: (params?: { page?: number; limit?: number }) =>
    API.get("/admin/logs/login", { params }).then(r => r.data),
};

export const postService = {
  getPosts: (params?: { page?: number; limit?: number }) =>
    API.get("/posts", { params }).then(r => r.data),
  deletePost: (postId: string, userId: string) =>
    API.delete(`/posts/${postId}`, { data: { userId } }).then(r => r.data),
};

export const reportService = {
  getReports: (params?: { page?: number; limit?: number; status?: string }) =>
    API.get("/reports", { params }).then(r => r.data),
  updateStatus: (reportId: string, status: string, reviewerId: string) =>
    API.patch(`/reports/${reportId}/status`, { status, reviewerId }).then(r => r.data),
};

export const settingService = {
  getAll: () => API.get("/admin/settings").then(r => r.data),
  update: (key: string, value: any, description: string, actorId: string) =>
    API.put(`/admin/settings/${key}`, { value, description, actorId }).then(r => r.data),
};
