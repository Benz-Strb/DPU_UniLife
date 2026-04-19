import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import path from "path";
import { createServer } from "http";
import { initSocket } from "./lib/socket";
import { announcementRouter } from "./routes/announcement";
import { authRouter } from "./routes/auth";
import { postRouter } from "./routes/post";
import { chatRouter } from "./routes/chat";
import { notificationRouter } from "./routes/notification";
import { groupRouter } from "./routes/group";
import { reportRouter } from "./routes/report";
import { followRouter } from "./routes/follow";
import scheduleRouter from "./routes/schedule";
import { adminRouter } from "./routes/admin";
import { searchRouter } from "./routes/search";
import { tagRouter } from "./routes/tag";

// Bootstrap หลักของ backend สำหรับตั้งค่า Express, routes, static files, error handler และ Socket.io
const app = express();
const port = process.env.PORT || 8080;

// Create HTTP Server and Initialize Socket.io
const httpServer = createServer(app);
initSocket(httpServer);

app.use(cors({ origin: "*" }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/auth', authRouter);
app.use('/announcements', announcementRouter);
app.use('/posts', postRouter);
app.use('/chats', chatRouter);
app.use('/notifications', notificationRouter);
app.use('/groups', groupRouter);
app.use('/reports', reportRouter);
app.use('/follows', followRouter);
app.use('/schedule', scheduleRouter);
app.use('/admin', adminRouter);
app.use('/search', searchRouter);
app.use('/tags', tagRouter);

app.get("/", (req, res) => {
  res.json({ message: "DPU UniLife backend is running with Socket.io" });
});

// Global error handler — must have 4 params for Express to treat as error middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Client aborted the request before server finished reading body — not a real error
  if (err.type === 'request.aborted' || err.message === 'request aborted') {
    return res.status(499).end();
  }
  console.error('[Server Error]', err.message ?? err);
  res.status(err.status ?? 500).json({ error: err.message ?? 'Internal server error' });
});

// สำคัญ: ต้องเปลี่ยนจาก app.listen เป็น httpServer.listen
httpServer.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
