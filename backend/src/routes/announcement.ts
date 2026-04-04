import { Router } from 'express';
import { Prisma, AnnouncementStatus, UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma';

const announcementRouter = Router();

const announcementAuthorSelect = {
  id: true,
  fullName: true,
  avatarUrl: true,
  role: true,
} as const;

const editableAnnouncementRoles = new Set<UserRole>([
  UserRole.STAFF,
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN,
]);

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

const isAnnouncementEditor = (role: UserRole): boolean => {
  return editableAnnouncementRoles.has(role);
};

const isPrismaKnownError = (error: unknown): error is Prisma.PrismaClientKnownRequestError => {
  return error instanceof Prisma.PrismaClientKnownRequestError;
};

announcementRouter.get('/', async (req, res) => {
  const statusQuery = req.query.status;
  const status = parseAnnouncementStatus(statusQuery);
  const page = parsePositiveInt(req.query.page);
  const limit = parsePositiveInt(req.query.limit);
  const q = normalizeOptionalString(req.query.q);
  const authorId = normalizeOptionalString(req.query.authorId);

  if (statusQuery !== undefined && !status) {
    return res.status(400).json({
      message: 'Invalid announcement status',
    });
  }

  if (req.query.page !== undefined && !page) {
    return res.status(400).json({
      message: 'page must be a positive integer',
    });
  }

  if (req.query.limit !== undefined && !limit) {
    return res.status(400).json({
      message: 'limit must be a positive integer',
    });
  }

  if (authorId !== undefined && !isUuid(authorId)) {
    return res.status(400).json({
      message: 'Invalid authorId',
    });
  }

  const currentPage = page ?? 1;
  const pageSize = Math.min(limit ?? 10, 50);
  const skip = (currentPage - 1) * pageSize;
  const where: Prisma.UniversityAnnouncementWhereInput = {
    status: status ?? AnnouncementStatus.PUBLISHED,
    authorId,
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { content: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  try {
    const [announcements, total] = await Promise.all([
      prisma.universityAnnouncement.findMany({
        where,
        include: {
          author: {
            select: announcementAuthorSelect,
          },
        },
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: pageSize,
      }),
      prisma.universityAnnouncement.count({ where }),
    ]);

    return res.json({
      data: announcements,
      pagination: {
        page: currentPage,
        limit: pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
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

    if (announcement.status !== AnnouncementStatus.PUBLISHED) {
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
  const {
    title: titleInput,
    content: contentInput,
    coverUrl,
    authorId,
    status: statusInput,
    publishedAt: publishedAtInput,
  } = req.body;
  const title = normalizeRequiredString(titleInput);
  const content = normalizeRequiredString(contentInput);

  if (!title || !content || !authorId) {
    return res.status(400).json({
      message: 'title, content and authorId are required',
    });
  }

  if (!isUuid(String(authorId))) {
    return res.status(400).json({
      message: 'Invalid authorId',
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
    const author = await prisma.user.findUnique({
      where: {
        id: String(authorId),
      },
      select: {
        id: true,
        role: true,
      },
    });

    if (!author) {
      return res.status(404).json({
        message: 'Author not found',
      });
    }

    if (!isAnnouncementEditor(author.role)) {
      return res.status(403).json({
        message: 'Only staff or admins can create announcements',
      });
    }

    const announcement = await prisma.universityAnnouncement.create({
      data: {
        title,
        content,
        coverUrl: typeof coverUrl === 'string' && coverUrl.trim() !== '' ? coverUrl.trim() : null,
        authorId: author.id,
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
    if (isPrismaKnownError(error) && error.code === 'P2003') {
      return res.status(400).json({
        message: 'Invalid authorId',
      });
    }

    console.error('Failed to create announcement:', error);
    return res.status(500).json({
      message: 'Failed to create announcement',
    });
  }
});

announcementRouter.patch('/:id', async (req, res) => {
  if (!isUuid(req.params.id)) {
    return res.status(400).json({
      message: 'Invalid announcement id',
    });
  }
  const {
    title: titleInput,
    content: contentInput,
    coverUrl,
    status: statusInput,
    publishedAt: publishedAtInput,
  } = req.body;

  const title = titleInput === undefined ? undefined : normalizeRequiredString(titleInput);
  const content = contentInput === undefined ? undefined : normalizeRequiredString(contentInput);

  if (titleInput !== undefined && !title) {
    return res.status(400).json({
      message: 'title cannot be empty',
    });
  }

  if (contentInput !== undefined && !content) {
    return res.status(400).json({
      message: 'content cannot be empty',
    });
  }

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
        title: title ?? undefined,
        content: content ?? undefined,
        coverUrl:
          coverUrl === null
            ? null
            : typeof coverUrl === 'string'
              ? coverUrl.trim() || null
              : undefined,
        status,
        publishedAt:
          publishedAt !== undefined
            ? publishedAt
            : nextStatus === AnnouncementStatus.PUBLISHED && !existingAnnouncement.publishedAt
              ? new Date()
              : nextStatus !== AnnouncementStatus.PUBLISHED
                ? null
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
    if (isPrismaKnownError(error) && error.code === 'P2025') {
      return res.status(404).json({
        message: 'Announcement not found',
      });
    }

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
    if (isPrismaKnownError(error) && error.code === 'P2025') {
      return res.status(404).json({
        message: 'Announcement not found',
      });
    }

    console.error('Failed to delete announcement:', error);
    return res.status(500).json({
      message: 'Failed to delete announcement',
    });
  }
});

export { announcementRouter };