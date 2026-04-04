import { Router, Request, Response } from 'express';
import { Prisma } from '../../generated/prisma/client';
import { prisma } from '../lib/prisma';
import { createNotification } from "../lib/notifications";

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

// GET Followers
followRouter.get('/:userId/followers', async (req: Request, res: Response) => {
  const userId = typeof req.params.userId === 'string' ? req.params.userId : null;
  const page = parsePositiveInt(req.query.page);
  const limit = parsePositiveInt(req.query.limit);

  if (!userId || !isUuid(userId)) {
    return res.status(400).json({ message: 'Invalid user id' });
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
        where: { followingId: userId },
        include: {
          follower: { select: userSelect },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.userFollow.count({ where: { followingId: userId } }),
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

// GET Following
followRouter.get('/:userId/following', async (req: Request, res: Response) => {
  const userId = typeof req.params.userId === 'string' ? req.params.userId : null;
  const page = parsePositiveInt(req.query.page);
  const limit = parsePositiveInt(req.query.limit);

  if (!userId || !isUuid(userId)) {
    return res.status(400).json({ message: 'Invalid user id' });
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
        where: { followerId: userId },
        include: {
          following: { select: userSelect },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.userFollow.count({ where: { followerId: userId } }),
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

// GET Follow Summary
followRouter.get('/:userId/summary', async (req: Request, res: Response) => {
  const userId = typeof req.params.userId === 'string' ? req.params.userId : null;
  const viewerId = typeof req.query.viewerId === 'string' ? req.query.viewerId : undefined;

  if (!userId || !isUuid(userId)) {
    return res.status(400).json({ message: 'Invalid user id' });
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
      prisma.userFollow.count({ where: { followingId: userId } }),
      prisma.userFollow.count({ where: { followerId: userId } }),
      prisma.post.count({ where: { authorId: userId, deletedAt: null } }),
      viewerId && isUuid(viewerId)
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

// GET Following IDs (Used for UI state)
followRouter.get("/ids/:userId", async (req: Request, res: Response) => {
  const { userId } = req.params;
  if (!isUuid(userId)) return res.status(400).json({ error: "Invalid user id" });

  try {
    const following = await prisma.userFollow.findMany({
      where: { followerId: userId },
      select: { followingId: true }
    });
    res.json(following.map(f => f.followingId));
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch following IDs" });
  }
});

// Toggle Follow (Handles both Follow and Unfollow + Notification)
followRouter.post("/toggle", async (req: Request, res: Response) => {
  const { followerId, followingId } = req.body;

  if (!followerId || !isUuid(followerId) || !followingId || !isUuid(followingId)) {
    return res.status(400).json({ error: "Missing or invalid followerId or followingId" });
  }

  if (followerId === followingId) {
    return res.status(400).json({ error: "Cannot follow yourself" });
  }

  try {
    const existingFollow = await prisma.userFollow.findUnique({
      where: {
        followerId_followingId: { followerId, followingId },
      },
    });

    if (existingFollow) {
      // Unfollow
      await prisma.userFollow.delete({
        where: {
          followerId_followingId: { followerId, followingId },
        },
      });
      return res.json({ success: true, followed: false, message: "Unfollowed successfully" });
    } else {
      // Follow
      const follow = await prisma.userFollow.create({
        data: { followerId, followingId },
        include: {
          follower: { select: { fullName: true } }
        }
      });
      
      // Create Notification
      createNotification({
        receiverId: followingId,
        senderId: followerId,
        type: "FOLLOW",
        title: "New Follower",
        body: `${follow.follower.fullName} started following you`,
      }).catch(err => console.error("Failed to create notification", err));

      return res.json({ success: true, followed: true, message: "Followed successfully" });
    }
  } catch (error) {
    console.error("Follow error:", error);
    res.status(500).json({ error: "Failed to toggle follow" });
  }
});

// Legacy POST and DELETE for compatibility
followRouter.post('/', async (req: Request, res: Response) => {
  const { followerId, followingId } = req.body;
  if (!isUuid(followerId) || !isUuid(followingId)) return res.status(400).json({ message: 'Invalid IDs' });

  try {
    const follow = await prisma.userFollow.upsert({
      where: { followerId_followingId: { followerId, followingId } },
      update: {},
      create: { followerId, followingId },
      include: { follower: { select: userSelect }, following: { select: userSelect } }
    });
    return res.status(201).json(follow);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to follow' });
  }
});

followRouter.delete('/', async (req: Request, res: Response) => {
  const { followerId, followingId } = req.body;
  if (!isUuid(followerId) || !isUuid(followingId)) return res.status(400).json({ message: 'Invalid IDs' });

  try {
    await prisma.userFollow.delete({
      where: { followerId_followingId: { followerId, followingId } }
    });
    return res.json({ message: 'Unfollowed successfully' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to unfollow' });
  }
});

export { followRouter };
