import { Router, Request, Response } from 'express';
import { Prisma } from '../../generated/prisma/client';
import { prisma } from '../lib/prisma';

const followRouter = Router();

const userSelect = {
  id: true,
  email: true,
  username: true,
  studentId: true,
  fullName: true,
  bio: true,
  avatarUrl: true,
  coverUrl: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
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

const isPrismaKnownError = (error: unknown): error is Prisma.PrismaClientKnownRequestError => {
  return error instanceof Prisma.PrismaClientKnownRequestError;
};

followRouter.get('/:userId/followers', async (req: Request, res: Response) => {
  const userId = typeof req.params.userId === 'string' ? req.params.userId : null;
  const page = parsePositiveInt(req.query.page);
  const limit = parsePositiveInt(req.query.limit);

  if (!userId || !isUuid(userId)) {
    return res.status(400).json({ message: 'Invalid user id' });
  }

  if (req.query.page !== undefined && !page) {
    return res.status(400).json({ message: 'page must be a positive integer' });
  }

  if (req.query.limit !== undefined && !limit) {
    return res.status(400).json({ message: 'limit must be a positive integer' });
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

    const [followers, total] = await Promise.all([
      prisma.userFollow.findMany({
        where: {
          followingId: userId,
        },
        include: {
          follower: {
            select: userSelect,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: pageSize,
      }),
      prisma.userFollow.count({
        where: {
          followingId: userId,
        },
      }),
    ]);

    return res.json({
      data: followers,
      pagination: {
        page: currentPage,
        limit: pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  } catch (error) {
    console.error('Failed to fetch followers:', error);
    return res.status(500).json({ message: 'Failed to fetch followers' });
  }
});

followRouter.get('/:userId/following', async (req: Request, res: Response) => {
  const userId = typeof req.params.userId === 'string' ? req.params.userId : null;
  const page = parsePositiveInt(req.query.page);
  const limit = parsePositiveInt(req.query.limit);

  if (!userId || !isUuid(userId)) {
    return res.status(400).json({ message: 'Invalid user id' });
  }

  if (req.query.page !== undefined && !page) {
    return res.status(400).json({ message: 'page must be a positive integer' });
  }

  if (req.query.limit !== undefined && !limit) {
    return res.status(400).json({ message: 'limit must be a positive integer' });
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

    const [following, total] = await Promise.all([
      prisma.userFollow.findMany({
        where: {
          followerId: userId,
        },
        include: {
          following: {
            select: userSelect,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: pageSize,
      }),
      prisma.userFollow.count({
        where: {
          followerId: userId,
        },
      }),
    ]);

    return res.json({
      data: following,
      pagination: {
        page: currentPage,
        limit: pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  } catch (error) {
    console.error('Failed to fetch following:', error);
    return res.status(500).json({ message: 'Failed to fetch following' });
  }
});

followRouter.get('/:userId/summary', async (req: Request, res: Response) => {
  const userId = typeof req.params.userId === 'string' ? req.params.userId : null;
  const viewerId = typeof req.query.viewerId === 'string' ? req.query.viewerId : undefined;

  if (!userId || !isUuid(userId)) {
    return res.status(400).json({ message: 'Invalid user id' });
  }

  if (viewerId !== undefined && !isUuid(viewerId)) {
    return res.status(400).json({ message: 'Invalid viewerId' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: userSelect,
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const [followersCount, followingCount, postsCount, isFollowing] = await Promise.all([
      prisma.userFollow.count({
        where: { followingId: userId },
      }),
      prisma.userFollow.count({
        where: { followerId: userId },
      }),
      prisma.post.count({
        where: {
          authorId: userId,
          deletedAt: null,
        },
      }),
      viewerId
        ? prisma.userFollow.findUnique({
            where: {
              followerId_followingId: {
                followerId: viewerId,
                followingId: userId,
              },
            },
            select: { followerId: true },
          })
        : Promise.resolve(null),
    ]);

    return res.json({
      user,
      stats: {
        followers: followersCount,
        following: followingCount,
        posts: postsCount,
      },
      viewer: {
        isFollowing: Boolean(isFollowing),
      },
    });
  } catch (error) {
    console.error('Failed to fetch follow summary:', error);
    return res.status(500).json({ message: 'Failed to fetch follow summary' });
  }
});

followRouter.post('/', async (req: Request, res: Response) => {
  const { followerId, followingId } = req.body;

  if (typeof followerId !== 'string' || !isUuid(followerId)) {
    return res.status(400).json({ message: 'A valid followerId is required' });
  }

  if (typeof followingId !== 'string' || !isUuid(followingId)) {
    return res.status(400).json({ message: 'A valid followingId is required' });
  }

  if (followerId === followingId) {
    return res.status(400).json({ message: 'Users cannot follow themselves' });
  }

  try {
    const [follower, following] = await Promise.all([
      prisma.user.findUnique({
        where: { id: followerId },
        select: { id: true },
      }),
      prisma.user.findUnique({
        where: { id: followingId },
        select: { id: true },
      }),
    ]);

    if (!follower) {
      return res.status(404).json({ message: 'Follower user not found' });
    }

    if (!following) {
      return res.status(404).json({ message: 'Following user not found' });
    }

    const follow = await prisma.userFollow.upsert({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
      update: {},
      create: {
        followerId,
        followingId,
      },
      include: {
        follower: {
          select: userSelect,
        },
        following: {
          select: userSelect,
        },
      },
    });

    return res.status(201).json(follow);
  } catch (error) {
    if (isPrismaKnownError(error) && error.code === 'P2003') {
      return res.status(400).json({ message: 'Invalid relation data' });
    }

    console.error('Failed to follow user:', error);
    return res.status(500).json({ message: 'Failed to follow user' });
  }
});

followRouter.delete('/', async (req: Request, res: Response) => {
  const { followerId, followingId } = req.body;

  if (typeof followerId !== 'string' || !isUuid(followerId)) {
    return res.status(400).json({ message: 'A valid followerId is required' });
  }

  if (typeof followingId !== 'string' || !isUuid(followingId)) {
    return res.status(400).json({ message: 'A valid followingId is required' });
  }

  try {
    const follow = await prisma.userFollow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    if (!follow) {
      return res.status(404).json({ message: 'Follow relation not found' });
    }

    await prisma.userFollow.delete({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    return res.json({ message: 'Unfollowed successfully' });
  } catch (error) {
    console.error('Failed to unfollow user:', error);
    return res.status(500).json({ message: 'Failed to unfollow user' });
  }
});

export { followRouter };
