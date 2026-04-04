import express from "express";
import { prisma } from "../lib/prisma";

const reportRouter = express.Router();

// ตัวอย่าง API สำหรับการแจ้งรายงาน
reportRouter.post("/", async (req, res) => {
  try {
    // โค้ดสำหรับบันทึกรายงานจะถูกเพิ่มที่นี่
    res.json({ message: "Report created (placeholder)" });
  } catch (error) {
    res.status(500).json({ error: "Failed to create report" });
  }
});

export { reportRouter };
