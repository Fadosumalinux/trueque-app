import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";

const router = Router();

// Dejar reseña sobre un intercambio completado
router.post("/", authMiddleware, async (req: AuthRequest, res) => {
  const { exchangeId, revieweeId, rating, comment } = req.body;
  if (!exchangeId || !revieweeId || !rating || rating < 1 || rating > 5) {
    res.status(400).json({ error: "Datos inválidos (exchangeId, revieweeId, rating 1-5)" });
    return;
  }
  const exchange = await prisma.exchange.findUnique({
    where: { id: exchangeId },
    include: { reviews: true },
  });
  if (!exchange) {
    res.status(404).json({ error: "Intercambio no encontrado" });
    return;
  }
  if (exchange.status !== "completed") {
    res.status(400).json({ error: "Solo se pueden reseñar trueques completados" });
    return;
  }
  if (![exchange.fromUserId, exchange.toUserId].includes(req.userId!)) {
    res.status(403).json({ error: "No participaste en este trueque" });
    return;
  }
  if (![exchange.fromUserId, exchange.toUserId].includes(revieweeId)) {
    res.status(400).json({ error: "Solo podés reseñar a otra parte del trueque" });
    return;
  }
  if (exchange.reviews.some((r) => r.reviewerId === req.userId)) {
    res.status(400).json({ error: "Ya dejaste una reseña en este trueque" });
    return;
  }

  const review = await prisma.$transaction(async (tx) => {
    const created = await tx.review.create({
      data: { exchangeId, reviewerId: req.userId!, revieweeId, rating: Number(rating), comment: comment || null },
    });
    const reviewee = await tx.user.findUnique({ where: { id: revieweeId }, select: { ratingAvg: true, ratingCount: true } });
    const newCount = (reviewee?.ratingCount || 0) + 1;
    const newAvg = ((reviewee?.ratingAvg || 0) * (reviewee?.ratingCount || 0) + Number(rating)) / newCount;
    await tx.user.update({
      where: { id: revieweeId },
      data: { ratingAvg: Math.round(newAvg * 10) / 10, ratingCount: newCount },
    });
    return created;
  });

  res.status(201).json(review);
});

// Reseñas recibidas por un usuario
router.get("/user/:userId", async (req, res) => {
  const reviews = await prisma.review.findMany({
    where: { revieweeId: req.params.userId as string },
    include: { reviewer: { select: { displayName: true, avatarUrl: true } } },
    orderBy: { createdAt: "desc" },
  });
  res.json(reviews);
});

export default router;
