import { Router } from 'express';
import { LoginStatus } from '../../generated/prisma/enums';
import { prisma } from '../lib/prisma';
import { hashPassword, verifyPassword } from '../password';

const authRouter = Router();

authRouter.post('/register', async (req, res) => {
  const { email, fullName, username, password } = req.body;

  if (!email || !fullName || !username || !password) {
    return res.status(400).json({
      message: 'email, fullName, username and password are required',
    });
  }

  const dpuEmailRegex = /^\d{8}@dpu\.ac\.th$/i;

  if (!dpuEmailRegex.test(email)) {
    return res.status(400).json({
      message: 'Email must be in the format 12345678@dpu.ac.th',
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      message: 'Password must be at least 6 characters long',
    });
  }

  const studentId = email.slice(0, 8);
  const cleanUserName = username.trim();

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { studentId }, { username: cleanUserName }],
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
      username: cleanUserName,
      passwordHash,
    },
  });

  return res.status(201).json({
    message: 'User registered successfully',
    user,
  });
});

authRouter.post('/login', async (req, res) => {
    const { studentId, password } = req.body;
    const ipAddress = req.ip;
    const userAgent = req.get('user-agent') || null;

    if (!studentId || !password) {
        return res.status(400).json({
            message: 'studentId and password are required',
        });
    }

    const user = await prisma.user.findUnique({
        where: {
            studentId,
        },
    });

    if (!user || !user.passwordHash) {
        await prisma.loginLog.create({
            data: {
                emailInput: studentId,
                status: LoginStatus.FAILED,
                reason: 'User not found',
                ipAddress,
                userAgent,
            },
        });

        return res.status(401).json({
            message: 'Invalid studentId or password',
        });
    }

    const isPasswordCorrect = await verifyPassword(password, user.passwordHash);

    if (!isPasswordCorrect) {
        await prisma.loginLog.create({
            data: {
                userId: user.id,
                emailInput: studentId,
                status: LoginStatus.FAILED,
                reason: 'Incorrect password',
                ipAddress,
                userAgent,
            },
        });

        return res.status(401).json({
            message: 'Invalid studentId or password',
        });
    }

    await prisma.loginLog.create({
        data: {
            userId: user.id,
            emailInput: studentId,
            status: LoginStatus.SUCCESS,
            ipAddress,
            userAgent,
        },
    });
    
    return res.status(200).json({
        message: 'Login successful',
        user,
    })
})

export { authRouter };