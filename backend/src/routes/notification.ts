import { Router, Request, Response } from 'express';
import { Prisma, NotificationType } from '@prisma/client';
import { prisma } from '../lib/prisma';

const notificationRouter = Router();

const userSelect = {
  id: true,
  fullName: true,
  avatarUrl: true,
  role: true,
} as const;

const notificationInclude = {
  sender: {
    select: userSelect,
  },
  receiver: {
    select: userSelect,
  },
} as const;

const isUuid = (value: string): boolean => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
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

const parseNotificationType = (value: unknown): NotificationType | null => {
  if (typeof value !== 'string') {
    return null;
  }

  if (value in NotificationType) {
    return value as NotificationType;
  }

  return null;
};

const isPrismaKnownError = (error: unknown): error is Prisma.PrismaClientKnownRequestError => {
  return error instanceof Prisma.PrismaClientKnownRequestError;
};

notificationRouter.get('/:userId', async (req: Request, res: Response) => {
  const userId = typeof req.params.userId === 'string' ? req.params.userId : null;
  const page = parsePositiveInt(req.query.page);
  const limit = parsePositiveInt(req.query.limit);
  const typeQuery = req.query.type;
  const type = parseNotificationType(typeQuery);
  const isReadQuery = req.query.isRead;

  if (!userId || !isUuid(userId)) {
    return res.status(400).json({ message: 'Invalid user id' });
  }

  if (req.query.page !== undefined && !page) {
    return res.status(400).json({ message: 'page must be a positive integer' });
  }

  if (req.query.limit !== undefined && !limit) {
    return res.status(400).json({ message: 'limit must be a positive integer' });
  }

  if (typeQuery !== undefined && !type) {
    return res.status(400).json({ message: 'Invalid notification type' });
  }

  let isRead: boolean | undefined;
  if (isReadQuery !== undefined) {
    if (isReadQuery === 'true') {
      isRead = true;
    } else if (isReadQuery === 'false') {
      isRead = false;
    } else {
      return res.status(400).json({ message: 'isRead must be true or false' });
    }
  }

  const currentPage = page ?? 1;
  const pageSize = Math.min(limit ?? 20, 50);
  const skip = (currentPage - 1) * pageSize;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const where: Prisma.NotificationWhereInput = {
      receiverId: userId,
      type: type ?? undefined,
      isRead,
    };

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        include: notificationInclude,
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: pageSize,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: {
          receiverId: userId,
          isRead: false,
        },
      }),
    ]);

    return res.json({
      data: notifications,
      pagination: {
        page: currentPage,
        limit: pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
      unreadCount,
    });
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    return res.status(500).json({ message: 'Failed to fetch notifications' });
  }
});

notificationRouter.get('/:userId/unread-count', async (req: Request, res: Response) => {
  const userId = typeof req.params.userId === 'string' ? req.params.userId : null;

  if (!userId || !isUuid(userId)) {
    return res.status(400).json({ message: 'Invalid user id' });
  }

  try {
    const unreadCount = await prisma.notification.count({
      where: {
        receiverId: userId,
        isRead: false,
      },
    });

    return res.json({ unreadCount });
  } catch (error) {
    console.error('Failed to fetch unread notification count:', error);
    return res.status(500).json({ message: 'Failed to fetch unread notification count' });
  }
});

notificationRouter.post('/', async (req: Request, res: Response) => {
  const {
    receiverId,
    senderId,
    type: typeInput,
    title: titleInput,
    body: bodyInput,
    refPostId,
    refCommentId,
    refMessageId,
    refGroupId,
  } = req.body;

  const title = normalizeRequiredString(titleInput);
  const body = bodyInput === undefined ? undefined : typeof bodyInput === 'string' ? bodyInput.trim() || null : undefined;
  const type = parseNotificationType(typeInput);

  if (typeof receiverId !== 'string' || !isUuid(receiverId)) {
    return res.status(400).json({ message: 'A valid receiverId is required' });
  }

  if (senderId !== undefined && senderId !== null && (typeof senderId !== 'string' || !isUuid(senderId))) {
    return res.status(400).json({ message: 'Invalid senderId' });
  }

  if (!type) {
    return res.status(400).json({ message: 'Invalid notification type' });
  }

  if (!title) {
    return res.status(400).json({ message: 'title is required' });
  }

  const refIds = [
    ['refPostId', refPostId],
    ['refCommentId', refCommentId],
    ['refMessageId', refMessageId],
    ['refGroupId', refGroupId],
  ] as const;

  for (const [fieldName, value] of refIds) {
    if (value !== undefined && value !== null && (typeof value !== 'string' || !isUuid(value))) {
      return res.status(400).json({ message: `Invalid ${fieldName}` });
    }
  }

  try {
    const [receiver, sender] = await Promise.all([
      prisma.user.findUnique({
        where: { id: receiverId },
        select: { id: true },
      }),
      senderId
        ? prisma.user.findUnique({
            where: { id: senderId },
            select: { id: true },
          })
        : Promise.resolve(null),
    ]);

    if (!receiver) {
      return res.status(404).json({ message: 'Receiver not found' });
    }

    if (senderId && !sender) {
      return res.status(404).json({ message: 'Sender not found' });
    }

    const notification = await prisma.notification.create({
      data: {
        receiverId,
        senderId: senderId ?? null,
        type,
        title,
        body,
        refPostId: refPostId ?? null,
        refCommentId: refCommentId ?? null,
        refMessageId: refMessageId ?? null,
        refGroupId: refGroupId ?? null,
      },
      include: notificationInclude,
    });

    return res.status(201).json(notification);
  } catch (error) {
    if (isPrismaKnownError(error) && error.code === 'P2003') {
      return res.status(400).json({ message: 'Invalid relation data' });
    }

    console.error('Failed to create notification:', error);
    return res.status(500).json({ message: 'Failed to create notification' });
  }
});

notificationRouter.patch('/:notificationId/read', async (req: Request, res: Response) => {
  const notificationId = typeof req.params.notificationId === 'string' ? req.params.notificationId : null;

  if (!notificationId || !isUuid(notificationId)) {
    return res.status(400).json({ message: 'Invalid notification id' });
  }

  try {
    const notification = await prisma.notification.update({
      where: {
        id: notificationId,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
      include: notificationInclude,
    });

    return res.json(notification);
  } catch (error) {
    if (isPrismaKnownError(error) && error.code === 'P2025') {
      return res.status(404).json({ message: 'Notification not found' });
    }

    console.error('Failed to mark notification as read:', error);
    return res.status(500).json({ message: 'Failed to mark notification as read' });
  }
});

notificationRouter.patch('/user/:userId/read-all', async (req: Request, res: Response) => {
  const userId = typeof req.params.userId === 'string' ? req.params.userId : null;

  if (!userId || !isUuid(userId)) {
    return res.status(400).json({ message: 'Invalid user id' });
  }

  try {
    const result = await prisma.notification.updateMany({
      where: {
        receiverId: userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return res.json({
      message: 'Notifications marked as read',
      updatedCount: result.count,
    });
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error);
    return res.status(500).json({ message: 'Failed to mark all notifications as read' });
  }
});

export { notificationRouter };