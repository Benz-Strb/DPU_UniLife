import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { Prisma, PostVisibility, ReactionType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { createNotification } from '../lib/notifications';
import { rankPostsWithGemini } from '../lib/gemini';
import { getCachedFeed, setCachedFeed } from '../lib/feedCache';

const postRouter = Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

const postAuthorSelect = {
  id: true,
  fullName: true,
  username: true,
  avatarUrl: true,
  role: true,
} as const;

const commentAuthorSelect = {
  id: true,
  fullName: true,
  avatarUrl: true,
  role: true,
} as const;

const groupSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  avatarUrl: true,
  coverUrl: true,
  isOfficial: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
} as const;

const postInclude = {
  author: {
    select: postAuthorSelect,
  },
  group: {
    select: groupSelect,
  },
  media: {
    orderBy: {
      sortOrder: 'asc' as const,
    },
  },
  tags: {
    include: {
      tag: true,
    },
  },
  reactions: true,
  comments: {
    where: {
      deletedAt: null,
      parentId: null,
    },
    include: {
      author: {
        select: commentAuthorSelect,
      },
    },
    orderBy: {
      createdAt: 'asc' as const,
    },
  },
  _count: {
    select: {
      comments: true,
      reactions: true,
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

const getSingleParam = (value: string | string[] | undefined): string | null => {
  return typeof value === 'string' ? value : null;
};

const parseBooleanInput = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    if (value === 'true') {
      return true;
    }

    if (value === 'false') {
      return false;
    }
  }

  return undefined;
};

const parsePostVisibility = (value: unknown): PostVisibility | null => {
  if (typeof value !== 'string') {
    return null;
  }

  if (value in PostVisibility) {
    return value as PostVisibility;
  }

  return null;
};

const parseReactionType = (value: unknown): ReactionType | null => {
  if (typeof value !== 'string') {
    return null;
  }

  if (value in ReactionType) {
    return value as ReactionType;
  }

  return null;
};

const parseTagNames = (value: unknown): string[] | null => {
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    return null;
  }

  const tagNames = value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0);

  return [...new Set(tagNames)];
};

const isPrismaKnownError = (error: unknown): error is Prisma.PrismaClientKnownRequestError => {
  return error instanceof Prisma.PrismaClientKnownRequestError;
};

postRouter.post('/upload', upload.single('image'), (req: Request & { file?: Express.Multer.File }, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const imageUrl = `/uploads/${req.file.filename}`;
  return res.json({ imageUrl });
});

