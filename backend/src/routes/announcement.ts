import { Router } from 'express';
import { AnnouncementStatus } from '../../generated/prisma/enums';
import { prisma } from '../lib/prisma';

const announcementRouter = Router();

const announcementAuthorSelect = {
  id: true,
  fullName: true,
  avatarUrl: true,
  role: true,
} as const;

const parseAnnouncementStatus = (value: unknown): AnnouncementStatus | null => {
  if (typeof value !== 'string') {
    return null;
  }

  if (value in AnnouncementStatus) {
    return value as AnnouncementStatus;
  }
  return null;
};

const parseDate = (value: unknown): Date | null => {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const isUuid = (value: string): boolean => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
};

announcementRouter.get('/', async (req, res) => {
  const statusQuery = req.query.status;
  const status = parseAnnouncementStatus(statusQuery);

  if (statusQuery !== undefined && !status) {
    return res.status(400).json({
      message: 'Invalid announcement status',
    });
  }

  try {
    const announcements = await prisma.universityAnnouncement.findMany({
      where: {
        status: status ?? AnnouncementStatus.PUBLISHED,
      },
      include: {
        author: {
          select: announcementAuthorSelect,
        },
      },
      orderBy: [
        { publishedAt: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return res.json(announcements);
  } catch (error) {
    console.error('Failed to fetch announcements:', error);
    return res.status(500).json({
      message: 'Failed to fetch announcements',
    });
  }
});

announcementRouter.get('/:id', async (req, res) => {
  if (!isUuid(req.params.id)) {
    return res.status(400).json({
      message: "Invalid announcement id",
    });
  }
  try {
    const announcement = await prisma.universityAnnouncement.findUnique({
      where: {
        id: req.params.id,
      },
      include: {
        author: {
          select: announcementAuthorSelect,
        },
      },
    });

    if (!announcement) {
      return res.status(404).json({
        message: 'Announcement not found',
      });
    }

    return res.json(announcement);
  } catch (error) {
    console.error('Failed to fetch announcement:', error);
    return res.status(500).json({
      message: 'Failed to fetch announcement',
    });
  }
});

announcementRouter.post('/', async (req, res) => {
  const { title, content, coverUrl, authorId, status: statusInput, publishedAt: publishedAtInput } = req.body;

  if (!title || !content || !authorId) {
    return res.status(400).json({
      message: 'title, content and authorId are required',
    });
  }

  const status = statusInput ? parseAnnouncementStatus(statusInput) : AnnouncementStatus.DRAFT;
  if (!status) {
    return res.status(400).json({
      message: 'Invalid announcement status',
    });
  }

  const publishedAt = parseDate(publishedAtInput);
  if (publishedAtInput !== undefined && !publishedAt) {
    return res.status(400).json({
      message: 'Invalid publishedAt date',
    });
  }

  try {
    const announcement = await prisma.universityAnnouncement.create({
      data: {
        title: String(title).trim(),
        content: String(content).trim(),
        coverUrl: typeof coverUrl === 'string' && coverUrl.trim() !== '' ? coverUrl.trim() : null,
        authorId: String(authorId),
        status,
        publishedAt:
          status === AnnouncementStatus.PUBLISHED
            ? publishedAt ?? new Date()
            : publishedAt,
      },
      include: {
        author: {
          select: announcementAuthorSelect,
        },
      },
    });

    return res.status(201).json(announcement);
  } catch (error) {
    console.error('Failed to create announcement:', error);
    return res.status(500).json({
      message: 'Failed to create announcement',
    });
  }
});

announcementRouter.patch('/:id', async (req, res) => {
  if (!isUuid(req.params.id)) {
    return res.status(400).json({
      message: "Invalid announcement id",
    });
  }
  const { title, content, coverUrl, status: statusInput, publishedAt: publishedAtInput } = req.body;

  let status: AnnouncementStatus | undefined;
  if (statusInput !== undefined) {
    const parsedStatus = parseAnnouncementStatus(statusInput);
    if (!parsedStatus) {
      return res.status(400).json({
        message: 'Invalid announcement status',
      });
    }

    status = parsedStatus;
  }

  const publishedAt = publishedAtInput !== undefined ? parseDate(publishedAtInput) : undefined;
  if (publishedAtInput !== undefined && !publishedAt) {
    return res.status(400).json({
      message: 'Invalid publishedAt date',
    });
  }

  try {
    const existingAnnouncement = await prisma.universityAnnouncement.findUnique({
      where: {
        id: req.params.id,
      },
    });

    if (!existingAnnouncement) {
      return res.status(404).json({
        message: 'Announcement not found',
      });
    }

    const nextStatus = status ?? existingAnnouncement.status;

    const announcement = await prisma.universityAnnouncement.update({
      where: {
        id: req.params.id,
      },
      data: {
        title: typeof title === 'string' ? title.trim() : undefined,
        content: typeof content === 'string' ? content.trim() : undefined,
        coverUrl:
          coverUrl === null
            ? null
            : typeof coverUrl === 'string'
              ? coverUrl.trim()
              : undefined,
        status,
        publishedAt:
          publishedAt !== undefined
            ? publishedAt
            : nextStatus === AnnouncementStatus.PUBLISHED && !existingAnnouncement.publishedAt
              ? new Date()
              : undefined,
      },
      include: {
        author: {
          select: announcementAuthorSelect,
        },
      },
    });

    return res.json(announcement);
  } catch (error) {
    console.error('Failed to update announcement:', error);
    return res.status(500).json({
      message: 'Failed to update announcement',
    });
  }
});

announcementRouter.delete('/:id', async (req, res) => {
    if (!isUuid(req.params.id)) {
      return res.status(400).json({
        message: 'Invalid announcement id',
      });
    }

    try {
      const existingAnnouncement = await prisma.universityAnnouncement.findUnique({
        where: {
          id: req.params.id,
        },
      });

      if (!existingAnnouncement) {
        return res.status(404).json({
          message: 'Announcement not found',
        });
      }

      await prisma.universityAnnouncement.delete({
        where: {
          id: req.params.id,
        },
      });

      return res.json({
        message: 'Announcement deleted successfully',
      });
    } catch (error) {
      console.error('Failed to delete announcement:', error);
      return res.status(500).json({
        message: 'Failed to delete announcement',
      });
    }
});

export { announcementRouter };