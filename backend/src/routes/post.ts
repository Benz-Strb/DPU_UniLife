import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import multer from 'multer';
import path from 'path';

const postRouter = Router();

// ตั้งค่าการเก็บไฟล์
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// API สำหรับอัปโหลดรูปภาพ
postRouter.post('/upload', upload.single('image'), (req: any, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  // ส่ง URL ของรูปกลับไป (ใช้ Path สัมพัทธ์)
  const imageUrl = `/uploads/${req.file.filename}`;
  res.json({ imageUrl });
});

// 1. ดึงโพสต์ทั้งหมด (พร้อมข้อมูลผู้เขียน, สื่อ, ไลก์ และคอมเมนต์)
postRouter.get('/', async (req: Request, res: Response) => {
  try {
    const posts = await prisma.post.findMany({
      include: {
        author: {
          select: { id: true, fullName: true, avatarUrl: true, role: true }
        },
        media: true,
        reactions: true,
        comments: {
          include: {
            author: { select: { fullName: true } }
          }
        },
        _count: {
          select: { comments: true, reactions: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// 2. สร้างโพสต์ใหม่
postRouter.post('/', async (req: Request, res: Response) => {
  const { authorId, content, image } = req.body;
  try {
    const post = await prisma.post.create({
      data: {
        authorId,
        content,
        media: image ? {
          create: {
            url: image,
            mediaType: 'IMAGE'
          }
        } : undefined,
      },
      include: {
        author: true,
        media: true
      }
    });
    res.status(201).json(post);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// 3. ไลก์ / ยกเลิกไลก์โพสต์
postRouter.post('/:id/like', async (req: Request, res: Response) => {
  const postId = req.params.id as string;
  const { userId } = req.body;

  try {
    const existingLike = await prisma.postReaction.findUnique({
      where: { postId_userId: { postId, userId: userId as string } }
    });

    if (existingLike) {
      await prisma.postReaction.delete({
        where: { postId_userId: { postId, userId: userId as string } }
      });
      res.json({ message: 'Unliked' });
    } else {
      await prisma.postReaction.create({
        data: { postId, userId: userId as string }
      });
      res.json({ message: 'Liked' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle like' });
  }
});

// 4. เพิ่มคอมเมนต์
postRouter.post('/:id/comments', async (req: Request, res: Response) => {
  const postId = req.params.id as string;
  const { authorId, content } = req.body;
  try {
    const comment = await prisma.comment.create({
      data: { postId, authorId: authorId as string, content: content as string },
      include: { author: { select: { fullName: true } } }
    });
    res.status(201).json(comment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

export { postRouter };