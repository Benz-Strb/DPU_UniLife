import { prisma } from "./prisma";
import { getIO } from "./socket";
import { NotificationType } from "@prisma/client";

interface NotificationData {
  receiverId: string;
  senderId?: string;
  type: NotificationType;
  title: string;
  body?: string;
  refPostId?: string;
  refCommentId?: string;
  refMessageId?: string;
  refConversationId?: string;
  refGroupId?: string;
}

export async function createNotification(data: NotificationData) {
  try {
    // 1. ดึงข้อมูลผู้ส่งมาเพื่อใช้แสดงผลใน Toast ทันที
    const sender = data.senderId ? await prisma.user.findUnique({
      where: { id: data.senderId },
      select: { fullName: true, avatarUrl: true }
    }) : null;

    const notificationPayload = {
      ...data,
      id: `temp-${Date.now()}`,
      createdAt: new Date(),
      sender: sender
    };

    // 2. ส่งผ่าน Socket ทันที (ไม่ต้องรอ Save DB)
    const io = getIO();
    io.to(`user_${data.receiverId}`).emit("new_notification", notificationPayload);
    
    console.log(`[SOCKET] FAST Emission to user_${data.receiverId}: ${data.type}`);

    // 3. บันทึกลง Database เป็น Background Task
    return prisma.notification.create({
      data: {
        receiverId: data.receiverId,
        senderId: data.senderId,
        type: data.type,
        title: data.title,
        body: data.body,
        refPostId: data.refPostId,
        refCommentId: data.refCommentId,
        refMessageId: data.refMessageId,
        refConversationId: data.refConversationId,
        refGroupId: data.refGroupId,
      }
    });
  } catch (error) {
    console.error("Failed to process notification:", error);
  }
}
