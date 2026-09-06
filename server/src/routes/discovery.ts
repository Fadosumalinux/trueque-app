import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import { resolveAuction } from "./bids.js";

const router = Router();

// Feed de descubrimiento: listados de otros usuarios que aún no vi, con valor zonal.
router.get("/feed", authMiddleware, async (req: AuthRequest, res) => {
  const { categoryId, zoneId, type } = req.query;
  const me = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { zoneId: true, latitude: true, longitude: true, sentLikes: { select: { listingId: true } } },
  });
  if (!me) {
    res.status(404).json({ error: "Usuario no encontrado" });
    return;
  }
  const seenIds = me.sentLikes.map((l) => l.listingId);
  const listings = await prisma.listing.findMany({
    where: {
      status: "active",
      userId: { not: req.userId },
      type: (type as string) || undefined,
      categoryId: (categoryId as string) || undefined,
      zoneId: (zoneId as string) || undefined,
      ...(seenIds.length ? { id: { notIn: seenIds } } : {}),
    },
    include: {
      user: { select: { id: true, displayName: true, username: true, avatarUrl: true, verificationStatus: true, ratingAvg: true, ratingCount: true, role: true, coverageZone: true } },
      category: true,
      zone: { select: { id: true, name: true, multiplier: true } },
      mode: true,
      bids: { orderBy: [{ amount: "desc" }, { createdAt: "asc" }], take: 1, include: { bidder: { select: { id: true, displayName: true, verificationStatus: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 60,
  });
  await Promise.all(listings.map((l) => (l.auctionEnd && l.auctionEnd <= new Date() && l.status === "active" ? resolveAuction(l.id) : Promise.resolve(null))));
  res.json(listings);
});

// Like o pass (swipe). Un "like" de ambos lados crea un match.
router.post("/like", authMiddleware, async (req: AuthRequest, res) => {
  const { listingId, direction } = req.body;
  if (!listingId || !["like", "pass"].includes(direction)) {
    res.status(400).json({ error: "Datos inválidos (listingId, direction: like|pass)" });
    return;
  }
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) {
    res.status(404).json({ error: "Listado no encontrado" });
    return;
  }

  let like = await prisma.listingLike.findUnique({
    where: { userId_listingId: { userId: req.userId!, listingId } },
  });

  if (like) {
    like = await prisma.listingLike.update({ where: { id: like.id }, data: { direction } });
  } else {
    like = await prisma.listingLike.create({
      data: { userId: req.userId!, listingId, direction },
    });
  }

  let match = false;
  if (direction === "like") {
    await prisma.user.update({
      where: { id: req.userId! },
      data: { likesCount: { increment: 1 } },
    });
    // Match: el dueño del listado ya me dio like a algo mío, o a mí.
    const theyLikedMe = await prisma.listingLike.findFirst({
      where: {
        direction: "like",
        listing: { userId: req.userId },
        userId: listing.userId,
      },
    });
    const iLikedTheirListing = await prisma.listingLike.findUnique({
      where: { userId_listingId: { userId: req.userId!, listingId } },
    });
    match = Boolean(iLikedTheirListing?.direction === "like") && Boolean(theyLikedMe);
  }

  res.json({ like, match });
});

// Matches: mutual interest estilo dating app.
router.get("/matches", authMiddleware, async (req: AuthRequest, res) => {
  const likedByMe = await prisma.listingLike.findMany({
    where: { userId: req.userId, direction: "like" },
    include: {
      listing: { include: { user: { select: { id: true, displayName: true, avatarUrl: true, verificationStatus: true, ratingAvg: true } }, category: true, zone: { select: { name: true } } } },
    },
  });

  const matched = [];
  for (const entry of likedByMe) {
    const back = await prisma.listingLike.findFirst({
      where: {
        direction: "like",
        listing: { userId: entry.listing.userId === req.userId ? "none" : req.userId },
        userId: entry.listing.userId,
      },
    });
    if (back) matched.push(entry.listing);
  }

  // También: mis listados que les gustaron a otros y me gustan a mí.
  const likesOnMyListings = await prisma.listingLike.findMany({
    where: { direction: "like", listing: { userId: req.userId } },
    include: {
      listing: { include: { user: { select: { id: true, displayName: true, avatarUrl: true, verificationStatus: true, ratingAvg: true } }, category: true, zone: { select: { name: true } } } },
    },
  });
  for (const entry of likesOnMyListings) {
    const iLikedBack = await prisma.listingLike.findFirst({
      where: { userId: req.userId, direction: "like", listingId: entry.listingId },
    });
    if (iLikedBack) matched.push(entry.listing);
  }

  const unique = Array.from(new Map(matched.map((m) => [m.id, m])).values());
  res.json(unique);
});

export default router;
