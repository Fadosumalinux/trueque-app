import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";

const router = Router();

export function computeZonalValue(baseValue: number, multiplier: number): number {
  return Math.round(baseValue * multiplier);
}

router.get("/", authMiddleware, async (req: AuthRequest, res) => {
  const { categoryId, zoneId, type, q } = req.query;
  const listings = await prisma.listing.findMany({
    where: {
      status: "active",
      categoryId: (categoryId as string) || undefined,
      zoneId: (zoneId as string) || undefined,
      type: (type as string) || undefined,
      ...(q ? { OR: [{ title: { contains: q as string } }, { description: { contains: q as string } }] } : {}),
    },
    include: {
      user: { select: { id: true, displayName: true, username: true, avatarUrl: true, verificationStatus: true, ratingAvg: true, zone: { select: { name: true } } } },
      category: true,
      zone: { select: { id: true, name: true, multiplier: true } },
      likes: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  res.json(listings.map((l) => ({ ...l, likeCount: l.likes.length })));
});

router.get("/mine", authMiddleware, async (req: AuthRequest, res) => {
  const listings = await prisma.listing.findMany({
    where: { userId: req.userId },
    include: { category: true, zone: { select: { name: true } }, likes: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(listings.map((l) => ({ ...l, likeCount: l.likes.length })));
});

router.get("/:id", authMiddleware, async (req: AuthRequest, res) => {
  const listing = await prisma.listing.findUnique({
    where: { id: req.params.id as string },
    include: {
      user: { select: { id: true, displayName: true, username: true, avatarUrl: true, bio: true, verificationStatus: true, ratingAvg: true, ratingCount: true, coverageZone: true, maxTravelKm: true, role: true, zone: { select: { name: true } } } },
      category: true,
      zone: { select: { id: true, name: true, multiplier: true } },
      likes: true,
    },
  });
  if (!listing) {
    res.status(404).json({ error: "Listado no encontrado" });
    return;
  }
  res.json({ ...listing, likeCount: listing.likes.length });
});

router.post("/", authMiddleware, async (req: AuthRequest, res) => {
  const { categoryId, zoneId, type = "offer", title, description, acceptTerms, currency = "both", photos } = req.body;
  if (!categoryId || !zoneId || !title) {
    res.status(400).json({ error: "Faltan datos obligatorios (categoría, zona, título)" });
    return;
  }
  const [category, zone] = await Promise.all([
    prisma.category.findUnique({ where: { id: categoryId } }),
    prisma.zone.findUnique({ where: { id: zoneId } }),
  ]);
  if (!category || !zone) {
    res.status(404).json({ error: "Categoría o zona no encontrada" });
    return;
  }
  const listing = await prisma.listing.create({
    data: {
      userId: req.userId!,
      categoryId,
      zoneId,
      type,
      title,
      description: description || "",
      acceptTerms: acceptTerms || "",
      currency,
      photos: photos ? JSON.stringify(photos) : "[]",
      estimatedValue: computeZonalValue(category.baseValue, zone.multiplier),
    },
    include: { category: true, zone: true },
  });
  res.status(201).json(listing);
});

router.put("/:id", authMiddleware, async (req: AuthRequest, res) => {
  const listing = await prisma.listing.findUnique({ where: { id: req.params.id as string } });
  if (!listing) {
    res.status(404).json({ error: "Listado no encontrado" });
    return;
  }
  if (listing.userId !== req.userId) {
    res.status(403).json({ error: "No puedes modificar este listado" });
    return;
  }
  const { title, description, acceptTerms, currency, status, photos, categoryId, zoneId } = req.body;
  let estimatedValue = listing.estimatedValue;
  if (categoryId || zoneId) {
    const [category, zone] = await Promise.all([
      prisma.category.findUnique({ where: { id: categoryId || listing.categoryId } }),
      prisma.zone.findUnique({ where: { id: zoneId || listing.zoneId } }),
    ]);
    if (category && zone) estimatedValue = computeZonalValue(category.baseValue, zone.multiplier);
  }
  const updated = await prisma.listing.update({
    where: { id: listing.id },
    data: {
      title: title ?? undefined,
      description: description ?? undefined,
      acceptTerms: acceptTerms ?? undefined,
      currency: currency ?? undefined,
      status: status ?? undefined,
      categoryId: categoryId ?? undefined,
      zoneId: zoneId ?? undefined,
      estimatedValue,
      photos: photos ? JSON.stringify(photos) : undefined,
    },
    include: { category: true, zone: true },
  });
  res.json(updated);
});

router.delete("/:id", authMiddleware, async (req: AuthRequest, res) => {
  const listing = await prisma.listing.findUnique({ where: { id: req.params.id as string } });
  if (!listing) {
    res.status(404).json({ error: "Listado no encontrado" });
    return;
  }
  if (listing.userId !== req.userId) {
    res.status(403).json({ error: "No puedes eliminar este listado" });
    return;
  }
  await prisma.listing.delete({ where: { id: listing.id } });
  res.json({ ok: true });
});

export default router;
