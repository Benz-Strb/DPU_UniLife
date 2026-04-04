import express from "express";
import { prisma } from "../lib/prisma";

const groupRouter = express.Router();

// ตัวอย่าง API สำหรับดึงรายการกลุ่ม
groupRouter.get("/", async (req, res) => {
  try {
    // โค้ดสำหรับดึงข้อมูลกลุ่มจะถูกเพิ่มที่นี่
    res.json({ message: "Get all groups (placeholder)" });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch groups" });
  }
});

export { groupRouter };
