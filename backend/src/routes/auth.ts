import { Router, Request, Response } from 'express';
import { Prisma, Gender, LoginStatus, UserRole, UserStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { hashPassword, verifyPassword } from '../password';

const authRouter = Router();

const safeUserSelect = {
  id: true,
  email: true,
  username: true,
  studentId: true,
  fullName: true,
  bio: true,
  avatarUrl: true,
  coverUrl: true,
  birthDate: true,
  gender: true,
  role: true,
  faculty: true,
  status: true,
  bannedUntil: true,
  isVerified: true,
  verifiedAt: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

const dpuEmailRegex = /^(\d{8}|admin)@dpu\.ac\.th$/i;
const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
const fullNameRegex = /^[A-Za-z0-9_\s\u0E00-\u0E7F.]+$/;

const isUuid = (value: string): boolean => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
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

const parseGender = (value: unknown): Gender | null => {
  if (typeof value !== 'string') {
    return null;
  }

  if (value in Gender) {
    return value as Gender;
  }

  return null;
};

const parseBirthDate = (value: unknown): Date | null => {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const isPrismaKnownError = (error: unknown): error is Prisma.PrismaClientKnownRequestError => {
  return error instanceof Prisma.PrismaClientKnownRequestError;
};

const logLoginAttempt = async ({
  userId,
  emailInput,
  status,
  reason,
  ipAddress,
  userAgent,
}: {
  userId?: string;
  emailInput?: string;
  status: LoginStatus;
  reason?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}) => {
  try {
    await prisma.loginLog.create({
      data: {
        userId,
        emailInput,
        status,
        reason,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      },
    });
  } catch (error) {
    console.error('Failed to create login log:', error);
  }
};

authRouter.post('/register', async (req: Request, res: Response) => {
  const { email: emailInput, fullName: fullNameInput, username: usernameInput, password, faculty: facultyInput } = req.body;

  const email = normalizeRequiredString(emailInput)?.toLowerCase();
  const fullName = normalizeRequiredString(fullNameInput);
  const username = normalizeRequiredString(usernameInput)?.toLowerCase().replace(/\s+/g, '_');
  const faculty = typeof facultyInput === 'string' ? facultyInput.trim() : null;

  if (!email || !fullName || !username || typeof password !== 'string') {
    return res.status(400).json({
      message: 'email, fullName, username and password are required',
    });
  }

  if (!dpuEmailRegex.test(email)) {
    return res.status(400).json({
      message: 'Email must be in the format 12345678@dpu.ac.th or admin@dpu.ac.th',
    });
  }

  if (!fullNameRegex.test(fullName)) {
    return res.status(400).json({
      message: 'Full name must be in English only',
    });
  }

  if (!usernameRegex.test(username)) {
    return res.status(400).json({
      message: 'Username must be 3-30 characters and use only letters, numbers, or underscores',
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      message: 'Password must be at least 6 characters long',
    });
  }

  const isSuperAdmin = email === 'admin@dpu.ac.th';
  const studentId = isSuperAdmin ? '00000000' : email.slice(0, 8);
  
  // [ROLE_MAP] กำหนดสิทธิ์อัตโนมัติ (รหัส 1111 = แอดมินคณะ)
  const isFacultyAdmin = !isSuperAdmin && studentId.startsWith('1111');

  try {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { studentId }, { username }],
      },
      select: {
        id: true,
      },
    });

    if (existingUser) {
      return res.status(409).json({
        message: 'This DPU account is already registered',
      });
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        fullName,
        studentId,
        username,
        passwordHash,
        faculty,
        role: isSuperAdmin ? UserRole.SUPER_ADMIN : (isFacultyAdmin ? UserRole.ADMIN : UserRole.STUDENT),
        status: UserStatus.ACTIVE,
      },
      select: safeUserSelect,
    });

    return res.status(201).json({
      message: 'User registered successfully',
      user,
    });
  } catch (error) {
    if (isPrismaKnownError(error) && error.code === 'P2002') {
      return res.status(409).json({
        message: 'This DPU account is already registered',
      });
    }

    console.error('Failed to register user:', error);
    return res.status(500).json({
      message: 'Failed to register user',
    });
  }
});

