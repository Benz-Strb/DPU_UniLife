import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const searchRouter = Router();

// GET /search?q=&type=all|users|posts|groups&userId=&limit=
searchRouter.get('/', async (req: Request, res: Response) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const type = typeof req.query.type === 'string' ? req.query.type : 'all';
  const userId = typeof req.query.userId === 'string' ? req.query.userId : null;
  const limit = typeof req.query.limit === 'string' ? Math.min(parseInt(req.query.limit, 10) || 10, 30) : 10;

  if (!q) {
    return res.status(400).json({ error: 'q (search query) is required' });
  }

  try {
    // บันทึก search history ถ้ามี userId
    if (userId) {
      prisma.searchHistory.create({ data: { userId, keyword: q } }).catch(() => {});
    }

    const [users, posts, groups] = await Promise.all([
      type === 'all' || type === 'users'
        ? prisma.user.findMany({
            where: {
              OR: [
                { fullName: { contains: q, mode: 'insensitive' } },
                { username: { contains: q, mode: 'insensitive' } },
                { studentId: { contains: q, mode: 'insensitive' } },
              ],
              status: 'ACTIVE',
            },
            select: {
              id: true,
              fullName: true,
              username: true,
              avatarUrl: true,
              role: true,
              faculty: true,
            },
            take: limit,
          })
        : Promise.resolve([]),

      type === 'all' || type === 'posts'
        ? prisma.post.findMany({
            where: {
              deletedAt: null,
              isArchived: false,
              OR: [
                { title: { contains: q, mode: 'insensitive' } },
                { content: { contains: q, mode: 'insensitive' } },
              ],
            },
            select: {
              id: true,
              title: true,
              content: true,
              createdAt: true,
              visibility: true,
              author: { select: { id: true, fullName: true, avatarUrl: true } },
              media: { take: 1, select: { url: true, mediaType: true } },
              _count: { select: { reactions: true, comments: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
          })
        : Promise.resolve([]),

      type === 'all' || type === 'groups'
        ? prisma.group.findMany({
            where: {
              deletedAt: null,
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } },
              ],
            },
            select: {
              id: true,
              name: true,
              slug: true,
              description: true,
              avatarUrl: true,
              isOfficial: true,
              _count: { select: { members: true } },
            },
            take: limit,
          })
        : Promise.resolve([]),
    ]);

    return res.json({ q, users, posts, groups });
  } catch (error) {
    console.error('Search failed:', error);
    return res.status(500).json({ error: 'Search failed' });
  }
});

export { searchRouter };
