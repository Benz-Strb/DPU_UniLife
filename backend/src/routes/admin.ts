import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const adminRouter = Router();

// GET /admin/dashboard — สถิติภาพรวมสำหรับ admin
adminRouter.get('/dashboard', async (_req: Request, res: Response) => {
  try {
    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      totalPosts,
      totalGroups,
      totalAnnouncements,
      openReports,
      totalMessages,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.user.count({ where: { status: 'SUSPENDED' } }),
      prisma.post.count({ where: { deletedAt: null } }),
      prisma.group.count({ where: { deletedAt: null } }),
      prisma.universityAnnouncement.count({ where: { status: 'PUBLISHED' } }),
      prisma.report.count({ where: { status: { in: ['OPEN', 'IN_REVIEW'] } } }),
      prisma.message.count({ where: { deletedAt: null } }),
    ]);

    // Posts ใน 7 วันล่าสุด (รายวัน)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const recentPosts = await prisma.post.findMany({
      where: { deletedAt: null, createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true },
    });

    const recentLogins = await prisma.loginLog.findMany({
      where: { status: 'SUCCESS', createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true },
    });

    // จัดกลุ่มตามวัน
    const groupByDay = (dates: { createdAt: Date }[]) => {
      const map: Record<string, number> = {};
      dates.forEach(({ createdAt }) => {
        const day = createdAt.toISOString().slice(0, 10);
        map[day] = (map[day] ?? 0) + 1;
      });
      return map;
    };

    return res.json({
      users: { total: totalUsers, active: activeUsers, suspended: suspendedUsers },
      posts: { total: totalPosts },
      groups: { total: totalGroups },
      announcements: { published: totalAnnouncements },
      reports: { open: openReports },
      messages: { total: totalMessages },
      charts: {
        postsPerDay: groupByDay(recentPosts),
        loginsPerDay: groupByDay(recentLogins),
      },
    });
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error);
    return res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// GET /admin/logs/login — ดู login logs (admin)
adminRouter.get('/logs/login', async (req: Request, res: Response) => {
  const page = typeof req.query.page === 'string' ? Math.max(parseInt(req.query.page, 10) || 1, 1) : 1;
  const limit = typeof req.query.limit === 'string' ? Math.min(parseInt(req.query.limit, 10) || 20, 100) : 20;
  const status = typeof req.query.status === 'string' ? req.query.status : null;
  const userId = typeof req.query.userId === 'string' ? req.query.userId : null;
  const skip = (page - 1) * limit;

  const where: any = {
    ...(status ? { status } : {}),
    ...(userId ? { userId } : {}),
  };

  try {
    const [logs, total] = await Promise.all([
      prisma.loginLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, fullName: true, username: true, email: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.loginLog.count({ where }),
    ]);

    return res.json({ logs, total, page, limit });
  } catch (error) {
    console.error('Failed to fetch login logs:', error);
    return res.status(500).json({ error: 'Failed to fetch login logs' });
  }
});

// GET /admin/logs/audit — ดู admin audit logs
adminRouter.get('/logs/audit', async (req: Request, res: Response) => {
  const page = typeof req.query.page === 'string' ? Math.max(parseInt(req.query.page, 10) || 1, 1) : 1;
  const limit = typeof req.query.limit === 'string' ? Math.min(parseInt(req.query.limit, 10) || 20, 100) : 20;
  const actorId = typeof req.query.actorId === 'string' ? req.query.actorId : null;
  const entityType = typeof req.query.entityType === 'string' ? req.query.entityType : null;
  const skip = (page - 1) * limit;

  const where: any = {
    ...(actorId ? { actorId } : {}),
    ...(entityType ? { entityType } : {}),
  };

  try {
    const [logs, total] = await Promise.all([
      prisma.adminAuditLog.findMany({
        where,
        include: {
          actor: {
            select: { id: true, fullName: true, username: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.adminAuditLog.count({ where }),
    ]);

    return res.json({ logs, total, page, limit });
  } catch (error) {
    console.error('Failed to fetch audit logs:', error);
    return res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// POST /admin/logs/audit — บันทึก audit log (เรียกจาก backend หลังทำ action สำคัญ)
adminRouter.post('/logs/audit', async (req: Request, res: Response) => {
  const { actorId, action, entityType, entityId, detail } = req.body;

  if (typeof actorId !== 'string' || typeof action !== 'string' || typeof entityType !== 'string') {
    return res.status(400).json({ error: 'actorId, action, and entityType are required' });
  }

  try {
    const log = await prisma.adminAuditLog.create({
      data: {
        actorId,
        action,
        entityType,
        entityId: typeof entityId === 'string' ? entityId : null,
        detail: detail ?? null,
      },
    });

    return res.status(201).json(log);
  } catch (error) {
    console.error('Failed to create audit log:', error);
    return res.status(500).json({ error: 'Failed to create audit log' });
  }
});

// GET /admin/settings — ดู system settings ทั้งหมด
adminRouter.get('/settings', async (_req: Request, res: Response) => {
  try {
    const settings = await prisma.systemSetting.findMany({
      orderBy: { key: 'asc' },
      include: {
        updatedBy: {
          select: { id: true, fullName: true, username: true },
        },
      },
    });

    return res.json(settings);
  } catch (error) {
    console.error('Failed to fetch system settings:', error);
    return res.status(500).json({ error: 'Failed to fetch system settings' });
  }
});

// PUT /admin/settings/:key — อัพเดท system setting
adminRouter.put('/settings/:key', async (req: Request, res: Response) => {
  const key = req.params.key as string;
  const { value, description, actorId } = req.body;

  if (value === undefined) {
    return res.status(400).json({ error: 'value is required' });
  }

  if (typeof actorId !== 'string') {
    return res.status(400).json({ error: 'actorId is required' });
  }

  try {
    const setting = await prisma.systemSetting.upsert({
      where: { key },
      update: {
        value,
        ...(typeof description === 'string' ? { description } : {}),
        updatedById: actorId,
      },
      create: {
        key,
        value,
        description: typeof description === 'string' ? description : null,
        updatedById: actorId,
      },
    });

    return res.json(setting);
  } catch (error) {
    console.error('Failed to update system setting:', error);
    return res.status(500).json({ error: 'Failed to update system setting' });
  }
});

export { adminRouter };
