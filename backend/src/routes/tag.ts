import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const tagRouter = Router();

// GET /tags — list all tags with post count
tagRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const tags = await prisma.tag.findMany({
      include: {
        _count: { select: { postLinks: true } },
      },
      orderBy: { postLinks: { _count: 'desc' } },
    });
    return res.json(tags);
  } catch (error) {
    console.error('Failed to fetch tags:', error);
    return res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

// GET /tags/:name/posts — get posts with this tag
tagRouter.get('/:name/posts', async (req: Request, res: Response) => {
  const name = typeof req.params.name === 'string' ? req.params.name.trim() : null;
  if (!name) return res.status(400).json({ error: 'Invalid tag name' });

  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 50);
  const skip = (page - 1) * limit;

  try {
    const tag = await prisma.tag.findUnique({ where: { name } });

    const postInclude = {
      author: { select: { id: true, fullName: true, avatarUrl: true, role: true, faculty: true } },
      media: { orderBy: { sortOrder: 'asc' as const } },
      reactions: { select: { userId: true, reaction: true } },
      comments: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'asc' as const },
        include: {
          author: { select: { id: true, fullName: true, avatarUrl: true } },
        },
      },
      _count: { select: { comments: true, reactions: true } },
    };

    const baseWhere = { deletedAt: null, isArchived: false };

    const posts = await prisma.post.findMany({
      where: {
        ...baseWhere,
        OR: [
          // โพสต์ที่ผูก tag ผ่าน TagMap
          ...(tag ? [{ tags: { some: { tagId: tag.id } } }] : []),
          // โพสต์ที่ใช้ facultyTag ตรงๆ (case-insensitive)
          { facultyTag: { equals: name, mode: 'insensitive' as const } },
        ],
      },
      include: postInclude,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    return res.json({ tag: tag ?? { name }, posts });
  } catch (error) {
    console.error('Failed to fetch tag posts:', error);
    return res.status(500).json({ error: 'Failed to fetch tag posts' });
  }
});

export { tagRouter };
