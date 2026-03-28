import { Router } from 'express';
import { prisma } from '../lib/prisma';

const chatRouter = Router();

// 1. ดึงห้องสนทนาทั้งหมดของ User
chatRouter.get('/:userId', async (req, res) => {
  const userId = req.params.userId;
  try {
    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: { userId }
        }
      },
      include: {
        participants: {
          include: {
            user: {
              select: { id: true, fullName: true, avatarUrl: true }
            }
          }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// 2. ส่งข้อความในห้องสนทนา
chatRouter.post('/:convoId/messages', async (req, res) => {
  const conversationId = req.params.convoId;
  const { senderId, body } = req.body;
  try {
    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId,
        body
      },
      include: {
        sender: { select: { fullName: true } }
      }
    });

    // อัปเดตเวลาล่าสุดของห้องสนทนา
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() }
    });

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

export { chatRouter };
