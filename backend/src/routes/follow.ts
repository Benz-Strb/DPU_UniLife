import { Router, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
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
  if (typeof value !== 'string' || value.trim() === '') return null;
  const parsedValue = Number.parseInt(value, 10);
  return (!Number.isInteger(parsedValue) || parsedValue <= 0) ? null : parsedValue;
};

// GET Followers - ดึงรายการผู้ที่มาติดตามเรา
followRouter.get('/:userId/followers', async (req: Request, res: Response) => {
  const userId = typeof req.params.userId === 'string' ? req.params.userId : null;
  const page = parsePositiveInt(req.query.page);
  const limit = parsePositiveInt(req.query.limit);

  if (!userId || !isUuid(userId)) return res.status(400).json({ message: 'Invalid user id' });

  const currentPage = page ?? 1;
  const pageSize = Math.min(limit ?? 20, 50);
  const skip = (currentPage - 1) * pageSize;

  try {
    const [followers, total] = await Promise.all([
      prisma.userFollow.findMany({
        where: { followingId: userId },
        include: { follower: { select: userSelect } },
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
    return res.status(500).json({ message: 'Failed to fetch followers' });
  }
});

// GET Following - ดึงรายการผู้ที่เราไปติดตาม
followRouter.get('/:userId/following', async (req: Request, res: Response) => {
  const userId = typeof req.params.userId === 'string' ? req.params.userId : null;
  const page = parsePositiveInt(req.query.page);
  const limit = parsePositiveInt(req.query.limit);

  if (!userId || !isUuid(userId)) return res.status(400).json({ message: 'Invalid user id' });

  const currentPage = page ?? 1;
  const pageSize = Math.min(limit ?? 20, 50);
  const skip = (currentPage - 1) * pageSize;

  try {
    const [following, total] = await Promise.all([
      prisma.userFollow.findMany({
        where: { followerId: userId },
        include: { following: { select: userSelect } },
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
    return res.status(500).json({ message: 'Failed to fetch following' });
  }
});

// GET Follow Summary - สรุปจำนวน Follower/Following และสถานะการติดตาม
followRouter.get('/:userId/summary', async (req: Request, res: Response) => {
  const userId = typeof req.params.userId === 'string' ? req.params.userId : null;
  const viewerId = typeof req.query.viewerId === 'string' ? req.query.viewerId : undefined;

  if (!userId || !isUuid(userId)) return res.status(400).json({ message: 'Invalid user id' });

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: userSelect,
    });

    if (!user) return res.status(404).json({ message: 'User not found' });

    const [followersCount, followingCount, postsCount, isFollowing] = await Promise.all([
      prisma.userFollow.count({ where: { followingId: userId } }),
      prisma.userFollow.count({ where: { followerId: userId } }),
      prisma.post.count({ where: { authorId: userId, deletedAt: null } }),
      viewerId && typeof viewerId === 'string' && isUuid(viewerId)
        ? prisma.userFollow.findUnique({
            where: { followerId_followingId: { followerId: viewerId, followingId: userId } },
            select: { followerId: true },
          })
        : Promise.resolve(null),
    ]);

    return res.json({
      user,
      stats: { followers: followersCount, following: followingCount, posts: postsCount },
      viewer: { isFollowing: Boolean(isFollowing) },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch follow summary' });
  }
});

// GET Following IDs - ดึงเฉพาะ ID ทั้งหมดที่เราติดตาม (ใช้จัดการ UI)
followRouter.get("/ids/:userId", async (req: Request, res: Response) => {
  const userId = typeof req.params.userId === 'string' ? req.params.userId : '';
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

/**
 * TOGGLE FOLLOW (Atomic Implementation)
 * ระบบจะสลับสถานะติดตาม/เลิกติดตามในคำสั่งเดียว
 */
followRouter.post("/toggle", async (req: Request, res: Response) => {
  const followerId = typeof req.body.followerId === 'string' ? req.body.followerId : '';
  const followingId = typeof req.body.followingId === 'string' ? req.body.followingId : '';

  if (!followerId || !isUuid(followerId) || !followingId || !isUuid(followingId)) {
    return res.status(400).json({ error: "Invalid followerId or followingId" });
  }

  if (followerId === followingId) {
    return res.status(400).json({ error: "Cannot follow yourself" });
  }

  try {
    // ใช้ Transaction เพื่อความเสถียร (เสร็จทั้งหมด หรือไม่เกิดเลย)
    const result = await prisma.$transaction(async (tx) => {
      // 1. ตรวจสอบว่าผู้ใช้ทั้งคู่มีตัวตนจริง
      const users = await tx.user.findMany({
        where: { id: { in: [followerId, followingId] } },
        select: { id: true, fullName: true }
      });

      if (users.length < 2) throw new Error("USER_NOT_FOUND");

      const followerUser = users.find(u => u.id === followerId);
      
      // 2. เช็คสถานะปัจจุบัน
      const existingFollow = await tx.userFollow.findUnique({
        where: { followerId_followingId: { followerId, followingId } },
      });

      if (existingFollow) {
        // UNFOLLOW
        await tx.userFollow.delete({
          where: { followerId_followingId: { followerId, followingId } },
        });
        return { followed: false, message: "Unfollowed successfully" };
      } else {
        // FOLLOW
        await tx.userFollow.create({
          data: { followerId, followingId },
        });
        return { followed: true, message: "Followed successfully", followerName: followerUser?.fullName };
      }
    });

    // 3. ส่ง Notification (ทำนอก Transaction เพื่อไม่ให้บล็อก DB)
    if (result.followed) {
      createNotification({
        receiverId: followingId,
        senderId: followerId,
        type: "FOLLOW",
        title: "New Follower",
        body: `${result.followerName} started following you`,
      }).catch(err => console.error("Notification Error:", err));
    }

    return res.json({ success: true, followed: result.followed, message: result.message });

  } catch (error: any) {
    if (error.message === "USER_NOT_FOUND") {
      return res.status(404).json({ error: "One or both users not found" });
    }
    
    // จัดการกรณีรัวปุ่มจนเกิด Duplicate ในจังหวะสั้นๆ
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002' || error.code === 'P2025') {
        return res.status(409).json({ error: "Operation in progress, please try again" });
      }
    }

    console.error("Follow Toggle Error:", error);
    res.status(500).json({ error: "Failed to toggle follow" });
  }
});

// Legacy POST and DELETE for compatibility (Wrapped in error handling)
followRouter.post('/', async (req: Request, res: Response) => {
  const followerId = typeof req.body.followerId === 'string' ? req.body.followerId : '';
  const followingId = typeof req.body.followingId === 'string' ? req.body.followingId : '';
  
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
  const followerId = typeof req.body.followerId === 'string' ? req.body.followerId : '';
  const followingId = typeof req.body.followingId === 'string' ? req.body.followingId : '';

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
