import express from "express";
import { prisma } from "../lib/prisma";
import { createNotification } from "../lib/notifications";

const followRouter = express.Router();

// Toggle Follow (Follow/Unfollow)
followRouter.post("/toggle", async (req, res) => {
  const { followerId, followingId } = req.body;

  if (!followerId || !followingId) {
    return res.status(400).json({ error: "Missing followerId or followingId" });
  }

  if (followerId === followingId) {
    return res.status(400).json({ error: "Cannot follow yourself" });
  }

  try {
    // ตรวจสอบว่าติดตามอยู่แล้วหรือไม่
    const existingFollow = await prisma.userFollow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    if (existingFollow) {
      // ถ้าติดตามอยู่แล้ว ให้ Unfollow
      await prisma.userFollow.delete({
        where: {
          followerId_followingId: {
            followerId,
            followingId,
          },
        },
      });
      return res.json({ success: true, followed: false, message: "Unfollowed successfully" });
    } else {
      // ถ้ายังไม่ได้ติดตาม ให้ Follow
      const follow = await prisma.userFollow.create({
        data: {
          followerId,
          followingId,
        },
        include: {
          follower: {
            select: { fullName: true }
          }
        }
      });
      
      // สร้าง Notification
      await createNotification({
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

// Check Follow Status
followRouter.get("/status", async (req, res) => {
  const { followerId, followingId } = req.query;

  if (!followerId || !followingId) {
    return res.status(400).json({ error: "Missing followerId or followingId" });
  }

  try {
    const follow = await prisma.userFollow.findUnique({
      where: {
        followerId_followingId: {
          followerId: followerId as string,
          followingId: followingId as string,
        },
      },
    });

    res.json({ followed: !!follow });
  } catch (error) {
    res.status(500).json({ error: "Failed to check follow status" });
  }
});

// Get All Following IDs
followRouter.get("/ids/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const following = await prisma.userFollow.findMany({
      where: { followerId: userId },
      select: { followingId: true }
    });

    const ids = following.map(f => f.followingId);
    res.json(ids);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch following IDs" });
  }
});

export { followRouter };
