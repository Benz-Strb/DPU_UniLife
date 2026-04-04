import { Router, Request, Response } from 'express';
import { Prisma, ConversationType, MediaType } from '@prisma/client';
import { prisma } from '../lib/prisma';

const chatRouter = Router();

const participantUserSelect = {
  id: true,
  fullName: true,
  avatarUrl: true,
  role: true,
} as const;

const messageSenderSelect = {
  id: true,
  fullName: true,
  avatarUrl: true,
  role: true,
} as const;

const conversationInclude = {
  group: {
    select: {
      id: true,
      name: true,
      slug: true,
      avatarUrl: true,
      coverUrl: true,
      isOfficial: true,
    },
  },
  participants: {
    include: {
      user: {
        select: participantUserSelect,
      },
    },
    orderBy: {
      joinedAt: 'asc' as const,
    },
  },
  messages: {
    where: {
      deletedAt: null,
    },
    include: {
      sender: {
        select: messageSenderSelect,
      },
    },
    orderBy: {
      createdAt: 'asc' as const,
    },
  },
} as const;

const isUuid = (value: string): boolean => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
};

const getSingleParam = (value: string | string[] | undefined): string | null => {
  return typeof value === 'string' ? value : null;
};

const normalizeOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmedValue = value.trim();
  return trimmedValue === '' ? undefined : trimmedValue;
};

const normalizeRequiredString = (value: unknown): string | null => {
  return normalizeOptionalString(value) ?? null;
};

const parsePositiveInt = (value: unknown): number | null => {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }

  const parsedValue = Number.parseInt(value, 10);
  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    return null;
  }

  return parsedValue;
};

const parseConversationType = (value: unknown): ConversationType | null => {
  if (typeof value !== 'string') {
    return null;
  }

  if (value in ConversationType) {
    return value as ConversationType;
  }

  return null;
};

const parseMediaType = (value: unknown): MediaType | null => {
  if (typeof value !== 'string') {
    return null;
  }

  if (value in MediaType) {
    return value as MediaType;
  }

  return null;
};

const parseParticipantIds = (value: unknown): string[] | null => {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  const ids = value.filter((item): item is string => typeof item === 'string').map((item) => item.trim());
  if (ids.length !== value.length || ids.some((item) => !isUuid(item))) {
    return null;
  }

  return [...new Set(ids)];
};

const isPrismaKnownError = (error: unknown): error is Prisma.PrismaClientKnownRequestError => {
  return error instanceof Prisma.PrismaClientKnownRequestError;
};

const canDirectMessage = async (senderId: string, recipientId: string): Promise<boolean> => {
  const follow = await prisma.userFollow.findUnique({
    where: {
      followerId_followingId: {
        followerId: senderId,
        followingId: recipientId,
      },
    },
    select: {
      followerId: true,
    },
  });

  return Boolean(follow);
};

