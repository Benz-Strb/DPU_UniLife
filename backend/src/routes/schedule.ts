import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { DayOfWeek } from '@prisma/client';

const router = Router();

// GET: ดึงตารางเรียนทั้งหมดของ User
router.get('/', async (req, res) => {
  try {
    const userId = req.query.userId as string; 

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const courses = await prisma.course.findMany({
      where: { userId },
      include: {
        schedules: {
          orderBy: {
            startTime: 'asc'
          }
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    res.json(courses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
});

// GET: ดึงตารางเรียนเฉพาะวันนี้ (Today's Schedule)
router.get('/today', async (req, res) => {
  try {
    const userId = req.query.userId as string;
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const todayName = days[new Date().getDay()] as DayOfWeek;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const todayCourses = await prisma.course.findMany({
      where: {
        userId,
        schedules: {
          some: {
            dayOfWeek: todayName
          }
        }
      },
      include: {
        schedules: {
          where: {
            dayOfWeek: todayName
          },
          orderBy: {
            startTime: 'asc'
          }
        }
      }
    });

    res.json(todayCourses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch today\'s schedule' });
  }
});

// POST: เพิ่มวิชาและคาบเรียนใหม่
router.post('/', async (req, res) => {
  try {
    const { userId, courseCode, courseName, credits, color, schedules } = req.body;

    if (!userId || !courseName || !schedules || !Array.isArray(schedules)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const newCourse = await prisma.course.create({
      data: {
        userId,
        courseCode,
        courseName,
        credits: credits ? parseInt(credits) : null,
        color,
        schedules: {
          create: schedules.map((s: any) => ({
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
            room: s.room,
            instructor: s.instructor,
          })),
        },
      },
      include: {
        schedules: true,
      },
    });

    res.status(201).json(newCourse);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create course' });
  }
});

// PUT: แก้ไขข้อมูลวิชา
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { courseCode, courseName, credits, color, schedules } = req.body;

    // ลบ schedules เก่าและสร้างใหม่ (วิธีที่ง่ายที่สุดในการ Update แบบ Nested)
    const updatedCourse = await prisma.course.update({
      where: { id },
      data: {
        courseCode,
        courseName,
        credits: credits ? parseInt(credits) : null,
        color,
        schedules: {
          deleteMany: {}, // ลบของเก่าออกทั้งหมดก่อน
          create: schedules.map((s: any) => ({
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
            room: s.room,
            instructor: s.instructor,
          })),
        },
      },
      include: {
        schedules: true,
      },
    });

    res.json(updatedCourse);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update course' });
  }
});

// DELETE: ลบวิชา
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.course.delete({
      where: { id },
    });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete course' });
  }
});

export default router;
