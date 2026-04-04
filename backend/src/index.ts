import express from "express";
import path from "path";
import { announcementRouter } from "./routes/announcement";
import { authRouter } from "./routes/auth";
import { postRouter } from "./routes/post";
import { chatRouter } from "./routes/chat";
import { notificationRouter } from "./routes/notification";
import { groupRouter } from "./routes/group";
import { reportRouter } from "./routes/report";
import { followRouter } from "./routes/follow";
import scheduleRouter from "./routes/schedule";

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());
// ทำให้เข้าถึงรูปภาพได้ผ่าน http://IP:8080/uploads/filename.jpg
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

app.get("/", (req, res) => {
  res.json({ message: "DPU UniLife backend is running" });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