postRouter.get('/', async (req: Request, res: Response) => {
  const page = parsePositiveInt(req.query.page);
  const limit = parsePositiveInt(req.query.limit);
  const authorId = normalizeOptionalString(req.query.authorId);
  const groupId = normalizeOptionalString(req.query.groupId);
  const facultyTag = normalizeOptionalString(req.query.facultyTag);
  const q = normalizeOptionalString(req.query.q);
  const visibilityQuery = req.query.visibility;
  const visibility = parsePostVisibility(visibilityQuery);
  const commentsEnabled = req.query.commentsEnabled === undefined
    ? undefined
    : parseBooleanInput(req.query.commentsEnabled);

  if (req.query.page !== undefined && !page) {
    return res.status(400).json({ error: 'page must be a positive integer' });
  }

  if (req.query.limit !== undefined && !limit) {
    return res.status(400).json({ error: 'limit must be a positive integer' });
  }

  if (authorId !== undefined && !isUuid(authorId)) {
    return res.status(400).json({ error: 'Invalid authorId' });
  }

  if (groupId !== undefined && !isUuid(groupId)) {
    return res.status(400).json({ error: 'Invalid groupId' });
  }

  if (visibilityQuery !== undefined && !visibility) {
    return res.status(400).json({ error: 'Invalid visibility' });
  }

  if (req.query.commentsEnabled !== undefined && commentsEnabled === undefined) {
    return res.status(400).json({ error: 'commentsEnabled must be true or false' });
  }

  const currentPage = page ?? 1;
  const pageSize = Math.min(limit ?? 20, 50);
  const skip = (currentPage - 1) * pageSize;

  const where: Prisma.PostWhereInput = {
    deletedAt: null,
    isArchived: false,
    authorId,
    groupId,
    facultyTag,
    visibility: visibility ?? undefined,
    commentsEnabled,
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { content: { contains: q, mode: 'insensitive' } },
            { facultyTag: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  try {
    const posts = await prisma.post.findMany({
      where,
      include: postInclude,
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' },
      ],
      skip,
      take: pageSize,
    });

    return res.json(posts);
  } catch (error) {
    console.error('Failed to fetch posts:', error);
    return res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

postRouter.get('/ai-feed', async (req: Request, res: Response) => {
  const userId = normalizeOptionalString(req.query.userId);

  if (!userId || !isUuid(userId)) {
    return res.status(400).json({ error: 'Invalid userId' });
  }

  // Return cached result if still fresh
  const cached = getCachedFeed(userId);
  if (cached) {
    return res.json(cached);
  }

  try {
    // Fetch user profile for personalization
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        faculty: true,
        following: { select: { followingId: true } },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Fetch 40 recent public posts as candidates
    const candidates = await prisma.post.findMany({
      where: {
        deletedAt: null,
        isArchived: false,
        visibility: 'PUBLIC',
      },
      include: postInclude,
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
      take: 40,
    });

    if (candidates.length === 0) {
      return res.json([]);
    }

    // Build compact summaries for Gemini
    const postSummaries = candidates.map(p => ({
      id: p.id,
      author: (p.author as any)?.fullName ?? 'Unknown',
      faculty: p.facultyTag ?? 'Unknown',
      content: (p.content ?? '').slice(0, 120),
      likes: (p._count as any)?.reactions ?? 0,
      comments: (p._count as any)?.comments ?? 0,
      age_hours: Math.round((Date.now() - new Date(p.createdAt).getTime()) / 3600000),
    }));

    const authorIds = Object.fromEntries(
      candidates.map(p => [p.id, (p.author as any)?.id ?? ''])
    );

    // Ask Gemini to rank
    const rankedIds = await rankPostsWithGemini({
      userFaculty: user.faculty ?? 'Unknown',
      followingIds: user.following.map(f => f.followingId),
      authorIds,
      posts: postSummaries,
    });

    // Reorder candidates by Gemini's ranking, return top 20
    const idOrder = new Map(rankedIds.map((id, i) => [id, i]));
    const ranked = [...candidates]
      .sort((a, b) => (idOrder.get(a.id) ?? 999) - (idOrder.get(b.id) ?? 999))
      .slice(0, 20);

    setCachedFeed(userId, ranked);
    return res.json(ranked);
  } catch (error) {
    console.error('[AI Feed] Error:', error);
    return res.status(500).json({ error: 'Failed to generate AI feed' });
  }
});

postRouter.get('/:id', async (req: Request, res: Response) => {
  const postId = getSingleParam(req.params.id);

  if (!postId || !isUuid(postId)) {
    return res.status(400).json({ error: 'Invalid post id' });
  }

  try {
    const post = await prisma.post.findFirst({
      where: {
        id: postId,
        deletedAt: null,
      },
      include: postInclude,
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    return res.json(post);
  } catch (error) {
    console.error('Failed to fetch post:', error);
    return res.status(500).json({ error: 'Failed to fetch post' });
  }
});

postRouter.post('/', async (req: Request, res: Response) => {
  const {
    authorId,
    groupId,
    title: titleInput,
    content: contentInput,
    image,
    visibility: visibilityInput,
    commentsEnabled: commentsEnabledInput,
    tags: tagsInput,
    facultyTag: facultyTagInput,
    isOfficial: isOfficialInput,
  } = req.body;

  const title = normalizeOptionalString(titleInput);
  const content = normalizeOptionalString(contentInput);
  const imageUrl = normalizeOptionalString(image);
  const facultyTag = normalizeOptionalString(facultyTagInput);
  const isOfficial = parseBooleanInput(isOfficialInput) ?? false;
  const tagNames = parseTagNames(tagsInput);

  if (typeof authorId !== 'string' || !isUuid(authorId)) {
    return res.status(400).json({ error: 'A valid authorId is required' });
  }

  if (groupId !== undefined && groupId !== null && (typeof groupId !== 'string' || !isUuid(groupId))) {
    return res.status(400).json({ error: 'Invalid groupId' });
  }

  // Support both single `image` and multiple `images` array
  const rawImages = req.body.images;
  const imageUrls: string[] = Array.isArray(rawImages)
    ? rawImages.map((u: unknown) => normalizeOptionalString(u)).filter((u): u is string => !!u)
    : imageUrl
      ? [imageUrl]
      : [];

  if (!title && !content && imageUrls.length === 0) {
    return res.status(400).json({ error: 'Post must include title, content, or image' });
  }

  const visibility = visibilityInput === undefined ? PostVisibility.PUBLIC : parsePostVisibility(visibilityInput);
  if (!visibility) {
    return res.status(400).json({ error: 'Invalid visibility' });
  }

  const commentsEnabled = commentsEnabledInput === undefined ? true : parseBooleanInput(commentsEnabledInput);
  if (commentsEnabled === undefined) {
    return res.status(400).json({ error: 'commentsEnabled must be true or false' });
  }

  if (tagNames === null) {
    return res.status(400).json({ error: 'tags must be an array of strings' });
  }

  try {
    const [author, group] = await Promise.all([
      prisma.user.findUnique({
        where: { id: authorId },
        select: { id: true, bannedUntil: true },
      }),
      groupId
        ? prisma.group.findFirst({
            where: {
              id: groupId,
              deletedAt: null,
            },
            select: { id: true },
          })
        : Promise.resolve(null),
    ]);

    if (!author) {
      return res.status(404).json({ error: 'Author not found' });
    }

    if (author.bannedUntil && new Date(author.bannedUntil) > new Date()) {
      return res.status(403).json({ error: 'Your account is temporarily banned', bannedUntil: author.bannedUntil });
    }

    if (groupId && !group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const post = await prisma.post.create({
      data: {
        authorId,
        groupId: groupId ?? null,
        title,
        content,
        facultyTag,
        isOfficial,
        visibility,
        commentsEnabled,
        media: imageUrls.length
          ? {
              create: imageUrls.map((url, idx) => ({
                url,
                mediaType: 'IMAGE' as const,
                sortOrder: idx,
              })),
            }
          : undefined,
        tags: tagNames.length
          ? {
              create: tagNames.map((tagName) => ({
                tag: {
                  connectOrCreate: {
                    where: { name: tagName },
                    create: { name: tagName },
                  },
                },
              })),
            }
          : undefined,
      },
      include: postInclude,
    });

    return res.status(201).json(post);
  } catch (error) {
    if (isPrismaKnownError(error) && error.code === 'P2003') {
      return res.status(400).json({ error: 'Invalid relation data' });
    }

    console.error('Failed to create post:', error);
    return res.status(500).json({ error: 'Failed to create post' });
  }
});

postRouter.patch('/:id', async (req: Request, res: Response) => {
  const postId = getSingleParam(req.params.id);
  const {
    groupId,
    title: titleInput,
    content: contentInput,
    visibility: visibilityInput,
    commentsEnabled: commentsEnabledInput,
    isPinned: isPinnedInput,
    isArchived: isArchivedInput,
    tags: tagsInput,
    image,
  } = req.body;

  if (!postId || !isUuid(postId)) {
    return res.status(400).json({ error: 'Invalid post id' });
  }

  if (groupId !== undefined && groupId !== null && (typeof groupId !== 'string' || !isUuid(groupId))) {
    return res.status(400).json({ error: 'Invalid groupId' });
  }

  const title = titleInput === undefined ? undefined : normalizeOptionalString(titleInput);
  const content = contentInput === undefined ? undefined : normalizeOptionalString(contentInput);
  const imageUrl = image === undefined ? undefined : normalizeOptionalString(image);
  const visibility = visibilityInput === undefined ? undefined : parsePostVisibility(visibilityInput);
  const commentsEnabled = commentsEnabledInput === undefined ? undefined : parseBooleanInput(commentsEnabledInput);
  const isPinned = isPinnedInput === undefined ? undefined : parseBooleanInput(isPinnedInput);
  const isArchived = isArchivedInput === undefined ? undefined : parseBooleanInput(isArchivedInput);
  const tagNames = tagsInput === undefined ? undefined : parseTagNames(tagsInput);

  if (titleInput !== undefined && title === undefined) {
    return res.status(400).json({ error: 'title cannot be empty' });
  }

  if (contentInput !== undefined && content === undefined) {
    return res.status(400).json({ error: 'content cannot be empty' });
  }

  if (visibilityInput !== undefined && !visibility) {
    return res.status(400).json({ error: 'Invalid visibility' });
  }

  if (commentsEnabledInput !== undefined && commentsEnabled === undefined) {
    return res.status(400).json({ error: 'commentsEnabled must be true or false' });
  }

  if (isPinnedInput !== undefined && isPinned === undefined) {
    return res.status(400).json({ error: 'isPinned must be true or false' });
  }

  if (isArchivedInput !== undefined && isArchived === undefined) {
    return res.status(400).json({ error: 'isArchived must be true or false' });
  }

  if (tagNames === null) {
    return res.status(400).json({ error: 'tags must be an array of strings' });
  }

  try {
    const existingPost = await prisma.post.findFirst({
      where: {
        id: postId,
        deletedAt: null,
      },
      include: {
        tags: true,
        media: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
    });

    if (!existingPost) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (groupId) {
      const group = await prisma.group.findFirst({
        where: {
          id: groupId,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (!group) {
        return res.status(404).json({ error: 'Group not found' });
      }
    }

    const mediaOperation =
      image === undefined
        ? undefined
        : imageUrl
          ? {
              deleteMany: {},
              create: {
                url: imageUrl,
                mediaType: 'IMAGE' as const,
              },
            }
          : {
              deleteMany: {},
            };

    const tagsOperation = tagNames === undefined
      ? undefined
      : {
          deleteMany: {},
          ...(tagNames.length
            ? {
                create: tagNames.map((tagName) => ({
                  tag: {
                    connectOrCreate: {
                      where: { name: tagName },
                      create: { name: tagName },
                    },
                  },
                })),
              }
            : {}),
        };

    const updatedPost = await prisma.post.update({
      where: {
        id: postId,
      },
      data: {
        groupId: groupId === null ? null : groupId ?? undefined,
        title,
        content,
        visibility: visibility ?? undefined,
        commentsEnabled,
        isPinned,
        isArchived,
        media: mediaOperation,
        tags: tagsOperation,
      },
      include: postInclude,
    });

    return res.json(updatedPost);
  } catch (error) {
    if (isPrismaKnownError(error) && error.code === 'P2025') {
      return res.status(404).json({ error: 'Post not found' });
    }

    console.error('Failed to update post:', error);
    return res.status(500).json({ error: 'Failed to update post' });
  }
});

postRouter.post('/:id/like', async (req: Request, res: Response) => {
  const postId = getSingleParam(req.params.id);
  const { userId, reaction: reactionInput } = req.body;

  if (!postId || !isUuid(postId)) {
    return res.status(400).json({ error: 'Invalid post id' });
  }

  if (typeof userId !== 'string' || !isUuid(userId)) {
    return res.status(400).json({ error: 'A valid userId is required' });
  }

  const reaction = reactionInput === undefined ? ReactionType.LIKE : parseReactionType(reactionInput);
  if (!reaction) {
    return res.status(400).json({ error: 'Invalid reaction type' });
  }

  try {
    const [post, user, existingReaction] = await Promise.all([
      prisma.post.findFirst({
        where: {
          id: postId,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      }),
      prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          id: true,
        },
      }),
      prisma.postReaction.findUnique({
        where: {
          postId_userId: { postId, userId },
        },
      }),
    ]);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (existingReaction) {
      if (existingReaction.reaction === reaction) {
        await prisma.postReaction.delete({
          where: {
            postId_userId: { postId, userId },
          },
        });

        return res.json({ message: 'Reaction removed', reaction: null });
      }

      const updatedReaction = await prisma.postReaction.update({
        where: {
          postId_userId: { postId, userId },
        },
        data: {
          reaction,
        },
      });

      return res.json({ message: 'Reaction updated', reaction: updatedReaction });
    }

    const createdReaction = await prisma.postReaction.create({
      data: { postId, userId, reaction },
    });

    // แจ้งเตือนเจ้าของโพสต์ (ถ้าไม่ใช่คนไลค์เอง)
    const postOwner = await prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true }
    });

    if (postOwner && postOwner.authorId !== userId) {
      const sender = await prisma.user.findUnique({ where: { id: userId }, select: { fullName: true } });
      await createNotification({
        receiverId: postOwner.authorId,
        senderId: userId,
        type: "LIKE",
        title: "New Reaction",
        body: `${sender?.fullName || 'Someone'} liked your post`,
        refPostId: postId
      }).catch(err => console.error("Notification Error:", err));
    }

    return res.json({ message: 'Reaction added', reaction: createdReaction });
  } catch (error) {
    console.error('Failed to toggle reaction:', error);
    return res.status(500).json({ error: 'Failed to toggle reaction' });
  }
});

postRouter.post('/:id/comments', async (req: Request, res: Response) => {
  const postId = getSingleParam(req.params.id);
  const { authorId, content: contentInput, parentId } = req.body;
  const content = normalizeRequiredString(contentInput);

  if (!postId || !isUuid(postId)) {
    return res.status(400).json({ error: 'Invalid post id' });
  }

  if (typeof authorId !== 'string' || !isUuid(authorId)) {
    return res.status(400).json({ error: 'A valid authorId is required' });
  }

  if (!content) {
    return res.status(400).json({ error: 'content is required' });
  }

  if (parentId !== undefined && parentId !== null && (typeof parentId !== 'string' || !isUuid(parentId))) {
    return res.status(400).json({ error: 'Invalid parentId' });
  }

  try {
    const [post, author, parentComment] = await Promise.all([
      prisma.post.findFirst({
        where: {
          id: postId,
          deletedAt: null,
        },
        select: {
          id: true,
          commentsEnabled: true,
        },
      }),
      prisma.user.findUnique({
        where: {
          id: authorId,
        },
        select: {
          id: true,
        },
      }),
      parentId
        ? prisma.comment.findFirst({
            where: {
              id: parentId,
              postId,
              deletedAt: null,
            },
            select: {
              id: true,
            },
          })
        : Promise.resolve(null),
    ]);

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (!post.commentsEnabled) {
      return res.status(400).json({ error: 'Comments are disabled for this post' });
    }

    if (!author) {
      return res.status(404).json({ error: 'Author not found' });
    }

    if (parentId && !parentComment) {
      return res.status(404).json({ error: 'Parent comment not found' });
    }

    const comment = await prisma.comment.create({
      data: {
        postId,
        authorId,
        content,
        parentId: parentId ?? null,
      },
      include: {
        author: {
          select: commentAuthorSelect,
        },
      },
    });

    // แจ้งเตือนเจ้าของโพสต์
    const postOwner = await prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true }
    });

    if (postOwner && postOwner.authorId !== authorId) {
      await createNotification({
        receiverId: postOwner.authorId,
        senderId: authorId,
        type: "COMMENT",
        title: "New Comment",
        body: `${comment.author.fullName} commented on your post`,
        refPostId: postId,
        refCommentId: comment.id
      }).catch(err => console.error("Notification Error:", err));
    }

    return res.status(201).json(comment);
  } catch (error) {
    console.error('Failed to add comment:', error);
    return res.status(500).json({ error: 'Failed to add comment' });
  }
});

postRouter.post('/:id/share', async (req: Request, res: Response) => {
  const postId = getSingleParam(req.params.id);
  const { userId, sharedToText } = req.body;

  if (!postId || !isUuid(postId)) {
    return res.status(400).json({ error: 'Invalid post id' });
  }

  if (typeof userId !== 'string' || !isUuid(userId)) {
    return res.status(400).json({ error: 'A valid userId is required' });
  }

  try {
    const post = await prisma.post.findFirst({
      where: { id: postId, deletedAt: null },
      select: { id: true, authorId: true },
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const share = await prisma.postShare.create({
      data: {
        postId,
        sharedById: userId,
        originalAuthorId: post.authorId,
        sharedToText: typeof sharedToText === 'string' ? sharedToText.trim() || null : null,
      },
    });

    if (post.authorId !== userId) {
      await createNotification({
        receiverId: post.authorId,
        senderId: userId,
        type: 'SHARE',
        title: 'New Share',
        body: `${user.fullName} shared your post`,
        refPostId: postId,
      }).catch((err) => console.error('Notification Error:', err));
    }

    return res.status(201).json(share);
  } catch (error) {
    console.error('Failed to share post:', error);
    return res.status(500).json({ error: 'Failed to share post' });
  }
});

postRouter.delete('/:id/share', async (req: Request, res: Response) => {
  const postId = getSingleParam(req.params.id);
  const userId = getSingleParam(req.query.userId as string);

  if (!postId || !isUuid(postId)) return res.status(400).json({ error: 'Invalid post id' });
  if (!userId || !isUuid(userId)) return res.status(400).json({ error: 'A valid userId is required' });

  try {
    await prisma.postShare.deleteMany({ where: { postId, sharedById: userId } });
    return res.json({ success: true });
  } catch (error) {
    console.error('Failed to unrepost:', error);
    return res.status(500).json({ error: 'Failed to unrepost' });
  }
});

postRouter.delete('/:id/comments/:commentId', async (req: Request, res: Response) => {
  const postId = getSingleParam(req.params.id);
  const commentId = getSingleParam(req.params.commentId);
  const { userId } = req.body;

  if (!postId || !isUuid(postId)) {
    return res.status(400).json({ error: 'Invalid post id' });
  }

  if (!commentId || !isUuid(commentId)) {
    return res.status(400).json({ error: 'Invalid comment id' });
  }

  if (typeof userId !== 'string' || !isUuid(userId)) {
    return res.status(400).json({ error: 'A valid userId is required' });
  }

  try {
    const comment = await prisma.comment.findFirst({
      where: { id: commentId, postId, deletedAt: null },
      select: { id: true, authorId: true },
    });

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const requestingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    const isOwner = comment.authorId === userId;
    const isAdmin = requestingUser?.role === 'ADMIN' || requestingUser?.role === 'SUPER_ADMIN';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Not authorized to delete this comment' });
    }

    await prisma.comment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    });

    return res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Failed to delete comment:', error);
    return res.status(500).json({ error: 'Failed to delete comment' });
  }
});

postRouter.delete('/:id', async (req: Request, res: Response) => {
  const postId = getSingleParam(req.params.id);

  if (!postId || !isUuid(postId)) {
    return res.status(400).json({ error: 'Invalid post id' });
  }

  try {
    const existingPost = await prisma.post.findFirst({
      where: {
        id: postId,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!existingPost) {
      return res.status(404).json({ error: 'Post not found' });
    }

    await prisma.post.update({
      where: {
        id: postId,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    return res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    if (isPrismaKnownError(error) && error.code === 'P2025') {
      return res.status(404).json({ error: 'Post not found' });
    }

    console.error('Failed to delete post:', error);
    return res.status(500).json({ error: 'Failed to delete post' });
  }
});

export { postRouter };