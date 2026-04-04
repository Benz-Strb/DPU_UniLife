import { Router, Request, Response } from 'express';
import { Prisma, GroupMemberRole } from '@prisma/client';
import { prisma } from '../lib/prisma';

const groupRouter = Router();

const userSelect = {
  id: true,
  fullName: true,
  avatarUrl: true,
  role: true,
} as const;

const groupInclude = {
  createdBy: {
    select: userSelect,
  },
  members: {
    include: {
      user: {
        select: userSelect,
      },
    },
    orderBy: {
      joinedAt: 'asc' as const,
    },
  },
  _count: {
    select: {
      members: true,
      posts: true,
      conversations: true,
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

const slugify = (value: string): string => {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
};

const parseBooleanInput = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    if (value === 'true') return true;
    if (value === 'false') return false;
  }

  return undefined;
};

const parseGroupMemberRole = (value: unknown): GroupMemberRole | null => {
  if (typeof value !== 'string') {
    return null;
  }

  if (value in GroupMemberRole) {
    return value as GroupMemberRole;
  }

  return null;
};

const isPrismaKnownError = (error: unknown): error is Prisma.PrismaClientKnownRequestError => {
  return error instanceof Prisma.PrismaClientKnownRequestError;
};

groupRouter.get('/', async (req: Request, res: Response) => {
  const page = parsePositiveInt(req.query.page);
  const limit = parsePositiveInt(req.query.limit);
  const q = normalizeOptionalString(req.query.q);
  const createdById = normalizeOptionalString(req.query.createdById);
  const isOfficialQuery = req.query.isOfficial;
  const isOfficial = isOfficialQuery === undefined ? undefined : parseBooleanInput(isOfficialQuery);

  if (req.query.page !== undefined && !page) {
    return res.status(400).json({ message: 'page must be a positive integer' });
  }

  if (req.query.limit !== undefined && !limit) {
    return res.status(400).json({ message: 'limit must be a positive integer' });
  }

  if (createdById !== undefined && !isUuid(createdById)) {
    return res.status(400).json({ message: 'Invalid createdById' });
  }

  if (isOfficialQuery !== undefined && isOfficial === undefined) {
    return res.status(400).json({ message: 'isOfficial must be true or false' });
  }

  const currentPage = page ?? 1;
  const pageSize = Math.min(limit ?? 20, 50);
  const skip = (currentPage - 1) * pageSize;

  const where: Prisma.GroupWhereInput = {
    deletedAt: null,
    createdById,
    isOfficial,
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { slug: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  try {
    const [groups, total] = await Promise.all([
      prisma.group.findMany({
        where,
        include: groupInclude,
        orderBy: [{ isOfficial: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: pageSize,
      }),
      prisma.group.count({ where }),
    ]);

    return res.json({
      data: groups,
      pagination: {
        page: currentPage,
        limit: pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  } catch (error) {
    console.error('Failed to fetch groups:', error);
    return res.status(500).json({ message: 'Failed to fetch groups' });
  }
});

groupRouter.get('/:groupId', async (req: Request, res: Response) => {
  const groupId = typeof req.params.groupId === 'string' ? req.params.groupId : null;

  if (!groupId || !isUuid(groupId)) {
    return res.status(400).json({ message: 'Invalid group id' });
  }

  try {
    const group = await prisma.group.findFirst({
      where: {
        id: groupId,
        deletedAt: null,
      },
      include: groupInclude,
    });

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    return res.json(group);
  } catch (error) {
    console.error('Failed to fetch group:', error);
    return res.status(500).json({ message: 'Failed to fetch group' });
  }
});

groupRouter.get('/:groupId/members', async (req: Request, res: Response) => {
  const groupId = typeof req.params.groupId === 'string' ? req.params.groupId : null;

  if (!groupId || !isUuid(groupId)) {
    return res.status(400).json({ message: 'Invalid group id' });
  }

  try {
    const group = await prisma.group.findFirst({
      where: {
        id: groupId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const members = await prisma.groupMember.findMany({
      where: {
        groupId,
      },
      include: {
        user: {
          select: userSelect,
        },
      },
      orderBy: {
        joinedAt: 'asc',
      },
    });

    return res.json(members);
  } catch (error) {
    console.error('Failed to fetch group members:', error);
    return res.status(500).json({ message: 'Failed to fetch group members' });
  }
});

groupRouter.post('/', async (req: Request, res: Response) => {
  const {
    name: nameInput,
    slug: slugInput,
    description: descriptionInput,
    avatarUrl: avatarUrlInput,
    coverUrl: coverUrlInput,
    isOfficial: isOfficialInput,
    createdById,
  } = req.body;

  const name = normalizeRequiredString(nameInput);
  const slug = normalizeOptionalString(slugInput);
  const description = descriptionInput === undefined ? undefined : typeof descriptionInput === 'string' ? descriptionInput.trim() || null : undefined;
  const avatarUrl = avatarUrlInput === undefined ? undefined : typeof avatarUrlInput === 'string' ? avatarUrlInput.trim() || null : undefined;
  const coverUrl = coverUrlInput === undefined ? undefined : typeof coverUrlInput === 'string' ? coverUrlInput.trim() || null : undefined;
  const isOfficial = isOfficialInput === undefined ? false : parseBooleanInput(isOfficialInput);

  if (!name) {
    return res.status(400).json({ message: 'name is required' });
  }

  if (typeof createdById !== 'string' || !isUuid(createdById)) {
    return res.status(400).json({ message: 'A valid createdById is required' });
  }

  if (isOfficial === undefined) {
    return res.status(400).json({ message: 'isOfficial must be true or false' });
  }

  const finalSlug = slug ?? slugify(name);
  if (!finalSlug) {
    return res.status(400).json({ message: 'Unable to generate a valid slug' });
  }

  try {
    const creator = await prisma.user.findUnique({
      where: { id: createdById },
      select: { id: true },
    });

    if (!creator) {
      return res.status(404).json({ message: 'Creator not found' });
    }

    const group = await prisma.group.create({
      data: {
        name,
        slug: finalSlug,
        description,
        avatarUrl,
        coverUrl,
        isOfficial,
        createdById,
        members: {
          create: {
            userId: createdById,
            role: GroupMemberRole.OWNER,
          },
        },
      },
      include: groupInclude,
    });

    return res.status(201).json(group);
  } catch (error) {
    if (isPrismaKnownError(error) && error.code === 'P2002') {
      return res.status(409).json({ message: 'Group slug already exists' });
    }

    if (isPrismaKnownError(error) && error.code === 'P2003') {
      return res.status(400).json({ message: 'Invalid relation data' });
    }

    console.error('Failed to create group:', error);
    return res.status(500).json({ message: 'Failed to create group' });
  }
});

groupRouter.patch('/:groupId', async (req: Request, res: Response) => {
  const groupId = typeof req.params.groupId === 'string' ? req.params.groupId : null;
  const {
    name: nameInput,
    slug: slugInput,
    description: descriptionInput,
    avatarUrl: avatarUrlInput,
    coverUrl: coverUrlInput,
    isOfficial: isOfficialInput,
  } = req.body;

  if (!groupId || !isUuid(groupId)) {
    return res.status(400).json({ message: 'Invalid group id' });
  }

  const name = nameInput === undefined ? undefined : normalizeRequiredString(nameInput);
  const slug = slugInput === undefined ? undefined : normalizeRequiredString(slugInput);
  const description = descriptionInput === undefined ? undefined : typeof descriptionInput === 'string' ? descriptionInput.trim() || null : undefined;
  const avatarUrl = avatarUrlInput === undefined ? undefined : typeof avatarUrlInput === 'string' ? avatarUrlInput.trim() || null : undefined;
  const coverUrl = coverUrlInput === undefined ? undefined : typeof coverUrlInput === 'string' ? coverUrlInput.trim() || null : undefined;
  const isOfficial = isOfficialInput === undefined ? undefined : parseBooleanInput(isOfficialInput);

  if (nameInput !== undefined && !name) {
    return res.status(400).json({ message: 'name cannot be empty' });
  }

  if (slugInput !== undefined && !slug) {
    return res.status(400).json({ message: 'slug cannot be empty' });
  }

  if (isOfficialInput !== undefined && isOfficial === undefined) {
    return res.status(400).json({ message: 'isOfficial must be true or false' });
  }

  try {
    const existingGroup = await prisma.group.findFirst({
      where: {
        id: groupId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!existingGroup) {
      return res.status(404).json({ message: 'Group not found' });
    }

    const group = await prisma.group.update({
      where: { id: groupId },
      data: {
        name: name ?? undefined,
        slug: slug ?? undefined,
        description,
        avatarUrl,
        coverUrl,
        isOfficial,
      },
      include: groupInclude,
    });

    return res.json(group);
  } catch (error) {
    if (isPrismaKnownError(error) && error.code === 'P2002') {
      return res.status(409).json({ message: 'Group slug already exists' });
    }

    if (isPrismaKnownError(error) && error.code === 'P2025') {
      return res.status(404).json({ message: 'Group not found' });
    }

    console.error('Failed to update group:', error);
    return res.status(500).json({ message: 'Failed to update group' });
  }
});

groupRouter.post('/:groupId/join', async (req: Request, res: Response) => {
  const groupId = typeof req.params.groupId === 'string' ? req.params.groupId : null;
  const { userId, role: roleInput } = req.body;
  const role = roleInput === undefined ? GroupMemberRole.MEMBER : parseGroupMemberRole(roleInput);

  if (!groupId || !isUuid(groupId)) {
    return res.status(400).json({ message: 'Invalid group id' });
  }

  if (typeof userId !== 'string' || !isUuid(userId)) {
    return res.status(400).json({ message: 'A valid userId is required' });
  }

  if (!role) {
    return res.status(400).json({ message: 'Invalid member role' });
  }

  try {
    const [group, user] = await Promise.all([
      prisma.group.findFirst({
        where: {
          id: groupId,
          deletedAt: null,
        },
        select: { id: true },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      }),
    ]);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const member = await prisma.groupMember.upsert({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
      update: {
        role,
      },
      create: {
        groupId,
        userId,
        role,
      },
      include: {
        user: {
          select: userSelect,
        },
      },
    });

    return res.json(member);
  } catch (error) {
    console.error('Failed to join group:', error);
    return res.status(500).json({ message: 'Failed to join group' });
  }
});

groupRouter.delete('/:groupId/members/:userId', async (req: Request, res: Response) => {
  const groupId = typeof req.params.groupId === 'string' ? req.params.groupId : null;
  const userId = typeof req.params.userId === 'string' ? req.params.userId : null;

  if (!groupId || !isUuid(groupId)) {
    return res.status(400).json({ message: 'Invalid group id' });
  }

  if (!userId || !isUuid(userId)) {
    return res.status(400).json({ message: 'Invalid user id' });
  }

  try {
    const member = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    });

    if (!member) {
      return res.status(404).json({ message: 'Group member not found' });
    }

    if (member.role === GroupMemberRole.OWNER) {
      return res.status(400).json({ message: 'Group owner cannot leave or be removed with this endpoint' });
    }

    await prisma.groupMember.delete({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    });

    return res.json({ message: 'Member removed from group successfully' });
  } catch (error) {
    console.error('Failed to remove group member:', error);
    return res.status(500).json({ message: 'Failed to remove group member' });
  }
});

groupRouter.delete('/:groupId', async (req: Request, res: Response) => {
  const groupId = typeof req.params.groupId === 'string' ? req.params.groupId : null;

  if (!groupId || !isUuid(groupId)) {
    return res.status(400).json({ message: 'Invalid group id' });
  }

  try {
    const existingGroup = await prisma.group.findFirst({
      where: {
        id: groupId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!existingGroup) {
      return res.status(404).json({ message: 'Group not found' });
    }

    await prisma.group.update({
      where: { id: groupId },
      data: {
        deletedAt: new Date(),
      },
    });

    return res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    if (isPrismaKnownError(error) && error.code === 'P2025') {
      return res.status(404).json({ message: 'Group not found' });
    }

    console.error('Failed to delete group:', error);
    return res.status(500).json({ message: 'Failed to delete group' });
  }
});

export { groupRouter };
