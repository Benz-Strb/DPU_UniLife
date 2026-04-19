import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { DayOfWeek } from '@prisma/client';

const router = Router();

// GET: ดึงวิชาทั้งหมดของ User
router.get('/', async (req, res) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: 'User ID is required' });

    const courses = await prisma.course.findMany({
      where: { userId },
      orderBy: { startTime: 'asc' },
    });

    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
});

// POST: เพิ่มวิชาใหม่
router.post('/', async (req, res) => {
  try {
    const { userId, courseCode, courseName, color, dayOfWeek, startTime, endTime, room, instructor } = req.body;

    if (!userId || !courseName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const newCourse = await prisma.course.create({
      data: {
        userId,
        courseCode,
        courseName,
        color,
        dayOfWeek: dayOfWeek as DayOfWeek ?? null,
        startTime: startTime || null,
        endTime: endTime || null,
        room: room || null,
        instructor: instructor || null,
      },
    });

    res.status(201).json(newCourse);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create course' });
  }
});

// DELETE: ลบวิชา
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.course.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete course' });
  }
});

export default router;
