import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";

const router = Router();

router.get("/", authMiddleware, async (req: AuthRequest, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  res.json(notifications);
});

router.post("/:id/read", authMiddleware, async (req: AuthRequest, res) => {
  await prisma.notification.updateMany({
    where: { id: req.params.id as string, userId: req.userId },
    data: { read: true },
  });
  res.json({ ok: true });
});

router.post("/read-all", authMiddleware, async (req: AuthRequest, res) => {
  await prisma.notification.updateMany({ where: { userId: req.userId }, data: { read: true } });
  res.json({ ok: true });
});

export default router;
