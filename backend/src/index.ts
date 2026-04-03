import express from "express";
import path from "path";
import { announcementRouter } from "./routes/announcement";
import { authRouter } from "./routes/auth";
import { postRouter } from "./routes/post";
import { chatRouter } from "./routes/chat";
import { notificationRouter } from "./routes/notification";

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

app.get("/", (req, res) => {
  res.json({ message: "DPU UniLife backend is running" });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