authRouter.post('/login', async (req: Request, res: Response) => {
  const { studentId: studentIdInput, password } = req.body;
  const ipAddress = req.ip;
  const userAgent = req.get('user-agent') || null;
  const studentId = normalizeRequiredString(studentIdInput);

  if (!studentId || typeof password !== 'string') {
    return res.status(400).json({
      message: 'studentId and password are required',
    });
  }

  try {
    // Support login with studentId OR email
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { studentId },
          { email: studentId.includes('@') ? studentId : `${studentId}@dpu.ac.th` }
        ]
      },
      select: {
        ...safeUserSelect,
        passwordHash: true,
      },
    });

    if (!user || !user.passwordHash) {
      await logLoginAttempt({
        emailInput: studentId,
        status: LoginStatus.FAILED,
        reason: 'User not found',
        ipAddress,
        userAgent,
      });

      return res.status(401).json({
        message: 'Invalid studentId or password',
      });
    }

    if (user.status === UserStatus.SUSPENDED || user.status === UserStatus.DEACTIVATED) {
      await logLoginAttempt({
        userId: user.id,
        emailInput: studentId,
        status: LoginStatus.LOCKED,
        reason: `User status is ${user.status}`,
        ipAddress,
        userAgent,
      });

      return res.status(403).json({
        message: 'This account is not allowed to sign in',
      });
    }

    if (user.bannedUntil && new Date(user.bannedUntil) > new Date()) {
      await logLoginAttempt({
        userId: user.id,
        emailInput: studentId,
        status: LoginStatus.LOCKED,
        reason: `User is banned until ${user.bannedUntil}`,
        ipAddress,
        userAgent,
      });

      return res.status(403).json({
        message: 'Your account has been temporarily banned',
        bannedUntil: user.bannedUntil,
      });
    }

    const isPasswordCorrect = await verifyPassword(password, user.passwordHash);

    if (!isPasswordCorrect) {
      await logLoginAttempt({
        userId: user.id,
        emailInput: studentId,
        status: LoginStatus.FAILED,
        reason: 'Incorrect password',
        ipAddress,
        userAgent,
      });

      return res.status(401).json({
        message: 'Invalid studentId or password',
      });
    }

    const { passwordHash: _passwordHash, ...safeUser } = user;

    await Promise.all([
      prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
        },
      }),
      logLoginAttempt({
        userId: user.id,
        emailInput: studentId,
        status: LoginStatus.SUCCESS,
        ipAddress,
        userAgent,
      }),
    ]);

    return res.status(200).json({
      message: 'Login successful',
      user: {
        ...safeUser,
        lastLoginAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Failed to log in:', error);
    return res.status(500).json({
      message: 'Failed to log in',
    });
  }
});

