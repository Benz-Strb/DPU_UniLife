import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { getIO } from '../lib/socket';
import { hashPassword } from '../password';
import { invalidateSettingsCache } from '../lib/settings';

const adminRouter = Router();

// GET /admin/dashboard — สถิติภาพรวมสำหรับ admin
adminRouter.get('/dashboard', async (_req: Request, res: Response) => {
  try {
    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      bannedUsers,
      totalPosts,
      totalGroups,
      totalAnnouncements,
      openReports,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.user.count({ where: { status: 'SUSPENDED' } }),
      prisma.user.count({ where: { bannedUntil: { gt: new Date() } } }),
      prisma.post.count({ where: { deletedAt: null } }),
      prisma.group.count({ where: { deletedAt: null } }),
      prisma.universityAnnouncement.count({ where: { status: 'PUBLISHED' } }),
      prisma.report.count({ where: { status: { in: ['OPEN', 'IN_REVIEW'] } } }),
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
      users: { total: totalUsers, active: activeUsers, suspended: suspendedUsers, banned: bannedUsers },
      posts: { total: totalPosts },
      groups: { total: totalGroups },
      announcements: { published: totalAnnouncements },
      reports: { open: openReports },
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

    invalidateSettingsCache();
    return res.json(setting);
  } catch (error) {
    console.error('Failed to update system setting:', error);
    return res.status(500).json({ error: 'Failed to update system setting' });
  }
});

// POST /admin/users/:userId/ban — แบน user เป็นเวลา X วัน (0 = unban)
adminRouter.post('/users/:userId/ban', async (req: Request, res: Response) => {
  const userId = typeof req.params.userId === 'string' ? req.params.userId : null;
  const { days, actorId } = req.body;

  if (!userId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
    return res.status(400).json({ message: 'Invalid user id' });
  }

  if (typeof actorId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(actorId)) {
    return res.status(400).json({ message: 'A valid actorId is required' });
  }

  const banDays = typeof days === 'number' ? days : parseInt(days, 10);
  if (isNaN(banDays) || banDays < 0) {
    return res.status(400).json({ message: 'days must be a non-negative number' });
  }

  try {
    const [actor, target] = await Promise.all([
      prisma.user.findUnique({ where: { id: actorId }, select: { id: true, role: true } }),
      prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } }),
    ]);

    if (!actor || (actor.role !== 'ADMIN' && actor.role !== 'SUPER_ADMIN')) {
      return res.status(403).json({ message: 'Only admins can ban users' });
    }

    if (!target) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (target.role === 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'Cannot ban a SUPER_ADMIN' });
    }

    const bannedUntil = banDays === 0 ? null : new Date(Date.now() + banDays * 24 * 60 * 60 * 1000);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { bannedUntil },
      select: {
        id: true, fullName: true, username: true, role: true, status: true, bannedUntil: true,
      },
    });

    await prisma.adminAuditLog.create({
      data: {
        actorId,
        action: banDays === 0 ? 'UNBAN_USER' : `BAN_USER_${banDays}D`,
        entityType: 'User',
        entityId: userId,
        detail: { days: banDays, bannedUntil },
      },
    });

    if (banDays > 0) {
      try {
        getIO().to(`user_${userId}`).emit('user_banned', { days: banDays, bannedUntil });
      } catch {}
    }

    return res.json({ message: banDays === 0 ? 'User unbanned' : `User banned for ${banDays} days`, user: updatedUser });
  } catch (error) {
    console.error('Failed to ban user:', error);
    return res.status(500).json({ message: 'Failed to ban user' });
  }
});

// POST /admin/create-account — สร้าง admin account โดย SUPER_ADMIN ไม่ต้องใช้ student ID หรือ OTP
adminRouter.post('/create-account', async (req: Request, res: Response) => {
  const { actorId, fullName, username, email, password, faculty, role } = req.body;

  if (!actorId || !fullName || !username || !email || !password || !role) {
    return res.status(400).json({ message: 'actorId, fullName, username, email, password และ role จำเป็นต้องมี' });
  }

  if (!['ADMIN', 'SUPER_ADMIN'].includes(role)) {
    return res.status(400).json({ message: 'role ต้องเป็น ADMIN หรือ SUPER_ADMIN' });
  }

  try {
    const actor = await prisma.user.findUnique({ where: { id: actorId }, select: { role: true } });
    if (!actor || actor.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'เฉพาะ SUPER_ADMIN เท่านั้นที่สร้าง admin account ได้' });
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
      select: { id: true },
    });
    if (existing) {
      return res.status(409).json({ message: 'Email หรือ Username นี้ถูกใช้งานแล้ว' });
    }

    const hashedPassword = await hashPassword(password);
    const adminStudentId = `ADM${Date.now().toString().slice(-7)}`;

    const newUser = await prisma.user.create({
      data: {
        fullName,
        username,
        email,
        passwordHash: hashedPassword,
        faculty: faculty || null,
        role,
        studentId: adminStudentId,
        status: 'ACTIVE',
      },
      select: {
        id: true, fullName: true, username: true, email: true,
        faculty: true, role: true, studentId: true, createdAt: true,
      },
    });

    await prisma.adminAuditLog.create({
      data: {
        actorId,
        action: 'CREATE_ADMIN_ACCOUNT',
        entityType: 'User',
        entityId: newUser.id,
        detail: { fullName, username, email, faculty, role },
      },
    });

    return res.status(201).json({ message: 'สร้าง Admin account สำเร็จ', user: newUser });
  } catch (error) {
    console.error('Failed to create admin account:', error);
    return res.status(500).json({ message: 'Failed to create admin account' });
  }
});

export { adminRouter };