chatRouter.get('/:userId', async (req: Request, res: Response) => {
  const userId = getSingleParam(req.params.userId);

  if (!userId || !isUuid(userId)) {
    return res.status(400).json({ error: 'Invalid user id' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: { userId },
        },
      },
      include: {
        group: conversationInclude.group,
        participants: conversationInclude.participants,
        messages: {
          where: {
            deletedAt: null,
          },
          include: {
            sender: {
              select: messageSenderSelect,
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return res.json(conversations);
  } catch (error) {
    console.error('Failed to fetch conversations:', error);
    return res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

chatRouter.get('/conversation/:conversationId', async (req: Request, res: Response) => {
  const conversationId = getSingleParam(req.params.conversationId);

  if (!conversationId || !isUuid(conversationId)) {
    return res.status(400).json({ error: 'Invalid conversation id' });
  }

  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: conversationInclude,
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    return res.json(conversation);
  } catch (error) {
    console.error('Failed to fetch conversation:', error);
    return res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

chatRouter.get('/conversation/:conversationId/messages', async (req: Request, res: Response) => {
  const conversationId = getSingleParam(req.params.conversationId);
  const limit = parsePositiveInt(req.query.limit);

  if (!conversationId || !isUuid(conversationId)) {
    return res.status(400).json({ error: 'Invalid conversation id' });
  }

  if (req.query.limit !== undefined && !limit) {
    return res.status(400).json({ error: 'limit must be a positive integer' });
  }

  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true },
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const messages = await prisma.message.findMany({
      where: {
        conversationId,
        deletedAt: null,
      },
      include: {
        sender: {
          select: messageSenderSelect,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: limit ?? 100,
    });

    return res.json(messages);
  } catch (error) {
    console.error('Failed to fetch messages:', error);
    return res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

chatRouter.post('/', async (req: Request, res: Response) => {
  const {
    type: typeInput,
    title: titleInput,
    createdById,
    groupId,
    participantIds: participantIdsInput,
  } = req.body;

  if (typeof createdById !== 'string' || !isUuid(createdById)) {
    return res.status(400).json({ error: 'A valid createdById is required' });
  }

  if (groupId !== undefined && groupId !== null && (typeof groupId !== 'string' || !isUuid(groupId))) {
    return res.status(400).json({ error: 'Invalid groupId' });
  }

  const title = titleInput === undefined ? undefined : normalizeOptionalString(titleInput);
  if (titleInput !== undefined && title === undefined) {
    return res.status(400).json({ error: 'title cannot be empty' });
  }

  const type = typeInput === undefined ? ConversationType.DIRECT : parseConversationType(typeInput);
  if (!type) {
    return res.status(400).json({ error: 'Invalid conversation type' });
  }

  const participantIds = parseParticipantIds(participantIdsInput);
  if (!participantIds) {
    return res.status(400).json({ error: 'participantIds must be a non-empty array of user ids' });
  }

  const allParticipantIds = [...new Set([createdById, ...participantIds])];

  if (type === ConversationType.DIRECT && allParticipantIds.length !== 2) {
    return res.status(400).json({ error: 'Direct conversation must have exactly 2 participants' });
  }

  if (type === ConversationType.GROUP && allParticipantIds.length < 2) {
    return res.status(400).json({ error: 'Group conversation must have at least 2 participants' });
  }

  try {
    const [creator, users, group] = await Promise.all([
      prisma.user.findUnique({
        where: { id: createdById },
        select: { id: true },
      }),
      prisma.user.findMany({
        where: {
          id: { in: allParticipantIds },
        },
        select: { id: true },
      }),
      groupId
        ? prisma.group.findFirst({
            where: {
              id: groupId,
              deletedAt: null,
            },
            select: { id: true },
          })
        : Promise.resolve(null),
    ]);

    if (!creator) {
      return res.status(404).json({ error: 'Creator not found' });
    }

    if (users.length !== allParticipantIds.length) {
      return res.status(404).json({ error: 'One or more participants were not found' });
    }

    if (groupId && !group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    if (type === ConversationType.DIRECT) {
      const recipientId = allParticipantIds.find((participantId) => participantId !== createdById);
      if (!recipientId) {
        return res.status(400).json({ error: 'Direct conversation must have exactly 2 participants' });
      }

      const allowedToMessage = await canDirectMessage(createdById, recipientId);
      if (!allowedToMessage) {
        return res.status(403).json({ error: 'You must follow this user before sending direct messages' });
      }
    }

    if (type === ConversationType.DIRECT) {
      const existingConversation = await prisma.conversation.findFirst({
        where: {
          type: ConversationType.DIRECT,
          participants: {
            every: {
              userId: { in: allParticipantIds },
            },
          },
          AND: allParticipantIds.map((participantId) => ({
            participants: {
              some: { userId: participantId },
            },
          })),
        },
        include: conversationInclude,
      });

      if (existingConversation && existingConversation.participants.length === 2) {
        return res.json(existingConversation);
      }
    }

    const conversation = await prisma.conversation.create({
      data: {
        type,
        title,
        createdById,
        groupId: groupId ?? null,
        participants: {
          create: allParticipantIds.map((participantId) => ({
            userId: participantId,
          })),
        },
      },
      include: conversationInclude,
    });

    return res.status(201).json(conversation);
  } catch (error) {
    if (isPrismaKnownError(error) && error.code === 'P2003') {
      return res.status(400).json({ error: 'Invalid relation data' });
    }

    console.error('Failed to create conversation:', error);
    return res.status(500).json({ error: 'Failed to create conversation' });
  }
});

chatRouter.post('/:convoId/messages', async (req: Request, res: Response) => {
  const conversationId = getSingleParam(req.params.convoId);
  const {
    senderId,
    body: bodyInput,
    attachmentUrl,
    attachmentType: attachmentTypeInput,
  } = req.body;

  if (!conversationId || !isUuid(conversationId)) {
    return res.status(400).json({ error: 'Invalid conversation id' });
  }

  if (typeof senderId !== 'string' || !isUuid(senderId)) {
    return res.status(400).json({ error: 'A valid senderId is required' });
  }

  const body = normalizeOptionalString(bodyInput);
  const normalizedAttachmentUrl = normalizeOptionalString(attachmentUrl);
  const attachmentType = attachmentTypeInput === undefined ? undefined : parseMediaType(attachmentTypeInput);

  if (!body && !normalizedAttachmentUrl) {
    return res.status(400).json({ error: 'Message must include body or attachmentUrl' });
  }

  if (attachmentTypeInput !== undefined && !attachmentType) {
    return res.status(400).json({ error: 'Invalid attachmentType' });
  }

  if (normalizedAttachmentUrl && !attachmentType) {
    return res.status(400).json({ error: 'attachmentType is required when attachmentUrl is provided' });
  }

  try {
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        participants: {
          some: { userId: senderId },
        },
      },
      include: {
        participants: {
          select: {
            userId: true,
          },
        },
        group: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found or sender is not a participant' });
    }

    if (!conversation.group && conversation.participants.length === 2) {
      const recipientId = conversation.participants.find((participant) => participant.userId !== senderId)?.userId;

      if (!recipientId) {
        return res.status(400).json({ error: 'Invalid direct conversation participants' });
      }

      const allowedToMessage = await canDirectMessage(senderId, recipientId);
      if (!allowedToMessage) {
        return res.status(403).json({ error: 'You must follow this user before sending direct messages' });
      }
    }

    const message = await prisma.$transaction(async (tx) => {
      const createdMessage = await tx.message.create({
        data: {
          conversationId,
          senderId,
          body,
          attachmentUrl: normalizedAttachmentUrl,
          attachmentType,
        },
        include: {
          sender: {
            select: messageSenderSelect,
          },
        },
      });

      await tx.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      await tx.conversationParticipant.update({
        where: {
          conversationId_userId: {
            conversationId,
            userId: senderId,
          },
        },
        data: {
          lastReadAt: new Date(),
        },
      });

      await tx.messageRead.upsert({
        where: {
          messageId_userId: {
            messageId: createdMessage.id,
            userId: senderId,
          },
        },
        update: {
          readAt: new Date(),
        },
        create: {
          messageId: createdMessage.id,
          userId: senderId,
          readAt: new Date(),
        },
      });

      return createdMessage;
    });

    return res.status(201).json(message);
  } catch (error) {
    console.error('Failed to send message:', error);
    return res.status(500).json({ error: 'Failed to send message' });
  }
});

chatRouter.patch('/:convoId/read', async (req: Request, res: Response) => {
  const conversationId = getSingleParam(req.params.convoId);
  const { userId, messageId } = req.body;

  if (!conversationId || !isUuid(conversationId)) {
    return res.status(400).json({ error: 'Invalid conversation id' });
  }

  if (typeof userId !== 'string' || !isUuid(userId)) {
    return res.status(400).json({ error: 'A valid userId is required' });
  }

  if (typeof messageId !== 'string' || !isUuid(messageId)) {
    return res.status(400).json({ error: 'A valid messageId is required' });
  }

  try {
    const [participant, message] = await Promise.all([
      prisma.conversationParticipant.findUnique({
        where: {
          conversationId_userId: {
            conversationId,
            userId,
          },
        },
      }),
      prisma.message.findFirst({
        where: {
          id: messageId,
          conversationId,
          deletedAt: null,
        },
        select: { id: true },
      }),
    ]);

    if (!participant) {
      return res.status(404).json({ error: 'Conversation participant not found' });
    }

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    await prisma.$transaction([
      prisma.conversationParticipant.update({
        where: {
          conversationId_userId: {
            conversationId,
            userId,
          },
        },
        data: {
          lastReadAt: new Date(),
        },
      }),
      prisma.messageRead.upsert({
        where: {
          messageId_userId: {
            messageId,
            userId,
          },
        },
        update: {
          readAt: new Date(),
        },
        create: {
          messageId,
          userId,
          readAt: new Date(),
        },
      }),
    ]);

    return res.json({ message: 'Conversation marked as read' });
  } catch (error) {
    console.error('Failed to mark conversation as read:', error);
    return res.status(500).json({ error: 'Failed to mark conversation as read' });
  }
});

// Get or Create Direct Conversation
chatRouter.post("/direct", async (req, res) => {
  const { userId, targetId } = req.body;

  if (!userId || !targetId) {
    return res.status(400).json({ error: "Missing userId or targetId" });
  }

  try {
    // ค้นหาห้องแชทที่เป็นแบบ DIRECT ที่ทั้งคู่เป็นสมาชิกอยู่ร่วมกัน
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        type: "DIRECT",
        participants: {
          every: {
            userId: { in: [userId, targetId] }
          }
        }
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                avatarUrl: true
              }
            }
          }
        }
      }
    });

    // ถ้าเจอห้องแชทเดิมที่มีสมาชิก 2 คนพอดี
    if (existingConversation && existingConversation.participants.length === 2) {
      return res.json(existingConversation);
    }

    // ถ้าไม่เจอ ให้สร้างห้องแชทใหม่
    const newConversation = await prisma.conversation.create({
      data: {
        type: "DIRECT",
        createdById: userId,
        participants: {
          create: [
            { userId: userId },
            { userId: targetId }
          ]
        }
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                avatarUrl: true
              }
            }
          }
        }
      }
    });

    res.json(newConversation);
  } catch (error) {
    console.error("Create direct chat error:", error);
    res.status(500).json({ error: "Failed to create direct chat" });
  }
});

export { chatRouter };
