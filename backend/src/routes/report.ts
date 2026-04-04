import { Router, Request, Response } from 'express';
import { Prisma, ReportStatus, ReportTargetType } from '@prisma/client';
import { prisma } from '../lib/prisma';

const reportRouter = Router();

const userSelect = {
  id: true,
  fullName: true,
  avatarUrl: true,
  role: true,
} as const;

const reportInclude = {
  reporter: {
    select: userSelect,
  },
  handledBy: {
    select: userSelect,
  },
  targetUser: {
    select: userSelect,
  },
  targetPost: {
    select: {
      id: true,
      title: true,
      content: true,
      authorId: true,
      createdAt: true,
    },
  },
  targetComment: {
    select: {
      id: true,
      content: true,
      authorId: true,
      postId: true,
      createdAt: true,
    },
  },
  targetMessage: {
    select: {
      id: true,
      body: true,
      senderId: true,
      conversationId: true,
      createdAt: true,
    },
  },
  targetGroup: {
    select: {
      id: true,
      name: true,
      slug: true,
      createdById: true,
      isOfficial: true,
    },
  },
  targetAnnouncement: {
    select: {
      id: true,
      title: true,
      status: true,
      authorId: true,
      createdAt: true,
    },
  },
  actions: {
    include: {
      actor: {
        select: userSelect,
      },
    },
    orderBy: {
      createdAt: 'asc' as const,
    },
  },
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

const parseReportTargetType = (value: unknown): ReportTargetType | null => {
  if (typeof value !== 'string') {
    return null;
  }

  if (value in ReportTargetType) {
    return value as ReportTargetType;
  }

  return null;
};

const parseReportStatus = (value: unknown): ReportStatus | null => {
  if (typeof value !== 'string') {
    return null;
  }

  if (value in ReportStatus) {
    return value as ReportStatus;
  }

  return null;
};

const isPrismaKnownError = (error: unknown): error is Prisma.PrismaClientKnownRequestError => {
  return error instanceof Prisma.PrismaClientKnownRequestError;
};

reportRouter.get('/', async (req: Request, res: Response) => {
  const page = parsePositiveInt(req.query.page);
  const limit = parsePositiveInt(req.query.limit);
  const reporterId = normalizeOptionalString(req.query.reporterId);
  const handledById = normalizeOptionalString(req.query.handledById);
  const targetTypeQuery = req.query.targetType;
  const statusQuery = req.query.status;
  const targetType = parseReportTargetType(targetTypeQuery);
  const status = parseReportStatus(statusQuery);

  if (req.query.page !== undefined && !page) {
    return res.status(400).json({ message: 'page must be a positive integer' });
  }

  if (req.query.limit !== undefined && !limit) {
    return res.status(400).json({ message: 'limit must be a positive integer' });
  }

  if (reporterId !== undefined && !isUuid(reporterId)) {
    return res.status(400).json({ message: 'Invalid reporterId' });
  }

  if (handledById !== undefined && !isUuid(handledById)) {
    return res.status(400).json({ message: 'Invalid handledById' });
  }

  if (targetTypeQuery !== undefined && !targetType) {
    return res.status(400).json({ message: 'Invalid report target type' });
  }

  if (statusQuery !== undefined && !status) {
    return res.status(400).json({ message: 'Invalid report status' });
  }

  const currentPage = page ?? 1;
  const pageSize = Math.min(limit ?? 20, 50);
  const skip = (currentPage - 1) * pageSize;

  const where: Prisma.ReportWhereInput = {
    reporterId,
    handledById,
    targetType: targetType ?? undefined,
    status: status ?? undefined,
  };

  try {
    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        include: reportInclude,
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        skip,
        take: pageSize,
      }),
      prisma.report.count({ where }),
    ]);

    return res.json({
      data: reports,
      pagination: {
        page: currentPage,
        limit: pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  } catch (error) {
    console.error('Failed to fetch reports:', error);
    return res.status(500).json({ message: 'Failed to fetch reports' });
  }
});

reportRouter.get('/:reportId', async (req: Request, res: Response) => {
  const reportId = typeof req.params.reportId === 'string' ? req.params.reportId : null;

  if (!reportId || !isUuid(reportId)) {
    return res.status(400).json({ message: 'Invalid report id' });
  }

  try {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: reportInclude,
    });

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    return res.json(report);
  } catch (error) {
    console.error('Failed to fetch report:', error);
    return res.status(500).json({ message: 'Failed to fetch report' });
  }
});