authRouter.get('/profile/:userId', async (req: Request, res: Response) => {
  const userId = typeof req.params.userId === 'string' ? req.params.userId : null;

  if (!userId || !isUuid(userId)) {
    return res.status(400).json({
      message: 'Invalid user id',
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        ...safeUserSelect,
        authoredPosts: {
          where: {
            deletedAt: null,
          },
          include: {
            media: true,
            reactions: true,
            comments: {
              include: {
                author: {
                  select: {
                    fullName: true,
                    avatarUrl: true
                  }
                }
              }
            },
            _count: {
              select: {
                reactions: true,
                comments: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        postShares: {
          include: {
            post: {
              include: {
                media: true,
                author: {
                  select: { id: true, fullName: true, avatarUrl: true, username: true }
                },
                _count: {
                  select: { reactions: true, comments: true }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: {
            followers: true,
            following: true,
            authoredPosts: true
          }
        }
      },
    });

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    return res.json(user);
  } catch (error) {
    console.error('Failed to fetch profile:', error);
    return res.status(500).json({
      message: 'Failed to fetch profile',
    });
  }
});

authRouter.patch('/profile/:userId', async (req: Request, res: Response) => {
  const userId = typeof req.params.userId === 'string' ? req.params.userId : null;
  const {
    fullName: fullNameInput,
    username: usernameInput,
    bio: bioInput,
    avatarUrl: avatarUrlInput,
    coverUrl: coverUrlInput,
    gender: genderInput,
    birthDate: birthDateInput,
    faculty: facultyInput,
  } = req.body;

  if (!userId || !isUuid(userId)) {
    return res.status(400).json({
      message: 'Invalid user id',
    });
  }

  const fullName = fullNameInput === undefined ? undefined : normalizeOptionalString(fullNameInput);
  const username = usernameInput === undefined
    ? undefined
    : normalizeOptionalString(usernameInput)?.toLowerCase().replace(/\s+/g, '_');
  const bio = bioInput === undefined ? undefined : typeof bioInput === 'string' ? bioInput.trim() : undefined;
  const avatarUrl = avatarUrlInput === undefined ? undefined : typeof avatarUrlInput === 'string' ? avatarUrlInput.trim() || null : undefined;
  const coverUrl = coverUrlInput === undefined ? undefined : typeof coverUrlInput === 'string' ? coverUrlInput.trim() || null : undefined;
  const gender = genderInput === undefined ? undefined : parseGender(genderInput);
  const birthDate = birthDateInput === undefined ? undefined : birthDateInput === null ? null : parseBirthDate(birthDateInput);
  const faculty = facultyInput === undefined ? undefined : typeof facultyInput === 'string' ? facultyInput.trim() : undefined;

  if (fullNameInput !== undefined && !fullName) {
    return res.status(400).json({
      message: 'fullName cannot be empty',
    });
  }

  if (fullName && !fullNameRegex.test(fullName)) {
    return res.status(400).json({
      message: 'Full name must be in English or Thai only',
    });
  }

  if (usernameInput !== undefined && !username) {
    return res.status(400).json({
      message: 'username cannot be empty',
    });
  }

  if (username && !usernameRegex.test(username)) {
    return res.status(400).json({
      message: 'Username must be 3-30 characters and use only letters, numbers, or underscores',
    });
  }

  if (bioInput !== undefined && typeof bioInput !== 'string') {
    return res.status(400).json({
      message: 'bio must be a string',
    });
  }

  if (genderInput !== undefined && !gender) {
    return res.status(400).json({
      message: 'Invalid gender',
    });
  }

  if (birthDateInput !== undefined && birthDateInput !== null && !birthDate) {
    return res.status(400).json({
      message: 'Invalid birthDate',
    });
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
      },
    });

    if (!existingUser) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    if (username) {
      const duplicatedUser = await prisma.user.findFirst({
        where: {
          username,
          id: {
            not: userId,
          },
        },
        select: {
          id: true,
        },
      });

      if (duplicatedUser) {
        return res.status(409).json({
          message: 'Username is already in use',
        });
      }
    }

    const user = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        fullName,
        username,
        bio,
        avatarUrl,
        coverUrl,
        gender: gender ?? undefined,
        birthDate,
        faculty,
      },
      select: safeUserSelect,
    });

    return res.json({
      message: 'Profile updated successfully',
      user,
    });
  } catch (error) {
    if (isPrismaKnownError(error) && error.code === 'P2002') {
      return res.status(409).json({
        message: 'Username is already in use',
      });
    }

    console.error('Failed to update profile:', error);
    return res.status(500).json({
      message: 'Failed to update profile',
    });
  }
});

authRouter.get('/admins', async (req: Request, res: Response) => {
  const faculty = typeof req.query.faculty === 'string' ? req.query.faculty : null;
  const role = typeof req.query.role === 'string' ? req.query.role : null;

  try {
    const whereClause: any = {
      status: UserStatus.ACTIVE,
    };

    if (role === 'SUPER_ADMIN') {
      whereClause.role = UserRole.SUPER_ADMIN;
    } else if (faculty) {
      whereClause.role = UserRole.ADMIN;
      // ค้นหาคณะแบบไม่สนใจตัวพิมพ์เล็ก-ใหญ่ (Case-insensitive)
      whereClause.faculty = {
        equals: faculty,
        mode: 'insensitive',
      };
    } else {
      whereClause.role = { in: [UserRole.ADMIN, UserRole.SUPER_ADMIN] };
    }

    const admins = await prisma.user.findMany({
      where: whereClause,
      select: safeUserSelect,
      take: 5, // เอามาแค่บางส่วนพอ
    });

    return res.json(admins);
  } catch (error) {
    console.error('Failed to fetch admins:', error);
    return res.status(500).json({ error: 'Failed to fetch admins' });
  }
});

authRouter.get('/roles', (_req: Request, res: Response) => {
  return res.json({
    roles: Object.values(UserRole),
    genders: Object.values(Gender),
    statuses: Object.values(UserStatus),
  });
});

// GET /auth/users — list all users (admin)
authRouter.get('/users', async (req: Request, res: Response) => {
  const page = typeof req.query.page === 'string' ? parseInt(req.query.page, 10) : 1;
  const limit = typeof req.query.limit === 'string' ? Math.min(parseInt(req.query.limit, 10), 100) : 20;
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : null;
  const status = typeof req.query.status === 'string' && req.query.status in UserStatus
    ? (req.query.status as UserStatus)
    : null;
  const role = typeof req.query.role === 'string' && req.query.role in UserRole
    ? (req.query.role as UserRole)
    : null;
  const faculty = typeof req.query.faculty === 'string' ? req.query.faculty.trim() || null : null;

  const skip = (Math.max(page, 1) - 1) * (isNaN(limit) || limit <= 0 ? 20 : limit);
  const take = isNaN(limit) || limit <= 0 ? 20 : limit;

  const where: any = {
    ...(status ? { status } : {}),
    ...(role ? { role } : {}),
    ...(faculty ? { faculty: { equals: faculty, mode: 'insensitive' } } : {}),
    ...(q
      ? {
          OR: [
            { fullName: { contains: q, mode: 'insensitive' } },
            { username: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
            { studentId: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  try {
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: safeUserSelect,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.user.count({ where }),
    ]);

    return res.json({ users, total, page: Math.max(page, 1), limit: take });
  } catch (error) {
    console.error('Failed to fetch users:', error);
    return res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// PATCH /auth/users/:userId/status — suspend / activate / deactivate (admin)
authRouter.patch('/users/:userId/status', async (req: Request, res: Response) => {
  const userId = typeof req.params.userId === 'string' ? req.params.userId : null;
  const { status: statusInput, actorId } = req.body;

  if (!userId || !isUuid(userId)) {
    return res.status(400).json({ message: 'Invalid user id' });
  }

  if (typeof actorId !== 'string' || !isUuid(actorId)) {
    return res.status(400).json({ message: 'A valid actorId is required' });
  }

  if (typeof statusInput !== 'string' || !(statusInput in UserStatus)) {
    return res.status(400).json({ message: `status must be one of: ${Object.values(UserStatus).join(', ')}` });
  }

  const newStatus = statusInput as UserStatus;

  try {
    const [actor, target] = await Promise.all([
      prisma.user.findUnique({ where: { id: actorId }, select: { id: true, role: true } }),
      prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, status: true } }),
    ]);

    if (!actor || (actor.role !== UserRole.ADMIN && actor.role !== UserRole.SUPER_ADMIN)) {
      return res.status(403).json({ message: 'Only admins can update user status' });
    }

    if (!target) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (target.role === UserRole.SUPER_ADMIN) {
      return res.status(403).json({ message: 'Cannot change status of a super admin' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { status: newStatus },
      select: safeUserSelect,
    });

    return res.json({ message: 'User status updated', user: updatedUser });
  } catch (error) {
    console.error('Failed to update user status:', error);
    return res.status(500).json({ message: 'Failed to update user status' });
  }
});

// PATCH /auth/users/:userId/role — promote/demote user role (SUPER_ADMIN only)
authRouter.patch('/users/:userId/role', async (req: Request, res: Response) => {
  const userId = typeof req.params.userId === 'string' ? req.params.userId : null;
  const { role: roleInput, actorId } = req.body;

  if (!userId || !isUuid(userId)) {
    return res.status(400).json({ message: 'Invalid user id' });
  }

  if (typeof actorId !== 'string' || !isUuid(actorId)) {
    return res.status(400).json({ message: 'A valid actorId is required' });
  }

  if (typeof roleInput !== 'string' || !(roleInput in UserRole)) {
    return res.status(400).json({ message: `role must be one of: ${Object.values(UserRole).join(', ')}` });
  }

  const newRole = roleInput as UserRole;

  try {
    const [actor, target] = await Promise.all([
      prisma.user.findUnique({ where: { id: actorId }, select: { id: true, role: true } }),
      prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } }),
    ]);

    if (!actor || actor.role !== UserRole.SUPER_ADMIN) {
      return res.status(403).json({ message: 'Only SUPER_ADMIN can change user roles' });
    }

    if (!target) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (target.role === UserRole.SUPER_ADMIN) {
      return res.status(403).json({ message: 'Cannot change role of a SUPER_ADMIN' });
    }

    if (newRole === UserRole.SUPER_ADMIN) {
      return res.status(403).json({ message: 'Cannot promote to SUPER_ADMIN' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
      select: safeUserSelect,
    });

    return res.json({ message: 'User role updated', user: updatedUser });
  } catch (error) {
    console.error('Failed to update user role:', error);
    return res.status(500).json({ message: 'Failed to update user role' });
  }
});

export { authRouter };
