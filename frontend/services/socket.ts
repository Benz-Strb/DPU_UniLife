import io from "socket.io-client/build/cjs/index.js";
import { BASE_URL } from "./api";

// เชื่อมต่อกับ Backend Socket
const socket = io(BASE_URL || "http://localhost:8080", {
  autoConnect: false,
  transports: ["websocket"], // บังคับใช้ WebSocket เพื่อความรวดเร็ว
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
});

export default socket;