reportRouter.post('/', async (req: Request, res: Response) => {
  const {
    reporterId,
    targetType: targetTypeInput,
    targetUserId,
    targetPostId,
    targetCommentId,
    targetMessageId,
    targetGroupId,
    targetAnnouncementId,
    reason: reasonInput,
    detail: detailInput,
  } = req.body;

  const targetType = parseReportTargetType(targetTypeInput);
  const reason = normalizeRequiredString(reasonInput);
  const detail = detailInput === undefined ? undefined : typeof detailInput === 'string' ? detailInput.trim() || null : undefined;

  if (typeof reporterId !== 'string' || !isUuid(reporterId)) {
    return res.status(400).json({ message: 'A valid reporterId is required' });
  }

  if (!targetType) {
    return res.status(400).json({ message: 'Invalid report target type' });
  }

  if (!reason) {
    return res.status(400).json({ message: 'reason is required' });
  }

  const targetFields = {
    USER: targetUserId,
    POST: targetPostId,
    COMMENT: targetCommentId,
    MESSAGE: targetMessageId,
    GROUP: targetGroupId,
    ANNOUNCEMENT: targetAnnouncementId,
  } as const;

  const targetId = targetFields[targetType];
  if (typeof targetId !== 'string' || !isUuid(targetId)) {
    return res.status(400).json({ message: `A valid target id is required for ${targetType}` });
  }

  const allOptionalTargets = [
    ['targetUserId', targetUserId],
    ['targetPostId', targetPostId],
    ['targetCommentId', targetCommentId],
    ['targetMessageId', targetMessageId],
    ['targetGroupId', targetGroupId],
    ['targetAnnouncementId', targetAnnouncementId],
  ] as const;

  for (const [fieldName, value] of allOptionalTargets) {
    if (value !== undefined && value !== null && (typeof value !== 'string' || !isUuid(value))) {
      return res.status(400).json({ message: `Invalid ${fieldName}` });
    }
  }

  try {
    const reporter = await prisma.user.findUnique({
      where: { id: reporterId },
      select: { id: true },
    });

    if (!reporter) {
      return res.status(404).json({ message: 'Reporter not found' });
    }

    const report = await prisma.report.create({
      data: {
        reporterId,
        targetType,
        targetUserId: targetType === ReportTargetType.USER ? targetUserId : null,
        targetPostId: targetType === ReportTargetType.POST ? targetPostId : null,
        targetCommentId: targetType === ReportTargetType.COMMENT ? targetCommentId : null,
        targetMessageId: targetType === ReportTargetType.MESSAGE ? targetMessageId : null,
        targetGroupId: targetType === ReportTargetType.GROUP ? targetGroupId : null,
        targetAnnouncementId: targetType === ReportTargetType.ANNOUNCEMENT ? targetAnnouncementId : null,
        reason,
        detail,
      },
      include: reportInclude,
    });

    return res.status(201).json(report);
  } catch (error) {
    if (isPrismaKnownError(error) && error.code === 'P2003') {
      return res.status(400).json({ message: 'Invalid relation data' });
    }

    console.error('Failed to create report:', error);
    return res.status(500).json({ message: 'Failed to create report' });
  }
});

reportRouter.patch('/:reportId/status', async (req: Request, res: Response) => {
  const reportId = typeof req.params.reportId === 'string' ? req.params.reportId : null;
  const { status: statusInput, handledById } = req.body;
  const status = parseReportStatus(statusInput);

  if (!reportId || !isUuid(reportId)) {
    return res.status(400).json({ message: 'Invalid report id' });
  }

  if (!status) {
    return res.status(400).json({ message: 'Invalid report status' });
  }

  if (handledById !== undefined && handledById !== null && (typeof handledById !== 'string' || !isUuid(handledById))) {
    return res.status(400).json({ message: 'Invalid handledById' });
  }

  try {
    if (handledById) {
      const handler = await prisma.user.findUnique({
        where: { id: handledById },
        select: { id: true },
      });

      if (!handler) {
        return res.status(404).json({ message: 'Handler not found' });
      }
    }

    const report = await prisma.report.update({
      where: { id: reportId },
      data: {
        status,
        handledById: handledById ?? null,
        handledAt: status === ReportStatus.OPEN ? null : new Date(),
      },
      include: reportInclude,
    });

    return res.json(report);
  } catch (error) {
    if (isPrismaKnownError(error) && error.code === 'P2025') {
      return res.status(404).json({ message: 'Report not found' });
    }

    console.error('Failed to update report status:', error);
    return res.status(500).json({ message: 'Failed to update report status' });
  }
});

reportRouter.post('/:reportId/actions', async (req: Request, res: Response) => {
  const reportId = typeof req.params.reportId === 'string' ? req.params.reportId : null;
  const { actorId, action: actionInput, note: noteInput } = req.body;
  const action = normalizeRequiredString(actionInput);
  const note = noteInput === undefined ? undefined : typeof noteInput === 'string' ? noteInput.trim() || null : undefined;

  if (!reportId || !isUuid(reportId)) {
    return res.status(400).json({ message: 'Invalid report id' });
  }

  if (typeof actorId !== 'string' || !isUuid(actorId)) {
    return res.status(400).json({ message: 'A valid actorId is required' });
  }

  if (!action) {
    return res.status(400).json({ message: 'action is required' });
  }

  try {
    const [report, actor] = await Promise.all([
      prisma.report.findUnique({
        where: { id: reportId },
        select: { id: true },
      }),
      prisma.user.findUnique({
        where: { id: actorId },
        select: { id: true },
      }),
    ]);

    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }

    if (!actor) {
      return res.status(404).json({ message: 'Actor not found' });
    }

    const reportAction = await prisma.reportAction.create({
      data: {
        reportId,
        actorId,
        action,
        note,
      },
      include: {
        actor: {
          select: userSelect,
        },
        report: {
          include: reportInclude,
        },
      },
    });

    return res.status(201).json(reportAction);
  } catch (error) {
    if (isPrismaKnownError(error) && error.code === 'P2003') {
      return res.status(400).json({ message: 'Invalid relation data' });
    }

    console.error('Failed to create report action:', error);
    return res.status(500).json({ message: 'Failed to create report action' });
  }
});

export { reportRouter };
